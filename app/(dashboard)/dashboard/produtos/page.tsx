'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Edit, Power, PowerOff, Search, Trash } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export default function ProdutosPage() {
    const [produtos, setProdutos] = useState<any[]>([])
    const [filteredProdutos, setFilteredProdutos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategoria, setFilterCategoria] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [productToDelete, setProductToDelete] = useState<string | null>(null)
    const supabase = createClient()
    const { showToast } = useToast()

    async function loadProdutos() {
        setLoading(true)
        const { data } = await supabase
            .from('produtos')
            .select('*')
            .order('categoria')
            .order('nome')

        setProdutos(data || [])
        setFilteredProdutos(data || [])
        setLoading(false)
    }

    useEffect(() => {
        loadProdutos()
    }, [])

    useEffect(() => {
        let filtered = [...produtos]

        if (filterCategoria !== 'all') {
            filtered = filtered.filter(p => p.categoria === filterCategoria)
        }

        if (filterStatus === 'ativo') {
            filtered = filtered.filter(p => p.ativo === true)
        } else if (filterStatus === 'inativo') {
            filtered = filtered.filter(p => p.ativo === false)
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.descricao && p.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        setFilteredProdutos(filtered)
    }, [searchTerm, filterCategoria, filterStatus, produtos])

    async function toggleAtivo(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from('produtos')
            .update({ ativo: !currentStatus })
            .eq('id', id)

        if (error) {
            showToast('error', 'Erro ao atualizar', error.message)
        } else {
            showToast('success', 'Status atualizado!', `Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`)
            loadProdutos()
        }
    }

    function handleDeleteClick(id: string) {
        setProductToDelete(id)
        setDeleteModalOpen(true)
    }

    async function confirmDelete() {
        if (!productToDelete) return

        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', productToDelete)

        if (error) {
            showToast('error', 'Erro ao excluir', error.message)
        } else {
            showToast('success', 'Produto excluído', 'O produto foi removido com sucesso.')
            loadProdutos()
        }
        setDeleteModalOpen(false)
        setProductToDelete(null)
    }

    function cancelDelete() {
        setDeleteModalOpen(false)
        setProductToDelete(null)
    }

    const categorias = Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean)))

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Produtos</h1>
                    <p className="text-muted-foreground">Gerencie os itens disponíveis para venda</p>
                </div>
                <Link href="/dashboard/produtos/novo">
                    <Button>
                        <Plus size={16} className="mr-2" />
                        Novo Produto
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                className="w-full pl-10 pr-3 py-2 border border-input rounded-md text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-3 py-2 border border-input rounded-md text-sm"
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                        >
                            <option value="all">Todas as categorias</option>
                            {categorias.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            className="px-3 py-2 border border-input rounded-md text-sm"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Todos os status</option>
                            <option value="ativo">Ativos</option>
                            <option value="inativo">Inativos</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Produtos ({filteredProdutos.length} itens)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="p-4 font-medium text-muted-foreground">Nome</th>
                                    <th className="p-4 font-medium text-muted-foreground">Categoria</th>
                                    <th className="p-4 font-medium text-muted-foreground">Preço</th>
                                    <th className="p-4 font-medium text-muted-foreground">Status</th>
                                    <th className="p-4 font-medium text-muted-foreground">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProdutos.map((produto) => (
                                    <tr key={produto.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="p-4">
                                            <div>
                                                <div className="font-medium">{produto.nome}</div>
                                                {produto.descricao && (
                                                    <div className="text-sm text-muted-foreground">{produto.descricao}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                backgroundColor: '#f3f4f6',
                                                color: '#374151'
                                            }}>
                                                {produto.categoria || 'Sem categoria'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium">R$ {Number(produto.preco).toFixed(2)}</td>
                                        <td className="p-4">
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                backgroundColor: produto.ativo ? '#dcfce7' : '#fee2e2',
                                                color: produto.ativo ? '#15803d' : '#991b1b'
                                            }}>
                                                {produto.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Link href={`/dashboard/produtos/${produto.id}/editar`}>
                                                    <Button
                                                        variant="ghost"
                                                        className="!h-8 !w-8 !p-0 !text-blue-500 hover:!text-blue-700 flex items-center justify-center shrink-0"
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    className={`!h-8 !w-8 !p-0 flex items-center justify-center shrink-0 ${produto.ativo ? '!text-orange-500 hover:!text-orange-700' : '!text-green-500 hover:!text-green-700'}`}
                                                    onClick={() => toggleAtivo(produto.id, produto.ativo)}
                                                    title={produto.ativo ? 'Desativar' : 'Ativar'}
                                                >
                                                    {produto.ativo ? <PowerOff size={16} /> : <Power size={16} />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="!h-8 !w-8 !p-0 !text-red-500 hover:!text-red-700 flex items-center justify-center shrink-0"
                                                    onClick={() => handleDeleteClick(produto.id)}
                                                    title="Excluir"
                                                >
                                                    <Trash size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProdutos.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Nenhum produto encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Excluir Produto"
                message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
