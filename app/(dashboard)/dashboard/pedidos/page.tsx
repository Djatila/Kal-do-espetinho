'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Clock, Phone, MapPin, Package, CheckCircle, XCircle, AlertCircle, Truck, Trash2, ShoppingBag, CreditCard, Banknote, Printer } from 'lucide-react'
import styles from './page.module.css'

interface ItemPedido {
    id: string
    nome: string
    quantidade: number
    preco: number
    subtotal: number
}

interface Pedido {
    id: string
    numero_pedido: number
    cliente_nome: string
    cliente_telefone: string
    cliente_endereco: string | null
    tipo_entrega: 'retirada' | 'delivery'
    metodo_pagamento?: 'pix' | 'cartao' | 'dinheiro' | 'pagamento_posterior'
    precisa_troco?: boolean
    valor_para_troco?: number
    itens: ItemPedido[]
    subtotal: number
    taxa_entrega: number
    total: number
    observacoes: string | null
    status: 'pendente' | 'confirmado' | 'preparando' | 'pronto' | 'entregue' | 'cancelado'
    created_at: string
    updated_at: string
    historico_complementos?: Array<{
        data: string
        itens: ItemPedido[]
        subtotal: number
        total: number
    }>
}

const STATUS_CONFIG = {
    pendente: { label: 'Pendente', color: '#f59e0b', icon: AlertCircle },
    confirmado: { label: 'Confirmado', color: '#3b82f6', icon: CheckCircle },
    preparando: { label: 'Preparando', color: '#8b5cf6', icon: Package },
    pronto: { label: 'Pronto', color: '#22c55e', icon: CheckCircle },
    entregue: { label: 'Entregue', color: '#10b981', icon: Truck },
    cancelado: { label: 'Cancelado', color: '#ef4444', icon: XCircle }
}

const PAGAMENTO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pix: { label: 'PIX', color: '#00a868', icon: '💳' },
    cartao: { label: 'Cartão', color: '#3b82f6', icon: CreditCard },
    dinheiro: { label: 'Dinheiro', color: '#22c55e', icon: Banknote },
    pagamento_posterior: { label: 'Pagamento Posterior', color: '#f59e0b', icon: Clock }
}

