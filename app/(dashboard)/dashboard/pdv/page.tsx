'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Utensils, CupSoda, ShoppingBag, Plus, Minus, Search, ChevronDown, Check, Trash2, Store, Square, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.css'
import { sendOrderWebhook } from '@/utils/webhook'


interface Produto {
    id: string
    nome: string
    descricao: string
    preco: number
    categoria: string
    ativo: boolean
}

interface ItemComanda extends Produto {
    quantidade: number
}

interface Mesa {
    id: string
    numero_mesa: string
    status: 'livre' | 'ocupada' | 'em_atendimento'
    garcom_atual_nome?: string | null
    garcom_atual_id?: string | null
}

export default function PDVPage() {
    const supabase = createClient()
    const { showToast } = useToast()

    const [produtos, setProdutos] = useState<Produto[]>([])
    const [loading, setLoading] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('Todos')

    // Estados da Comanda
    const [comanda, setComanda] = useState<ItemComanda[]>([])
    const [numeroMesa, setNumeroMesa] = useState('')
    const [nomeCliente, setNomeCliente] = useState('')
    const [telefone, setTelefone] = useState('')
    const [observacoes, setObservacoes] = useState('')
    const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao' | 'dinheiro' | null>('pix')
    const [precisaTroco, setPrecisaTroco] = useState(false)
    const [trocoPara, setTrocoPara] = useState('')

    const [showSuccessPopup, setShowSuccessPopup] = useState(false)
    const handleCloseSuccess = () => {
        setShowSuccessPopup(false)
        setMesaEscolhida(null)
    }

    // Estados de Mesas
    const [mesas, setMesas] = useState<Mesa[]>([])
    const [loadingMesas, setLoadingMesas] = useState(true)
    const [mesaEscolhida, setMesaEscolhida] = useState<Mesa | { id: 'balcao', numero_mesa: 'Balcão/Viagem' } | null>(null)

    // Estado do Garçom logado
    const [garcomId, setGarcomId] = useState<string>('')
    const [garcomNome, setGarcomNome] = useState<string>('')

    useEffect(() => {
        loadProdutos()
        loadMesas()
        loadGarcomInfo()

        // Canal único por sessão para evitar conflitos entre garçons
        const channelName = `mesas-pdv-${Math.random().toString(36).slice(2)}`
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'mesas' },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        setMesas(prev => prev.map(m => m.id === payload.new.id ? payload.new as Mesa : m))
                    } else if (payload.eventType === 'INSERT') {
                        setMesas(prev => [...prev, payload.new as Mesa].sort((a, b) =>
                            a.numero_mesa.localeCompare(b.numero_mesa, undefined, { numeric: true })
                        ))
                    } else if (payload.eventType === 'DELETE') {
                        setMesas(prev => prev.filter(m => m.id !== payload.old.id))
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Mesas realtime status:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function loadMesas() {
        setLoadingMesas(true)
        const { data, error } = await supabase
            .from('mesas')
            .select('*')
            .order('numero_mesa', { ascending: true })

        if (!error && data) {
            setMesas(data)
        }
        setLoadingMesas(false)
    }

    async function loadGarcomInfo() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setGarcomId(user.id)
        // Try getting name from metadata first
        if (user.user_metadata?.nome) {
            setGarcomNome(user.user_metadata.nome)
        } else {
            const { data: userData } = await supabase
                .from('usuarios')
                .select('nome')
                .eq('id', user.id)
                .single()
            setGarcomNome(userData?.nome || user.email?.split('@')[0] || 'Garçom')
        }
    }

    async function toggleMesaStatus(e: React.MouseEvent, id: string, currentStatus: string) {
        e.stopPropagation() 
        const newStatus = currentStatus === 'livre' ? 'ocupada' : 'livre'
        const { error } = await supabase
            .from('mesas')
            .update({ status: newStatus })
            .eq('id', id)
        
        if (error) {
            showToast('error', 'Erro', 'Falha ao atualizar mesa')
        } else {
            setMesas(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as 'livre' | 'ocupada' } : m))
        }
    }

    const selecionarMesa = async (mesa: Mesa | { id: 'balcao', numero_mesa: 'Balcão/Viagem' }) => {
        // Bloquear acesso a mesas ocupadas ou em atendimento por outro garçom
        if (mesa.id !== 'balcao') {
            const mesaFull = mesa as Mesa
            if (mesaFull.status === 'ocupada') {
                showToast('error', '🔴 Mesa Ocupada', `A Mesa ${mesaFull.numero_mesa} já foi atendida e está aguardando entrega.`)
                return
            }
            if (mesaFull.status === 'em_atendimento') {
                const nomeGarcom = mesaFull.garcom_atual_nome ? `pelo garçom ${mesaFull.garcom_atual_nome}` : 'por outro garçom'
                if (mesaFull.garcom_atual_id !== garcomId) {
                    if (!window.confirm(`A Mesa ${mesaFull.numero_mesa} está sendo atendida ${nomeGarcom}.\n\nDeseja assumir o atendimento desta mesa?`)) {
                        return
                    }
                }

            }
        }

        if (mesa.id !== 'balcao') {
            // Mark mesa as 'em_atendimento' with the garcom's name
            await supabase
                .from('mesas')
                .update({ 
                    status: 'em_atendimento', 
                    garcom_atual_id: garcomId || null, 
                    garcom_atual_nome: garcomNome || null 
                })
                .eq('id', mesa.id)
            setMesas(prev => prev.map(m => m.id === mesa.id ? { ...m, status: 'em_atendimento', garcom_atual_nome: garcomNome } : m))
        }
        setMesaEscolhida(mesa)
        setNumeroMesa(mesa.numero_mesa === 'Balcão/Viagem' ? '' : mesa.numero_mesa)
        setComanda([])
        setNomeCliente('')
        setTelefone('')
        setObservacoes('')
        setMetodoPagamento('pix')
    }

    const voltarDaMesa = async () => {
        if (mesaEscolhida && mesaEscolhida.id !== 'balcao') {
            // Release mesa back to 'livre'
            await supabase
                .from('mesas')
                .update({ status: 'livre', garcom_atual_id: null, garcom_atual_nome: null })
                .eq('id', mesaEscolhida.id)
            setMesas(prev => prev.map(m => m.id === mesaEscolhida.id ? { ...m, status: 'livre', garcom_atual_nome: null } : m))
        }
        setMesaEscolhida(null)
    }

    async function loadProdutos() {
        setLoading(true)
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true)
            .order('categoria', { ascending: true })
            .order('nome', { ascending: true })

        if (error) {
            console.error('Erro ao buscar produtos:', error)
            showToast('error', 'Erro', 'Falha ao carregar cardápio')
        } else if (data) {
            setProdutos(data)
        }
        setLoading(false)
    }

    const filteredProdutos = useMemo(() => {
        return produtos.filter(p => {
            const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesTab = activeTab === 'Todos' || p.categoria === activeTab
            return matchesSearch && matchesTab
        })
    }, [produtos, searchTerm, activeTab])

    const tabs = useMemo(() => {
        const cats = Array.from(new Set(produtos.map(p => p.categoria || 'Outros')))
        return ['Todos', ...cats]
    }, [produtos])

    const getCategoryIcon = (categoria: string) => {
        const catLower = categoria.toLowerCase()
        if (catLower.includes('bebida')) return <CupSoda size={24} className={styles.productIcon} />
        if (catLower.includes('espetin')) return <Utensils size={24} className={styles.productIcon} />
        return <ShoppingBag size={24} className={styles.productIcon} />
    }

    function alterarQuantidade(produto: Produto, delta: number) {
        setComanda(prev => {
            const itemExistenteIndex = prev.findIndex(item => item.id === produto.id)

            if (itemExistenteIndex >= 0) {
                const novaComanda = prev.map((item, idx) => 
                    idx === itemExistenteIndex 
                        ? { ...item, quantidade: item.quantidade + delta } 
                        : item
                ).filter(item => item.quantidade > 0)
                return novaComanda
            } else if (delta > 0) {
                return [...prev, { ...produto, quantidade: 1 }]
            }
            return prev
        })
    }

    function getQuantidade(produtoId: string) {
        return comanda.find(item => item.id === produtoId)?.quantidade || 0
    }

    const total = comanda.reduce((acc, item) => acc + (item.preco * item.quantidade), 0)

    async function finalizarPedido() {
        if (!numeroMesa && !nomeCliente) {
            showToast('error', 'Atenção', 'Preencha a Mesa ou o Nome do Cliente')
            return
        }
        if (comanda.length === 0) {
            showToast('error', 'Atenção', 'A comanda está vazia')
            return
        }
        if (!metodoPagamento) {
            showToast('error', 'Atenção', 'Selecione a forma de pagamento')
            return
        }

        setEnviando(true)

        if (metodoPagamento === 'dinheiro' && precisaTroco) {
            const val = parseFloat(trocoPara.replace(/[^\d.,]/g, '').replace(',', '.'));
            if (isNaN(val) || val < total) {
                showToast('error', 'Atenção', `O valor para troco deve ser maior que o total (R$ ${total.toFixed(2)})`);
                setEnviando(false);
                return;
            }
        }

        const itens = comanda.map(item => ({
            id: item.id,
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            subtotal: item.preco * item.quantidade
        }))

        const notasPDV = numeroMesa ? `MESA: ${numeroMesa}` : 'PDV Balcão'
        let objObservacoes = observacoes ? `${notasPDV}\n${observacoes}` : notasPDV

        const valorTrocoNumero = (metodoPagamento === 'dinheiro' && precisaTroco) ? parseFloat(trocoPara.replace(/[^\d.,]/g, '').replace(',', '.')) : null;

        const { data, error } = await supabase
            .from('pedidos_online')
            .insert({
                cliente_nome: nomeCliente || `Mesa ${numeroMesa}`,
                cliente_telefone: telefone || 'Não informado',
                tipo_entrega: 'retirada',
                metodo_pagamento: metodoPagamento,
                itens: itens,
                subtotal: total,
                taxa_entrega: 0,
                total: total,
                observacoes: objObservacoes,
                status: 'pendente',
                precisa_troco: metodoPagamento === 'dinheiro' ? precisaTroco : false,
                valor_para_troco: valorTrocoNumero,
                mesa_id: mesaEscolhida && mesaEscolhida.id !== 'balcao' ? mesaEscolhida.id : null,
                garcom_id: garcomId || null,
                garcom_nome: garcomNome || null
            })
            .select()


        setEnviando(false)

        if (error) {
            console.error('Erro ao enviar pedido:', error)
            showToast('error', 'Erro', 'Falha ao registrar pedido: ' + error.message)
        } else {
            if (mesaEscolhida && mesaEscolhida.id !== 'balcao') {
                supabase.from('mesas').update({ status: 'ocupada', garcom_atual_id: null, garcom_atual_nome: null }).eq('id', mesaEscolhida.id).then();
                setMesas(prev => prev.map(m => m.id === mesaEscolhida.id ? { ...m, status: 'ocupada', garcom_atual_nome: null } : m));
            }

            setShowSuccessPopup(true);

            setComanda([])
            setNumeroMesa('')
            setNomeCliente('')
            setTelefone('')
            setObservacoes('')
            setMetodoPagamento('pix')
            setPrecisaTroco(false)
            setTrocoPara('')

            // Disparar Webhook para Novo Pedido via PDV
            supabase
                .from('pedidos_online')
                .select('*')
                .eq('id', data[0].id) // data usually returns the inserted row as an array when using select()
                .single()
                .then(({ data: fullOrder }) => {
                    if (fullOrder) {
                        sendOrderWebhook('delivery_order', fullOrder);
                    }
                });
        }
    }

    if (loading || loadingMesas) {
        return <div className="p-8 text-center text-white">Carregando PDV...</div>
    }

    if (!mesaEscolhida) {
        return (
            <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-5xl mx-auto h-full p-2 sm:p-4 overflow-y-auto overflow-x-hidden">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Acessar PDV</h1>
                    <p className="text-white/70 text-sm sm:text-base">Selecione onde o cliente será atendido antes de abrir o cardápio.</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {/* Card Balcão fixo */}
                    <button
                        onClick={() => selecionarMesa({ id: 'balcao', numero_mesa: 'Balcão/Viagem' })}
                        className="bg-blue-600 text-white rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-blue-700 transition transform hover:scale-105 shadow-md border border-blue-500"
                    >
                        <Store className="w-8 h-8 sm:w-10 sm:h-10" />
                        <span className="font-bold text-base sm:text-xl">Balcão</span>
                        <span className="text-[10px] sm:text-xs bg-black/20 px-2 py-1 rounded-full uppercase tracking-wider text-center leading-tight whitespace-normal">Viagem/Delivery</span>
                    </button>

                    {/* Cards das Mesas Dinâmicas */}
                    {mesas.map(m => {
                        const isEmAtendimento = m.status === 'em_atendimento'
                        const isOcupada = m.status === 'ocupada'
                        const borderClass = isEmAtendimento
                            ? 'bg-zinc-800 border-orange-500/50 text-white border-b-4 border-b-orange-500'
                            : isOcupada
                            ? 'bg-zinc-800 border-red-500/50 text-white border-b-4 border-b-red-500'
                            : 'bg-zinc-800 border-green-500/50 text-white border-b-4 border-b-green-500'
                        const iconColor = isEmAtendimento ? 'text-orange-500' : isOcupada ? 'text-red-500' : 'text-green-500'
                        const badgeClass = isEmAtendimento
                            ? 'bg-orange-500/20 text-orange-400'
                            : isOcupada ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                        const statusLabel = isEmAtendimento ? `Em Atend.` : isOcupada ? 'Ocupada' : 'Livre'
                        return (
                            <button
                                key={m.id}
                                onClick={() => selecionarMesa(m)}
                                className={`p-4 sm:p-6 rounded-xl flex flex-col items-center justify-between gap-2 sm:gap-3 transition transform hover:scale-105 shadow-md border ${borderClass}`}
                            >
                                <Square className={`w-8 h-8 sm:w-9 sm:h-9 ${iconColor}`} />
                                <span className="font-bold text-base sm:text-xl">Mesa {m.numero_mesa}</span>
                                
                                <div className="flex flex-col items-center gap-1 mt-1 w-full">
                                    <div 
                                        onClick={(e) => toggleMesaStatus(e, m.id, m.status)} 
                                        className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full uppercase tracking-wider font-semibold cursor-pointer hover:opacity-80 transition ${badgeClass}`}
                                    >
                                        {statusLabel}
                                    </div>
                                    {isEmAtendimento && m.garcom_atual_nome && (
                                        <span className="text-[9px] sm:text-[10px] text-orange-300/80 truncate w-full text-center px-1">
                                            {m.garcom_atual_nome}
                                        </span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
                
                {mesas.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-xl border border-white/10 mt-4">
                        <Square size={48} className="text-muted-foreground mb-4 opacity-50" />
                        <p className="text-white/70">Nenhuma mesa foi configurada ainda.</p>
                        <p className="text-white/50 text-sm mt-1">Vá na aba "Mesas" para cadastrar.</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={styles.pdvContainer}>
            {/* Header de Atendimento */}
            <div className="flex items-center justify-between bg-zinc-900 border-b border-white/10 p-3 mb-0 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={voltarDaMesa} 
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                        title="Voltar para seleção de mesas"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="font-bold text-lg">
                        Atendimento: <span className="text-primary">{mesaEscolhida.numero_mesa}</span>
                    </div>
                </div>
            </div>

            {/* MOBILE ONLY: Inputs at the top */}
            <div className={styles.mobileInputsTop}>
                {/* Removido cabeçalho duplicado para ganhar espaço */}
                <div className={styles.comandaInputsRow}>
                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Número da Mesa / Comanda"
                        value={numeroMesa}
                        onChange={(e) => setNumeroMesa(e.target.value)}
                    />
                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Nome do Cliente"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                    />
                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Telefone/Contato"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                    />
                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Observações (opcional)"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                    />
                </div>

                {/* Mobile: lista de itens + total + finalizar */}
                {comanda.length > 0 && (
                    <div className="flex flex-col gap-1 bg-zinc-800/80 rounded-xl px-3 py-2 border border-white/10 lg:hidden">
                        {comanda.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400 w-6 shrink-0">{item.quantidade}x</span>
                                <span className="text-white flex-1 truncate">
                                    {item.nome} 
                                    <span className="text-zinc-500 text-[10px] ml-1">(R$ {item.preco.toFixed(0)})</span>
                                </span>
                                <span className="text-white font-semibold ml-2 shrink-0">R$ {(item.preco * item.quantidade).toFixed(0)}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/10">
                            <span className="text-orange-400 font-bold text-base">Total: R$ {total.toFixed(0)}</span>
                            <button
                                onClick={finalizarPedido}
                                disabled={enviando}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-1.5 rounded-lg transition active:scale-95"
                            >
                                {enviando ? 'Enviando...' : 'Finalizar ✓'}
                            </button>
                        </div>
                    </div>
                )}
                {comanda.length === 0 && (
                    <div className="flex items-center justify-between gap-2 bg-zinc-800/50 rounded-xl px-3 py-2 border border-white/10 lg:hidden">
                        <span className="text-zinc-500 text-sm italic">Nenhum item adicionado</span>
                        <button
                            disabled
                            className="bg-orange-500 opacity-40 cursor-not-allowed text-white font-bold text-sm px-4 py-1.5 rounded-lg"
                        >
                            Finalizar ✓
                        </button>
                    </div>
                )}
            </div>

            {/* LEFT COLUMN: Menu, Search, Tabs */}
            <div className={styles.menuColumn}>

                {/* Search & Tabs */}
                <div className={styles.menuControls}>
                    <div className={styles.tabsContainer}>
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className={styles.searchContainer}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Buscar Produto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.productsGrid}>
                    {filteredProdutos.map(produto => {
                        const qty = getQuantidade(produto.id)
                        return (
                            <div
                                key={produto.id}
                                className={`${styles.productCard} ${qty > 0 ? styles.selectedCard : ''}`}
                                onClick={() => qty === 0 && alterarQuantidade(produto, 1)}
                            >
                                <div className={styles.productIconWrapper}>
                                    {getCategoryIcon(produto.categoria)}
                                </div>
                                <div className={styles.productName}>{produto.nome}</div>

                                <div className={styles.cardActionArea}>
                                    <button
                                        className={styles.qtyBtn}
                                        onClick={(e) => { e.stopPropagation(); alterarQuantidade(produto, -1) }}
                                        disabled={qty === 0}
                                    >
                                        <Minus size={14} />
                                    </button>

                                    <div className={styles.priceDisplay}>
                                        {qty === 0 ? `R$ ${produto.preco.toFixed(0)}` : qty}
                                    </div>

                                    <button
                                        className={styles.qtyBtn}
                                        onClick={(e) => { e.stopPropagation(); alterarQuantidade(produto, 1) }}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {filteredProdutos.length === 0 && (
                        <div className={styles.noProductsText}>
                            Nenhum produto encontrado.
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Comanda & Cart (Desktop side, Mobile bottom fixed) */}
            <div className={styles.comandaColumn}>

                {/* DESKTOP ONLY: Header and Inputs are here on tablet/desktop */}
                <div className={styles.desktopInputsArea}>
                    <h2 className={styles.comandaTitle}>PDV Atendente - Novo Pedido</h2>
                    <div className={styles.comandaInputsCol}>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Número da Mesa / Comanda"
                            value={numeroMesa}
                            onChange={(e) => setNumeroMesa(e.target.value)}
                        />
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Nome do Cliente"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                        />
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Telefone/Contato"
                            value={telefone}
                            onChange={(e) => setTelefone(e.target.value)}
                        />
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Observações (opcional)"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Resumo do Pedido */}
                <div className={styles.cartContainer}>
                    <div className={styles.resumoHeader}>
                        <h3 className={styles.resumoTitle}>Resumo do Pedido</h3>
                    </div>

                    <div className={styles.resumoItemsBody}>
                        {comanda.length === 0 && (
                            <p className={styles.emptyCartText}>Nenhum item adicionado.</p>
                        )}
                        {comanda.map(item => (
                            <div key={item.id} className={styles.resumoItem}>
                                <div className={styles.resumoItemQty}>{item.quantidade}x</div>
                                <div className={styles.resumoItemName}>
                                    {item.nome} <span className={styles.itemMuted}>(R$ {item.preco.toFixed(0)})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className={styles.resumoItemPrice}>R$ {(item.preco * item.quantidade).toFixed(0)}</div>
                                    <button 
                                        onClick={() => setComanda(prev => prev.filter(i => i.id !== item.id))}
                                        title="Remover Item"
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', opacity: 0.8, transition: 'opacity 0.2s' }}
                                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.paymentSection}>
                        <h3 className={styles.paymentTitle}>
                            Tipo de Pagamento <ChevronDown size={14} className={styles.chevronIcon} />
                        </h3>
                        <div className={styles.paymentOptions}>
                            <button
                                className={`${styles.paymentBtn} ${metodoPagamento === 'pix' ? styles.paymentSelected : ''}`}
                                onClick={() => setMetodoPagamento('pix')}
                                aria-label="Pagar com Pix"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img src="/pix-logo.png" alt="Pix" style={{ width: '18px', height: '18px', filter: metodoPagamento === 'pix' ? 'none' : 'grayscale(100%) opacity(0.7)' }} />
                                    <span>Pix</span>
                                </div>
                            </button>
                            <button
                                className={`${styles.paymentBtn} ${metodoPagamento === 'cartao' ? styles.paymentSelected : ''}`}
                                onClick={() => setMetodoPagamento('cartao')}
                            >
                                {metodoPagamento === 'cartao' && <span className={styles.radioDot} />} Cartão de Crédito
                            </button>
                            <button
                                className={`${styles.paymentBtn} ${metodoPagamento === 'dinheiro' ? styles.paymentSelected : ''}`}
                                onClick={() => setMetodoPagamento('dinheiro')}
                            >
                                {metodoPagamento === 'dinheiro' && <span className={styles.radioDot} />} Dinheiro
                            </button>
                            {metodoPagamento === 'dinheiro' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', color: '#e5e5e5' }}>
                                        <input
                                            type="checkbox"
                                            checked={precisaTroco}
                                            onChange={(e) => setPrecisaTroco(e.target.checked)}
                                            style={{ accentColor: '#f97316', width: '16px', height: '16px' }}
                                        />
                                        Precisa de troco?
                                    </label>
                                    {precisaTroco && (
                                        <input
                                            type="text"
                                            className={styles.inputField}
                                            placeholder="Troco para... (Ex: 50)"
                                            value={trocoPara}
                                            onChange={(e) => setTrocoPara(e.target.value)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>TOTAL:</span>
                        <span className={styles.totalValue}>R$ {total.toFixed(0)}</span>
                    </div>

                    <button
                        className={styles.submitBtn}
                        onClick={finalizarPedido}
                        disabled={enviando || comanda.length === 0}
                    >
                        {enviando ? 'Enviando...' : 'FINALIZAR E ENVIAR PEDIDO'}
                    </button>
                </div>
            </div>
            
            {showSuccessPopup && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 p-4 sm:p-6 backdrop-blur-sm">
                    <div className="bg-zinc-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-sm w-[90%] sm:w-full flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                            <Check className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" strokeWidth={3} />
                        </div>
                        <h2 className="text-xl sm:text-3xl font-black text-white mb-2 sm:mb-3">Pedido Enviado!</h2>
                        <p className="text-zinc-400 text-sm sm:text-base mb-6 sm:mb-8 max-w-[200px] sm:max-w-[250px] leading-relaxed">A comanda foi registrada e já está na cozinha.</p>
                        <button 
                            onClick={handleCloseSuccess}
                            className="w-full py-3 sm:py-4 bg-green-600 hover:bg-green-700 active:scale-[0.98] transform transition-all text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg flex items-center justify-center gap-2"
                        >
                            <Plus size={20} className="sm:w-6 sm:h-6" />
                            Novo Atendimento
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
