import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { DadosCliente } from '../types'

export function useClienteSession() {
    const supabase = createClient()
    const [clienteId, setClienteId] = useState<string | null>(null)
    const [tipoCliente, setTipoCliente] = useState<'credito' | 'informal' | null>(null)
    const [mostrarIdentificacao, setMostrarIdentificacao] = useState(false)
    const [dadosCliente, setDadosCliente] = useState<DadosCliente>({
        nome: '',
        telefone: '',
        endereco: '',
        tipo_entrega: 'retirada',
        metodo_pagamento: undefined,
        precisa_troco: false,
        valor_para_troco: '',
        observacoes: '',
        limite_credito: 0,
        credito_utilizado: 0
    })

    useEffect(() => {
        checkClienteSession()
    }, [])

    async function checkClienteSession() {
        const savedClienteId = sessionStorage.getItem('clienteId')
        const savedTipoCliente = sessionStorage.getItem('tipoCliente') as 'credito' | 'informal' | null

        if (savedClienteId) {
            setClienteId(savedClienteId)
            await loadClienteData(savedClienteId)
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: cliente } = await supabase
                    .from('clientes')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (cliente) {
                    setClienteId(cliente.id)
                    setTipoCliente('credito')
                    sessionStorage.setItem('clienteId', cliente.id)
                    sessionStorage.setItem('tipoCliente', 'credito')
                    await loadClienteData(cliente.id)
                } else {
                    setMostrarIdentificacao(true)
                }
            } else {
                setMostrarIdentificacao(true)
            }
        }
    }

    async function loadClienteData(id: string) {
        const { data: cliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', id)
            .maybeSingle()

        if (cliente) {
            setTipoCliente(cliente.tipo_cliente)
            sessionStorage.setItem('tipoCliente', cliente.tipo_cliente)
            setDadosCliente(prev => ({
                ...prev,
                nome: cliente.nome || '',
                telefone: cliente.telefone || '',
                endereco: cliente.endereco || '',
                limite_credito: cliente.limite_credito || 0,
                credito_utilizado: cliente.credito_utilizado || 0
            }))
        }
    }

    async function handleLogout() {
        sessionStorage.removeItem('clienteId')
        sessionStorage.removeItem('tipoCliente')
        await supabase.auth.signOut()
        setClienteId(null)
        setTipoCliente(null)
        setMostrarIdentificacao(true)
        window.location.reload()
    }

    async function handleClienteIdentified(id: string, tipo: 'credito' | 'informal') {
        setClienteId(id)
        setTipoCliente(tipo)
        sessionStorage.setItem('clienteId', id)
        sessionStorage.setItem('tipoCliente', tipo)
        setMostrarIdentificacao(false)
        await loadClienteData(id)
    }

    return {
        clienteId,
        tipoCliente,
        dadosCliente,
        setDadosCliente,
        mostrarIdentificacao,
        setMostrarIdentificacao,
        handleLogout,
        handleClienteIdentified,
        checkClienteSession,
        loadClienteData
    }
}
