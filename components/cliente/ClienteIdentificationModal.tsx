'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, User, Phone, Mail, Lock, LogIn } from 'lucide-react'
import styles from './ClienteIdentificationModal.module.css'

interface ClienteIdentificationModalProps {
    isOpen: boolean
    onClienteIdentified: (clienteId: string, tipoCliente: 'credito' | 'informal') => void
}

export function ClienteIdentificationModal({ isOpen, onClienteIdentified }: ClienteIdentificationModalProps) {
    const supabase = createClient()
    const [mode, setMode] = useState<'choice' | 'login' | 'register' | 'informal'>('choice')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Dados para login
    const [loginData, setLoginData] = useState({
        telefone: '',
        password: ''
    })

    // Dados para acesso informal
    const [informalData, setInformalData] = useState({
        nome: '',
        telefone: ''
    })

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Gerar email fictício baseado no telefone
        const cleanPhone = loginData.telefone.replace(/\D/g, '')
        const fakeEmail = `${cleanPhone}@nita.app`

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: loginData.password
        })

        if (authError) {
            setError('Telefone ou senha incorretos')
            setLoading(false)
            return
        }

        // Buscar dados do cliente
        const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('user_id', data.user.id)
            .single()

        if (cliente) {
            onClienteIdentified(cliente.id, 'credito')
        } else {
            setError('Cliente não encontrado')
        }

        setLoading(false)
    }

    const handleInformalAccess = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Buscar cliente informal por telefone
        const { data: existingCliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', informalData.telefone)
            .eq('tipo_cliente', 'informal')
            .maybeSingle()

        if (existingCliente) {
            // Cliente informal já existe
            onClienteIdentified(existingCliente.id, 'informal')
        } else {
            // Criar novo cliente informal
            const { data: newCliente, error: insertError } = await supabase
                .from('clientes')
                .insert({
                    nome: informalData.nome,
                    telefone: informalData.telefone,
                    tipo_cliente: 'informal',
                    status: 'ativo'
                })
                .select('id')
                .single()

            if (insertError) {
                setError('Erro ao criar cliente: ' + insertError.message)
                setLoading(false)
                return
            }

            if (newCliente) {
                onClienteIdentified(newCliente.id, 'informal')
            }
        }

        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                {mode === 'choice' && (
                    <div className={styles.content}>
                        <h2 className={styles.title}>Bem-vindo!</h2>
                        <p className={styles.subtitle}>Como você gostaria de continuar?</p>

                        <div className={styles.choiceButtons}>
                            <button
                                className={styles.choiceBtn}
                                onClick={() => setMode('login')}
                            >
                                <LogIn size={32} />
                                <div className="text-xl font-bold mt-2">Sou Cliente Crédito</div>
                                <div className="text-sm mt-1">Faça login para acessar seu histórico e crédito</div>
                            </button>

                            <button
                                className={styles.choiceBtn}
                                onClick={() => setMode('informal')}
                            >
                                <User size={32} />
                                <div className="text-white text-xl font-bold mt-2">Acesso Rápido</div>
                                <div className="text-sm mt-1">Informe apenas nome e telefone para fazer seu pedido</div>
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'login' && (
                    <div className={styles.content}>
                        <h2 className={styles.title}>Login Cliente Crédito</h2>
                        <p className={styles.subtitle}>Entre com suas credenciais</p>

                        <form onSubmit={handleLogin} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>
                                    <Phone size={18} />
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={loginData.telefone}
                                    onChange={(e) => setLoginData({ ...loginData, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>
                                    <Lock size={18} />
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && <p className={styles.error}>{error}</p>}

                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>

                            <button
                                type="button"
                                className={styles.backBtn}
                                onClick={() => {
                                    setMode('choice')
                                    setError('')
                                }}
                            >
                                Voltar
                            </button>
                        </form>
                    </div>
                )}

                {mode === 'informal' && (
                    <div className={styles.content}>
                        <h2 className={styles.title}>Acesso Rápido</h2>
                        <p className={styles.subtitle}>Informe seus dados para continuar</p>

                        <form onSubmit={handleInformalAccess} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>
                                    <User size={18} />
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={informalData.nome}
                                    onChange={(e) => setInformalData({ ...informalData, nome: e.target.value })}
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>
                                    <Phone size={18} />
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={informalData.telefone}
                                    onChange={(e) => setInformalData({ ...informalData, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    required
                                />
                            </div>

                            {error && <p className={styles.error}>{error}</p>}

                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? 'Verificando...' : 'Continuar'}
                            </button>

                            <button
                                type="button"
                                className={styles.backBtn}
                                onClick={() => {
                                    setMode('choice')
                                    setError('')
                                }}
                            >
                                Voltar
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