export default function PedidosPage() {
    const supabase = createClient()
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [filtroStatus, setFiltroStatus] = useState<string>('todos')
    const [loading, setLoading] = useState(true)
    const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    // Solicitações de item pendentes do cliente
    const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<Record<number, any[]>>({})

    useEffect(() => {
        loadPedidos()

        // Criar elemento de áudio para notificação
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eafTRAMUKfj8LZjHAY4ktfzzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgs7y2Ik2CBlou+3mn00QDFA=')

        const cleanup = setupRealtimeSubscription()
        const cleanupSol = setupSolicitacoesSubscription()

        return () => {
            cleanup()
            cleanupSol()
        }
    }, [])

    async function loadPedidos() {
        setLoading(true)
        const { data, error } = await supabase
            .from('pedidos_online')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erro ao carregar pedidos:', error)
        } else if (data) {
            setPedidos(data)
        }
        setLoading(false)
    }

    function setupRealtimeSubscription() {
        console.log('🔄 Configurando Realtime Subscription...')

        const channel = supabase
            .channel('pedidos_online_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pedidos_online'
                },
                (payload) => {
                    console.log('🔔 Mudança detectada:', payload)

                    if (payload.eventType === 'INSERT') {
                        const novoPedido = payload.new as Pedido
                        console.log('➕ Novo pedido:', novoPedido)
                        setPedidos(prev => [novoPedido, ...prev])

                        // Tocar som de notificação para novos pedidos
                        if (audioRef.current) {
                            audioRef.current.play().catch(e => console.log('Erro ao tocar som:', e))
                        }

                        // Mostrar notificação do navegador
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Novo Pedido!', {
                                body: `Pedido #${novoPedido.numero_pedido} de ${novoPedido.cliente_nome}`,
                                icon: '/icon.png'
                            })
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        console.log('✏️ Pedido atualizado:', payload.new)
                        // Re-fetch the full order to ensure JSONB fields (itens, historico) are current
                        const updatedId = payload.new.id
                        supabase
                            .from('pedidos_online')
                            .select('*')
                            .eq('id', updatedId)
                            .maybeSingle()
                            .then(({ data }) => {
                                if (data) {
                                    setPedidos(prev => prev.map(p => p.id === data.id ? data as Pedido : p))
                                    // Also update selected modal if open
                                    setPedidoSelecionado(prev => prev?.id === data.id ? data as Pedido : prev)
                                }
                            })
                    } else if (payload.eventType === 'DELETE') {
                        console.log('🗑️ Pedido deletado:', payload.old)
                        setPedidos(prev => prev.filter(p => p.id !== payload.old.id))
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Status da subscription:', status)
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime conectado com sucesso!')
                }
            })

        // Solicitar permissão para notificações
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('🔔 Permissão de notificação:', permission)
            })
        }

        return () => {
            console.log('🔌 Desconectando Realtime...')
            supabase.removeChannel(channel)
        }
    }

    async function atualizarStatus(pedidoId: string, novoStatus: Pedido['status']) {
        const { error } = await supabase
            .from('pedidos_online')
            .update({ status: novoStatus })
            .eq('id', pedidoId)

        if (error) {
            console.error('Erro ao atualizar status:', error)
            alert('Erro ao atualizar status do pedido')
        }
    }

    function setupSolicitacoesSubscription() {
        // Carregar solicitações pendentes existentes
        supabase
            .from('solicitacoes_item')
            .select('*')
            .eq('status', 'pendente')
            .then(({ data }) => {
                if (data) {
                    const grouped: Record<number, any[]> = {}
                    data.forEach((sol: any) => {
                        if (!grouped[sol.pedido_numero]) grouped[sol.pedido_numero] = []
                        grouped[sol.pedido_numero].push(sol)
                    })
                    setSolicitacoesPendentes(grouped)
                }
            })

        const ch = supabase
            .channel('solicitacoes_item_admin')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'solicitacoes_item' },
                (payload) => {
                    const sol = payload.new as any
                    setSolicitacoesPendentes(prev => {
                        const lista = prev[sol.pedido_numero] || []
                        return { ...prev, [sol.pedido_numero]: [...lista, sol] }
                    })
                    // Tocar som e notificação
                    if (audioRef.current) audioRef.current.play().catch(() => { })
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('⚠️ Solicitação de Item!', {
                            body: `${sol.cliente_nome} quer adicionar item ao pedido #${sol.pedido_numero}`,
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'solicitacoes_item' },
                (payload) => {
                    const sol = payload.new as any
                    // Remover da lista de pendentes se foi resolvida
                    if (sol.status !== 'pendente') {
                        setSolicitacoesPendentes(prev => {
                            const lista = (prev[sol.pedido_numero] || []).filter((s: any) => s.id !== sol.id)
                            if (lista.length === 0) {
                                const novo = { ...prev }
                                delete novo[sol.pedido_numero]
                                return novo
                            }
                            return { ...prev, [sol.pedido_numero]: lista }
                        })
                    }
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(ch) }
    }

    async function autorizarSolicitacao(solicitacaoId: string, numeroPedido: number) {
        const { error } = await supabase
            .from('solicitacoes_item')
            .update({ status: 'autorizado' })
            .eq('id', solicitacaoId)
        if (!error) {
            setSolicitacoesPendentes(prev => {
                const lista = (prev[numeroPedido] || []).filter((s: any) => s.id !== solicitacaoId)
                if (lista.length === 0) { const n = { ...prev }; delete n[numeroPedido]; return n }
                return { ...prev, [numeroPedido]: lista }
            })
        }
    }

    async function recusarSolicitacao(solicitacaoId: string, numeroPedido: number) {
        const { error } = await supabase
            .from('solicitacoes_item')
            .update({ status: 'recusado' })
            .eq('id', solicitacaoId)
        if (!error) {
            setSolicitacoesPendentes(prev => {
                const lista = (prev[numeroPedido] || []).filter((s: any) => s.id !== solicitacaoId)
                if (lista.length === 0) { const n = { ...prev }; delete n[numeroPedido]; return n }
                return { ...prev, [numeroPedido]: lista }
            })
        }
    }

    async function excluirPedido(pedidoId: string) {
        if (!confirm('Tem certeza que deseja EXCLUIR este pedido permanentemente? Esta ação não pode ser desfeita.')) return

        const { error } = await supabase
            .from('pedidos_online')
            .delete()
            .eq('id', pedidoId)

        if (error) {
            console.error('Erro ao excluir pedido:', error)
            alert('Erro ao excluir pedido')
        }
    }

    const pedidosFiltrados = filtroStatus === 'todos'
        ? pedidos
        : pedidos.filter(p => p.status === filtroStatus)

    const contagemPorStatus = {
        todos: pedidos.length,
        pendente: pedidos.filter(p => p.status === 'pendente').length,
        confirmado: pedidos.filter(p => p.status === 'confirmado').length,
        preparando: pedidos.filter(p => p.status === 'preparando').length,
        pronto: pedidos.filter(p => p.status === 'pronto').length,
        entregue: pedidos.filter(p => p.status === 'entregue').length,
        cancelado: pedidos.filter(p => p.status === 'cancelado').length
    }

    function formatarData(data: string) {
        const date = new Date(data)
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    function getProximoStatus(statusAtual: Pedido['status']): Pedido['status'] | null {
        const fluxo: Pedido['status'][] = ['pendente', 'confirmado', 'preparando', 'pronto', 'entregue']
        const indiceAtual = fluxo.indexOf(statusAtual)
        return indiceAtual < fluxo.length - 1 ? fluxo[indiceAtual + 1] : null
    }

    function imprimirPedido(pedido: Pedido) {
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const troco = pedido.metodo_pagamento === 'dinheiro' && pedido.precisa_troco && pedido.valor_para_troco
            ? pedido.valor_para_troco - pedido.total
            : 0

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Pedido #${pedido.numero_pedido}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        font-size: 28px;
                        margin-bottom: 10px;
                        color: #ff6b35;
                    }
                    .pedido-numero {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 20px 0;
                    }
                    .status {
                        display: inline-block;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-weight: bold;
                        margin: 10px 0;
                        background-color: ${STATUS_CONFIG[pedido.status].color}20;
                        color: ${STATUS_CONFIG[pedido.status].color};
                        border: 2px solid ${STATUS_CONFIG[pedido.status].color};
                    }
                    .secao {
                        margin: 25px 0;
                        padding: 15px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                    }
                    .secao h2 {
                        font-size: 18px;
                        margin-bottom: 15px;
                        color: #333;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 8px;
                    }
                    .info-linha {
                        margin: 8px 0;
                        display: flex;
                        justify-content: space-between;
                    }
                    .info-linha strong {
                        color: #555;
                    }
                    .item {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px;
                        border-bottom: 1px solid #eee;
                    }
                    .item:last-child {
                        border-bottom: none;
                    }
                    .resumo {
                        margin-top: 20px;
                        padding: 15px;
                        background-color: #f9f9f9;
                        border-radius: 8px;
                    }
                    .resumo-linha {
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                        font-size: 16px;
                    }
                    .resumo-total {
                        font-size: 20px;
                        font-weight: bold;
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 2px solid #333;
                    }
                    .troco-destaque {
                        color: #22c55e;
                        font-weight: bold;
                        background-color: #22c55e20;
                        padding: 10px;
                        border-radius: 5px;
                        margin: 10px 0;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        border-top: 1px solid #ddd;
                        padding-top: 20px;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Quentinhas da Goi</h1>
                    <div class="pedido-numero">Pedido #${pedido.numero_pedido}</div>
                    <div class="status">${STATUS_CONFIG[pedido.status].label}</div>
                </div>

                <div class="secao">
                    <h2>Informações do Cliente</h2>
                    <div class="info-linha"><strong>Nome:</strong> <span>${pedido.cliente_nome}</span></div>
                    <div class="info-linha"><strong>Telefone:</strong> <span>${pedido.cliente_telefone}</span></div>
                    <div class="info-linha"><strong>Tipo:</strong> <span>${pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada no Local'}</span></div>
                    ${pedido.metodo_pagamento ? `<div class="info-linha"><strong>Pagamento:</strong> <span>${PAGAMENTO_CONFIG[pedido.metodo_pagamento].label}</span></div>` : ''}
                    ${pedido.cliente_endereco ? `<div class="info-linha"><strong>Endereço:</strong> <span>${pedido.cliente_endereco}</span></div>` : ''}
                    <div class="info-linha"><strong>Data/Hora:</strong> <span>${formatarData(pedido.created_at)}</span></div>
                </div>

                ${pedido.metodo_pagamento === 'dinheiro' && pedido.precisa_troco && pedido.valor_para_troco ? `
                    <div class="troco-destaque">
                        <div class="info-linha"><strong>Cliente vai pagar com:</strong> <span>R$ ${pedido.valor_para_troco.toFixed(2)}</span></div>
                        <div class="info-linha"><strong>Troco a devolver:</strong> <span>R$ ${troco.toFixed(2)}</span></div>
                    </div>
                ` : ''}

                <div class="secao">
                    <h2>Itens do Pedido</h2>
                    ${pedido.itens.map(item => `
                        <div class="item">
                            <span>${item.quantidade}x ${item.nome}</span>
                            <span>R$ ${item.subtotal.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>

                ${pedido.observacoes ? `
                    <div class="secao">
                        <h2>Observações</h2>
                        <p>${pedido.observacoes}</p>
                    </div>
                ` : ''}

                <div class="resumo">
                    <div class="resumo-linha">
                        <span>Subtotal:</span>
                        <span>R$ ${pedido.subtotal.toFixed(2)}</span>
                    </div>
                    ${pedido.taxa_entrega > 0 ? `
                        <div class="resumo-linha">
                            <span>Taxa de Entrega:</span>
                            <span>R$ ${pedido.taxa_entrega.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="resumo-linha resumo-total">
                        <span>Total:</span>
                        <span>R$ ${pedido.total.toFixed(2)}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>Obrigado pela preferência!</p>
                    <p>Quentinhas da Goi</p>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `

        printWindow.document.write(html)
        printWindow.document.close()
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.titulo}>Pedidos Online</h1>
                    <p className={styles.subtitulo}>Gerencie os pedidos em tempo real</p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Pendentes</span>
                        <span className={styles.statValue} style={{ color: '#f59e0b' }}>
                            {contagemPorStatus.pendente}
                        </span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Em Preparo</span>
                        <span className={styles.statValue} style={{ color: '#8b5cf6' }}>
                            {contagemPorStatus.preparando}
                        </span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Prontos</span>
                        <span className={styles.statValue} style={{ color: '#22c55e' }}>
                            {contagemPorStatus.pronto}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className={styles.filtros}>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <button
                        key={status}
                        className={`${styles.filtroBtn} ${filtroStatus === status ? styles.filtroAtivo : ''}`}
                        onClick={() => setFiltroStatus(status)}
                        style={{
                            borderColor: filtroStatus === status ? config.color : undefined,
                            color: filtroStatus === status ? config.color : undefined
                        }}
                    >
                        {config.label} ({contagemPorStatus[status as keyof typeof contagemPorStatus]})
                    </button>
                ))}
                <button
                    className={`${styles.filtroBtn} ${filtroStatus === 'todos' ? styles.filtroAtivo : ''}`}
                    onClick={() => setFiltroStatus('todos')}
                >
                    Todos ({contagemPorStatus.todos})
                </button>
            </div>

            {/* Lista de Pedidos */}
            <div className={styles.pedidos}>
                {loading ? (
                    <p className={styles.loading}>Carregando pedidos...</p>
                ) : pedidosFiltrados.length === 0 ? (
                    <p className={styles.vazio}>Nenhum pedido encontrado</p>
                ) : (
                    pedidosFiltrados.map(pedido => {
                        const StatusIcon = STATUS_CONFIG[pedido.status].icon
                        const proximoStatus = getProximoStatus(pedido.status)

                        return (
                            <div
                                key={pedido.id}
                                className={styles.pedidoCard}
                                onClick={() => setPedidoSelecionado(pedido)}
                            >
                                <div className={styles.pedidoHeader}>
                                    <div className={styles.pedidoNumero}>
                                        Pedido #{pedido.numero_pedido}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div
                                            className={styles.statusBadge}
                                            style={{
                                                backgroundColor: `${STATUS_CONFIG[pedido.status].color}20`,
                                                color: STATUS_CONFIG[pedido.status].color
                                            }}
                                        >
                                            <StatusIcon size={16} />
                                            {STATUS_CONFIG[pedido.status].label}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                excluirPedido(pedido.id)
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#ef4444',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                transition: 'background-color 0.2s'
                                            }}
                                            title="Excluir Pedido"
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.pedidoInfo}>
                                    <div className={styles.infoItem}>
                                        <Phone size={16} />
                                        <span>{pedido.cliente_nome}</span>
                                    </div>
                                    <div className={styles.infoItem} style={{ color: pedido.tipo_entrega === 'delivery' ? '#f59e0b' : '#3b82f6', fontWeight: 500 }}>
                                        {pedido.tipo_entrega === 'delivery' ? <Truck size={16} /> : <ShoppingBag size={16} />}
                                        <span>{pedido.tipo_entrega === 'delivery' ? 'Entrega (Delivery)' : 'Retirada no Local'}</span>
                                    </div>
                                    {pedido.metodo_pagamento && (() => {
                                        const PagamentoIcon = PAGAMENTO_CONFIG[pedido.metodo_pagamento].icon;
                                        return (
                                            <div className={styles.infoItem} style={{ color: PAGAMENTO_CONFIG[pedido.metodo_pagamento].color, fontWeight: 500 }}>
                                                {typeof PagamentoIcon === 'string' ? (
                                                    <span style={{ fontSize: '16px' }}>{PagamentoIcon}</span>
                                                ) : (
                                                    <PagamentoIcon size={16} />
                                                )}
                                                <span>{PAGAMENTO_CONFIG[pedido.metodo_pagamento].label}</span>
                                            </div>
                                        );
                                    })()}
                                    {pedido.metodo_pagamento === 'dinheiro' && pedido.precisa_troco && pedido.valor_para_troco && (
                                        <div className={styles.infoItem} style={{ color: '#22c55e', fontWeight: 500, fontSize: '0.9rem' }}>
                                            💵 Troco para R$ {pedido.valor_para_troco.toFixed(2)} (Troco: R$ {(pedido.valor_para_troco - pedido.total).toFixed(2)})
                                        </div>
                                    )}
                                    <div className={styles.infoItem}>
                                        <Clock size={16} />
                                        <span>{formatarData(pedido.created_at)}</span>
                                    </div>
                                    {pedido.tipo_entrega === 'delivery' && pedido.cliente_endereco && (
                                        <div className={styles.infoItem}>
                                            <MapPin size={16} />
                                            <span>{pedido.cliente_endereco}</span>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.pedidoItens}>
                                    {pedido.itens.map((item, idx) => {
                                        // Verificar se é item complementar
                                        const qtdInicial = pedido.historico_complementos?.reduce((acc, comp) => {
                                            const itemComp = comp.itens.find(i => i.id === item.id)
                                            return acc + (itemComp?.quantidade || 0)
                                        }, 0) || 0

                                        const isComplementar = qtdInicial > 0

                                        return (
                                            <div
                                                key={idx}
                                                className={`${styles.item} ${isComplementar ? styles.itemComplementar : ''}`}
                                            >
                                                <span>
                                                    {item.quantidade}x {item.nome}
                                                    {isComplementar && <span className={styles.badgeNovo}>NOVO</span>}
                                                </span>
                                                <span>R$ {item.subtotal.toFixed(2)}</span>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Notificação de solicitação de item pendente */}
                                {solicitacoesPendentes[pedido.numero_pedido] && solicitacoesPendentes[pedido.numero_pedido].length > 0 && (
                                    <div style={{
                                        margin: '0.75rem 0',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        border: '2px solid #f59e0b',
                                        background: 'rgba(245,158,11,0.08)',
                                    }}>
                                        <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            ⚠️ Solicitação de Item
                                        </p>
                                        {solicitacoesPendentes[pedido.numero_pedido].map((sol: any) => (
                                            <div key={sol.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                                <span style={{ fontSize: '0.82rem', color: '#ccc', flex: 1 }}>
                                                    <strong>{sol.cliente_nome}</strong> quer adicionar item ao pedido
                                                </span>
                                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); autorizarSolicitacao(sol.id, pedido.numero_pedido) }}
                                                        style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                                    >
                                                        ✅ Autorizar
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); recusarSolicitacao(sol.id, pedido.numero_pedido) }}
                                                        style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                                    >
                                                        ❌ Recusar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={styles.pedidoFooter}>
                                    <div className={styles.total}>
                                        Total: <strong>R$ {pedido.total.toFixed(2)}</strong>
                                    </div>
                                    {proximoStatus && pedido.status !== 'cancelado' && (
                                        <button
                                            className={styles.botaoAvancar}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                atualizarStatus(pedido.id, proximoStatus)
                                            }}
                                            style={{ backgroundColor: STATUS_CONFIG[proximoStatus].color }}
                                        >
                                            {STATUS_CONFIG[proximoStatus].label}
                                        </button>
                                    )}
                                    {pedido.status === 'pendente' && (
                                        <button
                                            className={styles.botaoCancelar}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (confirm('Deseja cancelar este pedido?')) {
                                                    atualizarStatus(pedido.id, 'cancelado')
                                                }
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Modal de Detalhes */}
            {pedidoSelecionado && (
                <div className={styles.modalOverlay} onClick={() => setPedidoSelecionado(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Pedido #{pedidoSelecionado.numero_pedido}</h2>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                <button
                                    onClick={() => imprimirPedido(pedidoSelecionado)}
                                    style={{
                                        background: '#22c55e',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        transition: 'background 0.2s',
                                        whiteSpace: 'nowrap',
                                        minWidth: '110px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}
                                    title="Imprimir Pedido"
                                >
                                    🖨️ Imprimir
                                </button>
                                <button onClick={() => setPedidoSelecionado(null)}>✕</button>
                            </div>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.secao}>
                                <h3>Informações do Cliente</h3>
                                <p><strong>Nome:</strong> {pedidoSelecionado.cliente_nome}</p>
                                <p><strong>Telefone:</strong> {pedidoSelecionado.cliente_telefone}</p>
                                <p><strong>Tipo:</strong> {pedidoSelecionado.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada'}</p>
                                {pedidoSelecionado.metodo_pagamento && (
                                    <p><strong>Pagamento:</strong> {PAGAMENTO_CONFIG[pedidoSelecionado.metodo_pagamento].label}</p>
                                )}
                                {pedidoSelecionado.metodo_pagamento === 'dinheiro' && pedidoSelecionado.precisa_troco && pedidoSelecionado.valor_para_troco && (
                                    <p style={{ color: '#22c55e', fontWeight: 500 }}>
                                        <strong>Troco:</strong> Cliente vai pagar com R$ {pedidoSelecionado.valor_para_troco.toFixed(2)}<br />
                                        Troco a devolver: R$ {(pedidoSelecionado.valor_para_troco - pedidoSelecionado.total).toFixed(2)}
                                    </p>
                                )}
                                {pedidoSelecionado.cliente_endereco && (
                                    <p><strong>Endereço:</strong> {pedidoSelecionado.cliente_endereco}</p>
                                )}
                            </div>

                            <div className={styles.secao}>
                                <h3>Itens do Pedido</h3>
                                {pedidoSelecionado.itens.map((item, idx) => (
                                    <div key={idx} className={styles.itemDetalhe}>
                                        <span>{item.quantidade}x {item.nome}</span>
                                        <span>R$ {item.subtotal.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            {pedidoSelecionado.observacoes && (
                                <div className={styles.secao}>
                                    <h3>Observações</h3>
                                    <p>{pedidoSelecionado.observacoes}</p>
                                </div>
                            )}

                            <div className={styles.secao}>
                                <h3>Resumo</h3>
                                <div className={styles.resumoItem}>
                                    <span>Subtotal:</span>
                                    <span>R$ {pedidoSelecionado.subtotal.toFixed(2)}</span>
                                </div>
                                {pedidoSelecionado.taxa_entrega > 0 && (
                                    <div className={styles.resumoItem}>
                                        <span>Taxa de Entrega:</span>
                                        <span>R$ {pedidoSelecionado.taxa_entrega.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className={`${styles.resumoItem} ${styles.resumoTotal}`}>
                                    <span>Total:</span>
                                    <span>R$ {pedidoSelecionado.total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className={styles.secao}>
                                <h3>Alterar Status</h3>
                                <div className={styles.statusOpcoes}>
                                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                                        <button
                                            key={status}
                                            className={`${styles.statusBtn} ${pedidoSelecionado.status === status ? styles.statusAtivo : ''}`}
                                            onClick={() => {
                                                atualizarStatus(pedidoSelecionado.id, status as Pedido['status'])
                                                setPedidoSelecionado(null)
                                            }}
                                            style={{
                                                borderColor: config.color,
                                                backgroundColor: pedidoSelecionado.status === status ? config.color : 'transparent',
                                                color: pedidoSelecionado.status === status ? 'white' : config.color
                                            }}
                                        >
                                            {config.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
