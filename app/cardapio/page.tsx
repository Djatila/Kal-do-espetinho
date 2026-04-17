'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Flame, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

// --- Hooks ---
import { useCardapioData } from './hooks/useCardapioData'
import { useClienteSession } from './hooks/useClienteSession'
import { useCart } from './hooks/useCart'
import { useOrderStatus } from './hooks/useOrderStatus'

// --- Tipos ---
import { Produto, VariacaoPreco } from './types'

// --- Components Globais ---
// --- Components Globais ---
import CartSidebar from '@/_cardapio_kal_novo/CartSidebar'
import { ClienteIdentificationModal } from '@/components/cliente/ClienteIdentificationModal'
// --- Components Locais ---
import { HeroSection } from './_components/HeroSection'
import { CardapioHeader } from './_components/CardapioHeader'
import { CategoryFilter } from './_components/CategoryFilter'
import { ProductGrid } from './_components/ProductGrid'
import { SelectionModal } from './_components/SelectionModal'
import { OrderConfirmation } from './_components/OrderConfirmation'
import { InfoModals } from './_components/InfoModals'

import styles from './page.module.css'

export default function CardapioNovo() {
    const router = useRouter()
    const { showToast } = useToast()
    const supabase = createClient()
    const cartIconRef = useRef<HTMLDivElement>(null)

    // Modais Informacionais
    const [mostrarQuemSomos, setMostrarQuemSomos] = useState(false)
    const [mostrarContato, setMostrarContato] = useState(false)

    // Estados Locais
    const [categoriaFiltro, setCategoriaFiltro] = useState('todos')
    const [animations, setAnimations] = useState<Array<{ id: number, x: number, y: number, image: string }>>([])
    const [enviando, setEnviando] = useState(false)

    // --- Hooks ---
    // --- Hooks ---
    const { produtos, loading, configuracao } = useCardapioData()
    const { 
        clienteId, 
        tipoCliente, 
        dadosCliente, 
        setDadosCliente, 
        loadClienteData,
        mostrarIdentificacao,
        handleClienteIdentified,
        handleLogout
    } = useClienteSession()
    

    const { 
        carrinho, 
        setCarrinho, 
        mostrarCarrinho, 
        setMostrarCarrinho, 
        adicionarAoCarrinho, 
        removerDoCarrinho, 
        alterarQuantidade, 
        limparCarrinho,
        cartCount 
    } = useCart()
    
    const {
        pedidoConfirmado,
        setPedidoConfirmado,
        orderStatus,
        setOrderStatus,
        modoComplemento,
        setModoComplemento,
        pedidoComplementoNumero,
        setPedidoComplementoNumero,
        confirmacoMinimizada,
        setConfirmacoMinimizada,
        verificandoStatus,
        mostrarModalBloqueio,
        setMostrarModalBloqueio,
        solicitacaoStatus,
        setSolicitacaoStatus,
        mostrarConfirmacaoCancelamento,
        setMostrarConfirmacaoCancelamento,
        statusCancelamento,
        cancelarPedido,
        handleAdicionarItens,
        resetarEstadoTotal,
        setupOrderStatusListener,
        iniciarPolling
    } = useOrderStatus(clienteId, setDadosCliente, limparCarrinho)
    const [produtoParaVariacao, setProdutoParaVariacao] = useState<Produto | null>(null)
    const [opcaoInterna, setOpcaoInterna] = useState<string | null>(null)
    const [variacaoInterna, setVariacaoInterna] = useState<VariacaoPreco | null>(null)

    // Categorias derivadas
    const categorias = ['todos', ...Array.from(new Set(produtos.map(p => p.categoria)))]

    useEffect(() => {
        if (!loading && produtos.length === 0) {
            console.error('Nenhum produto carregado.')
        }
    }, [produtos, loading])



    const triggerCartAnimation = (image: string, startX: number, startY: number) => {
        const id = Date.now()
        setAnimations(prev => [...prev, { id, x: startX, y: startY, image }])
        setTimeout(() => {
            setAnimations(prev => prev.filter(a => a.id !== id))
        }, 800)
    }

    // Handler para abrir modal de variação ou adicionar direto
    const handleAddToCartAnim = (produtoAAdicionar: Produto, variacaoId?: string | VariacaoPreco, opcao?: string, evento?: React.MouseEvent) => {
        if (pedidoConfirmado && (orderStatus === 'pronto' || orderStatus === 'saiu_para_entrega' || orderStatus === 'entregue')) {
            showToast('error', 'Atenção', 'Pedido já finalizado, inicie um novo')
            return;
        }

        if (evento) {
            evento.stopPropagation();
            evento.preventDefault();
        }

        let variacaoObj: VariacaoPreco | undefined;
        if (typeof variacaoId === 'string') {
            variacaoObj = produtoAAdicionar.variacoes_preco?.find(v => v.id === variacaoId);
        } else {
            variacaoObj = variacaoId;
        }

        const temOpcoesList = Array.isArray(produtoAAdicionar.opcoes) && produtoAAdicionar.opcoes.length > 0;
        const temPrecosNaPorcao = produtoAAdicionar.variacoes_preco && produtoAAdicionar.variacoes_preco.length > 0;

        if ((temOpcoesList || temPrecosNaPorcao) && !variacaoId && (!opcao || !temOpcoesList)) {
            setProdutoParaVariacao(produtoAAdicionar)
            setVariacaoInterna(null)
            setOpcaoInterna(null)
            return;
        }

        if (evento) {
            const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
            triggerCartAnimation(produtoAAdicionar.imagem_url || '', rect.left + rect.width / 2, rect.top + rect.height/2);
        }
        
        adicionarAoCarrinho(produtoAAdicionar, variacaoObj, opcao)
    }

    // Função de finalização do pedido principal/complemento
    const handlePlaceOrder = async (order: any) => {
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
                nome: item.nome + (item.opcao_selecionada ? ` - ${item.opcao_selecionada}` : '') + (item.variacao_nome ? ` (${item.variacao_nome})` : ''),
                quantidade: item.quantidade,
                preco: item.preco,
                subtotal: item.preco * item.quantidade,
                variacao_id: item.variacao_id || null,
                opcao_selecionada: item.opcao_selecionada || null,
                novo: modoComplemento // Marca como novo se for um complemento
            }))

            if (modoComplemento && pedidoComplementoNumero) {
                const targetNumber = Number(pedidoComplementoNumero);
                console.log(`🔍 Buscando pedido original #${targetNumber} para adicionar itens...`);
                
                const { data: pedidoOriginal, error: fetchError } = await supabase
                    .from('pedidos_online')
                    .select('*')
                    .eq('numero_pedido', targetNumber)
                    .maybeSingle();

                if (fetchError || !pedidoOriginal) {
                    console.error('Erro ao buscar pedido:', fetchError);
                    showToast('error', 'Erro', 'Não foi possível localizar o pedido original.');
                    return;
                }

                console.log('--- RESUMO DO COMPLEMENTO ---');
                console.log('Itens originais:', pedidoOriginal.itens?.length || 0);
                console.log('Itens novos a adicionar:', itensPedido.length);
                
                const novosItens = [...(pedidoOriginal.itens || []), ...itensPedido];
                const novoSubtotal = (pedidoOriginal.subtotal || 0) + subtotal;
                const novoTotal = (pedidoOriginal.total || 0) + subtotal;

                const complemento = {
                    data: new Date().toISOString(),
                    itens: itensPedido,
                    subtotal: subtotal,
                    total: subtotal
                };

                const historico = Array.isArray(pedidoOriginal.historico_complementos)
                    ? [...pedidoOriginal.historico_complementos, complemento]
                    : [complemento];

                const { data: updateData, error: updateError } = await supabase
                    .from('pedidos_online')
                    .update({
                        itens: novosItens,
                        subtotal: novoSubtotal,
                        total: novoTotal,
                        historico_complementos: historico,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', pedidoOriginal.id)
                    .select(); // Adicionado select() para confirmar o retorno

                if (updateError) {
                    console.error('❌ Erro Crítico no Update:', updateError);
                    showToast('error', 'Erro no Banco', `Não foi possível salvar os itens: ${updateError.message}`);
                    throw updateError;
                }

                console.log('✅ Pedido atualizado com sucesso no banco.');

                // Webhook de atualização
                const { sendOrderWebhook } = await import('@/utils/webhook');
                sendOrderWebhook('delivery_order', {
                    ...pedidoOriginal,
                    itens: novosItens,
                    subtotal: novoSubtotal,
                    total: novoTotal
                });

                showToast('success', '✅ Adicionado!', `Itens adicionados ao Pedido #${targetNumber} com sucesso.`);

                // Reset states
                setModoComplemento(false);
                setPedidoComplementoNumero(null);
                limparCarrinho();
                localStorage.removeItem('modoComplemento');
                localStorage.removeItem('pedidoComplementoNumero');
                setMostrarCarrinho(false);
                setPedidoConfirmado(targetNumber);
                setupOrderStatusListener(pedidoOriginal.id);
                iniciarPolling(pedidoOriginal.id);
                // Atualiza activeOrder com o id do pedido original para realtime persistente
                localStorage.setItem('activeOrder', JSON.stringify({ numero: targetNumber, id: pedidoOriginal.id }));
                return;
            } else {
                // ... Lógica de novo pedido ...
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
                        total: order.total,
                        observacoes: obs || null,
                        status: 'pendente'
                    })
                    .select()
                    .single()

                if (error) throw error

                import('@/utils/webhook').then(m => m.sendOrderWebhook('delivery_order', data));

                setCarrinho([])
                localStorage.removeItem('carrinho')
                setMostrarCarrinho(false)
                setPedidoConfirmado(data.numero_pedido)
                setOrderStatus('pendente')
                setupOrderStatusListener(data.id)
                iniciarPolling(data.id)

                // Sempre salvar tipo_entrega no localStorage e no estado para o popup mostrar corretamente
                localStorage.setItem('activeOrder', JSON.stringify({ numero: data.numero_pedido, id: data.id, tipo_entrega: tipoEntregaMapped }))
                
                // Atualiza tipo_entrega no estado imediatamente (antes de qualquer carregamento assíncrono)
                setDadosCliente(prev => ({ ...prev, tipo_entrega: tipoEntregaMapped as any }))

                if (!clienteId) {
                    localStorage.setItem('tempClientData', JSON.stringify({
                        nome: order.customer.name,
                        telefone: order.customer.phone,
                        endereco: enderecoCompleto || '',
                        bairro: order.customer.address.neighborhood || '',
                        numero: order.customer.address.number || '',
                        tipo_entrega: tipoEntregaMapped
                    }))
                    setDadosCliente(prev => ({
                        ...prev,
                        nome: order.customer.name,
                        telefone: order.customer.phone,
                        endereco: enderecoCompleto || '',
                        bairro: order.customer.address.neighborhood || '',
                        numero: order.customer.address.number || '',
                        tipo_entrega: tipoEntregaMapped as any
                    }))
                } else if (tipoCliente === 'credito') {
                    await loadClienteData(clienteId)
                    // Reaplica tipo_entrega após loadClienteData (que pode sobrescrever o estado)
                    setDadosCliente(prev => ({ ...prev, tipo_entrega: tipoEntregaMapped as any }))
                }
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        } catch (error) {
            console.error('Erro ao salvar pedido:', error)
            alert('Não foi possível realizar o pedido. Tente novamente.')
        } finally {
            setEnviando(false)
        }
    }

    // Modal de Confirmação de Cancelamento
    const renderCancelConfirmationModal = () => {
        if (!mostrarConfirmacaoCancelamento) return null;
        
        return (
            <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                <div className="bg-[#1e2633] border border-white/5 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_25px_60px_rgba(0,0,0,0.7)] animate-in zoom-in-95 text-center">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                        <X size={40} strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3">Cancelar Pedido?</h3>
                    <p className="text-neutral-400 text-base mb-8 leading-relaxed">
                        Tem certeza que deseja cancelar o pedido <strong>#{pedidoConfirmado}</strong>? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                console.log('Confirmando cancelamento...');
                                cancelarPedido(pedidoConfirmado!);
                            }}
                            disabled={statusCancelamento !== null}
                            className="w-full py-4 bg-[#ff4b4b] hover:bg-[#ff3333] text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                        >
                            {statusCancelamento === 'cancelando' ? 'Processando...' : 'SIM, CANCELAR AGORA'}
                        </button>
                        <button
                            onClick={() => setMostrarConfirmacaoCancelamento(false)}
                            disabled={statusCancelamento !== null}
                            className="w-full py-4 bg-transparent hover:bg-white/5 text-neutral-400 font-bold rounded-2xl transition-all"
                        >
                            Não, manter pedido
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            {/* Header com Navegação */}
            <CardapioHeader 
                nomeRestaurante={configuracao.nome_restaurante}
                categorias={categorias}
                selectedCategory={categoriaFiltro}
                setSelectedCategory={setCategoriaFiltro}
                cartCount={cartCount}
                setMostrarCarrinho={setMostrarCarrinho}
                cartIconRef={cartIconRef}
                tipoCliente={tipoCliente}
                dadosCliente={dadosCliente}
                setMostrarQuemSomos={setMostrarQuemSomos}
                setMostrarContato={setMostrarContato}
                handleLogout={handleLogout}
            />

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


            {/* Hero Section */}
            <HeroSection 
                bannerUrl={configuracao.banner_url || undefined}
                titulo={configuracao.banner_titulo}
                subtitulo={configuracao.banner_subtitulo}
            />

            {/* Categoria Filter (Mobile) */}
            <CategoryFilter 
                categorias={categorias} 
                selectedCategory={categoriaFiltro} 
                setSelectedCategory={setCategoriaFiltro} 
            />

            {/* Main Menu Grid */}
            {!loading && produtos.length > 0 && (
                <ProductGrid 
                    produtos={produtos}
                    selectedCategory={categoriaFiltro}
                    layoutCardapio={configuracao.layout_cardapio || 'standard'}
                    produtosDestaqueBolha={configuracao.produtos_destaque_bolha || []}
                    onAdd={handleAddToCartAnim}
                />
            )}

            {/* Loading / Empty States */}
            {loading && (
                 <p className="text-center text-orange-500 animate-pulse py-10 mt-10">Carregando cardápio...</p>
            )}
            {!loading && produtos.length === 0 && (
                <p className="text-center text-neutral-500 py-10 mt-10">Nenhum produto disponível.</p>
            )}

            {/* Footer Omitido no Page para simplificar, pode manter aqui também se quiser, mas mantemos local  */}
            <footer className="mt-0 text-center bg-neutral-950">
                <div className="py-5">
                    <div className="text-white font-display font-bold text-xl tracking-wider flex items-center justify-center gap-2">
                        <div className="bg-orange-600 p-1 rounded shadow-neon mr-1"><Flame className="text-white" size={16} fill="currentColor" /></div>
                        KAL DO <span className="text-orange-500">ESPETINHO</span>
                    </div>
                    <p className="text-white text-xs font-bold uppercase tracking-wider mt-2">Desenvolvido por Atila Azevedo</p>
                </div>

                <div className="bg-orange-600 pt-4 pb-5 shadow-neon-strong overflow-hidden flex flex-col items-center">
                    <p className="text-white text-sm font-medium drop-shadow-sm px-4 text-center mb-0">© 2026 Kal do Espetinho. Todos os direitos reservados.</p>

                    <div className="flex flex-wrap justify-center items-center gap-2 mt-2 text-xs text-white font-medium px-4">
                        <a href="/privacidade" className="hover:underline hover:text-black transition-colors">Política de Privacidade</a>
                        <span className="opacity-60 hidden sm:inline">•</span>
                        <a href="/termos" className="hover:underline hover:text-black transition-colors">Termos de Uso</a>
                    </div>
                    <div className="w-[52%] sm:w-[35%] max-w-xs h-[2px] bg-black/50 mt-3 mb-1.5 rounded-full"></div>
                </div>
            </footer>

            {/* Cart Sidebar */}
            <CartSidebar
                isOpen={mostrarCarrinho}
                onClose={() => setMostrarCarrinho(false)}
                cart={carrinho.map(item => ({
                    ...item,
                    id: `${item.id}${item.variacao_id ? `-${item.variacao_id}` : ''}${item.opcao_selecionada ? `-${item.opcao_selecionada}` : ''}`,
                    name: `${item.nome}${item.opcao_selecionada ? ` - Sabor: ${item.opcao_selecionada}` : ''}${item.variacao_nome ? ` (${item.variacao_nome})` : ''}`,
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
                deliveryFee={configuracao.taxa_entrega_padrao}
                allowPayLater={tipoCliente === 'credito' || (dadosCliente.limite_credito !== undefined && dadosCliente.limite_credito > 0)}
                onPlaceOrder={handlePlaceOrder}
                isComplement={modoComplemento}
                complementOrderNumber={pedidoComplementoNumero}
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
            />

            {/* Confirmation Overlay */}
            {pedidoConfirmado && (
                <OrderConfirmation 
                    pedidoConfirmado={pedidoConfirmado}
                    modoComplemento={modoComplemento}
                    confirmacoMinimizada={confirmacoMinimizada}
                    setConfirmacoMinimizada={setConfirmacoMinimizada}
                    verificandoStatus={verificandoStatus}
                    handleAdicionarItens={handleAdicionarItens}
                    carrinho={carrinho}
                    setMostrarCarrinho={setMostrarCarrinho}
                    dadosCliente={dadosCliente}
                    tipoCliente={tipoCliente}
                    orderStatus={orderStatus}
                    setMostrarConfirmacaoCancelamento={setMostrarConfirmacaoCancelamento}
                    statusCancelamento={statusCancelamento}
                    mostrarModalBloqueio={mostrarModalBloqueio}
                    solicitacaoStatus={solicitacaoStatus}
                    setMostrarModalBloqueio={setMostrarModalBloqueio}
                    setSolicitacaoStatus={setSolicitacaoStatus as any}
                    resetarEstadoTotal={resetarEstadoTotal}
                />
            )}

            {/* Selection Modal (Variants/Options) */}
            <SelectionModal 
                produtoParaVariacao={produtoParaVariacao}
                setProdutoParaVariacao={setProdutoParaVariacao}
                opcaoInterna={opcaoInterna}
                setOpcaoInterna={setOpcaoInterna}
                variacaoInterna={variacaoInterna}
                setVariacaoInterna={setVariacaoInterna}
                onAddToCart={handleAddToCartAnim}
                triggerCartAnimation={triggerCartAnimation}
            />

            {/* Info Modals */}
            <InfoModals 
                configuracao={configuracao as any}
                mostrarContato={mostrarContato}
                mostrarQuemSomos={mostrarQuemSomos}
                setMostrarContato={setMostrarContato}
                setMostrarQuemSomos={setMostrarQuemSomos}
            />

            {renderCancelConfirmationModal()}

            <ClienteIdentificationModal 
                isOpen={mostrarIdentificacao}
                onClienteIdentified={handleClienteIdentified}
            />
        </div>
    )
}
