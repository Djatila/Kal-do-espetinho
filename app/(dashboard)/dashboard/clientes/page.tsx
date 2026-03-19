'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Edit, Trash2, Phone, MapPin, Save, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([])
    const [resumoPagamentos, setResumoPagamentos] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [filtroTipo, setFiltroTipo] = useState<'todos' | 'credito' | 'informal'>('todos')
    const supabase = createClient()
    const { showToast } = useToast()
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
        isOpen: false,
        id: null
    })

    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        endereco: '',
        observacoes: '',
        tipo_cliente: 'informal',
        senha: '',
        limite_credito: 0,
        limite_ilimitado: false
    })

    async function loadClientes() {
        setLoading(true)
        const { data: clientesData } = await supabase
            .from('clientes')
            .select('*')
            .order('nome')

        if (!clientesData) {
            setClientes([])
            setLoading(false)
            return
        }

        setClientes(clientesData)

        // Buscar breakdown de pagamentos para estes clientes
        const ids = clientesData.map(c => c.id)

        // 1. Vendas PDV
        const { data: vendas } = await supabase
            .from('vendas')
            .select('cliente_id, forma_pagamento, total')
            .in('cliente_id', ids)

        // 2. Pedidos Online
        const { data: pedidos } = await supabase
            .from('pedidos_online')
            .select('cliente_id, metodo_pagamento, total')
            .in('cliente_id', ids)
            .neq('status', 'cancelado')

        const breakdown: Record<string, any> = {}

        const addGasto = (cid: string, metodo: string, valor: number) => {
            if (!breakdown[cid]) breakdown[cid] = {}
            const m = metodo?.toLowerCase() || 'outros'
            breakdown[cid][m] = (breakdown[cid][m] || 0) + Number(valor)
        }

        vendas?.forEach(v => addGasto(v.cliente_id, v.forma_pagamento, v.total))
        pedidos?.forEach(p => addGasto(p.cliente_id, p.metodo_pagamento, p.total))

        setResumoPagamentos(breakdown)
        setLoading(false)
    }

    useEffect(() => {
        loadClientes()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.tipo_cliente === 'credito') {
            // Validar senha
            if (!editingId && !formData.senha) {
                showToast('error', 'Erro', 'Senha é obrigatória para clientes crédito')
                return
            }
            if (formData.senha && formData.senha.length < 6) {
                showToast('error', 'Erro', 'A senha deve ter pelo menos 6 caracteres')
                return
            }

            // Usar API Route para criar/atualizar cliente crédito e usuário Auth
            try {
                const response = await fetch('/api/clientes/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                })

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao processar solicitação')
                }

                showToast('success', 'Sucesso', 'Cliente crédito salvo com sucesso!')
                resetForm()
                loadClientes()
            } catch (error: any) {
                showToast('error', 'Erro', error.message)
            }
            return
        }

        // Fluxo normal para clientes informais
        if (editingId) {
            // Atualizar
            const { error } = await supabase
                .from('clientes')
                .update({
                    nome: formData.nome,
                    telefone: formData.telefone,
                    endereco: formData.endereco,
                    observacoes: formData.observacoes,
                    tipo_cliente: 'informal'
                })
                .eq('id', editingId)

            if (error) {
                showToast('error', 'Erro ao atualizar', error.message)
            } else {
                showToast('success', 'Cliente atualizado!', 'Os dados foram atualizados com sucesso.')
                resetForm()
                loadClientes()
            }
        } else {
            // Criar
            const { error } = await supabase
                .from('clientes')
                .insert({
                    nome: formData.nome,
                    telefone: formData.telefone,
                    endereco: formData.endereco,
                    observacoes: formData.observacoes,
                    tipo_cliente: 'informal'
                })

            if (error) {
                showToast('error', 'Erro ao cadastrar', error.message)
            } else {
                showToast('success', 'Cliente cadastrado!', 'O cliente foi adicionado com sucesso.')
                resetForm()
                loadClientes()
            }
        }
    }

    const handleEdit = (cliente: any) => {
        setFormData({
            nome: cliente.nome,
            telefone: cliente.telefone,
            endereco: cliente.endereco || '',
            observacoes: cliente.observacoes || '',
            tipo_cliente: cliente.tipo_cliente || 'informal',
            senha: '', // Senha sempre vazia ao editar
            limite_credito: cliente.limite_credito || 0,
            limite_ilimitado: cliente.limite_ilimitado || false
        })
        setEditingId(cliente.id)
        setShowForm(true)
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return

        const { error } = await supabase
            .from('clientes')
            .delete()
            .eq('id', deleteModal.id)

        if (error) {
            showToast('error', 'Erro ao excluir', error.message)
        } else {
            showToast('success', 'Cliente excluído!', 'O cliente foi removido com sucesso.')
            loadClientes()
        }

        setDeleteModal({ isOpen: false, id: null })
    }

    const resetForm = () => {
        setFormData({
            nome: '',
            telefone: '',
            endereco: '',
            observacoes: '',
            tipo_cliente: 'informal',
            senha: '',
            limite_credito: 0,
            limite_ilimitado: false
        })
        setEditingId(null)
        setShowForm(false)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Clientes</h1>
                    <p className="text-muted-foreground">Gerencie seus clientes</p>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)}>
                        <Plus size={16} className="mr-2" />
                        Novo Cliente
                    </Button>
                )}
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
                            <Button variant="ghost" onClick={resetForm}>
                                <X size={20} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Nome Completo"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Telefone"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo de Cliente</label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={formData.tipo_cliente}
                                    onChange={(e) => setFormData({ ...formData, tipo_cliente: e.target.value })}
                                >
                                    <option value="informal">Informal</option>
                                    <option value="credito">Crédito (Pré-aprovado)</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Clientes "Crédito" podem criar conta com senha. Clientes "Informal" apenas acesso rápido.
                                </p>
                            </div>

                            {formData.tipo_cliente === 'credito' && (
                                <>
                                    <Input
                                        label={editingId ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso"}
                                        type="password"
                                        value={formData.senha}
                                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                        placeholder={editingId ? "******" : "Mínimo 6 caracteres"}
                                        required={!editingId}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Limite de Crédito (R$)</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                disabled={formData.limite_ilimitado}
                                                value={formData.limite_credito}
                                                onChange={(e) => setFormData({ ...formData, limite_credito: Number(e.target.value) })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pb-3">
                                            <input
                                                type="checkbox"
                                                id="limite_ilimitado"
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={formData.limite_ilimitado}
                                                onChange={(e) => setFormData({ ...formData, limite_ilimitado: e.target.checked, limite_credito: e.target.checked ? 0 : formData.limite_credito })}
                                            />
                                            <label htmlFor="limite_ilimitado" className="text-sm font-medium">Limite Ilimitado</label>
                                        </div>
                                    </div>
                                </>
                            )}

                            <Input
                                label="Endereço Completo"
                                value={formData.endereco}
                                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                placeholder="Rua, número, bairro, cidade, CEP"
                            />
                            <Input
                                label="Observações"
                                value={formData.observacoes}
                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                placeholder="Informações adicionais"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="secondary" onClick={resetForm}>
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    <Save size={16} className="mr-2" />
                                    {editingId ? 'Atualizar' : 'Cadastrar'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Lista de Clientes ({clientes.filter(c => filtroTipo === 'todos' || c.tipo_cliente === filtroTipo).length})</CardTitle>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFiltroTipo('todos')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: filtroTipo === 'todos' ? '2px solid #667eea' : '2px solid #e5e7eb',
                                    background: filtroTipo === 'todos' ? '#667eea' : 'white',
                                    color: filtroTipo === 'todos' ? 'white' : '#6b7280',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Todos ({clientes.length})
                            </button>
                            <button
                                onClick={() => setFiltroTipo('credito')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: filtroTipo === 'credito' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                                    background: filtroTipo === 'credito' ? '#3b82f6' : 'white',
                                    color: filtroTipo === 'credito' ? 'white' : '#6b7280',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Crédito ({clientes.filter(c => c.tipo_cliente === 'credito').length})
                            </button>
                            <button
                                onClick={() => setFiltroTipo('informal')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: filtroTipo === 'informal' ? '2px solid #6b7280' : '2px solid #e5e7eb',
                                    background: filtroTipo === 'informal' ? '#6b7280' : 'white',
                                    color: filtroTipo === 'informal' ? 'white' : '#6b7280',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Informal ({clientes.filter(c => c.tipo_cliente === 'informal').length})
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="p-4 font-medium text-muted-foreground">Nome</th>
                                    <th className="p-4 font-medium text-muted-foreground">Tipo</th>
                                    <th className="p-4 font-medium text-muted-foreground">Telefone</th>
                                    <th className="p-4 font-medium text-muted-foreground">Endereço</th>
                                    <th className="p-4 font-medium text-muted-foreground">Pedidos</th>
                                    <th className="p-4 font-medium text-muted-foreground">Limite Disp.</th>
                                    <th className="p-4 font-medium text-muted-foreground">Total Gasto</th>
                                    <th className="p-4 font-medium text-muted-foreground">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes
                                    .filter(c => filtroTipo === 'todos' || c.tipo_cliente === filtroTipo)
                                    .map((cliente) => (
                                        <tr key={cliente.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td className="p-4 font-medium">{cliente.nome}</td>
                                            <td className="p-4">
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    backgroundColor: cliente.tipo_cliente === 'credito' ? '#dbeafe' : '#f3f4f6',
                                                    color: cliente.tipo_cliente === 'credito' ? '#1e40af' : '#6b7280'
                                                }}>
                                                    {cliente.tipo_cliente === 'credito' ? '💳 Crédito' : '👤 Informal'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Phone size={14} className="text-muted-foreground" />
                                                    {cliente.telefone}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {cliente.endereco ? (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={14} className="text-muted-foreground" />
                                                        <span className="text-sm">{cliente.endereco}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: '#e0f2fe',
                                                    color: '#0369a1'
                                                }}>
                                                    {cliente.total_pedidos || 0} pedidos
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {cliente.tipo_cliente === 'credito' ? (
                                                    cliente.limite_ilimitado ? (
                                                        <span className="text-green-600 font-bold">Ilimitado</span>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className={((cliente.limite_credito || 0) - (cliente.credito_utilizado || 0)) <= 0 ? 'text-red-500' : 'text-blue-600'}>
                                                                R$ {((cliente.limite_credito || 0) - (cliente.credito_utilizado || 0)).toFixed(2)}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">de R$ {(cliente.limite_credito || 0).toFixed(2)}</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">R$ {(cliente.total_gasto || 0).toFixed(2)}</span>
                                                    {resumoPagamentos[cliente.id] && (
                                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                                            {Object.entries(resumoPagamentos[cliente.id]).map(([metodo, valor]: [string, any]) => (
                                                                <span key={metodo} className="text-[10px] text-muted-foreground whitespace-nowrap capitalize">
                                                                    {metodo.replace('_', ' ')}: R$ {Number(valor).toFixed(2)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        className="!h-8 !w-8 !p-0 !text-blue-500 hover:!text-blue-700 flex items-center justify-center shrink-0"
                                                        onClick={() => handleEdit(cliente)}
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        className="!h-8 !w-8 !p-0 !text-red-500 hover:!text-red-700 flex items-center justify-center shrink-0"
                                                        onClick={() => setDeleteModal({ isOpen: true, id: cliente.id })}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {clientes.filter(c => filtroTipo === 'todos' || c.tipo_cliente === filtroTipo).length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            Nenhum cliente encontrado.
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
                title="Excluir Cliente"
                message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setDeleteModal({ isOpen: false, id: null })}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
