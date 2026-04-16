'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Clock, Phone, MapPin, Package, CheckCircle, XCircle, AlertCircle, Truck, Trash2, ShoppingBag, CreditCard, Banknote, Printer, Wallet, Pencil, Save, X, Plus } from 'lucide-react'
import styles from './page.module.css'
import { sendOrderWebhook } from '@/utils/webhook'
import clsx from 'clsx'


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
    metodo_pagamento?: string | null
    pagamento_principal_valor?: number | null
    pagamento_secundario_metodo?: string | null
    pagamento_secundario_valor?: number | null
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
    garcom_nome?: string | null
    garcom_id?: string | null
    historico_complementos?: Array<{
        data: string
        itens: ItemPedido[]
        subtotal: number
        total: number
    }>
    mesaStr?: string
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
    pix: { label: 'PIX', color: '#00a868', icon: Wallet }, // Usando Wallet como fallback para PIX se o logo falhar
    cartao: { label: 'Cartão', color: '#3b82f6', icon: CreditCard },
    dinheiro: { label: 'Dinheiro', color: '#22c55e', icon: Banknote },
    credit_card: { label: 'Cartão de Crédito', color: '#3b82f6', icon: CreditCard },
    debit_card: { label: 'Cartão de Débito', color: '#3b82f6', icon: CreditCard },
    cash: { label: 'Dinheiro', color: '#22c55e', icon: Banknote },
    pagamento_posterior: { label: 'Pagamento Posterior', color: '#f59e0b', icon: Clock }
}

