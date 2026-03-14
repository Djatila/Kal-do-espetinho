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

interface Produto {
    id: string
    nome: string
    descricao: string
    preco: number
    categoria: string
    ativo: boolean
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

    // Customer identification
    const [mostrarIdentificacao, setMostrarIdentificacao] = useState(false)
    const [clienteId, setClienteId] = useState<string | null>(null)
    const [tipoCliente, setTipoCliente] = useState<'credito' | 'informal' | null>(null)
    const [isPromoOpen, setIsPromoOpen] = useState(false)
    const [animations, setAnimations] = useState<any[]>([])
    const cartIconRef = useRef<HTMLDivElement>(null)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const [configuracao, setConfiguracao] = useState({
        nome_restaurante: 'Cardápio Online',
        logo_url: '',
        taxa_entrega_padrao: 0,
        chave_pix: '',
        whatsapp_loja: '',
        layout_cardapio: 'padrao'
    })

    const [dadosCliente, setDadosCliente] = useState<DadosCliente>({
        nome: '',
        telefone: '',
        endereco: '',
        tipo_entrega: 'retirada',
        metodo_pagamento: undefined,
        precisa_troco: false,
        valor_para_troco: '',
        observacoes: ''
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
    }, [])

    async function checkClienteSession() {
        // Verificar se há sessão de cliente salva
        const savedClienteId = sessionStorage.getItem('clienteId')
        const savedTipoCliente = sessionStorage.getItem('tipoCliente') as 'credito' | 'informal' | null

        if (savedClienteId && savedTipoCliente) {
            setClienteId(savedClienteId)
            setTipoCliente(savedTipoCliente)
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
            setDadosCliente(prev => ({
                ...prev,
                nome: cliente.nome || '',
                telefone: cliente.telefone || '',
                endereco: cliente.endereco || ''
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

    function handleClienteIdentified(id: string, tipo: 'credito' | 'informal') {
        setClienteId(id)
        setTipoCliente(tipo)
        sessionStorage.setItem('clienteId', id)
        sessionStorage.setItem('tipoCliente', tipo)
        setMostrarIdentificacao(false)
        loadClienteData(id)
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
            .select('taxa_entrega_padrao, nome_restaurante, logo_url, chave_pix, whatsapp_loja, layout_cardapio')
            .maybeSingle()

        if (data) {
            setConfiguracao({
                nome_restaurante: data.nome_restaurante || 'Cardápio Online',
                logo_url: data.logo_url || '',
                taxa_entrega_padrao: data.taxa_entrega_padrao || 0,
                chave_pix: data.chave_pix || '',
                whatsapp_loja: data.whatsapp_loja || '',
                layout_cardapio: data.layout_cardapio || 'padrao'
            })
            setTaxaEntrega(data.taxa_entrega_padrao || 0)
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

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0)
    const taxaAplicada = dadosCliente.tipo_entrega === 'delivery' ? taxaEntrega : 0
    const total = subtotal + taxaAplicada

    async function finalizarPedido() {
        if (!dadosCliente.nome || !dadosCliente.telefone) {
            alert('Por favor, preencha seu nome e telefone')
            return
        }

        if (dadosCliente.tipo_entrega === 'delivery' && !dadosCliente.endereco) {
            alert('Por favor, preencha seu endereço para entrega')
            return
        }

        if (!dadosCliente.metodo_pagamento) {
            alert('Por favor, selecione a forma de pagamento')
            return
        }

        if (dadosCliente.metodo_pagamento === 'dinheiro' && dadosCliente.precisa_troco) {
            const valorParaTroco = parseFloat(dadosCliente.valor_para_troco)
            if (!dadosCliente.valor_para_troco || isNaN(valorParaTroco) || valorParaTroco < total) {
                alert('Por favor, informe um valor válido para o troco (deve ser maior ou igual ao total)')
                return
            }
        }

        if (carrinho.length === 0) {
            alert('Seu carrinho está vazio')
            return
        }

        setEnviando(true)

        const itens = carrinho.map(item => ({
            id: item.id,
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            subtotal: item.preco * item.quantidade
        }))

        // Modo Complemento: Atualizar pedido existente
        if (modoComplemento && pedidoComplementoNumero) {
            // Buscar pedido original
            const { data: pedidoOriginal, error: fetchError } = await supabase
                .from('pedidos_online')
                .select('*')
                .eq('numero_pedido', pedidoComplementoNumero)
                .single()

            if (fetchError || !pedidoOriginal) {
                setEnviando(false)
                alert('Erro: Pedido original não encontrado')
                return
            }

            // Calcular novos totais
            const novosItens = [...pedidoOriginal.itens, ...itens]
            const novoSubtotal = pedidoOriginal.subtotal + subtotal
            const novoTotal = pedidoOriginal.total + total

            // Criar registro de complemento para histórico
            const complemento = {
                data: new Date().toISOString(),
                itens: itens,
                subtotal: subtotal,
                total: total
            }

            const historico = Array.isArray(pedidoOriginal.historico_complementos)
                ? [...pedidoOriginal.historico_complementos, complemento]
                : [complemento]

            // Atualizar pedido
            const { error: updateError } = await supabase
                .from('pedidos_online')
                .update({
                    itens: novosItens,
                    subtotal: novoSubtotal,
                    total: novoTotal,
                    historico_complementos: historico
                })
                .eq('numero_pedido', pedidoComplementoNumero)

            setEnviando(false)

            if (updateError) {
                console.error('Erro ao adicionar complemento:', updateError)
                alert('Erro ao adicionar itens. Tente novamente.')
            } else {
                // Resetar modo complemento
                setModoComplemento(false)
                setPedidoComplementoNumero(null)
                setCarrinho([])
                localStorage.removeItem('carrinho')
                setMostrarCheckout(false)
                setMostrarCarrinho(false)
                setPedidoConfirmado(pedidoComplementoNumero)
            }
        } else {
            // Modo Normal: Criar novo pedido
            const { data, error } = await supabase
                .from('pedidos_online')
                .insert({
                    cliente_id: clienteId,
                    cliente_nome: dadosCliente.nome,
                    cliente_telefone: dadosCliente.telefone,
                    cliente_endereco: dadosCliente.endereco || null,
                    tipo_entrega: dadosCliente.tipo_entrega,
                    metodo_pagamento: dadosCliente.metodo_pagamento,
                    precisa_troco: dadosCliente.precisa_troco,
                    valor_para_troco: dadosCliente.precisa_troco && dadosCliente.valor_para_troco
                        ? parseFloat(dadosCliente.valor_para_troco)
                        : null,
                    itens: itens,
                    subtotal: subtotal,
                    taxa_entrega: taxaAplicada,
                    total: total,
                    observacoes: dadosCliente.observacoes || null,
                    status: 'pendente'
                })
                .select('numero_pedido')
                .single()

            setEnviando(false)

            if (error) {
                console.error('Erro ao criar pedido:', error)
                alert('Erro ao enviar pedido. Tente novamente.')
            } else if (data) {
                setPedidoConfirmado(data.numero_pedido)
                setCarrinho([])
                localStorage.removeItem('carrinho')
                setMostrarCheckout(false)
                setMostrarCarrinho(false)
            }
        }
    }

    if (pedidoConfirmado && !modoComplemento) {
        return (
            <div className={styles.confirmacao}>
                <div className={styles.confirmacaoCard}>
                    <div className={styles.confirmacaoIcone}>✓</div>
                    <h1>Pedido Confirmado!</h1>

                    <div className={styles.pedidoHeader}>
                        <p className={styles.numeroPedido}>
                            Pedido <strong>#{pedidoConfirmado}</strong>
                        </p>
                        <button
                            className={styles.botaoComplemento}
                            onClick={() => {
                                setModoComplemento(true)
                                setPedidoComplementoNumero(pedidoConfirmado)
                            }}
                        >
                            + Adicionar Itens
                        </button>
                    </div>

                    <p>Seu pedido foi recebido e está sendo preparado.</p>
                    <p className={styles.textoSecundario}>
                        {dadosCliente.tipo_entrega === 'delivery'
                            ? 'Entraremos em contato em breve para confirmar a entrega.'
                            : 'Você pode retirar seu pedido em aproximadamente 30 minutos.'}
                    </p>
                    <button
                        className={styles.botaoPrimario}
                        onClick={() => {
                            setPedidoConfirmado(null)
                            setDadosCliente({
                                nome: '',
                                telefone: '',
                                endereco: '',
                                tipo_entrega: 'retirada',
                                metodo_pagamento: undefined,
                                precisa_troco: false,
                                valor_para_troco: '',
                                observacoes: ''
                            })
                        }}
                    >
                        Fazer Novo Pedido
                    </button>
                </div>
            </div>
        )
    }

    // Data mapping
    const kalMenuItems = produtos.map(p => ({
        id: p.id,
        name: p.nome,
        description: p.descricao || '',
        price: p.preco,
        category: p.categoria as any,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300',
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
            {/* Header / Nav */}
            <nav className="fixed top-0 w-full z-30 bg-neutral-950 border-b border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo + Location */}
                        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="bg-orange-600 p-1.5 rounded-md shadow-neon"><Flame className="text-white" size={20} fill="currentColor" /></div>
                            <div className="flex flex-col justify-center leading-none">
                                <h1 className="text-base font-display font-bold text-white tracking-widest uppercase">
                                    KAL DO <span className="text-orange-500">ESPETINHO</span>
                                </h1>
                                <p className="text-[10px] text-neutral-400 tracking-[0.18em] uppercase mt-0.5">Arataca - BA</p>
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
                    <img src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2574&auto=format&fit=crop" alt="Hero" className="w-full h-full object-cover opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                </div>
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-4 drop-shadow-2xl">SABOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">PREMIUM</span></h2>
                    <p className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-8">A melhor quentinha da cidade em um ambiente exclusivo.</p>
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

            <CartSidebar
                isOpen={mostrarCarrinho}
                onClose={() => setMostrarCarrinho(false)}
                cart={carrinho.map(item => ({
                    ...item,
                    name: item.nome,
                    description: item.descricao || '',
                    price: item.preco,
                    category: item.categoria as any,
                    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300',
                    quantity: item.quantidade
                }))}
                onRemove={removerDoCarrinho}
                onUpdateQuantity={alterarQuantidade}
                whatsappNumber={configuracao.whatsapp_loja}
                pixKey={configuracao.chave_pix}
                deliveryFee={taxaEntrega}
                allowPayLater={tipoCliente === 'credito'}
                onPlaceOrder={async (order) => {
                    setEnviando(true)
                    try {
                        let paymentMapped = 'dinheiro'
                        if (order.customer.paymentMethod === 'pix') paymentMapped = 'pix'
                        if (order.customer.paymentMethod === 'credit_card' || order.customer.paymentMethod === 'debit_card') paymentMapped = 'cartao'
                        if (order.customer.paymentMethod === 'pay_later') paymentMapped = 'pagamento_posterior'

                        let tipoEntregaMapped = 'retirada'
                        let taxaAplicada = 0

                        if (order.customer.deliveryMethod === 'delivery') {
                            taxaAplicada = taxaEntrega
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

                        const itens = carrinho.map(item => ({
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

                            const novosItens = [...pedidoOriginal.itens, ...itens]
                            const novoSubtotal = pedidoOriginal.subtotal + subtotal
                            const novoTotal = pedidoOriginal.total + subtotal + taxaAplicada

                            const complemento = {
                                data: new Date().toISOString(),
                                itens: itens,
                                subtotal: subtotal,
                                total: subtotal + taxaAplicada
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
                                .eq('numero_pedido', pedidoComplementoNumero)

                            if (updateError) throw updateError

                            setModoComplemento(false)
                            setPedidoComplementoNumero(null)
                            setCarrinho([])
                            localStorage.removeItem('carrinho')
                            setMostrarCarrinho(false)
                            setPedidoConfirmado(pedidoComplementoNumero)
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
                                    itens: itens,
                                    subtotal: subtotal,
                                    taxa_entrega: taxaAplicada,
                                    total: subtotal + taxaAplicada,
                                    observacoes: obs || null,
                                    status: 'pendente'
                                })
                                .select('numero_pedido')
                                .single()

                            if (error) throw error

                            setPedidoConfirmado(data.numero_pedido)
                            setCarrinho([])
                            localStorage.removeItem('carrinho')
                            setMostrarCarrinho(false)
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

            <GeminiAssistant systemInstruction={"Você é um assistente da Nita Quentinhas."} menuItems={kalMenuItems} />

            {/* Footer */}
            <footer className="bg-neutral-950 border-t border-neutral-800 mt-12 py-8 text-center">
                <p className="text-white font-display font-bold text-lg tracking-wider flex items-center justify-center gap-2">
                    🔥 <span>KAL DO ESPETINHO</span>
                </p>
                <p className="text-neutral-400 text-sm uppercase tracking-[0.2em] mt-1">Arataca - BA</p>
                <p className="text-neutral-600 text-xs mt-4">© 2026 Todos os direitos reservados.</p>
            </footer>
        </div>
    )
}
