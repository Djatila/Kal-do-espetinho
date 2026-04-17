import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { sendOrderWebhook } from '@/utils/webhook'
import { DadosCliente } from '../types'

export function useOrderStatus(
    clienteId: string | null, 
    setDadosCliente: Dispatch<SetStateAction<DadosCliente>>,
    limparCarrinho: () => void
) {
    const supabase = createClient()
    const { showToast } = useToast()

    const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null)
    const [orderStatus, setOrderStatus] = useState<string | null>(null)
    const [verificandoStatus, setVerificandoStatus] = useState(false)
    const [modoComplemento, setModoComplemento] = useState<boolean>(false)
    const [pedidoComplementoNumero, setPedidoComplementoNumero] = useState<number | null>(null)

    // Efeito para carregar estados do localStorage após a hidratação (client-side only)
    useEffect(() => {
        const savedModo = localStorage.getItem('modoComplemento') === 'true'
        const savedNumero = localStorage.getItem('pedidoComplementoNumero')
        
        if (savedModo) setModoComplemento(true)
        if (savedNumero) setPedidoComplementoNumero(parseInt(savedNumero))
    }, [])

    // Persistir estados de complemento quando mudarem
    useEffect(() => {
        // Só persistir se estivermos no cliente
        if (typeof window !== 'undefined') {
            localStorage.setItem('modoComplemento', modoComplemento.toString())
            if (pedidoComplementoNumero) {
                localStorage.setItem('pedidoComplementoNumero', pedidoComplementoNumero.toString())
            } else {
                localStorage.removeItem('pedidoComplementoNumero')
            }
        }
    }, [modoComplemento, pedidoComplementoNumero])
    
    // Status Cancelamento
    const [statusCancelamento, setStatusCancelamento] = useState<'verificando' | 'cancelando' | null>(null)
    const [mostrarModalWhatsAppCancela, setMostrarModalWhatsAppCancela] = useState(false)
    const [mostrarConfirmacaoCancelamento, setMostrarConfirmacaoCancelamento] = useState(false)
    
    // Modais Bloqueio/Novo Pedido
    const [mostrarModalBloqueio, setMostrarModalBloqueio] = useState(false)
    const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false)
    const [confirmacoMinimizada, setConfirmacoMinimizada] = useState(false)

    // Solicitações
    const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null)
    const [solicitacaoStatus, setSolicitacaoStatus] = useState<'pendente' | 'autorizado' | 'recusado' | null>(null)
    
    const solicitacaoChannelRef = useRef<any>(null)
    const orderStatusStatusRef = useRef<any>(null)

    const pollingRef = useRef<any>(null)

    useEffect(() => {
        restoreActiveOrder()
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [])

    async function restoreActiveOrder() {
        const activeOrderStr = localStorage.getItem('activeOrder')
        if (!activeOrderStr) return
        
        try {
            const activeOrder = JSON.parse(activeOrderStr)
            const id = activeOrder?.id
            const numero = activeOrder?.numero
            if (!id && !numero) return

            // busca o pedido pelo id (UUID) ou pelo numero
            const { data: pedido, error } = id
                ? await supabase.from('pedidos_online').select('id, numero_pedido, status, tipo_entrega').eq('id', id).maybeSingle()
                : await supabase.from('pedidos_online').select('id, numero_pedido, status, tipo_entrega').eq('numero_pedido', numero).maybeSingle()

            if (error) {
                // Erro de rede: manter localStorage e mostrar popup com o que temos
                console.warn('Erro ao restaurar pedido, mantendo localStorage:', error)
                if (numero) {
                    setPedidoConfirmado(numero)
                }
                return
            }

            if (!pedido) {
                // Pedido não existe mais no banco (foi deletado)
                localStorage.removeItem('activeOrder')
                return
            }

            if (pedido.status === 'cancelado') {
                // Pedido cancelado: limpar tudo
                localStorage.removeItem('activeOrder')
                return
            }

            // Pedido existe e não foi cancelado (pendente, confirmado, preparando, pronto, saiu_para_entrega, entregue)
            // Sempre mostrar popup até o cliente clicar em "Fazer Novo Pedido"
            setPedidoConfirmado(pedido.numero_pedido)
            setOrderStatus(pedido.status)
            // tipo_entrega: prioriza o que está no localStorage (mais rápido), senão usa o do banco
            const tipoEntregaRestored = activeOrder?.tipo_entrega || pedido.tipo_entrega
            setDadosCliente(prev => ({ ...prev, tipo_entrega: tipoEntregaRestored as any }))
            
            // Salvar o UUID para Realtime (inclui tipo_entrega para restaurações futuras)
            localStorage.setItem('activeOrder', JSON.stringify({ numero: pedido.numero_pedido, id: pedido.id, tipo_entrega: tipoEntregaRestored }))
            
            // Iniciar polling + Realtime
            setupOrderStatusListener(pedido.id)
            iniciarPolling(pedido.id)
        } catch (e) {
            console.error('Erro ao restaurar pedido ativo:', e)
        }
    }

    async function verificarStatusAtual(pedidoId: string) {
        const { data } = await supabase
            .from('pedidos_online')
            .select('status')
            .eq('id', pedidoId)
            .maybeSingle()

        if (data) {
            setOrderStatus(prev => {
                if (prev !== data.status) {
                    console.log(`🔄 Polling detectou mudança de status: ${prev} → ${data.status}`)
                    if (data.status === 'cancelado') {
                        setTimeout(() => {
                            showToast('info', 'Pedido Cancelado', 'Este pedido foi cancelado.')
                            resetarEstadoTotal()
                        }, 1000)
                    }
                }
                return data.status
            })
        }
    }

    function iniciarPolling(pedidoId: string) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        // Verifica o status a cada 5 segundos
        pollingRef.current = setInterval(() => {
            verificarStatusAtual(pedidoId)
        }, 5000)
    }

    function pararPolling() {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }

    function setupOrderStatusListener(pedidoId: string) {
        if (orderStatusStatusRef.current) {
            supabase.removeChannel(orderStatusStatusRef.current)
        }

        const ch = supabase
            .channel(`order_status_id_${pedidoId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pedidos_online',
                    filter: `id=eq.${pedidoId}`
                },
                (payload) => {
                    const novoStatus = (payload.new as any).status
                    if (novoStatus) {
                        console.log(`📡 Realtime: status=${novoStatus}`)
                        setOrderStatus(novoStatus)
                        if (novoStatus === 'cancelado') {
                            setTimeout(() => {
                                showToast('info', 'Pedido Cancelado', 'Este pedido foi cancelado.')
                                resetarEstadoTotal()
                            }, 2000)
                        }
                    }
                }
            )
            .subscribe()

        orderStatusStatusRef.current = ch
    }

    const resetarEstadoTotal = () => {
        setPedidoConfirmado(null)
        setOrderStatus(null)
        limparCarrinho()
        setMostrarModalNovoPedido(false)
        setMostrarModalWhatsAppCancela(false)
        setMostrarConfirmacaoCancelamento(false)
        setStatusCancelamento(null)
        setMostrarModalBloqueio(false)
        setSolicitacaoId(null)
        setSolicitacaoStatus(null)
        setModoComplemento(false)
        setPedidoComplementoNumero(null)
        setConfirmacoMinimizada(false)
        localStorage.removeItem('activeOrder')
        localStorage.removeItem('modoComplemento')
        localStorage.removeItem('pedidoComplementoNumero')
        pararPolling()
        if (orderStatusStatusRef.current) {
            supabase.removeChannel(orderStatusStatusRef.current)
            orderStatusStatusRef.current = null
        }
        if (solicitacaoChannelRef.current) {
            supabase.removeChannel(solicitacaoChannelRef.current)
            solicitacaoChannelRef.current = null
        }
        setDadosCliente(prev => ({
            ...prev,
            metodo_pagamento: undefined,
            precisa_troco: false,
            valor_para_troco: '',
            observacoes: ''
        }))
    }

    async function handleAdicionarItens(numeroPedido: number, nomeCLiente?: string) {
        setVerificandoStatus(true)
        try {
            const { data: pedido, error } = await supabase
                .from('pedidos_online')
                .select('status, id, cliente_nome, metodo_pagamento')
                .eq('numero_pedido', numeroPedido)
                .maybeSingle()

            console.log(`Verificando status do pedido #${numeroPedido} para adição: ${pedido?.status}`);

            if (error || !pedido) {
                showToast('error', 'Erro', 'Não foi possível verificar o status do pedido.')
                return
            }

            const statusPermitidos = ['pendente', 'confirmado']
            const statusFinalizado = ['entregue', 'cancelado']
            
            if (statusFinalizado.includes(pedido.status)) {
                showToast('info', 'Pedido Finalizado', 'Este pedido já foi encerrado. Para pedir novamente, clique em "Fazer Novo Pedido".')
                return
            }
            
            if (statusPermitidos.includes(pedido.status)) {
                setModoComplemento(true)
                setPedidoComplementoNumero(numeroPedido)
                setPedidoConfirmado(null)
                setDadosCliente(prev => ({
                    ...prev,
                    metodo_pagamento: pedido.metodo_pagamento as any
                }))
            } else {
                const nome = nomeCLiente || pedido.cliente_nome || 'Cliente'
                const { data: solicitacao, error: solErr } = await supabase
                    .from('solicitacoes_item')
                    .insert({
                        pedido_numero: numeroPedido,
                        pedido_id: pedido.id,
                        cliente_nome: nome,
                        status: 'pendente'
                    })
                    .select('id')
                    .single()

                if (solErr || !solicitacao) {
                    showToast('error', 'Erro', 'Não foi possível enviar sua solicitação. Tente novamente.')
                    return
                }

                setSolicitacaoId(solicitacao.id)
                setSolicitacaoStatus('pendente')
                setMostrarModalBloqueio(true)

                if (solicitacaoChannelRef.current) {
                    supabase.removeChannel(solicitacaoChannelRef.current)
                }
                const ch = supabase
                    .channel(`solicitacao_${solicitacao.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'solicitacoes_item',
                            filter: `id=eq.${solicitacao.id}`
                        },
                        (payload) => {
                            const novoStatus = (payload.new as any).status
                            setSolicitacaoStatus(novoStatus)
                            if (novoStatus === 'autorizado') {
                                console.log('Solicitação autorizada! Reabrindo cardápio...');
                                setMostrarModalBloqueio(false)
                                setSolicitacaoId(null)
                                setSolicitacaoStatus(null)
                                supabase.removeChannel(ch)
                                solicitacaoChannelRef.current = null
                                
                                setModoComplemento(true)
                                setPedidoComplementoNumero(numeroPedido)
                                setPedidoConfirmado(null) // Fecha o popup para mostrar o cardápio
                                
                                setDadosCliente(prev => ({
                                    ...prev,
                                    metodo_pagamento: pedido.metodo_pagamento as any
                                }))
                                showToast('success', '✅ Autorizado!', 'Siga as instruções na tela para adicionar itens.')
                            }
                            if (novoStatus === 'recusado') {
                                supabase.removeChannel(ch)
                                solicitacaoChannelRef.current = null
                            }
                        }
                    )
                    .subscribe()
                solicitacaoChannelRef.current = ch
            }
        } finally {
            setVerificandoStatus(false)
        }
    }

    const handleCancelarPedido = async (numero: number) => {
        try {
            console.log(`Iniciando cancelamento do pedido #${numero}...`);
            setStatusCancelamento('verificando')
            const { data, error } = await supabase
                .from('pedidos_online')
                .select('status')
                .eq('numero_pedido', numero)
                .single()

            if (error) {
                console.error('Erro ao verificar status para cancelamento:', error);
                throw error;
            }

            console.log(`Status atual do pedido #${numero}: ${data.status}`);
            if (data.status === 'pendente' || data.status === 'confirmado') {
                setStatusCancelamento('cancelando')

                const res = await fetch('/api/pedidos/cancelar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ numero_pedido: numero, cliente_id: clienteId })
                })

                if (!res.ok) {
                    const errorData = await res.json()
                    throw new Error(errorData.error || 'Erro interno ao cancelar.')
                }

                supabase
                    .from('pedidos_online')
                    .select('*')
                    .eq('numero_pedido', numero)
                    .single()
                    .then(({ data: fullOrder }) => {
                        if (fullOrder) {
                            sendOrderWebhook('order_status_update', fullOrder, 'cancelado')
                        }
                    })

                resetarEstadoTotal()
            } else {
                setMostrarModalWhatsAppCancela(true)
                setMostrarModalNovoPedido(false)
                setStatusCancelamento(null)
            }
        } catch (error) {
            console.error('Erro ao cancelar pedido:', error)
            alert('Não foi possível cancelar o pedido no momento.')
            setStatusCancelamento(null)
        }
    }

    return {
        pedidoConfirmado,
        setPedidoConfirmado,
        orderStatus,
        setOrderStatus,
        modoComplemento,
        setModoComplemento,
        pedidoComplementoNumero,
        setPedidoComplementoNumero,
        statusCancelamento,
        mostrarModalWhatsAppCancela,
        setMostrarModalWhatsAppCancela,
        mostrarConfirmacaoCancelamento,
        setMostrarConfirmacaoCancelamento,
        mostrarModalBloqueio,
        setMostrarModalBloqueio,
        mostrarModalNovoPedido,
        setMostrarModalNovoPedido,
        confirmacoMinimizada,
        setConfirmacoMinimizada,
        solicitacaoStatus,
        setSolicitacaoStatus,
        verificandoStatus,
        handleAdicionarItens,
        cancelarPedido: handleCancelarPedido,
        setupOrderStatusListener,
        iniciarPolling,
        resetarEstadoTotal
    }
}
