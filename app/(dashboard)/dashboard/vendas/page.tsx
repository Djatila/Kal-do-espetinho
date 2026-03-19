'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Trash2, Edit, Search, ShoppingBag, Store } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export default function VendasPage() {
    const [vendas, setVendas] = useState<any[]>([])
    const [filteredVendas, setFilteredVendas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const supabase = createClient()
    const { showToast } = useToast()
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
        isOpen: false,
        id: null
    })

    async function loadVendas() {
        setLoading(true)

        const [
            { data: vendasData, error: vendasError },
            { data: pedidosData, error: pedidosError }
        ] = await Promise.all([
            supabase
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
                .order('data', { ascending: false })
                .limit(100),
            supabase
                .from('pedidos_online')
                .select('*')
                .in('status', ['entregue', 'confirmado', 'preparando', 'pronto'])
                .order('created_at', { ascending: false })
                .limit(100)
        ])

        if (vendasError) console.error('Erro PDV:', vendasError)
        if (pedidosError) console.error('Erro Online:', pedidosError)

        const consolidated = [
            ...(vendasData || []).map(v => ({
                ...v,
                origem: 'PDV',
                data_venda: v.data,
                itens_processados: v.itens_venda
            })),
            ...(pedidosData || []).map(p => ({
                ...p,
                origem: 'Online',
                data_venda: p.created_at,
                forma_pagamento: p.metodo_pagamento || 'Online',
                // Para online, v.tipo costuma ser o metodo de entrega, mas vamos manter o padrão do filtro
                tipo: p.tipo_entrega === 'retirada' ? 'local' : 'delivery',
                itens_processados: p.itens // Formato JSON [{nome, quantidade, ...}]
            }))
        ].sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime())

        setVendas(consolidated)
        setFilteredVendas(consolidated)
        setLoading(false)
    }

    useEffect(() => {
        loadVendas()
    }, [])

    useEffect(() => {
        let filtered = [...vendas]

        if (filterType !== 'all') {
            filtered = filtered.filter(v => v.tipo === filterType)
        }

        if (startDate) {
            filtered = filtered.filter(v => new Date(v.data_venda) >= new Date(startDate))
        }
        if (endDate) {
            filtered = filtered.filter(v => new Date(v.data_venda) <= new Date(endDate + 'T23:59:59'))
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(v =>
                v.forma_pagamento?.toLowerCase().includes(term) ||
                (v.observacoes && v.observacoes.toLowerCase().includes(term)) ||
                (v.cliente_nome && v.cliente_nome.toLowerCase().includes(term))
            )
        }

        setFilteredVendas(filtered)
    }, [searchTerm, filterType, startDate, endDate, vendas])

    async function handleDelete() {
        if (!deleteModal.id) return

        const { error } = await supabase
            .from('vendas')
            .delete()
            .eq('id', deleteModal.id)

        if (error) {
            showToast('error', 'Erro ao excluir', error.message)
        } else {
            showToast('success', 'Venda excluída!', 'A venda foi removida com sucesso.')
            loadVendas()
        }

        setDeleteModal({ isOpen: false, id: null })
    }

    const totalVendas = filteredVendas.reduce((sum, v) => sum + Number(v.total || v.valor || 0), 0)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Vendas e Pedidos</h1>
                    <p className="text-muted-foreground">Histórico consolidado de todas as entradas</p>
                </div>
                <Link href="/dashboard/vendas/nova">
                    <Button>
                        <Plus size={16} className="mr-2" />
                        Nova Venda PDV
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por pagamento, cliente..."
                                className="w-full pl-10 pr-3 py-2 border border-input rounded-md text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-3 py-2 border border-input rounded-md text-sm"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">Todos os tipos</option>
                            <option value="local">Local / Retirada</option>
                            <option value="delivery">Delivery</option>
                        </select>
                        <Input
                            type="date"
                            label=""
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Data início"
                        />
                        <Input
                            type="date"
                            label=""
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="Data fim"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Movimentação ({filteredVendas.length} registros)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="p-4 font-medium text-muted-foreground">Data</th>
                                    <th className="p-4 font-medium text-muted-foreground">Origem</th>
                                    <th className="p-4 font-medium text-muted-foreground">Tipo</th>
                                    <th className="p-4 font-medium text-muted-foreground">Produtos</th>
                                    <th className="p-4 font-medium text-muted-foreground">Pagamento</th>
                                    <th className="p-4 font-medium text-muted-foreground">Valor</th>
                                    <th className="p-4 font-medium text-muted-foreground text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVendas.map((venda) => (
                                    <tr key={`${venda.origem}-${venda.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span>{new Date(venda.data_venda).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(venda.data_venda).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {venda.origem === 'Online' ? (
                                                    <Badge variant="online"><ShoppingBag size={12} className="mr-1" /> Online</Badge>
                                                ) : (
                                                    <Badge variant="pdv"><Store size={12} className="mr-1" /> PDV</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                backgroundColor: venda.tipo === 'delivery' ? '#e0f2fe' : '#dcfce7',
                                                color: venda.tipo === 'delivery' ? '#0369a1' : '#15803d'
                                            }}>
                                                {venda.tipo === 'delivery' ? 'Delivery' : 'Local'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm max-w-[200px] truncate">
                                                {venda.itens_processados && Array.isArray(venda.itens_processados) && venda.itens_processados.length > 0 ? (
                                                    venda.itens_processados.map((item: any, idx: number) => (
                                                        <div key={idx} className="truncate">
                                                            {item.quantidade}x {item.produtos?.nome || item.nome || 'Produto'}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        {venda.quantidade || 1} item(ns)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 capitalize">{venda.forma_pagamento}</td>
                                        <td className="p-4 font-medium">R$ {Number(venda.total || venda.valor || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {venda.origem === 'PDV' ? (
                                                    <>
                                                        <Link href={`/dashboard/vendas/${venda.id}/editar`}>
                                                            <Button
                                                                variant="ghost"
                                                                className="!h-8 !w-8 !p-0 !text-blue-500 hover:!text-blue-700 flex items-center justify-center shrink-0"
                                                            >
                                                                <Edit size={16} />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            className="!h-8 !w-8 !p-0 !text-red-500 hover:!text-red-700 flex items-center justify-center shrink-0"
                                                            onClick={() => setDeleteModal({ isOpen: true, id: venda.id })}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Link href={`/dashboard/pedidos?id=${venda.id}`}>
                                                        <Button variant="ghost" className="text-xs text-muted-foreground">
                                                            Ver Pedido
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredVendas.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                                    <td colSpan={5} className="p-4 text-right">Faturamento no Período:</td>
                                    <td className="p-4">R$ {totalVendas.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Excluir Venda"
                message="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setDeleteModal({ isOpen: false, id: null })}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}

function Badge({ children, variant }: { children: React.ReactNode; variant: 'online' | 'pdv' }) {
    const styles = {
        online: { bg: '#fff7ed', text: '#9a3412', border: '#ffedd5' },
        pdv: { bg: '#f0f9ff', text: '#075985', border: '#e0f2fe' }
    }
    const s = styles[variant]
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: s.bg,
            color: s.text,
            border: `1px solid ${s.border}`
        }}>
            {children}
        </span>
    )
}
