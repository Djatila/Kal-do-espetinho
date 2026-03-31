'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ShoppingCart, Plus, Minus, X, Phone, MapPin, User, MessageSquare, CreditCard, Banknote, Clock, LogOut, ShoppingBag, Flame, Menu as MenuIcon, ShieldCheck, Check as CheckIcon } from 'lucide-react'
import { ClienteIdentificationModal } from '@/components/cliente/ClienteIdentificationModal'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.css'

import MenuCard from '@/_cardapio_kal_novo/MenuCard'
import HighlightCard from '@/_cardapio_kal_novo/HighlightCard'
import CartSidebar from '@/_cardapio_kal_novo/CartSidebar'
import PromoPopup from '@/_cardapio_kal_novo/PromoPopup'
import GeminiAssistant from '@/_cardapio_kal_novo/GeminiAssistant'
import { sendOrderWebhook } from '@/utils/webhook'


interface Produto {
    id: string
    nome: string
    descricao: string
    preco: number
    categoria: string
    ativo: boolean
    imagem_url?: string
}

interface ItemCarrinho extends Produto {
    quantidade: number
}

interface DadosCliente {
    nome: string
    telefone: string
    endereco: string
    tipo_entrega: 'retirada' | 'delivery'
    metodo_pagamento?: 'pix' | 'cartao' | 'dinheiro' | 'pagamento_posterior'
    precisa_troco: boolean
    valor_para_troco: string
    observacoes: string
    limite_credito?: number
    credito_utilizado?: number
}

