'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Edit, Trash2, X, Square } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Mesa {
    id: string
    numero_mesa: string
    status: 'livre' | 'ocupada'
}

export default function MesasPage() {
    const [mesas, setMesas] = useState<Mesa[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const supabase = createClient()
    const { showToast } = useToast()
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
        isOpen: false,
        id: null
    })

    const [formData, setFormData] = useState({
        numero_mesa: '',
        status: 'livre'
    })

    async function loadMesas() {
        setLoading(true)
        const { data, error } = await supabase
            .from('mesas')
            .select('*')
            .order('numero_mesa', { ascending: true })

        if (error) {
            showToast('error', 'Erro', 'Falha ao carregar mesas: ' + error.message)
        } else if (data) {
            setMesas(data as Mesa[])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadMesas()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.numero_mesa.trim()) {
            showToast('error', 'Atenção', 'O Número da Mesa é obrigatório.')
            return
        }

        if (editingId) {
            // Atualizar
            const { error } = await supabase
                .from('mesas')
                .update({
                    numero_mesa: formData.numero_mesa,
                    status: formData.status
                })
                .eq('id', editingId)

            if (error) {
                showToast('error', 'Erro ao atualizar', error.message)
            } else {
                showToast('success', 'Mesa atualizada!', 'Os dados foram atualizados com sucesso.')
                resetForm()
                loadMesas()
            }
        } else {
            // Criar
            const { error } = await supabase
                .from('mesas')
                .insert({
                    numero_mesa: formData.numero_mesa,
                    status: formData.status
                })

            if (error) {
                // Handle duplicate unique constraint gracefully if possible
                if (error.code === '23505') {
                    showToast('error', 'Erro', 'Já existe uma mesa cadastrada com esse número.')
                } else {
                    showToast('error', 'Erro ao cadastrar', error.message)
                }
            } else {
                showToast('success', 'Mesa cadastrada!', 'A mesa foi adicionada com sucesso.')
                resetForm()
                loadMesas()
            }
        }
    }

    const handleEdit = (mesa: Mesa) => {
        setFormData({
            numero_mesa: mesa.numero_mesa,
            status: mesa.status
        })
        setEditingId(mesa.id)
        setShowForm(true)
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return

        const { error } = await supabase
            .from('mesas')
            .delete()
            .eq('id', deleteModal.id)

        if (error) {
            showToast('error', 'Erro ao excluir', error.message)
        } else {
            showToast('success', 'Mesa excluída!', 'A mesa foi removida com sucesso.')
            loadMesas()
        }

        setDeleteModal({ isOpen: false, id: null })
    }

    const resetForm = () => {
        setFormData({
            numero_mesa: '',
            status: 'livre'
        })
        setEditingId(null)
        setShowForm(false)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Mesas</h1>
                    <p className="text-muted-foreground">Gerencie as mesas do estabelecimento</p>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)}>
                        <Plus size={16} className="mr-2" />
                        Nova Mesa
                    </Button>
                )}
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>{editingId ? 'Editar Mesa' : 'Nova Mesa'}</CardTitle>
                            <Button variant="ghost" onClick={resetForm}>
                                <X size={20} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Número/Nome da Mesa"
                                    value={formData.numero_mesa}
                                    onChange={(e) => setFormData({ ...formData, numero_mesa: e.target.value })}
                                    placeholder="Ex: 01, 02, Varanda"
                                    required
                                />
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status Atual</label>
                                    <select
                                        className="w-full p-2 border rounded-md"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'livre' | 'ocupada' })}
                                    >
                                        <option value="livre">Livre</option>
                                        <option value="ocupada">Ocupada</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit">
                                    {editingId ? 'Atualizar Mesa' : 'Salvar Mesa'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="text-left p-4 font-medium text-muted-foreground w-16">Icone</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Mesa</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">Carregando...</td>
                                    </tr>
                                )}
                                {!loading && mesas.map((mesa) => (
                                    <tr key={mesa.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                        <td className="p-4">
                                            <div className={`p-2 rounded-md inline-flex ${mesa.status === 'livre' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                <Square size={20} />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-medium text-lg">Mesa {mesa.numero_mesa}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${mesa.status === 'livre' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {mesa.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    className="!h-8 !w-8 !p-0 !text-blue-500 hover:!text-blue-700 flex items-center justify-center shrink-0"
                                                    onClick={() => handleEdit(mesa)}
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="!h-8 !w-8 !p-0 !text-red-500 hover:!text-red-700 flex items-center justify-center shrink-0"
                                                    onClick={() => setDeleteModal({ isOpen: true, id: mesa.id })}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && mesas.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                            Nenhuma mesa cadastrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Excluir Mesa"
                message="Tem certeza que deseja excluir esta mesa? Esta ação não pode ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setDeleteModal({ isOpen: false, id: null })}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
