'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, User, Phone, LogIn } from 'lucide-react'
import styles from './ClienteIdentificationModal.module.css'

interface ClienteIdentificationModalProps {
    isOpen: boolean
    onClienteIdentified: (clienteId: string, tipoCliente: 'credito' | 'informal') => void
}

export function ClienteIdentificationModal({ isOpen, onClienteIdentified }: ClienteIdentificationModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Dados para acesso
    const [informalData, setInformalData] = useState({
        nome: '',
        telefone: ''
    })

    const handleInformalAccess = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Normalizar telefone (somente dígitos) para evitar falsos negativos por formatação
        const telefoneLimpo = informalData.telefone.replace(/\D/g, '')

        const { data: existingClientes } = await supabase
            .from('clientes')
            .select('id, tipo_cliente, limite_credito')
            .in('telefone', [telefoneLimpo, informalData.telefone])

        let existingCliente = null;
        if (existingClientes && existingClientes.length > 0) {
            // Prioriza a conta com crédito; caso contrário, pega a mais recente
            existingCliente = existingClientes.find(c => c.tipo_cliente === 'credito' || (c.limite_credito && c.limite_credito > 0)) || existingClientes[existingClientes.length - 1];
        }

        if (existingCliente) {
            // Cliente já existe (credito ou informal)
            onClienteIdentified(existingCliente.id, existingCliente.tipo_cliente as 'credito' | 'informal')
        } else {
            // Criar novo cliente informal (salva telefone limpo para consistência)
            const { data: newCliente, error: insertError } = await supabase
                .from('clientes')
                .insert({
                    nome: informalData.nome,
                    telefone: telefoneLimpo,
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
                <div className={styles.content}>
                    <h2 className={styles.title}>Bem-vindo!</h2>
                    <p className={styles.subtitle}>Informe nome e telefone para acessar o cardápio</p>

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
                            {loading ? 'Verificando...' : 'Acessar Cardápio'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