export default function CardapioPublicoPage() {
    const supabase = createClient()
    const { showToast } = useToast()
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
    const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
    const [mostrarCarrinho, setMostrarCarrinho] = useState(false)
    const [mostrarCheckout, setMostrarCheckout] = useState(false)
    const [taxaEntrega, setTaxaEntrega] = useState(0)
    const [loading, setLoading] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null)
    const [modoComplemento, setModoComplemento] = useState(false)
    const [pedidoComplementoNumero, setPedidoComplementoNumero] = useState<number | null>(null)
    const [carrinhoCarregado, setCarrinhoCarregado] = useState(false)

    // Controle de adição de itens por status do pedido
    const [verificandoStatus, setVerificandoStatus] = useState(false)
    const [mostrarModalBloqueio, setMostrarModalBloqueio] = useState(false)
    const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false)
    const [mostrarModalWhatsAppCancela, setMostrarModalWhatsAppCancela] = useState(false)
    const [statusCancelamento, setStatusCancelamento] = useState<'verificando' | 'cancelando' | null>(null)
    const [mostrarConfirmacaoCancelamento, setMostrarConfirmacaoCancelamento] = useState(false)
    const [confirmacoMinimizada, setConfirmacoMinimizada] = useState(false)
    const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null)
    const [solicitacaoStatus, setSolicitacaoStatus] = useState<'pendente' | 'autorizado' | 'recusado' | null>(null)
    const [orderStatus, setOrderStatus] = useState<string | null>(null) // Novo estado para status real-time
    const solicitacaoChannelRef = useRef<any>(null)
    const orderStatusStatusRef = useRef<any>(null) // Ref para listener do status do pedido

    // Customer identification
    const [mostrarIdentificacao, setMostrarIdentificacao] = useState(false)
    const [clienteId, setClienteId] = useState<string | null>(null)
    const [tipoCliente, setTipoCliente] = useState<'credito' | 'informal' | null>(null)
    const [isPromoOpen, setIsPromoOpen] = useState(false)
    const [animations, setAnimations] = useState<any[]>([])
    const cartIconRef = useRef<HTMLDivElement>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [promoSettings, setPromoSettings] = useState({
        isActive: false,
        title: "",
        productName: "",
        description: "",
        price: 0,
        image: "",
        badgeText: ""
    })

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const [configuracao, setConfiguracao] = useState({
        nome_restaurante: 'Cardápio Online',
        logo_url: '',
        taxa_entrega_padrao: 0,
        chave_pix: '',
        whatsapp_loja: '',
        layout_cardapio: 'padrao',
        banner_url: '',
        banner_titulo: 'SABOR PREMIUM',
        banner_subtitulo: 'O melhor espetinho da cidade em um ambiente exclusivo.'
    })

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

    // Carregar carrinho do localStorage
    useEffect(() => {
        const carrinhoSalvo = localStorage.getItem('carrinho')
        if (carrinhoSalvo) {
            try {
                setCarrinho(JSON.parse(carrinhoSalvo))
            } catch (e) {
                console.error('Erro ao carregar carrinho:', e)
            }
        }
        setCarrinhoCarregado(true)
    }, [])

    // Salvar carrinho no localStorage
    useEffect(() => {
        if (carrinhoCarregado) {
            localStorage.setItem('carrinho', JSON.stringify(carrinho))
        }
    }, [carrinho, carrinhoCarregado])

    useEffect(() => {
        loadProdutos()
        loadConfiguracao()
        checkClienteSession()
        restoreActiveOrder()
    }, [])

    async function restoreActiveOrder() {
        const activeOrderStr = localStorage.getItem('activeOrder')
        if (activeOrderStr) {
            try {
                const activeOrder = JSON.parse(activeOrderStr)
                if (activeOrder && activeOrder.numero) {
                    // Verificar status atual no banco
                    const { data: pedido } = await supabase
                        .from('pedidos_online')
                        .select('status, tipo_entrega')
                        .eq('numero_pedido', activeOrder.numero)
                        .maybeSingle()

                    if (pedido && pedido.status !== 'cancelado') {
                        setPedidoConfirmado(activeOrder.numero)
                        setOrderStatus(pedido.status)
                        setDadosCliente(prev => ({ ...prev, tipo_entrega: pedido.tipo_entrega as any }))
                        setupOrderStatusListener(activeOrder.numero)
                    } else {
                        // Se estiver cancelado, limpa a persistência
                        localStorage.removeItem('activeOrder')
                    }
                }
            } catch (e) {
                console.error('Erro ao restaurar pedido ativo:', e)
            }
        }
    }

    function setupOrderStatusListener(numeroPedido: number) {
        if (orderStatusStatusRef.current) {
            supabase.removeChannel(orderStatusStatusRef.current)
        }

        const ch = supabase
            .channel(`order_status_${numeroPedido}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pedidos_online',
                    filter: `numero_pedido=eq.${numeroPedido}`
                },
                (payload) => {
                    const novoStatus = (payload.new as any).status
                    setOrderStatus(novoStatus)

                    if (['cancelado', 'entregue'].includes(novoStatus)) {
                        // Aguarda um pouco antes de mostrar a opção de novo pedido ou resetar
                        setTimeout(() => {
                            if (novoStatus === 'cancelado') {
                                showToast('info', 'Pedido Cancelado', 'Este pedido foi cancelado.')
                                resetarEstadoTotal()
                            }
                        }, 2000)
                    }
                }
            )
            .subscribe()

        orderStatusStatusRef.current = ch
    }

    async function checkClienteSession() {
        // Verificar se há sessão de cliente salva
        const savedClienteId = sessionStorage.getItem('clienteId')
        const savedTipoCliente = sessionStorage.getItem('tipoCliente') as 'credito' | 'informal' | null

        if (savedClienteId) {
            setClienteId(savedClienteId)
            // Sempre re-sincroniza tipo_cliente do banco (pode ter mudado desde o último login)
            await loadClienteData(savedClienteId)
        } else {
            // Verificar se há usuário autenticado (cliente crédito)
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

    async function loadProdutos() {
        setLoading(true)
        const { data } = await supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true)
            .order('categoria', { ascending: true })
            .order('nome', { ascending: true })

        if (data) {
            setProdutos(data)
        }
        setLoading(false)
    }

    async function loadConfiguracao() {
        const { data } = await supabase
            .from('configuracoes')
            .select('*')
            .maybeSingle()

        if (data) {
            setConfiguracao({
                nome_restaurante: data.nome_restaurante || 'Cardápio Online',
                logo_url: data.logo_url || '',
                taxa_entrega_padrao: data.taxa_entrega_padrao || 0,
                chave_pix: data.chave_pix || '',
                whatsapp_loja: data.whatsapp_loja || '',
                layout_cardapio: data.layout_cardapio || 'padrao',
                banner_url: data.banner_url || '',
                banner_titulo: data.banner_titulo || 'SABOR PREMIUM',
                banner_subtitulo: data.banner_subtitulo || 'O melhor espetinho da cidade em um ambiente exclusivo.'
            })
            setTaxaEntrega(data.taxa_entrega_padrao || 0)

            // Atualizar Promoção
            if (data.promo_ativa) {
                setPromoSettings({
                    isActive: data.promo_ativa,
                    title: data.promo_titulo || '',
                    productName: data.promo_produto_nome || '',
                    description: data.promo_descricao || '',
                    price: Number(data.promo_preco) || 0,
                    image: data.promo_imagem_url || '',
                    badgeText: data.promo_badge_texto || ''
                })

                // Tentar abrir após carregar, respeitando a sessão dinâmica
                setTimeout(() => {
                    const sessionKey = `kalPromoSeen_${data.promo_titulo || 'default'}`
                    const hasSeenPromo = sessionStorage.getItem(sessionKey)
                    if (!hasSeenPromo) {
                        setIsPromoOpen(true)
                    }
                }, 1500)
            }
        }
    }

    const categorias = ['todas', ...Array.from(new Set(produtos.map(p => p.categoria)))]

    const produtosFiltrados = categoriaFiltro === 'todas'
        ? produtos
        : produtos.filter(p => p.categoria === categoriaFiltro)

    function adicionarAoCarrinho(produto: Produto) {
        const itemExistente = carrinho.find(item => item.id === produto.id)

        if (itemExistente) {
            setCarrinho(carrinho.map(item =>
                item.id === produto.id
                    ? { ...item, quantidade: item.quantidade + 1 }
                    : item
            ))
        } else {
            setCarrinho([...carrinho, { ...produto, quantidade: 1 }])
        }
        showToast('success', 'Adicionado ao carrinho', `${produto.nome} foi adicionado!`)
    }

    function alterarQuantidade(produtoId: string, delta: number) {
        setCarrinho(carrinho.map(item => {
            if (item.id === produtoId) {
                const novaQuantidade = item.quantidade + delta
                return novaQuantidade > 0 ? { ...item, quantidade: novaQuantidade } : item
            }
            return item
        }).filter(item => item.quantidade > 0))
    }

    function removerDoCarrinho(produtoId: string) {
        setCarrinho(carrinho.filter(item => item.id !== produtoId))
    }

    // Verifica o status do pedido antes de permitir adicionar itens
    async function handleAdicionarItens(numeroPedido: number) {
        setVerificandoStatus(true)
        try {
            const { data: pedido, error } = await supabase
                .from('pedidos_online')
                .select('status, id, cliente_nome, metodo_pagamento')
                .eq('numero_pedido', numeroPedido)
                .maybeSingle()

            if (error || !pedido) {
                showToast('error', 'Erro', 'Não foi possível verificar o status do pedido.')
                return
            }

            const statusPermitidos = ['pendente', 'confirmado']
            if (statusPermitidos.includes(pedido.status)) {
                setModoComplemento(true)
                setPedidoComplementoNumero(numeroPedido)
                setPedidoConfirmado(null)
                // Preservar o método de pagamento original
                setDadosCliente(prev => ({
                    ...prev,
                    metodo_pagamento: pedido.metodo_pagamento as any
                }))
            } else {
                const nomeCliente = dadosCliente.nome || pedido.cliente_nome || 'Cliente'
                const { data: solicitacao, error: solErr } = await supabase
                    .from('solicitacoes_item')
                    .insert({
                        pedido_numero: numeroPedido,
                        pedido_id: pedido.id,
                        cliente_nome: nomeCliente,
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
                                setMostrarModalBloqueio(false)
                                setSolicitacaoId(null)
                                setSolicitacaoStatus(null)
                                supabase.removeChannel(ch)
                                solicitacaoChannelRef.current = null
                                // Ativa modo complemento mas MANTÉM o écran de confirmação
                                // para que o cliente possa ver e abrir o carrinho
                                setModoComplemento(true)
                                setPedidoComplementoNumero(numeroPedido)
                                setDadosCliente(prev => ({
                                    ...prev,
                                    metodo_pagamento: pedido.metodo_pagamento as any
                                }))
                                // REMOVIDO: Abre o carrinho automaticamente para o cliente escolher itens
                                // setMostrarCarrinho(true)
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

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0)
    const taxaAplicada = dadosCliente.tipo_entrega === 'delivery' ? taxaEntrega : 0
    const total = subtotal + taxaAplicada


    const resetarEstadoTotal = () => {
        setPedidoConfirmado(null)
        setCarrinho([]) // Limpar o carrinho para o novo pedido
        setMostrarModalNovoPedido(false)
        setMostrarModalWhatsAppCancela(false)
        setMostrarConfirmacaoCancelamento(false)
        setStatusCancelamento(null)
        setMostrarModalBloqueio(false)
        setSolicitacaoId(null)
        setSolicitacaoStatus(null)
        setModoComplemento(false)
        setPedidoComplementoNumero(null)
        localStorage.removeItem('activeOrder') // Limpar pedido ativo
        if (orderStatusStatusRef.current) {
            supabase.removeChannel(orderStatusStatusRef.current)
            orderStatusStatusRef.current = null
        }
        if (solicitacaoChannelRef.current) {
            supabase.removeChannel(solicitacaoChannelRef.current)
            solicitacaoChannelRef.current = null
        }
        // Preserva nome, telefone e dados de crédito para o próximo pedido
        setDadosCliente(prev => ({
            ...prev,
            metodo_pagamento: undefined,
            precisa_troco: false,
            valor_para_troco: '',
            observacoes: ''
        }))
    }

    const handleCancelarPedido = async (numero: number) => {
        try {
            setStatusCancelamento('verificando')
            const { data, error } = await supabase
                .from('pedidos_online')
                .select('status')
                .eq('numero_pedido', numero)
                .single()

            if (error) throw error

            if (data.status === 'pendente' || data.status === 'confirmado') {
                setStatusCancelamento('cancelando')
                const { error: updateError } = await supabase
                    .from('pedidos_online')
                    .update({
                        status: 'cancelado',
                        observacoes: 'Cancelado pelo cliente'
                    })
                    .eq('numero_pedido', numero)

                if (updateError) throw updateError

                // Disparar Webhook para Cancelamento pelo Cliente
                supabase
                    .from('pedidos_online')
                    .select('*')
                    .eq('numero_pedido', numero)
                    .single()
                    .then(({ data: fullOrder }) => {
                        if (fullOrder) {
                            sendOrderWebhook('order_status_update', fullOrder, 'cancelado');
                        }
                    });

                resetarEstadoTotal()
            } else {
                // Em preparacao, pronto, etc.
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

    const confirmacaoScreen = pedidoConfirmado && !(modoComplemento && confirmacoMinimizada) ? (
        <div className={styles.confirmacao}>
            <div className={styles.confirmacaoCard}>
                <div className={styles.confirmacaoIcone}>{modoComplemento ? '🛒' : '✓'}</div>
                <h1>{modoComplemento ? 'Adicionar Itens' : 'Pedido Recebido'}</h1>

                <div className={styles.pedidoHeader}>
                    <p className={styles.numeroPedido}>
                        Pedido <strong>#{pedidoConfirmado}</strong>
                    </p>
                    {!modoComplemento && (
                        <button
                            className={styles.botaoComplemento}
                            disabled={verificandoStatus}
                            onClick={() => handleAdicionarItens(pedidoConfirmado!)}
                        >
                            {verificandoStatus ? '⏳ Verificando...' : '+ Adicionar Itens'}
                        </button>
                    )}
                </div>

                {modoComplemento ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                        <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                            Adição autorizada pelo atendente!
                        </p>
                        <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            Escolha os itens no carrinho e confirme para adicionar ao pedido.
                        </p>
                        {carrinho.length > 0 && (
                            <button
                                onClick={() => setMostrarCarrinho(true)}
                                style={{
                                    padding: '0.75rem 2rem',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    margin: '0 auto'
                                }}
                            >
                                🛒 Abrir Carrinho e Finalizar
                            </button>
                        )}
                        <button
                            onClick={() => setConfirmacoMinimizada(true)}
                            style={{
                                marginTop: '0.75rem',
                                padding: '0.6rem 1.5rem',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: '#78350f',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                border: 'none',
                                borderRadius: '2rem',
                                cursor: 'pointer',
                                display: 'block',
                                margin: '0.75rem auto 0'
                            }}
                        >
                            + Adicionar mais itens ao pedido
                        </button>
                    </div>
                ) : (
                    <>
                        <p>Seu pedido foi recebido aguarde as próximas etapas pelo Whatsapp.</p>
                        <p className={styles.textoSecundario}>
                            {dadosCliente.tipo_entrega === 'delivery'
                                ? 'voce deverá receber seu pedido em breve...'
                                : 'Você pode retirar seu pedido em breve...'}
                        </p>
                        {tipoCliente === 'credito' && dadosCliente.limite_credito && (
                            <div style={{
                                marginTop: '-0.3rem',
                                padding: '0.4rem 1.5rem',
                                background: '#1c1c1c',
                                borderRadius: '10px',
                                border: '1px solid #333',
                                display: 'block',
                                width: '90%',
                                margin: '-0.3rem auto 0.4rem'
                            }}>
                                <p style={{ fontSize: '0.65rem', color: '#999', marginBottom: '0.05rem' }}>Seu Limite Restante</p>
                                <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#22c55e' }}>
                                    R$ {((dadosCliente.limite_credito || 0) - (dadosCliente.credito_utilizado || 0)).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Modal de bloqueio de adição de itens */}
                {mostrarModalBloqueio && (
                    <div style={{
                        marginTop: '0.4rem',
                        padding: '0.4rem',
                        borderRadius: '10px',
                        border: solicitacaoStatus === 'recusado' ? '2px solid #ef4444' : '2px solid #f59e0b',
                        background: solicitacaoStatus === 'recusado' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        textAlign: 'center'
                    }}>
                        {solicitacaoStatus === 'pendente' && (
                            <>
                                <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>⏳</div>
                                <p style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.72rem', marginBottom: '0.1rem' }}>
                                    Item não pode ser adicionado agora
                                </p>
                                <p style={{ color: '#ccc', fontSize: '0.64rem', marginBottom: '0.2rem' }}>
                                    Seu pedido já está em preparação. Uma solicitação foi enviada ao atendente.
                                </p>
                                <p style={{ color: '#f59e0b', fontSize: '0.6rem', animation: 'pulse 2s infinite' }}>
                                    🔔 Aguardando autorização do atendente...
                                </p>
                                <p style={{ color: '#888', fontSize: '0.58rem', marginTop: '0.1rem' }}>
                                    Caso prefira, chame o atendente pessoalmente.
                                </p>
                            </>
                        )}
                        {solicitacaoStatus === 'recusado' && (
                            <>
                                <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>❌</div>
                                <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.72rem', marginBottom: '0.1rem' }}>
                                    Adição não autorizada
                                </p>
                                <p style={{ color: '#ccc', fontSize: '0.64rem' }}>
                                    O atendente não pôde autorizar a adição do item. Por favor, chame o atendente para mais informações.
                                </p>
                                <button
                                    onClick={() => { setMostrarModalBloqueio(false); setSolicitacaoStatus(null) }}
                                    style={{ marginTop: '0.35rem', padding: '0.25rem 0.8rem', borderRadius: '8px', background: '#ef4444', color: '#fff', fontWeight: 'bold', fontSize: '0.7rem', border: 'none', cursor: 'pointer' }}
                                >
                                    Fechar
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Botão Cancelar Pedido e Voltar ao Início */}
                {!modoComplemento && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            className={styles.botaoCancelarDireto}
                            onClick={() => setMostrarConfirmacaoCancelamento(true)}
                            disabled={statusCancelamento !== null}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#f87171',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                borderRadius: '0.75rem',
                                cursor: statusCancelamento ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {statusCancelamento === 'verificando' ? '⏳ Verificando...' :
                                statusCancelamento === 'cancelando' ? '🔴 Cancelando...' :
                                    '❌ Cancelar Pedido'}
                        </button>
                    </div>
                )}

                {/* Modal de Confirmação de Cancelamento */}
                {mostrarConfirmacaoCancelamento && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{
                            background: '#1c1c1c',
                            borderRadius: '1.5rem',
                            padding: '2rem',
                            maxWidth: '400px',
                            width: '100%',
                            textAlign: 'center',
                            border: '1px solid #ef4444',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{
                                width: '60px', height: '60px', margin: '0 auto 1.5rem',
                                background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                            <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                                Deseja mesmo cancelar este pedido?
                            </h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                Esta ação não poderá ser desfeita após a confirmação.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    onClick={() => {
                                        setMostrarConfirmacaoCancelamento(false)
                                        handleCancelarPedido(pedidoConfirmado!)
                                    }}
                                    style={{
                                        padding: '0.85rem',
                                        background: '#ef4444',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Confirmar (Sim)
                                </button>
                                <button
                                    onClick={() => setMostrarConfirmacaoCancelamento(false)}
                                    style={{
                                        padding: '0.85rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #444',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Voltar (Não)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status em tempo real */}
                {pedidoConfirmado && orderStatus && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Status do seu pedido:</p>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.4rem 1.2rem',
                            borderRadius: '2rem',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background:
                                orderStatus === 'pendente' ? 'rgba(245, 158, 11, 0.1)' :
                                    orderStatus === 'confirmado' ? 'rgba(59, 130, 246, 0.1)' :
                                        orderStatus === 'preparando' ? 'rgba(139, 92, 246, 0.1)' :
                                            orderStatus === 'pronto' ? 'rgba(34, 197, 94, 0.1)' :
                                                orderStatus === 'saiu_para_entrega' ? 'rgba(234, 179, 8, 0.1)' :
                                                    orderStatus === 'entregue' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.1)',
                            color:
                                orderStatus === 'pendente' ? '#f59e0b' :
                                    orderStatus === 'confirmado' ? '#3b82f6' :
                                        orderStatus === 'preparando' ? '#8b5cf6' :
                                            orderStatus === 'pronto' ? '#22c55e' :
                                                orderStatus === 'saiu_para_entrega' ? '#eab308' :
                                                    orderStatus === 'entregue' ? '#22c55e' : '#fff',
                            border: `1px solid ${orderStatus === 'pendente' ? 'rgba(245, 158, 11, 0.3)' :
                                orderStatus === 'confirmado' ? 'rgba(59, 130, 246, 0.3)' :
                                    orderStatus === 'preparando' ? 'rgba(139, 92, 246, 0.3)' :
                                        orderStatus === 'pronto' ? 'rgba(34, 197, 94, 0.3)' :
                                            orderStatus === 'saiu_para_entrega' ? 'rgba(234, 179, 8, 0.3)' :
                                                orderStatus === 'entregue' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'
                                }`
                        }}>
                            {orderStatus === 'pendente' && '⏳ Aguardando confirmação'}
                            {orderStatus === 'confirmado' && '✅ Confirmado'}
                            {orderStatus === 'preparando' && '👨‍🍳 Em preparação'}
                            {orderStatus === 'pronto' && '✅ Pronto para retirada!'}
                            {orderStatus === 'saiu_para_entrega' && '🛵 Saiu para entrega'}
                            {orderStatus === 'entregue' && '🏁 Entregue! Bom apetite!'}
                            {(!['pendente', 'confirmado', 'preparando', 'saiu_para_entrega', 'entregue', 'pronto'].includes(orderStatus)) && `Status: ${orderStatus}`}
                        </div>

                        {orderStatus === 'entregue' && (
                            <button
                                onClick={resetarEstadoTotal}
                                style={{
                                    marginTop: '1.5rem',
                                    width: '100%',
                                    padding: '0.85rem',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '0.95rem',
                                    border: 'none',
                                    borderRadius: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Fazer um novo pedido
                            </button>
                        )}
                    </div>
                )}

                {/* Popup de confirmacao novo pedido - REMOVIDO pois agora o fluxo é fixo */}

                {/* Popup de Contato WhatsApp para Cancelamento */}
                {!modoComplemento && mostrarModalWhatsAppCancela && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        backdropFilter: 'blur(8px)'
                    }}>
                        <div style={{
                            background: '#1c1c1c',
                            borderRadius: '1.25rem',
                            padding: '2.5rem 2rem',
                            maxWidth: '480px',
                            width: '100%',
                            textAlign: 'center',
                            border: '1px solid #4ade80',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(74, 222, 128, 0.1)'
                        }}>
                            <div style={{
                                width: '64px', height: '64px', margin: '0 auto 1.25rem',
                                background: 'rgba(74, 222, 128, 0.1)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                            </div>
                            <h3 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                                Entre em contato com o Kal Espetinhos
                            </h3>

                            <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem', textAlign: 'left' }}>
                                Seu pedido já está sendo preparado! Mas se deseja cancelar para adicionar um item, clique no botão para "Adicionar mais itens" e mantenha seu pedido atual com mais este novo item.
                            </p>

                            <p style={{ color: '#ef4444', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem', textAlign: 'left', fontWeight: '500', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                                Se quiser cancelar mesmo, entre em contato pelo Whatsapp porque já estamos preparando e nos informe o motivo.
                            </p>

                            <a
                                href="https://wa.me/5573981481349"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    padding: '1rem',
                                    background: '#25D366',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '1.05rem',
                                    border: 'none',
                                    borderRadius: '0.75rem',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    marginBottom: '1rem'
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                <span>Falar no Whatsapp</span>
                            </a>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button
                                    onClick={() => {
                                        setMostrarModalWhatsAppCancela(false)
                                        handleAdicionarItens(pedidoConfirmado!)
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem',
                                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                        color: '#78350f',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        border: 'none',
                                        borderRadius: '0.75rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Adicionar mais itens
                                </button>
                                <button
                                    onClick={() => setMostrarModalWhatsAppCancela(false)}
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem',
                                        background: 'transparent',
                                        color: '#aaa',
                                        fontWeight: '600',
                                        fontSize: '0.85rem',
                                        border: '1px solid #444',
                                        borderRadius: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Voltar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    // Data mapping
    const kalMenuItems = produtos.map(p => ({
        id: p.id,
        name: p.nome,
        description: p.descricao || '',
        price: p.preco,
        category: p.categoria as any,
        image: p.imagem_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300',
        popular: false
    }))

    const filteredItems = categoriaFiltro === 'todas'
        ? kalMenuItems
        : kalMenuItems.filter(item => item.category === categoriaFiltro);

    const highlights = kalMenuItems.filter(item => item.popular);
    const cartCount = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

    const handleAddToCartAnim = (item: any, event?: React.MouseEvent) => {
        if (event && cartIconRef.current) {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const newAnim = { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, image: item.image };
            setAnimations(prev => [...prev, newAnim]);
            setTimeout(() => setAnimations(prev => prev.filter(a => a.id !== newAnim.id)), 800);
        }

        const produtoOriginal = produtos.find(p => p.id === item.id);
        if (produtoOriginal) adicionarAoCarrinho(produtoOriginal);
    }

    if (!isMounted) return null;

    return (
        <div className="kal-bg min-h-screen text-neutral-200 font-sans pb-20 overflow-x-hidden relative">
            {confirmacaoScreen}

            <div style={{ display: (pedidoConfirmado && !confirmacoMinimizada) ? 'none' : 'block' }}>
                {/* Banner de modo complemento - aparece quando o overlay está minimizado */}
                {modoComplemento && confirmacoMinimizada && (
                    <div style={{
                        position: 'sticky',
                        top: '64px',
                        zIndex: 35,
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        padding: '0.75rem 1.5rem',
                        borderBottom: '2px solid #d97706',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <p style={{ margin: 0, color: '#78350f', fontWeight: '600', fontSize: '0.9rem' }}>
                            🛒 <strong>Modo Complemento</strong> — Selecione os itens desejados no cardápio
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {carrinho.length > 0 && (
                                <button
                                    onClick={() => { setConfirmacoMinimizada(false); setMostrarCarrinho(true) }}
                                    style={{ padding: '0.4rem 1rem', background: '#22c55e', color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', borderRadius: '1rem', cursor: 'pointer' }}
                                >
                                    Finalizar ({carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'})
                                </button>
                            )}
                            <button
                                onClick={() => setConfirmacoMinimizada(false)}
                                style={{ padding: '0.4rem 1rem', background: 'rgba(0,0,0,0.3)', color: '#fff', fontWeight: '600', fontSize: '0.85rem', border: 'none', borderRadius: '1rem', cursor: 'pointer' }}
                            >
                                Ver tela anterior
                            </button>
                        </div>
                    </div>
                )}

                {/* Header / Nav */}
                <nav className="fixed top-0 w-full z-30 bg-neutral-950 border-b border-neutral-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            {/* Logo + Location */}
                            <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                <div className="bg-orange-600 p-1.5 rounded-md shadow-neon"><Flame className="text-white" size={20} fill="currentColor" /></div>
                                <div className="flex flex-col justify-center leading-none">
                                    <h1 className="text-lg sm:text-xl font-display font-bold text-white tracking-widest uppercase">
                                        KAL DO <span className="text-orange-500">ESPETINHO</span>
                                    </h1>
                                    <p className="text-[10px] text-neutral-400 tracking-[0.18em] uppercase -mt-[8px]">Arataca - BA</p>
                                </div>
                            </div>

                            {/* Category tabs (desktop) */}
                            <div className="hidden md:flex items-center gap-5">
                                {categorias.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategoriaFiltro(cat)}
                                        className={`text-xs font-bold uppercase tracking-widest transition-colors ${categoriaFiltro === cat ? 'text-orange-500' : 'text-neutral-300 hover:text-white'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Right icons */}
                            <div className="flex items-center gap-4">
                                {tipoCliente && (
                                    <button className="text-neutral-400 hover:text-white" onClick={handleLogout} title="Sair / Trocar Usuário">
                                        <LogOut size={18} />
                                    </button>
                                )}
                                <div ref={cartIconRef} className="relative p-1.5 text-white hover:text-orange-500 transition-colors cursor-pointer" onClick={() => setMostrarCarrinho(true)}>
                                    <ShoppingBag size={24} />
                                    {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-neon">{cartCount}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Animation Layer */}
                <div className="fixed inset-0 pointer-events-none z-[100]">
                    {animations.map(anim => (
                        <div
                            key={anim.id}
                            className="fixed w-12 h-12 rounded-full border-2 border-orange-500 shadow-neon overflow-hidden z-[100]"
                            style={{ left: anim.x, top: anim.y, transform: 'translate(-50%, -50%)', animation: 'flyToCart 0.8s cubic-bezier(0.42, 0, 0.58, 1) forwards' }}
                        >
                            <img src={anim.image} alt="" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>

                <style>{`
                @keyframes flyToCart { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { left: calc(100vw - 40px); top: 40px; transform: translate(-50%, -50%) scale(0.2); opacity: 0.5; } } 
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

                {/* Hero */}
                <div className="relative mt-20 h-[40vh] sm:h-[50vh] w-full overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0">
                        <img 
                            src={configuracao.banner_url || "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2574&auto=format&fit=crop"} 
                            alt="Hero" 
                            className="w-full h-full object-cover opacity-40" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </div>
                    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                        <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-4 drop-shadow-2xl">
                            {configuracao.banner_titulo.split(' ').map((word, i) => (
                                i === configuracao.banner_titulo.split(' ').length - 1 ? (
                                    <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600"> {word}</span>
                                ) : <span key={i}> {word}</span>
                            ))}
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-8">
                            {configuracao.banner_subtitulo}
                        </p>
                    </div>
                </div>

                {/* Mobile Filter */}
                <div className="md:hidden sticky top-20 z-20 bg-black/95 border-b border-orange-900/30 overflow-x-auto py-4 px-4 scrollbar-hide">
                    <div className="flex gap-3">
                        {categorias.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoriaFiltro(cat)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${categoriaFiltro === cat ? 'bg-orange-600 border-orange-600 text-white' : 'border-neutral-800 text-neutral-400'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Menu Grid */}
                <main id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {highlights.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-xl font-display font-bold text-white mb-3 text-center sm:text-left border-l-4 border-red-600 pl-3">✨ Destaques</h2>
                            <div className="flex overflow-x-auto pb-2 gap-4 sm:gap-6 snap-x scrollbar-hide">
                                {highlights.map(item => <HighlightCard key={item.id} item={item} onAdd={handleAddToCartAnim} />)}
                            </div>
                            <hr className="border-neutral-800 mt-2" />
                        </div>
                    )}
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white border-l-4 border-orange-500 pl-4">
                            {categoriaFiltro === 'todas' ? 'Nosso Cardápio' : categoriaFiltro.charAt(0).toUpperCase() + categoriaFiltro.slice(1)}
                        </h2>
                    </div>

                    {loading ? (
                        <p className="text-center text-orange-500 animate-pulse py-10">Carregando cardápio...</p>
                    ) : filteredItems.length === 0 ? (
                        <p className="text-center text-neutral-500 py-10">Nenhum produto disponível nesta categoria.</p>
                    ) : (
                        <div className={`grid animate-fade-in-up ${configuracao.layout_cardapio === 'minimalista' ? 'grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
                            {filteredItems.map(item => (
                                <MenuCard
                                    key={item.id}
                                    item={item}
                                    onAdd={handleAddToCartAnim}
                                    variant={configuracao.layout_cardapio === 'minimalista' ? 'minimal' : 'standard'}
                                />
                            ))}
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="bg-neutral-950 border-t border-neutral-800 mt-12 py-8 text-center">
                    <p className="text-white font-display font-bold text-xl tracking-wider flex items-center justify-center gap-2">
                        <div className="bg-orange-600 p-1 rounded shadow-neon mr-1"><Flame className="text-white" size={16} fill="currentColor" /></div>
                        KAL DO <span className="text-orange-500">ESPETINHO</span>
                    </p>
                    <p className="text-neutral-400 text-[10px] uppercase tracking-[0.18em] -mt-[2px]">Arataca - BA</p>
                    <p className="text-neutral-600 text-xs mt-4">© 2026 Todos os direitos reservados.</p>
                </footer>
            </div>

            <CartSidebar
                isOpen={mostrarCarrinho}
                onClose={() => setMostrarCarrinho(false)}
                cart={carrinho.map(item => ({
                    ...item,
                    name: item.nome,
                    description: item.descricao || '',
                    price: item.preco,
                    category: item.categoria as any,
                    image: item.imagem_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300',
                    quantity: item.quantidade
                }))}
                onRemove={removerDoCarrinho}
                onUpdateQuantity={alterarQuantidade}
                whatsappNumber={configuracao.whatsapp_loja}
                pixKey={configuracao.chave_pix}
                deliveryFee={taxaEntrega}
                allowPayLater={tipoCliente === 'credito' || (dadosCliente.limite_credito !== undefined && dadosCliente.limite_credito > 0)}
                isComplement={modoComplemento}
                initialPaymentMethod={modoComplemento ? (() => {
                    const map: Record<string, string> = {
                        'pix': 'pix',
                        'cartao': 'credit_card',
                        'dinheiro': 'cash',
                        'pagamento_posterior': 'pay_later'
                    };
                    return map[dadosCliente.metodo_pagamento || ''] || 'pix';
                })() : undefined}
                limiteCredito={dadosCliente.limite_credito || 0}
                creditoUtilizado={dadosCliente.credito_utilizado || 0}
                initialCustomerName={dadosCliente.nome}
                initialCustomerPhone={dadosCliente.telefone}
                onPlaceOrder={async (order) => {
                    const subtotal = order.total - (order.deliveryFee || 0)
                    const taxaAplicada = order.deliveryFee || 0
                    setEnviando(true)
                    try {
                        let paymentMapped = 'dinheiro'
                        if (order.customer.paymentMethod === 'pix') paymentMapped = 'pix'
                        if (order.customer.paymentMethod === 'credit_card' || order.customer.paymentMethod === 'debit_card') paymentMapped = 'cartao'
                        if (order.customer.paymentMethod === 'pay_later') paymentMapped = 'pagamento_posterior'

                        let tipoEntregaMapped = 'retirada'
                        if (order.customer.deliveryMethod === 'delivery') {
                            tipoEntregaMapped = 'delivery'
                        }

                        let enderecoCompleto = null
                        if (tipoEntregaMapped === 'delivery') {
                            enderecoCompleto = `${order.customer.address.street}, ${order.customer.address.number}`
                            if (order.customer.address.neighborhood) enderecoCompleto += ` - ${order.customer.address.neighborhood}`
                            if (order.customer.address.complement) enderecoCompleto += ` (${order.customer.address.complement})`
                        }

                        let obs = order.customer.observations || ''
                        if (order.customer.deliveryMethod === 'table' && order.customer.tableNumber) {
                            obs = `[Mesa ${order.customer.tableNumber}] ${obs}`
                        }

                        const itensPedido = carrinho.map(item => ({
                            id: item.id,
                            nome: item.nome,
                            quantidade: item.quantidade,
                            preco: item.preco,
                            subtotal: item.preco * item.quantidade
                        }))

                        if (modoComplemento && pedidoComplementoNumero) {
                            const { data: pedidoOriginal, error: fetchError } = await supabase
                                .from('pedidos_online')
                                .select('*')
                                .eq('numero_pedido', pedidoComplementoNumero)
                                .maybeSingle()

                            if (fetchError || !pedidoOriginal) throw new Error('Pedido original não encontrado.')

                            const novosItens = [...pedidoOriginal.itens, ...itensPedido]
                            const novoSubtotal = pedidoOriginal.subtotal + subtotal
                            const novoTotal = pedidoOriginal.total + subtotal

                            const complemento = {
                                data: new Date().toISOString(),
                                itens: itensPedido,
                                subtotal: subtotal,
                                total: subtotal
                            }

                            const historico = Array.isArray(pedidoOriginal.historico_complementos)
                                ? [...pedidoOriginal.historico_complementos, complemento]
                                : [complemento]

                            const { error: updateError } = await supabase
                                .from('pedidos_online')
                                .update({
                                    itens: novosItens,
                                    subtotal: novoSubtotal,
                                    total: novoTotal,
                                    historico_complementos: historico
                                })
                                .eq('id', pedidoOriginal.id)

                            if (updateError) throw updateError

                            // Webhook para Complemento
                            await sendOrderWebhook('delivery_order', {
                                ...pedidoOriginal,
                                itens: novosItens,
                                subtotal: novoSubtotal,
                                total: novoTotal
                            });

                            setModoComplemento(false)
                            setPedidoComplementoNumero(null)
                            setCarrinho([])
                            localStorage.removeItem('carrinho')
                            setMostrarCarrinho(false)
                            setPedidoConfirmado(pedidoComplementoNumero)
                            setOrderStatus(pedidoOriginal.status) // Manter status atual

                            // Persistir pedido ativo e iniciar listener
                            localStorage.setItem('activeOrder', JSON.stringify({ numero: pedidoComplementoNumero }))
                            setupOrderStatusListener(pedidoComplementoNumero)

                            if (clienteId && tipoCliente === 'credito') {
                                await loadClienteData(clienteId)
                            }

                            // Garantir que tipo_entrega esteja correto para a mensagem
                            setDadosCliente(prev => ({ ...prev, tipo_entrega: pedidoOriginal.tipo_entrega as any }))

                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        } else {
                            const { data, error } = await supabase
                                .from('pedidos_online')
                                .insert({
                                    cliente_id: clienteId,
                                    cliente_nome: order.customer.customerName,
                                    cliente_telefone: order.customer.customerPhone,
                                    cliente_endereco: enderecoCompleto,
                                    tipo_entrega: tipoEntregaMapped,
                                    metodo_pagamento: paymentMapped,
                                    precisa_troco: order.customer.needChange,
                                    valor_para_troco: order.customer.needChange ? parseFloat(order.customer.changeFor.replace(/[^0-9,.]/g, '').replace(',', '.')) : null,
                                    itens: itensPedido,
                                    subtotal: subtotal,
                                    taxa_entrega: taxaAplicada,
                                    total: subtotal + taxaAplicada,
                                    observacoes: obs || null,
                                    status: 'pendente'
                                })
                                .select('*')
                                .single()

                            if (error) throw error

                            // Webhook para Novo Pedido
                            if (data) {
                                await sendOrderWebhook('delivery_order', data);
                            }

                            setPedidoConfirmado(data.numero_pedido)
                            setOrderStatus('pendente') // Inicializa status
                            setCarrinho([])
                            localStorage.removeItem('carrinho')
                            setMostrarCarrinho(false)

                            // Persistir pedido ativo e iniciar listener
                            localStorage.setItem('activeOrder', JSON.stringify({ numero: data.numero_pedido }))
                            setupOrderStatusListener(data.numero_pedido)

                            if (clienteId && tipoCliente === 'credito') {
                                await loadClienteData(clienteId)
                            }

                            // Garantir que tipo_entrega esteja correto para a mensagem
                            setDadosCliente(prev => ({
                                ...prev,
                                nome: order.customer.customerName,
                                telefone: order.customer.customerPhone,
                                tipo_entrega: tipoEntregaMapped as any
                            }))

                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                    } catch (error) {
                        console.error(error)
                        showToast('error', 'Erro', 'Ocorreu um erro ao processar seu pedido.')
                    } finally {
                        setEnviando(false)
                    }
                }}
            />

            <ClienteIdentificationModal
                isOpen={mostrarIdentificacao}
                onClienteIdentified={handleClienteIdentified}
            />

            <PromoPopup
                isOpen={isPromoOpen}
                onClose={() => {
                    setIsPromoOpen(false)
                    const sessionKey = `kalPromoSeen_${promoSettings.title || 'default'}`
                    sessionStorage.setItem(sessionKey, 'true')
                }}
                settings={promoSettings as any}
                onAddToCart={(item) => {
                    // Mapeia o item da promo para o formato do produto
                    const promoProd: Produto = {
                        id: item.id,
                        nome: item.name,
                        descricao: item.description,
                        preco: item.price,
                        categoria: 'Destaques',
                        ativo: true
                    }
                    adicionarAoCarrinho(promoProd)
                    setIsPromoOpen(false)
                    const sessionKey = `kalPromoSeen_${promoSettings.title || 'default'}`
                    sessionStorage.setItem(sessionKey, 'true')
                }}
            />

            <GeminiAssistant systemInstruction={"Você é um assistente da Nita Quentinhas."} menuItems={kalMenuItems} />
        </div>
    )
}
