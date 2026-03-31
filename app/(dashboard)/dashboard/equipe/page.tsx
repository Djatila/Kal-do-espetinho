'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserPlus, Trash2, Smartphone, UsersRound, Pencil, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Atendente {
    id: string
    nome: string
    telefone: string
    criado_em: string
}

interface AtendendeStats {
    id: string
    atendimentos_hoje: number
    atendimentos_mes: number
}

export default function EquipePage() {
    const [atendentes, setAtendentes] = useState<Atendente[]>([])
    const [stats, setStats] = useState<Record<string, AtendendeStats>>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')
    const [senha, setSenha] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const { showToast } = useToast()

    const carregarAtendentes = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/equipe')
            const data = await res.json()
            if (res.ok) {
                const lista: Atendente[] = data.atendentes || []
                setAtendentes(lista)
                // Load stats after loading attendants
                await carregarStats(lista.map((a: Atendente) => a.id))
            } else {
                showToast('error', data.error || 'Erro ao carregar equipe')
            }
        } catch (error) {
            showToast('error', 'Falha na comunicação com o servidor')
        } finally {
            setLoading(false)
        }
    }

    const carregarStats = async (ids: string[]) => {
        if (!ids.length) return
        try {
            const supabase = createClient()
            const hoje = new Date()
            const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
            const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

            const { data } = await supabase
                .from('pedidos_online')
                .select('garcom_id, created_at')
                .in('garcom_id', ids)
                .gte('created_at', inicioMes)

            const newStats: Record<string, AtendendeStats> = {}
            ids.forEach(id => { newStats[id] = { id, atendimentos_hoje: 0, atendimentos_mes: 0 } })

            if (data) {
                data.forEach((p: any) => {
                    if (!p.garcom_id) return
                    if (!newStats[p.garcom_id]) newStats[p.garcom_id] = { id: p.garcom_id, atendimentos_hoje: 0, atendimentos_mes: 0 }
                    newStats[p.garcom_id].atendimentos_mes++
                    if (p.created_at >= inicioDia) newStats[p.garcom_id].atendimentos_hoje++
                })
            }
            setStats(newStats)
        } catch (e) {
            // Stats failure is silent - doesn't block the main page
            console.error('Erro ao carregar stats:', e)
        }
    }

    useEffect(() => {
        carregarAtendentes()
    }, [])

    const handleAdicionarOuEditar = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        if (!editingId && senha.length < 6) {
            showToast('error', 'A senha precisa ter no mínimo 6 caracteres para novos')
            setSubmitting(false)
            return
        }
        if (editingId && senha && senha.length > 0 && senha.length < 6) {
           showToast('error', 'A senha precisa ter no mínimo 6 caracteres')
           setSubmitting(false)
           return
        }

        try {
            const endpoint = '/api/equipe'
            const method = editingId ? 'PUT' : 'POST'
            const bodyPayload: any = { nome, telefone }
            if (senha) bodyPayload.senha = senha
            if (editingId) bodyPayload.id = editingId

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            })

            const data = await res.json()
            if (res.ok) {
                showToast('success', editingId ? 'Cadastro atualizado com sucesso!' : 'Atendente adicionado com sucesso!')
                cancelarEdicao()
                carregarAtendentes()
            } else {
                showToast('error', data.error || 'Erro ao salvar atendente')
            }
        } catch (error) {
            showToast('error', 'Erro de rede')
        } finally {
            setSubmitting(false)
        }
    }

    const handleRemover = async (id: string) => {
        if (!confirm('Deseja realmente remover este atendente? Ele não poderá mais logar.')) return
        
        try {
            const res = await fetch(`/api/equipe?id=${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (res.ok) {
                showToast('success', 'Atendente removido')
                if (editingId === id) cancelarEdicao()
                carregarAtendentes()
            } else {
                showToast('error', data.error || 'Erro ao remover')
            }
        } catch (error) {
            showToast('error', 'Erro de rede')
        }
    }

    const iniciarEdicao = (atendente: Atendente) => {
        setEditingId(atendente.id)
        setNome(atendente.nome)
        setTelefone(atendente.telefone)
        setSenha('') // Senha vazia, indica que não vai alterar se continua vazia
        // Scroll to top mobile behavior helper
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelarEdicao = () => {
        setEditingId(null)
        setNome('')
        setTelefone('')
        setSenha('')
    }

    // Format phone utility
    const maskPhone = (v: string) => {
        let r = v.replace(/\D/g, "")
        r = r.replace(/^0/, "")
        if (r.length > 10) {
            r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3")
        } else if (r.length > 5) {
            r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3")
        } else if (r.length > 2) {
            r = r.replace(/^(\d\d)(\d{0,5})/, "($1) $2")
        } else {
            r = r.replace(/^(\d*)/, "($1")
        }
        return r
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4">
            <div className="flex justify-between items-center bg-card p-6 rounded-xl border border-border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UsersRound className="text-primary" /> Equipe e Atendentes
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie o acesso dos garçons ao sistema
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Form to Create/Edit */}
                <Card className={`md:col-span-1 shadow-sm border-border flex flex-col transition-all ${editingId ? 'ring-2 ring-primary border-primary' : ''}`}>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {editingId ? (
                                <><Pencil size={18} className="text-primary" /> Editar Atendente</>
                            ) : (
                                <><UserPlus size={18} className="text-primary" /> Novo Atendente</>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {editingId ? 'Modifique os dados ou defina uma nova senha' : 'Adicione um garçom que acessará pelo celular.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <form onSubmit={handleAdicionarOuEditar} className="space-y-4">
                            <Input
                                label="Nome Completo"
                                placeholder="Ex: João da Silva"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                required
                            />
                            <Input
                                label="Celular (Login)"
                                placeholder="(21) 99999-9999"
                                value={telefone}
                                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                                maxLength={15}
                                required
                            />
                            <Input
                                label={editingId ? "Nova Senha (opcional)" : "Senha (Mín. 6 dígitos)"}
                                type="password"
                                placeholder={editingId ? "Preencha APENAS se quiser mudar" : "******"}
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                required={!editingId}
                            />
                            <div className="pt-2 flex flex-col gap-2">
                                <Button type="submit" fullWidth disabled={submitting}>
                                    {submitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Adicionar Atendente')}
                                </Button>
                                {editingId && (
                                    <Button type="button" variant="outline" fullWidth onClick={cancelarEdicao}>
                                        <X size={16} className="mr-1" /> Cancelar Edição
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* List of Attendants */}
                <Card className="md:col-span-2 shadow-sm border-border">
                    <CardHeader>
                        <CardTitle className="text-lg">Atendentes Cadastrados</CardTitle>
                        <CardDescription>
                            Eles terão acesso exclusivo apenas ao PDV.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Carregando equipe...</div>
                        ) : atendentes.length === 0 ? (
                            <div className="text-center py-12 bg-muted/50 rounded-lg text-muted-foreground border border-dashed border-border">
                                <UserPlus className="mx-auto mb-3 opacity-50" size={32} />
                                Nenhum atendente cadastrado ainda.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {atendentes.map(atendente => (
                                    <div 
                                        key={atendente.id} 
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-background border shadow-sm transition-colors ${editingId === atendente.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${editingId === atendente.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                                                {atendente.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">{atendente.nome}</p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <Smartphone size={14} /> {atendente.telefone}
                                                </p>
                                                {/* Atendimentos Stats */}
                                                {stats[atendente.id] && (
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="inline-flex items-center gap-1 text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                                                            Hoje: {stats[atendente.id].atendimentos_hoje}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                                                            Mês: {stats[atendente.id].atendimentos_mes}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3 sm:mt-0 flex items-center justify-end gap-2">
                                            <Button 
                                                variant="outline"
                                                className="border-primary/20 hover:bg-primary/10 text-primary w-full sm:w-auto px-3"
                                                onClick={() => iniciarEdicao(atendente)}
                                                type="button"
                                            >
                                                <Pencil size={16} /> <span className="sm:hidden ml-1">Editar</span>
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-500 flex items-center px-3 dark:hover:bg-red-950/30 w-full sm:w-auto"
                                                onClick={() => handleRemover(atendente.id)}
                                                type="button"
                                            >
                                                <Trash2 size={16} /> <span className="sm:hidden ml-1">Remover</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