export default function PedidosPage() {
    const supabase = createClient()
    const searchParams = useSearchParams()
    const highlightId = searchParams.get('id')
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [filtroStatus, setFiltroStatus] = useState<string>('todos')
    const [loading, setLoading] = useState(true)
    const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    // Solicitações de item pendentes do cliente
    const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<Record<number, any[]>>({})
    const [configuracao, setConfiguracao] = useState<any>(null)
    const scrolledIdRef = useRef<string | null>(null)

    // Edit states
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState<Partial<Pedido>>({})
    const [produtosCadastrados, setProdutosCadastrados] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [itemQuantidade, setItemQuantidade] = useState(1)

    useEffect(() => {
        loadPedidos()
        loadConfiguracao()
        loadProdutos()

        // Criar elemento de áudio para notificação
        audioRef.current = new Audio('/login-sound.mp3')

        const cleanup = setupRealtimeSubscription()
        const cleanupSol = setupSolicitacoesSubscription()

        return () => {
            cleanup()
            cleanupSol()
        }
    }, [])

    useEffect(() => {
        if (highlightId && pedidos.length > 0 && scrolledIdRef.current !== highlightId) {
            // Pequeno delay para garantir que o DOM renderizou após o loading
            const timer = setTimeout(() => {
                const element = document.getElementById(`pedido-${highlightId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    scrolledIdRef.current = highlightId;
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [highlightId, pedidos])

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

    async function loadConfiguracao() {
        const { data } = await supabase
            .from('configuracoes')
            .select('*')
            .maybeSingle()

        if (data) {
            setConfiguracao(data)
        }
    }

    async function loadProdutos() {
        const { data } = await supabase
            .from('produtos')
            .select('id, nome, preco, imagem_url')
            .eq('ativo', true)
        if (data) setProdutosCadastrados(data)
    }

    function iniciarEdicao() {
        if (!pedidoSelecionado) return
        setIsEditing(true)
        let mesa = ''
        let obsLimpa = pedidoSelecionado.observacoes || ''
        const match = obsLimpa.match(/MESA:\s*([^\s\n]+)/i)
        if (match) {
            mesa = match[1]
            obsLimpa = obsLimpa.replace(/MESA:\s*[^\s\n]+/i, '').trim()
        }
        setEditData({
            ...pedidoSelecionado,
            observacoes: obsLimpa,
            mesaStr: mesa
        })
    }
    
    function cancelarEdicao() {
        setIsEditing(false)
        setEditData({})
        setSearchTerm('')
    }
    
    async function salvarEdicao() {
        if (!pedidoSelecionado) return
        
        let newObs = editData.observacoes || ''
        if (editData.tipo_entrega === 'retirada' && editData.mesaStr) {
            newObs = `MESA: ${editData.mesaStr} ${newObs}`.trim()
        }
        
        const { error } = await supabase.from('pedidos_online').update({
            tipo_entrega: editData.tipo_entrega,
            taxa_entrega: editData.taxa_entrega || 0,
            observacoes: newObs,
            itens: editData.itens,
            subtotal: editData.subtotal,
            total: editData.total,
            metodo_pagamento: editData.metodo_pagamento
        }).eq('id', pedidoSelecionado.id)
        
        if (!error) {
            setIsEditing(false)
            setSearchTerm('')
        } else {
            alert('Erro ao atualizar: ' + error.message)
        }
    }

    function handleAdicionarItemEdit(produto: any) {
        if (!editData.itens) return
        
        const newItem: ItemPedido = {
            id: produto.id || Math.random().toString(36).substring(7),
            nome: produto.nome,
            quantidade: itemQuantidade,
            preco: produto.preco,
            subtotal: produto.preco * itemQuantidade
        }
        
        const novosItens = [...editData.itens, newItem]
        const novoSubtotal = novosItens.reduce((acc, item) => acc + item.subtotal, 0)
        const novaTaxa = editData.tipo_entrega === 'delivery' ? (editData.taxa_entrega || 0) : 0
        const novoTotal = novoSubtotal + novaTaxa
        
        setEditData({
            ...editData,
            itens: novosItens,
            subtotal: novoSubtotal,
            total: novoTotal
        })
        
        setSearchTerm('')
        setItemQuantidade(1)
    }
    
    function removerItemEdit(idx: number) {
        if (!editData.itens) return
        const novosItens = [...editData.itens]
        novosItens.splice(idx, 1)
        
        const novoSubtotal = novosItens.reduce((acc, item) => acc + item.subtotal, 0)
        const novaTaxa = editData.tipo_entrega === 'delivery' ? (editData.taxa_entrega || 0) : 0
        const novoTotal = novoSubtotal + novaTaxa
        
        setEditData({
            ...editData,
            itens: novosItens,
            subtotal: novoSubtotal,
            total: novoTotal
        })
    }

    function handleTaxaChange(val: number) {
        setEditData(prev => ({
            ...prev,
            taxa_entrega: val,
            total: (prev.subtotal || 0) + val
        }))
    }

    function handleTipoEntregaChange(val: 'retirada' | 'delivery') {
        const novaTaxa = val === 'retirada' ? 0 : (editData.taxa_entrega || configuracao?.taxa_entrega || 0)
        setEditData(prev => ({
            ...prev,
            tipo_entrega: val,
            taxa_entrega: novaTaxa,
            total: (prev.subtotal || 0) + novaTaxa
        }))
    }

    const produtosFiltrados = searchTerm ? produtosCadastrados.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase())) : []

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
        } else {
            // Disparar Webhook para atualização de status
            supabase
                .from('pedidos_online')
                .select('*')
                .eq('id', pedidoId)
                .single()
                .then(({ data: fullOrder }) => {
                    if (fullOrder) {
                        sendOrderWebhook('order_status_update', fullOrder, novoStatus);
                    }
                });
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

    async function removerItemPedido(pedido: Pedido, itemIndex: number) {
        if (!confirm('Deseja remover este item do pedido?')) return

        const novosItens = [...pedido.itens]
        novosItens.splice(itemIndex, 1)

        const novoSubtotal = novosItens.reduce((acc, item) => acc + item.subtotal, 0)
        const novoTotal = novoSubtotal + pedido.taxa_entrega

        const { error } = await supabase
            .from('pedidos_online')
            .update({
                itens: novosItens,
                subtotal: novoSubtotal,
                total: novoTotal
            })
            .eq('id', pedido.id)

        if (error) {
            console.error('Erro ao remover item:', error)
            alert('Erro ao remover item do pedido')
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

    const statsFinanceiros = useMemo(() => {
        const agorinha = new Date()
        const dozeHorasAtras = new Date(agorinha.getTime() - 12 * 60 * 60 * 1000)

        const resumo = {
            cotaArtistica: { total: 0, pedidos: [] as number[] },
            gorjetasPorGarcom: {} as Record<string, { total: number, pedidos: number[] }>
        }

        pedidos.forEach(p => {
            const dataPedido = new Date(p.created_at)
            if (dataPedido < dozeHorasAtras) return

            const itensArray = Array.isArray(p.itens) ? p.itens : []
            
            itensArray.forEach((item: any) => {
                if (item.nome === 'Cota Artística') {
                    resumo.cotaArtistica.total += item.preco * (item.quantidade || 1)
                    if (!resumo.cotaArtistica.pedidos.includes(p.numero_pedido)) {
                        resumo.cotaArtistica.pedidos.push(p.numero_pedido)
                    }
                } else if (item.nome === 'Gorjeta') {
                    const nomeGarcom = p.garcom_nome || 'Caixa/Balcão'
                    if (!resumo.gorjetasPorGarcom[nomeGarcom]) {
                        resumo.gorjetasPorGarcom[nomeGarcom] = { total: 0, pedidos: [] }
                    }
                    resumo.gorjetasPorGarcom[nomeGarcom].total += item.preco * (item.quantidade || 1)
                    if (!resumo.gorjetasPorGarcom[nomeGarcom].pedidos.includes(p.numero_pedido)) {
                        resumo.gorjetasPorGarcom[nomeGarcom].pedidos.push(p.numero_pedido)
                    }
                }
            })
        })

        return resumo
    }, [pedidos])

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

        const logoUrl = configuracao?.comprovante_logo_url || configuracao?.logo_url || '';
        const msgRodape = configuracao?.comprovante_mensagem || 'Obrigado pela preferência!';

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
                        padding: 10px;
                        max-width: 400px;
                        margin: 0 auto;
                        color: #000;
                    }
                    .receiptHeader {
                        text-align: center;
                        margin-bottom: 10px;
                    }
                    .logoImage {
                        width: 70px;
                        height: 70px;
                        object-fit: cover;
                        border-radius: 50%;
                        margin: 0 auto 10px auto;
                        border: 2px solid #000;
                        display: block;
                    }
                    .storeName {
                        font-size: 1.1rem;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .orderNumber {
                        font-size: 1.3rem;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .statusPill {
                        display: inline-block;
                        padding: 2px 10px;
                        border-radius: 20px;
                        border: 2px solid #f59e0b;
                        color: #f59e0b;
                        background-color: #fef3c7;
                        font-weight: bold;
                        font-size: 0.8rem;
                    }
                    .dateTime {
                        text-align: center;
                        margin: 8px 0;
                        font-size: 0.85rem;
                        color: #333;
                    }
                    .greeting {
                        text-align: center;
                        margin-bottom: 10px;
                        font-size: 0.9rem;
                        font-weight: bold;
                    }
                    .section {
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        padding: 8px;
                        margin-bottom: 10px;
                        background-color: #fafafa;
                    }
                    .sectionTitle {
                        font-size: 0.95rem;
                        font-weight: bold;
                        margin-bottom: 6px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 5px;
                    }
                    .infoRow {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 4px;
                        font-size: 0.8rem;
                    }
                    .infoRow:last-child {
                        margin-bottom: 0;
                    }
                    .infoItem {
                        display: flex;
                        justify-content: space-between;
                        padding: 6px 0;
                        border-bottom: 1px dashed #eee;
                        font-size: 0.8rem;
                    }
                    .infoItem:last-child {
                        border-bottom: none;
                    }
                    .dashedSeparator {
                        border-top: 2px dashed #000;
                        margin: 20px 0;
                        position: relative;
                        text-align: center;
                    }
                    .cutInstruction {
                        background: #fff;
                        padding: 0 10px;
                        font-size: 0.8rem;
                        position: relative;
                        top: -9px;
                        color: #000;
                        font-weight: bold;
                    }
                    .secondPart {
                        margin-top: 5px;
                    }
                    .secondPartHeader {
                        text-align: center;
                        margin-bottom: 10px;
                    }
                    .secondPartTitle {
                        font-weight: bold;
                        font-size: 1.1rem;
                        margin: 5px 0;
                    }
                    .secondPartInfo {
                        font-size: 0.85rem;
                        margin-bottom: 3px;
                    }
                    @media print {
                        body {
                            padding: 0;
                            max-width: 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- Via Cliente -->
                <div class="receiptHeader">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logoImage" />` : ''}
                    <div class="orderNumber">Pedido #${pedido.numero_pedido}</div>
                    <span class="statusPill">${(STATUS_CONFIG[pedido.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente).label}</span>
                    
                    <div class="dateTime">
                        ${formatarData(pedido.created_at).replace(',', ' —')}
                    </div>
                    <div class="greeting">
                        ${msgRodape}<br/>${configuracao?.nome_restaurante || 'Kal do Espetinho'}
                    </div>
                </div>

                <div class="section">
                    <div class="sectionTitle">
                        👤 Dados do Cliente
                    </div>
                    <div class="infoRow">
                        <strong>Nome:</strong> <span>${pedido.cliente_nome}</span>
                    </div>
                    <div class="infoRow">
                        <strong>Telefone:</strong> <span>${pedido.cliente_telefone}</span>
                    </div>
                    <div class="infoRow">
                        <strong>Tipo:</strong> <span>${pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada no Local'}</span>
                    </div>
                    
                    ${(() => {
                        const temSecundario = !!pedido.pagamento_secundario_metodo;
                        const labelPrincipal = pedido.metodo_pagamento ? (PAGAMENTO_CONFIG[pedido.metodo_pagamento]?.label || pedido.metodo_pagamento) : '';
                        
                        let htmlPagamento = '<div style="height: 10px"></div>';
                        if (temSecundario) {
                            const labelSecundario = pedido.pagamento_secundario_metodo ? (PAGAMENTO_CONFIG[pedido.pagamento_secundario_metodo]?.label || pedido.pagamento_secundario_metodo) : '';
                            htmlPagamento += `
                                <div class="infoRow"><strong>Pagamento 1:</strong> <span>${labelPrincipal} (R$ ${pedido.pagamento_principal_valor?.toFixed(2)})</span></div>
                                <div class="infoRow"><strong>Pagamento 2:</strong> <span>${labelSecundario} (R$ ${pedido.pagamento_secundario_valor?.toFixed(2)})</span></div>
                            `;
                        } else if (pedido.metodo_pagamento) {
                            htmlPagamento += `<div class="infoRow"><strong>Pagamento:</strong> <span>${labelPrincipal}</span></div>`;
                        }
                        
                        // Troco display if applicable
                        if (pedido.metodo_pagamento === 'dinheiro' && pedido.precisa_troco && pedido.valor_para_troco) {
                             htmlPagamento += `
                                <div style="height: 10px"></div>
                                <div class="infoRow"><strong>Para Pagar:</strong> <span>R$ ${pedido.valor_para_troco.toFixed(2)}</span></div>
                                <div class="infoRow"><strong>Troco:</strong> <span>R$ ${troco.toFixed(2)}</span></div>
                            `;
                        }
                        
                        return htmlPagamento;
                    })()}
                </div>

                <div class="section">
                    <div class="sectionTitle">
                        📦 Itens do Pedido
                    </div>
                    ${pedido.itens.map(item => `
                        <div class="infoItem">
                            <span>${item.quantidade}x ${item.nome}</span>
                            <span>R$ ${item.subtotal.toFixed(2)}</span>
                        </div>
                    `).join('')}
                    
                    ${pedido.taxa_entrega > 0 ? `
                         <div class="infoItem" style="font-weight: bold;">
                            <span>Taxa de Entrega</span>
                            <span>R$ ${pedido.taxa_entrega.toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="section">
                    <div class="sectionTitle">
                        📝 Observações
                        <span style="margin-left: auto; font-weight: bold; font-size: 1.1rem">R$ ${pedido.total.toFixed(2)}</span>
                    </div>
                    ${pedido.observacoes ? `<p style="font-size: 0.85rem; padding-top: 5px;">${pedido.observacoes}</p>` : '<p style="font-size: 0.85rem; padding-top: 5px; color: #888;">Sem observações.</p>'}
                </div>

                <div class="dashedSeparator">
                    <span class="cutInstruction">Destacar e entregar ao entregador:</span>
                </div>

                <!-- Via Entregador / Cozinha -->
                <div class="secondPart">
                    <div class="secondPartHeader">
                        <div class="orderNumber" style="font-size: 1.1rem">Pedido #${pedido.numero_pedido}</div>
                    </div>
                    
                    <div class="section">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 1px solid #000" />` : ''}
                            <div style="flex: 1">
                                <div class="secondPartTitle">Pedido #${pedido.numero_pedido}</div>
                                <div class="secondPartInfo">Cliente: <strong>${pedido.cliente_nome}</strong></div>
                                <div class="secondPartInfo">Telefone: ${pedido.cliente_telefone}</div>
                                ${pedido.cliente_endereco ? `<div class="secondPartInfo">Endereço: <strong>${pedido.cliente_endereco}</strong></div>` : ''}
                                <div class="secondPartInfo" style="margin-top: 10px;"><strong>Itens:</strong><br/>
                                   ${pedido.itens.map(item => `${item.quantidade}x ${item.nome}<br/>`).join('')}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px">
                            <div style="font-size: 0.85rem;">${formatarData(pedido.created_at).replace(',', ' —')}</div>
                            <strong style="font-size: 1.1rem">R$ ${pedido.total.toFixed(2)}</strong>
                        </div>
                    </div>
                    <div class="greeting" style="margin-top: 15px;">
                        ${msgRodape}
                    </div>
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

            {/* Resumo Financeiro (Gorjetas e Cota nas últimas 12h) */}
            {(Object.keys(statsFinanceiros.gorjetasPorGarcom).length > 0 || statsFinanceiros.cotaArtistica.total > 0) && (
                <div style={{ padding: '0 2rem 1.5rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {Object.entries(statsFinanceiros.gorjetasPorGarcom).map(([garcom, data]) => data.total > 0 && (
                        <div key={garcom} style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', padding: '1rem' }}>
                            <div style={{ color: '#fdba74', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>⭐ Gorjeta - {garcom}</div>
                            <div style={{ color: '#f97316', fontWeight: 900, fontSize: '1.5rem', marginBottom: '4px' }}>R$ {data.total.toFixed(2)}</div>
                            <div style={{ color: '#fb923c', fontSize: '0.75rem', opacity: 0.8 }}>Pedidos: {data.pedidos.map((p: number) => `#${p}`).join(', ')}</div>
                        </div>
                    ))}
                    {statsFinanceiros.cotaArtistica.total > 0 && (
                        <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '12px', padding: '1rem' }}>
                            <div style={{ color: '#d8b4fe', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>🎵 Cota Artística</div>
                            <div style={{ color: '#a855f7', fontWeight: 900, fontSize: '1.5rem', marginBottom: '4px' }}>R$ {statsFinanceiros.cotaArtistica.total.toFixed(2)}</div>
                            <div style={{ color: '#c084fc', fontSize: '0.75rem', opacity: 0.8 }}>Pedidos: {statsFinanceiros.cotaArtistica.pedidos.map((p: number) => `#${p}`).join(', ')}</div>
                        </div>
                    )}
                </div>
            )}

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
                        const statusKey = pedido.status || 'pendente'
                        const currentStatusConfig = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente
                        const StatusIcon = currentStatusConfig.icon
                        const proximoStatus = getProximoStatus(pedido.status)

                        return (
                            <div
                                key={pedido.id}
                                id={`pedido-${pedido.id}`}
                                className={clsx(
                                    styles.pedidoCard,
                                    highlightId === pedido.id && styles.highlightCard
                                )}
                                onClick={() => setPedidoSelecionado(pedido)}
                            >
                                <div className={styles.pedidoHeader}>
                                    <div className={styles.pedidoNumero} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <span>Pedido #{pedido.numero_pedido}</span>
                                        {Array.isArray(pedido.itens) && pedido.itens.some((item: any) => item.nome === 'Gorjeta') && (
                                            <span style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#fdba74', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', gap: '2px', lineHeight: 1 }}>
                                                ⭐ Gorjeta
                                            </span>
                                        )}
                                        {Array.isArray(pedido.itens) && pedido.itens.some((item: any) => item.nome === 'Cota Artística') && (
                                            <span style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', gap: '2px', lineHeight: 1 }}>
                                                🎵 Cota Artística
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {!(pedido.status === 'cancelado' && pedido.observacoes === 'Cancelado pelo cliente') && (
                                            <div
                                                className={styles.statusBadge}
                                                style={{
                                                    backgroundColor: `${currentStatusConfig.color}20`,
                                                    color: currentStatusConfig.color
                                                }}
                                            >
                                                <StatusIcon size={16} />
                                                {currentStatusConfig.label}
                                            </div>
                                        )}
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
                                    {(() => {
                                        let deliveryText = pedido.tipo_entrega === 'delivery' ? 'Entrega (Delivery)' : 'Retirada no Local';
                                        if (pedido.tipo_entrega === 'retirada' && pedido.observacoes) {
                                            const match = pedido.observacoes.match(/MESA:\s*([^\s\n]+)/i);
                                            if (match) {
                                                deliveryText = `Mesa ${match[1]}`;
                                            }
                                        }
                                        return (
                                            <div className={styles.infoItem} style={{ color: pedido.tipo_entrega === 'delivery' ? '#f59e0b' : '#3b82f6', fontWeight: 500 }}>
                                                {pedido.tipo_entrega === 'delivery' ? <Truck size={16} /> : <ShoppingBag size={16} />}
                                                <span>{deliveryText}</span>
                                            </div>
                                        );
                                    })()}
                                    {/* Exibição de Pagamento (Suporta Split) */}
                                    {(() => {
                                        const temSecundario = !!pedido.pagamento_secundario_metodo;
                                        
                                        const renderMetodo = (metodo: string | null | undefined, valor?: number | null) => {
                                            if (!metodo) return null;
                                            const config = PAGAMENTO_CONFIG[metodo] || {
                                                label: metodo.replace('_', ' '),
                                                color: '#6b7280',
                                                icon: CreditCard
                                            };
                                            const Icon = config.icon;
                                            
                                            return (
                                                <div className={styles.infoItem} style={{ color: config.color, fontWeight: 500 }}>
                                                    {typeof Icon === 'string' ? (
                                                        Icon.startsWith('/') ? (
                                                            <img src={Icon} alt={config.label} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '16px' }}>{Icon}</span>
                                                        )
                                                    ) : (
                                                        <Icon size={16} />
                                                    )}
                                                    <span>
                                                        {config.label} 
                                                        {temSecundario && valor !== undefined && valor !== null && (
                                                            <span style={{ marginLeft: '4px', opacity: 0.8 }}>(R$ {valor.toFixed(2)})</span>
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        };

                                        if (temSecundario) {
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {renderMetodo(pedido.metodo_pagamento, pedido.pagamento_principal_valor)}
                                                    {renderMetodo(pedido.pagamento_secundario_metodo, pedido.pagamento_secundario_valor)}
                                                </div>
                                            );
                                        }

                                        return renderMetodo(pedido.metodo_pagamento);
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
                                    {pedido.garcom_nome && (
                                        <div className={styles.infoItem} style={{ color: '#f97316', fontWeight: 500 }}>
                                            <span>&#128107;</span>
                                            <span>Garçom: {pedido.garcom_nome}</span>
                                        </div>
                                    )}
                                </div>

                                {(() => {
                                    let obs = pedido.observacoes || '';
                                    if (pedido.tipo_entrega === 'retirada') {
                                        obs = obs.replace(/MESA:\s*[^\s\n]+/i, '').trim();
                                        obs = obs.replace(/PDV Balcão/i, '').trim();
                                    }
                                    if (obs && obs !== 'Cancelado pelo cliente') {
                                        return (
                                            <div style={{
                                                margin: '0.75rem 1rem 0',
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                                                borderLeft: '4px solid #eab308',
                                                borderRadius: '0.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.25rem'
                                            }}>
                                                <span style={{ color: '#eab308', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Observações
                                                </span>
                                                <span style={{ color: '#d1d5db', fontSize: '0.875rem' }}>
                                                    {obs}
                                                </span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className={styles.pedidoItens}>
                                    {pedido.status === 'cancelado' && pedido.observacoes === 'Cancelado pelo cliente' && (
                                        <div style={{
                                            margin: '0.5rem 0 1rem 0',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '10px',
                                            border: '2px dashed #ef4444',
                                            background: 'rgba(239,68,68,0.1)',
                                        }}>
                                            <p style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, textTransform: 'uppercase' }}>
                                                <XCircle size={20} color="#ef4444" />
                                                Pedido Cancelado pelo Cliente
                                            </p>
                                        </div>
                                    )}
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                    <span>
                                                        {item.quantidade}x {item.nome}
                                                        {isComplementar && <span className={styles.badgeNovo}>NOVO</span>}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span className={styles.itemPreco}>R$ {item.subtotal.toFixed(2)}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            removerItemPedido(pedido, idx)
                                                        }}
                                                        className={styles.itemRemoveBtn}
                                                        title="Remover Item"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
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
                                {!isEditing ? (
                                    <>
                                        <button
                                            onClick={iniciarEdicao}
                                            style={{
                                                background: '#f59e0b',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '8px 16px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                            title="Editar Pedido Manualmente"
                                        >
                                            <Pencil size={16} /> Editar
                                        </button>
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
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                whiteSpace: 'nowrap',
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
                                            onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}
                                            title="Imprimir Pedido"
                                        >
                                            <Printer size={16} /> Imprimir
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={salvarEdicao}
                                            style={{
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '8px 16px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                        >
                                            <Save size={16} /> Salvar
                                        </button>
                                        <button
                                            onClick={cancelarEdicao}
                                            style={{
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '8px 16px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                        >
                                            <X size={16} /> Cancelar
                                        </button>
                                    </>
                                )}
                                <button onClick={() => { setPedidoSelecionado(null); setIsEditing(false); setSearchTerm(''); }} style={{ marginLeft: '10px' }}>✕</button>
                            </div>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.secao}>
                                <h3>Informações do Cliente {isEditing && '(Modo Edição)'}</h3>
                                <p><strong>Nome:</strong> {pedidoSelecionado.cliente_nome}</p>
                                <p><strong>Telefone:</strong> {pedidoSelecionado.cliente_telefone}</p>
                                
                                {isEditing ? (
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label style={{ fontWeight: 600, width: '100px' }}>Modalidade:</label>
                                            <select 
                                                value={editData.tipo_entrega}
                                                onChange={(e) => handleTipoEntregaChange(e.target.value as 'retirada' | 'delivery')}
                                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', color: '#1e293b', backgroundColor: '#fff', flex: 1 }}
                                            >
                                                <option value="retirada">Retirada / Mesa</option>
                                                <option value="delivery">Delivery</option>
                                            </select>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label style={{ fontWeight: 600, width: '100px', flexShrink: 0 }}>Pagamento:</label>
                                            <select 
                                                value={editData.metodo_pagamento || ''}
                                                onChange={(e) => setEditData({...editData, metodo_pagamento: e.target.value as any})}
                                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', color: '#1e293b', backgroundColor: '#fff', flex: 1 }}
                                            >
                                                <option value="dinheiro">Dinheiro</option>
                                                <option value="pix">PIX</option>
                                                <option value="cartao">Cartão</option>
                                                <option value="pagamento_posterior">Pagamento Posterior</option>
                                            </select>
                                        </div>
                                        
                                        {editData.tipo_entrega === 'delivery' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <label style={{ fontWeight: 600, width: '100px' }}>Taxa de Entrega:</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={editData.taxa_entrega || 0}
                                                    onChange={(e) => handleTaxaChange(parseFloat(e.target.value) || 0)}
                                                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', width: '120px', color: '#1e293b', backgroundColor: '#fff' }}
                                                />
                                            </div>
                                        )}
                                        
                                        {editData.tipo_entrega === 'retirada' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <label style={{ fontWeight: 600, width: '100px', flexShrink: 0 }}>Mesa (Opc.):</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ex: 05"
                                                    value={editData.mesaStr || ''}
                                                    onChange={(e) => setEditData({...editData, mesaStr: e.target.value})}
                                                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', width: '120px', color: '#1e293b', backgroundColor: '#fff' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <p><strong>Tipo:</strong> {pedidoSelecionado.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada'}</p>
                                        {/* Modal Pagamento (Suporta Split) */}
                                        {(() => {
                                            const temSecundario = !!pedidoSelecionado.pagamento_secundario_metodo;
                                            
                                            const renderMetodoModal = (metodo: string | null | undefined, valor?: number | null, label?: string) => {
                                                if (!metodo) return null;
                                                const config = PAGAMENTO_CONFIG[metodo] || {
                                                    label: metodo.replace('_', ' '),
                                                    color: '#6b7280',
                                                    icon: CreditCard
                                                };
                                                const Icon = config.icon;
                                                
                                                return (
                                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                                        <strong>{label || 'Pagamento'}:</strong>
                                                        {(() => {
                                                            if (typeof Icon === 'string') {
                                                                if (Icon.startsWith('/')) {
                                                                    return <img src={Icon} alt={config.label} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />;
                                                                }
                                                                return <span style={{ fontSize: '18px' }}>{Icon}</span>;
                                                            }
                                                            return <Icon size={18} />;
                                                        })()}
                                                        {config.label}
                                                        {temSecundario && valor !== undefined && valor !== null && (
                                                            <span style={{ marginLeft: '4px', opacity: 0.8 }}>(R$ {valor.toFixed(2)})</span>
                                                        )}
                                                    </p>
                                                );
                                            };

                                            if (temSecundario) {
                                                return (
                                                    <div style={{ marginTop: '8px' }}>
                                                        {renderMetodoModal(pedidoSelecionado.metodo_pagamento, pedidoSelecionado.pagamento_principal_valor, 'Pagamento 1')}
                                                        {renderMetodoModal(pedidoSelecionado.pagamento_secundario_metodo, pedidoSelecionado.pagamento_secundario_valor, 'Pagamento 2')}
                                                    </div>
                                                );
                                            }

                                            return renderMetodoModal(pedidoSelecionado.metodo_pagamento);
                                        })()}
                                        {pedidoSelecionado.metodo_pagamento === 'dinheiro' && pedidoSelecionado.precisa_troco && pedidoSelecionado.valor_para_troco && (
                                            <p style={{ color: '#22c55e', fontWeight: 500 }}>
                                                <strong>Troco:</strong> Cliente vai pagar com R$ {pedidoSelecionado.valor_para_troco.toFixed(2)}<br />
                                                Troco a devolver: R$ {(pedidoSelecionado.valor_para_troco - pedidoSelecionado.total).toFixed(2)}
                                            </p>
                                        )}
                                        {pedidoSelecionado.cliente_endereco && (
                                            <p><strong>Endereço:</strong> {pedidoSelecionado.cliente_endereco}</p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className={styles.secao}>
                                <h3>Itens do Pedido</h3>
                                {(isEditing ? (editData.itens || []) : (pedidoSelecionado.itens || [])).map((item, idx) => (
                                    <div key={idx} className={styles.itemDetalhe} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '10px 12px', background: '#1c1c1c', borderRadius: '8px', marginBottom: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                                            <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.quantidade}x</span>
                                            <span style={{ fontWeight: 500, color: '#e2e8f0', lineHeight: '1.4', wordBreak: 'break-word' }}>{item.nome}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <span style={{ fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', fontSize: '0.95rem' }}>R$ {item.subtotal.toFixed(2)}</span>
                                            {isEditing ? (
                                                <button
                                                    onClick={() => removerItemEdit(idx)}
                                                    className={styles.itemRemoveBtn}
                                                    title="Remover Item da Edição"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => removerItemPedido(pedidoSelecionado, idx)}
                                                    className={styles.itemRemoveBtn}
                                                    title="Remover Item"
                                                    disabled={pedidoSelecionado.status === 'cancelado'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                ))}

                                {/* Adicionar Novo Item no Modo Edição */}
                                {isEditing && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Adicionar Produto</h4>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="Pesquise o produto..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#1e293b', backgroundColor: '#fff' }}
                                                />
                                                {produtosFiltrados.length > 0 && searchTerm && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', marginTop: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                                        {produtosFiltrados.map(prod => (
                                                            <div 
                                                                key={prod.id} 
                                                                onClick={() => { setSearchTerm(''); handleAdicionarItemEdit(prod); }}
                                                                style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}
                                                            >
                                                                <span>{prod.nome}</span>
                                                                <span style={{ color: '#0ea5e9', fontWeight: 600 }}>R$ {prod.preco.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {searchTerm && produtosFiltrados.length === 0 && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', marginTop: '4px', padding: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                        Nenhum produto encontrado. Pode apertar "Adicionar Livre" se quiser usar só esse nome.
                                                    </div>
                                                )}
                                            </div>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={itemQuantidade}
                                                onChange={(e) => setItemQuantidade(parseInt(e.target.value) || 1)}
                                                style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#1e293b', backgroundColor: '#fff' }}
                                            />
                                            {searchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAdicionarItemEdit({ nome: searchTerm, preco: 0 })}
                                                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Plus size={16} /> Adicionar Livre (R$ 0,00)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(!isEditing && pedidoSelecionado.observacoes) && (
                                <div className={styles.secao}>
                                    <h3>Observações</h3>
                                    <p>{pedidoSelecionado.observacoes}</p>
                                </div>
                            )}

                            {isEditing && (
                                <div className={styles.secao}>
                                    <h3>Observações Gerais</h3>
                                    <textarea 
                                        value={editData.observacoes || ''}
                                        onChange={(e) => setEditData({...editData, observacoes: e.target.value})}
                                        style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                                    />
                                </div>
                            )}

                            <div className={styles.secao}>
                                <h3>Resumo {isEditing && '(Pré-visualização)'}</h3>
                                <div className={styles.resumoItem}>
                                    <span>Subtotal:</span>
                                    <span>R$ {(isEditing ? (editData.subtotal || 0) : pedidoSelecionado.subtotal).toFixed(2)}</span>
                                </div>
                                {((isEditing ? editData.taxa_entrega : pedidoSelecionado.taxa_entrega) || 0) > 0 && (
                                    <div className={styles.resumoItem}>
                                        <span>Taxa de Entrega:</span>
                                        <span>R$ {((isEditing ? editData.taxa_entrega : pedidoSelecionado.taxa_entrega) || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className={`${styles.resumoItem} ${styles.resumoTotal}`}>
                                    <span>Total:</span>
                                    <span>R$ {(isEditing ? (editData.total || 0) : pedidoSelecionado.total).toFixed(2)}</span>
                                </div>
                            </div>

                            {!isEditing && (
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
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
