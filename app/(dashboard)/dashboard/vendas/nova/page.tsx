'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'

interface ItemVenda {
    produto_id: string
    produto_nome: string
    quantidade: number
    preco_unitario: number
    subtotal: number
    observacoes: string
}

export default function NovaVendaPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const { showToast } = useToast()
    const [clientes, setClientes] = useState<any[]>([])
    const [produtos, setProdutos] = useState<any[]>([])
    const [itens, setItens] = useState<ItemVenda[]>([])
    const [taxaEntregaPadrao, setTaxaEntregaPadrao] = useState<number>(0)

    const [formData, setFormData] = useState({
        tipo: 'local',
        forma_pagamento: 'dinheiro',
        observacoes: '',
        cliente_id: '',
        taxa_entrega: 0
    })

    const [novoItem, setNovoItem] = useState({
        produto_id: '',
        quantidade: 1,
        observacoes: ''
    })

    useEffect(() => {
        loadClientes()
        loadProdutos()
        loadTaxaEntregaPadrao()
    }, [])

    async function loadTaxaEntregaPadrao() {
        const { data: config } = await supabase
            .from('configuracoes')
            .select('taxa_entrega_padrao')
            .single()

        if (config?.taxa_entrega_padrao) {
            setTaxaEntregaPadrao(config.taxa_entrega_padrao)
        }
    }

    async function loadClientes() {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .order('nome')

        if (!error) {
            setClientes(data || [])
        }
    }

    async function loadProdutos() {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true)
            .order('categoria')
            .order('nome')

        if (!error) {
            setProdutos(data || [])
        }
    }

    // Atualizar taxa de entrega quando o tipo mudar para delivery
    useEffect(() => {
        if (formData.tipo === 'delivery' && taxaEntregaPadrao > 0 && formData.taxa_entrega === 0) {
            setFormData(prev => ({ ...prev, taxa_entrega: taxaEntregaPadrao }))
        } else if (formData.tipo === 'local') {
            setFormData(prev => ({ ...prev, taxa_entrega: 0 }))
        }
    }, [formData.tipo, taxaEntregaPadrao])


    function adicionarItem() {
        if (!novoItem.produto_id) {
            showToast('error', 'Produto obrigatório', 'Selecione um produto para adicionar.')
            return
        }

        const produto = produtos.find(p => p.id === novoItem.produto_id)
        if (!produto) return

        const item: ItemVenda = {
            produto_id: produto.id,
            produto_nome: produto.nome,
            quantidade: novoItem.quantidade,
            preco_unitario: produto.preco,
            subtotal: novoItem.quantidade * produto.preco,
            observacoes: novoItem.observacoes
        }

        setItens([...itens, item])
        setNovoItem({ produto_id: '', quantidade: 1, observacoes: '' })
    }

    function removerItem(index: number) {
        setItens(itens.filter((_, i) => i !== index))
    }

    const totalVenda = itens.reduce((sum, item) => sum + item.subtotal, 0)
    const totalComEntrega = totalVenda + (formData.tipo === 'delivery' ? formData.taxa_entrega : 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (itens.length === 0) {
            showToast('error', 'Adicione produtos', 'Adicione pelo menos um produto à venda.')
            return
        }

        if (formData.tipo === 'delivery' && !formData.cliente_id) {
            showToast('error', 'Cliente obrigatório', 'Para vendas delivery, selecione um cliente.')
            return
        }

        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        // Inserir venda
        const { data: vendaData, error: vendaError } = await supabase
            .from('vendas')
            .insert({
                tipo: formData.tipo as 'local' | 'delivery',
                forma_pagamento: formData.forma_pagamento,
                quantidade: itens.reduce((sum, item) => sum + item.quantidade, 0),
                valor: totalComEntrega,
                total: totalComEntrega,
                taxa_entrega: formData.tipo === 'delivery' ? formData.taxa_entrega : 0,
                observacoes: formData.observacoes,
                cliente_id: formData.cliente_id || null,
                criado_por: user?.id,
                data: new Date().toISOString()
            })
            .select()
            .single()

        if (vendaError) {
            showToast('error', 'Erro ao salvar venda', vendaError.message)
            setLoading(false)
            return
        }

        // Inserir itens da venda
        const itensParaInserir = itens.map(item => ({
            venda_id: vendaData.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            observacoes: item.observacoes || null
        }))

        // Debug: verificar os dados antes de inserir
        console.log('Itens para inserir:', itensParaInserir)
        console.log('Produtos disponíveis:', produtos.map(p => ({ id: p.id, nome: p.nome })))

        const { error: itensError } = await supabase
            .from('itens_venda')
            .insert(itensParaInserir)

        if (itensError) {
            showToast('error', 'Erro ao salvar itens', itensError.message)
            setLoading(false)
        } else {
            showToast('success', 'Venda cadastrada!', 'A venda foi registrada com sucesso.')
            router.push('/dashboard/vendas')
            router.refresh()
        }
    }

    const produtoSelecionado = produtos.find(p => p.id === novoItem.produto_id)

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/vendas">
                    <Button variant="ghost">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Nova Venda</h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Informações da Venda */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informações da Venda</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Tipo</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                >
                                    <option value="local">Consumo Local</option>
                                    <option value="delivery">Delivery</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Pagamento</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.forma_pagamento}
                                    onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                                >
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="pix">PIX</option>
                                    <option value="cartao_credito">Cartão de Crédito</option>
                                    <option value="cartao_debito">Cartão de Débito</option>
                                </select>
                            </div>
                        </div>

                        {/* Campo Cliente */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">
                                Cliente {formData.tipo === 'delivery' && <span className="text-red-500">*</span>}
                                {formData.tipo === 'local' && <span className="text-muted-foreground text-xs">(Opcional - para fidelização)</span>}
                            </label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.cliente_id}
                                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                                required={formData.tipo === 'delivery'}
                            >
                                <option value="">{formData.tipo === 'delivery' ? 'Selecione um cliente' : 'Nenhum (venda avulsa)'}</option>
                                {clientes.map((cliente) => (
                                    <option key={cliente.id} value={cliente.id}>
                                        {cliente.nome} - {cliente.telefone}
                                    </option>
                                ))}
                            </select>
                            {formData.tipo === 'delivery' && (
                                <div className="flex justify-end">
                                    <Link href="/dashboard/clientes" className="text-xs text-primary hover:underline">
                                        ➕ Cadastrar novo cliente
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Campo Taxa de Entrega - Apenas para Delivery */}
                        {formData.tipo === 'delivery' && (
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">
                                    Taxa de Entrega (R$)
                                    <span className="text-muted-foreground text-xs ml-2">
                                        (Padrão: R$ {taxaEntregaPadrao.toFixed(2)})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.taxa_entrega}
                                    onChange={(e) => setFormData({ ...formData, taxa_entrega: Number(e.target.value) })}
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Observações</label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.observacoes}
                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                placeholder="Observações gerais da venda..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Adicionar Produtos */}
                <Card>
                    <CardHeader>
                        <CardTitle>Produtos</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6 flex flex-col gap-2">
                                <label className="text-sm font-medium">Produto</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={novoItem.produto_id}
                                    onChange={(e) => setNovoItem({ ...novoItem, produto_id: e.target.value })}
                                >
                                    <option value="">Selecione um produto</option>
                                    {produtos.map((produto) => (
                                        <option key={produto.id} value={produto.id}>
                                            {produto.nome} - R$ {Number(produto.preco).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 flex flex-col gap-2">
                                <label className="text-sm font-medium">Qtd</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={novoItem.quantidade}
                                    onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })}
                                />
                            </div>

                            <div className="col-span-3 flex flex-col gap-2">
                                <label className="text-sm font-medium">Subtotal</label>
                                <input
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                                    value={produtoSelecionado ? `R$ ${(produtoSelecionado.preco * novoItem.quantidade).toFixed(2)}` : 'R$ 0,00'}
                                    disabled
                                />
                            </div>

                            <div className="col-span-1 flex items-end">
                                <Button type="button" onClick={adicionarItem} className="w-full">
                                    <Plus size={16} />
                                </Button>
                            </div>
                        </div>

                        {/* Lista de Itens */}
                        {itens.length > 0 && (
                            <div className="mt-4">
                                <div className="border rounded-md">
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
                                                <th className="p-3 text-left text-sm font-medium">Produto</th>
                                                <th className="p-3 text-center text-sm font-medium">Qtd</th>
                                                <th className="p-3 text-right text-sm font-medium">Preço Unit.</th>
                                                <th className="p-3 text-right text-sm font-medium">Subtotal</th>
                                                <th className="p-3 text-center text-sm font-medium">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itens.map((item, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td className="p-3 text-sm">{item.produto_nome}</td>
                                                    <td className="p-3 text-center text-sm">{item.quantidade}</td>
                                                    <td className="p-3 text-right text-sm">R$ {item.preco_unitario.toFixed(2)}</td>
                                                    <td className="p-3 text-right text-sm font-medium">R$ {item.subtotal.toFixed(2)}</td>
                                                    <td className="p-3 text-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className="!h-8 !w-8 !p-0 !text-red-500 hover:!text-red-700 flex items-center justify-center shrink-0"
                                                            onClick={() => removerItem(index)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr style={{ borderTop: '2px solid var(--border)' }}>
                                                <td colSpan={3} className="p-3 text-right font-medium">Subtotal Produtos:</td>
                                                <td className="p-3 text-right font-medium">R$ {totalVenda.toFixed(2)}</td>
                                                <td></td>
                                            </tr>
                                            {formData.tipo === 'delivery' && formData.taxa_entrega > 0 && (
                                                <tr>
                                                    <td colSpan={3} className="p-3 text-right font-medium">Taxa de Entrega:</td>
                                                    <td className="p-3 text-right font-medium">R$ {formData.taxa_entrega.toFixed(2)}</td>
                                                    <td></td>
                                                </tr>
                                            )}
                                            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                                                <td colSpan={3} className="p-3 text-right">Total Final:</td>
                                                <td className="p-3 text-right text-lg">R$ {totalComEntrega.toFixed(2)}</td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {itens.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Nenhum produto adicionado. Selecione produtos acima para adicionar à venda.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Link href="/dashboard/vendas">
                        <Button type="button" variant="secondary">Cancelar</Button>
                    </Link>
                    <Button type="submit" disabled={loading || itens.length === 0}>
                        {loading ? 'Salvando...' : 'Salvar Venda'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
