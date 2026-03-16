'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Utensils, CupSoda, ShoppingBag, Plus, Minus, Search, ChevronDown, Check } from 'lucide-react'
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
    const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao' | 'dinheiro' | null>('pix')

    useEffect(() => {
        loadProdutos()
    }, [])

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
                const novaComanda = [...prev]
                const novaQuantidade = novaComanda[itemExistenteIndex].quantidade + delta

                if (novaQuantidade <= 0) {
                    novaComanda.splice(itemExistenteIndex, 1)
                } else {
                    novaComanda[itemExistenteIndex].quantidade = novaQuantidade
                }
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

        const itens = comanda.map(item => ({
            id: item.id,
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            subtotal: item.preco * item.quantidade
        }))

        const notasPDV = numeroMesa ? `MESA: ${numeroMesa}` : 'PDV Balcão'

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
                observacoes: notasPDV,
                status: 'pendente'
            })
            .select()


        setEnviando(false)

        if (error) {
            console.error('Erro ao enviar pedido:', error)
            showToast('error', 'Erro', 'Falha ao registrar pedido: ' + error.message)
        } else {
            showToast('success', 'Pedido Registrado', 'A comanda foi enviada para a cozinha!')
            setComanda([])
            setNumeroMesa('')
            setNomeCliente('')
            setTelefone('')
            setMetodoPagamento('pix')

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

    if (loading) {
        return <div className="p-8 text-center text-white">Carregando PDV...</div>
    }

    return (
        <div className={styles.pdvContainer}>

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
                </div>
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
                                <div className={styles.resumoItemPrice}>R$ {(item.preco * item.quantidade).toFixed(0)}</div>
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
        </div>
    )
}
