'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { DollarSign, TrendingDown, TrendingUp, Sparkles, Users, Package, ShoppingCart, Award } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import styles from './page.module.css'

interface DashboardData {
    entrada_total: number
    saida_total: number
    saldo_do_dia: number
}

interface VendasPorDia {
    data: string
    total: number
}

interface DespesasPorCategoria {
    categoria: string
    total: number
}

interface VendasPorTipo {
    tipo: string
    total: number
    quantidade: number
}

interface ProdutoMaisVendido {
    nome: string
    quantidade: number
    total: number
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6']

export default function DashboardPage() {
    const [dashboardData, setDashboardData] = useState<DashboardData>({ entrada_total: 0, saida_total: 0, saldo_do_dia: 0 })
    const [vendasPorDia, setVendasPorDia] = useState<VendasPorDia[]>([])
    const [despesasPorCategoria, setDespesasPorCategoria] = useState<DespesasPorCategoria[]>([])
    const [vendasPorTipo, setVendasPorTipo] = useState<VendasPorTipo[]>([])
    const [topProdutos, setTopProdutos] = useState<ProdutoMaisVendido[]>([])
    const [totalClientes, setTotalClientes] = useState(0)
    const [totalProdutos, setTotalProdutos] = useState(0)
    const [ticketMedio, setTicketMedio] = useState(0)
    const [totalVendasMes, setTotalVendasMes] = useState(0)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const now = new Date()
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

            // Buscar vendas de hoje (Manuais)
            const { data: vendasHoje } = await supabase
                .from('vendas')
                .select('total, valor, quantidade')
                .gte('data', startOfToday)
                .lte('data', endOfToday)

            // Buscar pedidos online de hoje (Online)
            const { data: pedidosOnlineHoje } = await supabase
                .from('pedidos_online')
                .select('total')
                .gte('created_at', startOfToday)
                .lte('created_at', endOfToday)
                .in('status', ['entregue', 'confirmado', 'preparando', 'pronto'])

            let entradaTotal = 0

            // Somar vendas manuais
            vendasHoje?.forEach(venda => {
                entradaTotal += Number(venda.total || (venda.quantidade * venda.valor) || 0)
            })

            // Somar pedidos online
            pedidosOnlineHoje?.forEach(pedido => {
                entradaTotal += Number(pedido.total || 0)
            })

            // Buscar despesas de hoje
            const { data: despesasHoje } = await supabase
                .from('despesas')
                .select('valor')
                .gte('data', startOfToday)
                .lte('data', endOfToday)

            let saidaTotal = 0
            despesasHoje?.forEach(despesa => {
                saidaTotal += Number(despesa.valor || 0)
            })

            setDashboardData({
                entrada_total: entradaTotal,
                saida_total: saidaTotal,
                saldo_do_dia: entradaTotal - saidaTotal
            })

            // Buscar vendas dos últimos 7 dias (Manuais e Online)
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setHours(0, 0, 0, 0)
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const sevenDaysAgoIso = sevenDaysAgo.toISOString()

            const [{ data: vendas7d }, { data: pedidos7d }] = await Promise.all([
                supabase.from('vendas').select('data, total, valor, quantidade').gte('data', sevenDaysAgoIso),
                supabase.from('pedidos_online').select('created_at, total').gte('created_at', sevenDaysAgoIso).in('status', ['entregue', 'confirmado', 'preparando', 'pronto'])
            ])

            // Agrupar vendas por dia
            const vendasAgrupadas: { [key: string]: number } = {}

            vendas7d?.forEach(venda => {
                const dia = new Date(venda.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                const valorVenda = venda.total || (venda.quantidade * venda.valor) || 0
                vendasAgrupadas[dia] = (vendasAgrupadas[dia] || 0) + Number(valorVenda)
            })

            pedidos7d?.forEach(pedido => {
                const dia = new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                vendasAgrupadas[dia] = (vendasAgrupadas[dia] || 0) + Number(pedido.total || 0)
            })

            setVendasPorDia(Object.entries(vendasAgrupadas).map(([data, total]) => ({ data, total })).sort((a, b) => {
                const [dayA, monthA] = a.data.split('/')
                const [dayB, monthB] = b.data.split('/')
                return new Date(2026, Number(monthA) - 1, Number(dayA)).getTime() - new Date(2026, Number(monthB) - 1, Number(dayB)).getTime()
            }))

            // Buscar despesas por categoria (últimos 30 dias)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { data: despesas } = await supabase
                .from('despesas')
                .select('categoria, valor')
                .gte('data', thirtyDaysAgo.toISOString())

            // Agrupar despesas por categoria
            const despesasAgrupadas: { [key: string]: number } = {}
            despesas?.forEach(despesa => {
                despesasAgrupadas[despesa.categoria] = (despesasAgrupadas[despesa.categoria] || 0) + Number(despesa.valor || 0)
            })

            setDespesasPorCategoria(Object.entries(despesasAgrupadas).map(([categoria, total]) => ({ categoria, total })))

            // Buscar total de clientes
            const { count: clientesCount } = await supabase
                .from('clientes')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ativo')

            setTotalClientes(clientesCount || 0)

            // Buscar total de produtos ativos
            const { count: produtosCount } = await supabase
                .from('produtos')
                .select('*', { count: 'exact', head: true })
                .eq('ativo', true)

            setTotalProdutos(produtosCount || 0)

            // Buscar vendas por tipo (local vs delivery) - últimos 30 dias
            const [{ data: vendasTipo }, { data: pedidosTipo }] = await Promise.all([
                supabase.from('vendas').select('tipo, total, valor, quantidade').gte('data', thirtyDaysAgo.toISOString()),
                supabase.from('pedidos_online').select('tipo_entrega, total').gte('created_at', thirtyDaysAgo.toISOString()).in('status', ['entregue', 'confirmado', 'preparando', 'pronto'])
            ])

            const tipoAgrupado: { [key: string]: { total: number, quantidade: number } } = {}

            vendasTipo?.forEach(venda => {
                const tipo = venda.tipo || 'local'
                const valorVenda = venda.total || (venda.quantidade * venda.valor) || 0
                if (!tipoAgrupado[tipo]) {
                    tipoAgrupado[tipo] = { total: 0, quantidade: 0 }
                }
                tipoAgrupado[tipo].total += Number(valorVenda)
                tipoAgrupado[tipo].quantidade += 1
            })

            pedidosTipo?.forEach(pedido => {
                const tipo = pedido.tipo_entrega === 'delivery' ? 'delivery' : 'retirada'
                if (!tipoAgrupado[tipo]) {
                    tipoAgrupado[tipo] = { total: 0, quantidade: 0 }
                }
                tipoAgrupado[tipo].total += Number(pedido.total || 0)
                tipoAgrupado[tipo].quantidade += 1
            })

            setVendasPorTipo(Object.entries(tipoAgrupado).map(([tipo, dados]) => ({
                tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
                total: dados.total,
                quantidade: dados.quantidade
            })))

            // Calcular ticket médio do mês (Manuais e Online)
            const firstDayOfMonth = new Date()
            firstDayOfMonth.setDate(1)
            firstDayOfMonth.setHours(0, 0, 0, 0)
            const firstDayIso = firstDayOfMonth.toISOString()

            const [{ data: vendasMes }, { data: pedidosMes }] = await Promise.all([
                supabase.from('vendas').select('total, valor, quantidade').gte('data', firstDayIso),
                supabase.from('pedidos_online').select('total').gte('created_at', firstDayIso).in('status', ['entregue', 'confirmado', 'preparando', 'pronto'])
            ])

            let totalMes = 0
            let countMes = 0

            vendasMes?.forEach(venda => {
                const valorVenda = venda.total || (venda.quantidade * venda.valor) || 0
                totalMes += Number(valorVenda)
                countMes += 1
            })

            pedidosMes?.forEach(pedido => {
                totalMes += Number(pedido.total || 0)
                countMes += 1
            })

            setTotalVendasMes(totalMes)
            setTicketMedio(countMes > 0 ? totalMes / countMes : 0)

            // Buscar top 5 produtos mais vendidos (últimos 30 dias - Manuais e Online)
            const [{ data: itensVenda }, { data: pedidosProdutos }] = await Promise.all([
                supabase.from('itens_venda').select('quantidade, subtotal, produtos (nome)').gte('created_at', thirtyDaysAgo.toISOString()),
                supabase.from('pedidos_online').select('itens').gte('created_at', thirtyDaysAgo.toISOString()).in('status', ['entregue', 'confirmado', 'preparando', 'pronto'])
            ])

            // Agrupar por produto
            const produtosAgrupados: { [key: string]: { nome: string, quantidade: number, total: number } } = {}

            // Do itens_venda (vendas manuais)
            itensVenda?.forEach((item: any) => {
                const produtoNome = item.produtos?.nome || 'Produto Desconhecido'
                if (!produtosAgrupados[produtoNome]) {
                    produtosAgrupados[produtoNome] = { nome: produtoNome, quantidade: 0, total: 0 }
                }
                produtosAgrupados[produtoNome].quantidade += Number(item.quantidade || 0)
                produtosAgrupados[produtoNome].total += Number(item.subtotal || 0)
            })

            // Do pedidos_online (vendas automáticas)
            pedidosProdutos?.forEach((pedido: any) => {
                const itens = Array.isArray(pedido.itens) ? pedido.itens : []
                itens.forEach((item: any) => {
                    const produtoNome = item.nome || 'Produto Desconhecido'
                    if (!produtosAgrupados[produtoNome]) {
                        produtosAgrupados[produtoNome] = { nome: produtoNome, quantidade: 0, total: 0 }
                    }
                    produtosAgrupados[produtoNome].quantidade += Number(item.quantidade || 0)
                    produtosAgrupados[produtoNome].total += Number(item.subtotal || 0)
                })
            })

            const topProdutosArray = Object.values(produtosAgrupados)
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 5)

            setTopProdutos(topProdutosArray)

            setLoading(false)
        }

