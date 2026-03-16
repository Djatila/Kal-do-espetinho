'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { FileDown, Calendar, FileSpreadsheet, TrendingUp, DollarSign, ShoppingBag, Wallet, Filter } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import styles from './page.module.css'

// Cores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function RelatoriosPage() {
    const [loading, setLoading] = useState(false)
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [periodoPredefinido, setPeriodoPredefinido] = useState('hoje')
    const supabase = createClient()

    // Estados para dados
    const [vendas, setVendas] = useState<any[]>([])
    const [despesas, setDespesas] = useState<any[]>([])
    const [kpis, setKpis] = useState({
        faturamento: 0,
        ticketMedio: 0,
        pedidos: 0,
        lucro: 0
    })
    const [graficos, setGraficos] = useState<{
        vendasPorDia: Array<{ data: string; valor: number }>;
        topProdutos: Array<{ nome: string; qtd: number }>;
        formasPagamento: Array<{ nome: string; valor: number }>;
    }>({
        vendasPorDia: [],
        topProdutos: [],
        formasPagamento: []
    })

    useEffect(() => {
        aplicarFiltroPredefinido('hoje')
    }, [])

    useEffect(() => {
        if (dataInicio && dataFim) {
            fetchData()
        }
    }, [dataInicio, dataFim])

    function aplicarFiltroPredefinido(periodo: string) {
        setPeriodoPredefinido(periodo)
        const hoje = new Date()
        let inicio = new Date()
        let fim = new Date()

        switch (periodo) {
            case 'hoje':
                // Inicio e fim são hoje
                break
            case 'ontem':
                inicio.setDate(hoje.getDate() - 1)
                fim.setDate(hoje.getDate() - 1)
                break
            case '7dias':
                inicio.setDate(hoje.getDate() - 7)
                break
            case '30dias':
                inicio.setDate(hoje.getDate() - 30)
                break
            case 'mesAtual':
                inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                break
            case 'mesPassado':
                inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
                fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
                break
        }

        setDataInicio(inicio.toISOString().split('T')[0])
        setDataFim(fim.toISOString().split('T')[0])
    }

    async function fetchData() {
        setLoading(true)

        // Buscar Vendas Manuais
        const { data: vendasData, error: vendasError } = await supabase
            .from('vendas')
            .select(`
                *,
                itens_venda (
                    id,
                    quantidade,
                    preco_unitario,
                    subtotal,
                    produtos (
                        id,
                        nome
                    )
                )
            `)
            .gte('data', `${dataInicio}T00:00:00`)
            .lte('data', `${dataFim}T23:59:59`)
            .order('data', { ascending: true })

        // Buscar Pedidos Online
        const { data: pedidosData, error: pedidosError } = await supabase
            .from('pedidos_online')
            .select('*')
            .gte('created_at', `${dataInicio}T00:00:00`)
            .lte('created_at', `${dataFim}T23:59:59`)
            .in('status', ['entregue', 'confirmado', 'preparando', 'pronto'])
            .order('created_at', { ascending: true })

        if (vendasError) console.error('❌ Erro ao buscar vendas:', vendasError)
        if (pedidosError) console.error('❌ Erro ao buscar pedidos online:', pedidosError)

        // Buscar Despesas
        const { data: despesasData } = await supabase
            .from('despesas')
            .select('*')
            .gte('data', `${dataInicio}T00:00:00`)
            .lte('data', `${dataFim}T23:59:59`)

        if (vendasData && despesasData) {
            // Consolidar as vendas
            const vendasConsolidadas = [
                ...vendasData.map(v => ({
                    ...v,
                    origem: 'PDV',
                    data_venda: v.data,
                    itens: v.itens_venda
                })),
                ...(pedidosData || []).map(p => ({
                    ...p,
                    origem: 'Online',
                    data_venda: p.created_at,
                    forma_pagamento: p.metodo_pagamento || 'Online',
                    total: p.total,
                    itens: p.itens
                }))
            ]

            setVendas(vendasConsolidadas)
            setDespesas(despesasData)
            processarDados(vendasConsolidadas, despesasData)
        }

        setLoading(false)
    }

    function processarDados(vendas: any[], despesas: any[]) {
        // 1. KPIs
        const faturamento = vendas.reduce((acc, v) => acc + Number(v.total || 0), 0)
        const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor || 0), 0)
        const pedidosCount = vendas.length
        const ticketMedio = pedidosCount > 0 ? faturamento / pedidosCount : 0
        const lucro = faturamento - totalDespesas

        setKpis({ faturamento, ticketMedio, pedidos: pedidosCount, lucro })

        // 2. Gráfico: Vendas por Dia
        const vendasPorDiaMap = new Map()
        vendas.forEach(v => {
            const data = new Date(v.data_venda).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            vendasPorDiaMap.set(data, (vendasPorDiaMap.get(data) || 0) + Number(v.total || 0))
        })
        const vendasPorDia = Array.from(vendasPorDiaMap.entries())
            .map(([data, valor]) => ({ data, valor }))
            .sort((a, b) => {
                const [diaA, mesA] = a.data.split('/')
                const [diaB, mesB] = b.data.split('/')
                return new Date(2026, Number(mesA) - 1, Number(diaA)).getTime() - new Date(2026, Number(mesB) - 1, Number(diaB)).getTime()
            })

        // 3. Gráfico: Top Produtos
        const produtosMap = new Map()

        vendas.forEach(v => {
            if (v.itens && Array.isArray(v.itens) && v.itens.length > 0) {
                v.itens.forEach((item: any) => {
                    const nome = item.produtos?.nome || item.nome || 'Desconhecido'
                    produtosMap.set(nome, (produtosMap.get(nome) || 0) + (item.quantidade || 0))
                })
            } else if (v.origem === 'PDV') {
                // Fallback para vendas manuais antigas
                const tipoVenda = v.tipo === 'delivery' ? 'Delivery' : 'Local'
                const quantidade = v.quantidade || 1
                produtosMap.set(tipoVenda, (produtosMap.get(tipoVenda) || 0) + quantidade)
            }
        })

        const topProdutos = Array.from(produtosMap.entries())
            .map(([nome, qtd]) => ({ nome, qtd }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 5)

        // 4. Gráfico: Formas de Pagamento
        const pagamentosMap = new Map()
        vendas.forEach(v => {
            const forma = v.forma_pagamento || 'Não informado'
            pagamentosMap.set(forma, (pagamentosMap.get(forma) || 0) + Number(v.total || 0))
        })
        const formasPagamento = Array.from(pagamentosMap.entries()).map(([nome, valor]) => ({ nome, valor }))

        setGraficos({
            vendasPorDia,
            topProdutos,
            formasPagamento
        })
    }

    // ... (Funções de exportação PDF e Excel mantidas e melhoradas)
    const generatePDFReport = async () => {
        const doc = new jsPDF()

        // Cabeçalho
        doc.setFillColor(102, 126, 234) // Cor primária
        doc.rect(0, 0, 210, 40, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.text('Relatório Gerencial', 14, 20)
        doc.setFontSize(12)
        doc.text(`Período: ${new Date(dataInicio).toLocaleDateString()} a ${new Date(dataFim).toLocaleDateString()}`, 14, 30)

        // Resumo
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(14)
        doc.text('Resumo Financeiro', 14, 50)

        const resumoData = [
            ['Faturamento', `R$ ${kpis.faturamento.toFixed(2)}`],
            ['Despesas', `R$ ${despesas.reduce((acc, d) => acc + Number(d.valor), 0).toFixed(2)}`],
            ['Lucro Líquido', `R$ ${kpis.lucro.toFixed(2)}`],
            ['Ticket Médio', `R$ ${kpis.ticketMedio.toFixed(2)}`],
            ['Total de Pedidos', kpis.pedidos.toString()]
        ]

        autoTable(doc, {
            startY: 55,
            head: [['Indicador', 'Valor']],
            body: resumoData,
            theme: 'striped',
            headStyles: { fillColor: [102, 126, 234] }
        })

        // Vendas Detalhadas
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let finalY = (doc as any).lastAutoTable.finalY + 15
        doc.text('Detalhamento de Vendas', 14, finalY)

        const vendasData = vendas.map(v => [
            new Date(v.data_venda).toLocaleDateString(),
            v.origem || 'PDV',
            v.forma_pagamento,
            `R$ ${Number(v.total || 0).toFixed(2)}`
        ])

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Data', 'Origem', 'Pagamento', 'Valor']],
            body: vendasData,
            theme: 'striped',
            headStyles: { fillColor: [102, 126, 234] }
        })

        doc.save(`relatorio_${dataInicio}_${dataFim}.pdf`)
    }

    const generateExcelReport = () => {
        const wb = XLSX.utils.book_new()

        // Planilha de Vendas
        const wsVendas = XLSX.utils.json_to_sheet(vendas.map(v => ({
            Data: new Date(v.data_venda).toLocaleDateString(),
            Origem: v.origem || 'PDV',
            Pagamento: v.forma_pagamento,
            Total: v.total
        })))
        XLSX.utils.book_append_sheet(wb, wsVendas, 'Vendas')

        // Planilha de Despesas
        const wsDespesas = XLSX.utils.json_to_sheet(despesas.map(d => ({
            Data: new Date(d.data).toLocaleDateString(),
            Categoria: d.categoria,
            Descrição: d.descricao,
            Valor: d.valor
        })))
        XLSX.utils.book_append_sheet(wb, wsDespesas, 'Despesas')

        XLSX.writeFile(wb, `relatorio_${dataInicio}_${dataFim}.xlsx`)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.titulo}>Relatórios Avançados</h1>
                    <p className={styles.subtitulo}>Análise detalhada do seu negócio</p>
                </div>
                <div className={styles.actions}>
                    <Button onClick={generatePDFReport} variant="outline" className={styles.exportBtn}>
                        <FileDown size={18} className="mr-2" /> PDF
                    </Button>
                    <Button onClick={generateExcelReport} variant="outline" className={styles.exportBtn}>
                        <FileSpreadsheet size={18} className="mr-2" /> Excel
                    </Button>
                </div>
            </div>

            {/* Filtros Rápidos */}
            <div className={styles.filtros}>
                <div className={styles.filtrosRapidos}>
                    {[
                        { id: 'hoje', label: 'Hoje' },
                        { id: 'ontem', label: 'Ontem' },
                        { id: '7dias', label: '7 Dias' },
                        { id: '30dias', label: '30 Dias' },
                        { id: 'mesAtual', label: 'Este Mês' },
                        { id: 'mesPassado', label: 'Mês Passado' }
                    ].map(filtro => (
                        <button
                            key={filtro.id}
                            className={`${styles.filtroBtn} ${periodoPredefinido === filtro.id ? styles.filtroAtivo : ''}`}
                            onClick={() => aplicarFiltroPredefinido(filtro.id)}
                        >
                            {filtro.label}
                        </button>
                    ))}
                </div>
                <div className={styles.datasPersonalizadas}>
                    <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    <span className="text-gray-400">até</span>
                    <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
            </div>

            {/* KPIs */}
            <div className={styles.kpis}>
                <Card className={styles.kpiCard}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Faturamento</p>
                                <h3 className="text-2xl font-bold text-green-600">R$ {kpis.faturamento.toFixed(2)}</h3>
                            </div>
                            <div className="p-2 bg-green-100 rounded-full text-green-600">
                                <DollarSign size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={styles.kpiCard}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Lucro Líquido</p>
                                <h3 className={`text-2xl font-bold ${kpis.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    R$ {kpis.lucro.toFixed(2)}
                                </h3>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <Wallet size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={styles.kpiCard}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                                <h3 className="text-2xl font-bold text-purple-600">R$ {kpis.ticketMedio.toFixed(2)}</h3>
                            </div>
                            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={styles.kpiCard}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Pedidos</p>
                                <h3 className="text-2xl font-bold text-orange-600">{kpis.pedidos}</h3>
                            </div>
                            <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                                <ShoppingBag size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolução de Vendas */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Evolução de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {graficos.vendasPorDia.length > 0 ? (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={graficos.vendasPorDia}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="data" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                                        <Legend />
                                        <Line type="monotone" dataKey="valor" name="Vendas" stroke="#8884d8" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <TrendingUp size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Sem dados para exibir neste período</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Produtos */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Produtos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {graficos.topProdutos.length > 0 ? (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={graficos.topProdutos} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="nome" type="category" width={100} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="qtd" name="Quantidade" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <ShoppingBag size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Sem dados para exibir neste período</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Formas de Pagamento */}
                <Card>
                    <CardHeader>
                        <CardTitle>Formas de Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {graficos.formasPagamento.length > 0 ? (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={graficos.formasPagamento}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="valor"
                                        >
                                            {graficos.formasPagamento.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Wallet size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Sem dados para exibir neste período</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
