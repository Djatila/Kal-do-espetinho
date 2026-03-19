'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Trash2, Edit, Search } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export default function DespesasPage() {
    const [despesas, setDespesas] = useState<any[]>([])
    const [filteredDespesas, setFilteredDespesas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [categorias, setCategorias] = useState<string[]>([])
    const supabase = createClient()
    const { showToast } = useToast()
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
        isOpen: false,
        id: null
    })

    async function loadDespesas() {
        setLoading(true)
        const { data } = await supabase
            .from('despesas')
            .select('*')
            .order('data', { ascending: false })
            .limit(100)

        setDespesas(data || [])
        setFilteredDespesas(data || [])

        const uniqueCategories = [...new Set(data?.map(d => d.categoria) || [])]
        setCategorias(uniqueCategories)

        setLoading(false)
    }

    useEffect(() => {
        loadDespesas()
    }, [])

    useEffect(() => {
        let filtered = [...despesas]

        if (filterCategory !== 'all') {
            filtered = filtered.filter(d => d.categoria === filterCategory)
        }

        if (startDate) {
            filtered = filtered.filter(d => new Date(d.data) >= new Date(startDate))
        }
        if (endDate) {
            filtered = filtered.filter(d => new Date(d.data) <= new Date(endDate + 'T23:59:59'))
        }

        if (searchTerm) {
            filtered = filtered.filter(d =>
                d.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.fornecedor && d.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        setFilteredDespesas(filtered)
    }, [searchTerm, filterCategory, startDate, endDate, despesas])

    async function handleDelete() {
        if (!deleteModal.id) return

        const { error } = await supabase
            .from('despesas')
            .delete()
            .eq('id', deleteModal.id)

        if (error) {
            showToast('error', 'Erro ao excluir', error.message)
        } else {
            showToast('success', 'Despesa excluída!', 'A despesa foi removida com sucesso.')
            loadDespesas()
        }

        setDeleteModal({ isOpen: false, id: null })
    }

    const totalDespesas = filteredDespesas.reduce((sum, d) => sum + Number(d.valor || 0), 0)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Despesas</h1>
                    <p className="text-muted-foreground">Controle os gastos do restaurante</p>
                </div>
                <Link href="/dashboard/despesas/nova">
                    <Button variant="destructive">
                        <Plus size={16} className="mr-2" />
                        Nova Despesa
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
                                placeholder="Buscar..."
                                className="w-full pl-10 pr-3 py-2 border border-input rounded-md text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-3 py-2 border border-input rounded-md text-sm"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="all">Todas as categorias</option>
                            {categorias.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
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
                    <CardTitle>Histórico de Despesas ({filteredDespesas.length} registros)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="p-4 font-medium text-muted-foreground">Data</th>
                                    <th className="p-4 font-medium text-muted-foreground">Categoria</th>
                                    <th className="p-4 font-medium text-muted-foreground">Descrição</th>
                                    <th className="p-4 font-medium text-muted-foreground">Fornecedor</th>
                                    <th className="p-4 font-medium text-muted-foreground">Valor</th>
                                    <th className="p-4 font-medium text-muted-foreground">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDespesas.map((despesa) => (
                                    <tr key={despesa.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="p-4">{new Date(despesa.data).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                backgroundColor: '#fee2e2',
                                                color: '#991b1b'
                                            }}>
                                                {despesa.categoria}
                                            </span>
                                        </td>
                                        <td className="p-4">{despesa.descricao}</td>
                                        <td className="p-4">{despesa.fornecedor || '-'}</td>
                                        <td className="p-4 font-medium">R$ {despesa.valor.toFixed(2)}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Link href={`/dashboard/despesas/${despesa.id}/editar`}>
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
                                                    onClick={() => setDeleteModal({ isOpen: true, id: despesa.id })}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredDespesas.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Nenhuma despesa encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                                    <td colSpan={4} className="p-4 text-right">Total:</td>
                                    <td className="p-4">R$ {totalDespesas.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Excluir Despesa"
                message="Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setDeleteModal({ isOpen: false, id: null })}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