        loadData()
    }, [])

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>Carregando seus dados...</p>
                </div>
                <div className={styles.statsGrid}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className={styles.loadingCard}>
                            <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    <Sparkles size={32} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Dashboard
                </h1>
                <p className={styles.subtitle}>Resumo financeiro de hoje • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>

            {/* Primeira linha de cards - Métricas financeiras do dia */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <h3 className={styles.statCardTitle}>Vendas Hoje</h3>
                        <div className={`${styles.statCardIcon} ${styles.iconGreen}`}>
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className={styles.statCardValue}>
                        R$ {Number(dashboardData.entrada_total).toFixed(2)}
                    </div>
                    <p className={styles.statCardDescription}>
                        Entradas confirmadas
                    </p>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <h3 className={styles.statCardTitle}>Despesas Hoje</h3>
                        <div className={`${styles.statCardIcon} ${styles.iconRed}`}>
                            <TrendingDown size={24} />
                        </div>
                    </div>
                    <div className={styles.statCardValue}>
                        R$ {Number(dashboardData.saida_total).toFixed(2)}
                    </div>
                    <p className={styles.statCardDescription}>
                        Saídas registradas
                    </p>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <h3 className={styles.statCardTitle}>Lucro do Dia</h3>
                        <div className={`${styles.statCardIcon} ${styles.iconBlue}`}>
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div
                        className={styles.statCardValue}
                        style={{
                            WebkitTextFillColor: dashboardData.saldo_do_dia >= 0 ? '#22c55e' : '#ef4444',
                            backgroundImage: 'none'
                        }}
                    >
                        R$ {Number(dashboardData.saldo_do_dia).toFixed(2)}
                    </div>
                    <p className={styles.statCardDescription}>
                        {dashboardData.saldo_do_dia >= 0 ? 'Balanço positivo' : 'Balanço negativo'}
                    </p>
                </div>
            </div>

            {/* Segunda linha de cards - Métricas gerais */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <h3 className={styles.statCardTitle}>Clientes Ativos</h3>
                        <div className={`${styles.statCardIcon} ${styles.iconPurple}`}>
                            <Users size={24} />
                        </div>
                    </div>
                    <div className={styles.statCardValue}>
                        {totalClientes}
                    </div>
                    <p className={styles.statCardDescription}>
                        Total de clientes cadastrados
                    </p>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <h3 className={styles.statCardTitle}>Produtos Ativos</h3>
                        <div className={`${styles.statCardIcon} ${styles.iconOrange}`}>
                            <Package size={24} />
                        </div>
                    </div>
                    <div className={styles.statCardValue}>
                        {totalProdutos}
                    </div>
                    <p className={styles.statCardDescription}>
                        Disponíveis no cardápio
                    </p>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <h3 className={styles.statCardTitle}>Ticket Médio</h3>
                        <div className={`${styles.statCardIcon} ${styles.iconCyan}`}>
                            <ShoppingCart size={24} />
                        </div>
                    </div>
                    <div className={styles.statCardValue}>
                        R$ {ticketMedio.toFixed(2)}
                    </div>
                    <p className={styles.statCardDescription}>
                        Valor médio por venda este mês
                    </p>
                </div>
            </div>

            {/* Gráficos */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>Vendas dos Últimos 7 Dias</h2>
                    </div>
                    <div className={styles.chartContent}>
                        {mounted && vendasPorDia.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={vendasPorDia}>
                                    <defs>
                                        <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                    <XAxis
                                        dataKey="data"
                                        stroke="var(--muted-foreground)"
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                    <YAxis
                                        stroke="var(--muted-foreground)"
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                    <Tooltip
                                        formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                                        contentStyle={{
                                            backgroundColor: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.5rem',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        fill="url(#colorVendas)"
                                        name="Vendas"
                                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>Nenhuma venda nos últimos 7 dias</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>Despesas por Categoria (30 dias)</h2>
                    </div>
                    <div className={styles.chartContent}>
                        {mounted && despesasPorCategoria.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={despesasPorCategoria as any}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.categoria} (${((entry.percent || 0) * 100).toFixed(0)}%)`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="total"
                                        animationBegin={0}
                                        animationDuration={800}
                                    >
                                        {despesasPorCategoria.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                                        contentStyle={{
                                            backgroundColor: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.5rem',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>Nenhuma despesa nos últimos 30 dias</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>Vendas por Tipo (30 dias)</h2>
                    </div>
                    <div className={styles.chartContent}>
                        {mounted && vendasPorTipo.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={vendasPorTipo}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                    <XAxis
                                        dataKey="tipo"
                                        stroke="var(--muted-foreground)"
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                    <YAxis
                                        stroke="var(--muted-foreground)"
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === 'total') return `R$ ${Number(value).toFixed(2)}`
                                            return value
                                        }}
                                        contentStyle={{
                                            backgroundColor: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.5rem',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="total" fill="#3b82f6" name="Valor Total" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="quantidade" fill="#f59e0b" name="Quantidade" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>Nenhuma venda nos últimos 30 dias</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>
                            <Award size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
                            Top 5 Produtos Mais Vendidos
                        </h2>
                    </div>
                    <div className={styles.chartContent}>
                        {mounted && topProdutos.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topProdutos} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                    <XAxis
                                        type="number"
                                        stroke="var(--muted-foreground)"
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="nome"
                                        stroke="var(--muted-foreground)"
                                        style={{ fontSize: '0.875rem' }}
                                        width={120}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === 'total') return `R$ ${Number(value).toFixed(2)}`
                                            return `${value} unidades`
                                        }}
                                        contentStyle={{
                                            backgroundColor: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.5rem',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="quantidade" fill="#22c55e" name="Quantidade" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>Nenhum produto vendido ainda</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
