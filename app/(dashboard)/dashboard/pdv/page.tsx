'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Utensils, CupSoda, ShoppingBag, Plus, Minus, Search, ChevronDown, Check, Trash2, Store, Square, ArrowLeft, X } from 'lucide-react'
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
    tem_variacoes?: boolean
    variacoes_preco?: { id: string, nome: string, valor: number }[]
    tem_opcoes?: boolean
    opcoes?: any
}

interface ItemComanda {
    id: string
    nome: string
    descricao: string
    preco: number
    categoria: string
    ativo: boolean
    quantidade: number
    variacao_id?: string
    variacao_nome?: string
    opcao_selecionada?: string
}

interface Mesa {
    id: string
    numero_mesa: string
    status: 'livre' | 'ocupada' | 'em_atendimento'
    garcom_atual_nome?: string | null
    garcom_atual_id?: string | null
}

interface ClienteSugerido {
    id: string
    nome: string
    telefone: string
    limite_ilimitado?: boolean
    limite_credito?: number
    credito_utilizado?: number
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

    // Estados de Sugestões de Clientes (Autocomplete)
    const [sugestoesClientes, setSugestoesClientes] = useState<ClienteSugerido[]>([])
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
    const [clientePermiteFiado, setClientePermiteFiado] = useState(false)
    const [clienteCreditoDisponivel, setClienteCreditoDisponivel] = useState<number | null>(null)
    const [clienteLimiteTotal, setClienteLimiteTotal] = useState<number | null>(null)
    const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao' | 'dinheiro' | 'pagamento_posterior' | null>('pix')
    const [precisaTroco, setPrecisaTroco] = useState(false)
    const [trocoPara, setTrocoPara] = useState('')
    // Split Payment: pagamento secundário quando o crédito não cobre tudo
    const [splitMetodo, setSplitMetodo] = useState<'pix' | 'cartao' | 'dinheiro' | 'pagamento_posterior' | null>(null)
    const [valorPrimarioInput, setValorPrimarioInput] = useState<string>('')
    const [valorSecundarioInput, setValorSecundarioInput] = useState<string>('')

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

    // Estado para Gorjeta / Cota
    const [tipoExtra, setTipoExtra] = useState<'Gorjeta' | 'Cota Artística' | null>(null);
    const [extraValorInput, setExtraValorInput] = useState('');

    const [produtoParaVariacao, setProdutoParaVariacao] = useState<Produto | null>(null)
    const [opcaoSelecionadaPDV, setOpcaoSelecionadaPDV] = useState<string | null>(null)
    const [variacaoSelecionadaPDV, setVariacaoSelecionadaPDV] = useState<any | null>(null)

    const renderBotoesExtra = () => (
        <div className="flex flex-col gap-2 my-2 w-full">
            {!tipoExtra ? (
                <div className="flex gap-2">
                    <button 
                        onClick={() => setTipoExtra('Gorjeta')}
                        className="flex-1 py-1.5 bg-zinc-800/80 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-semibold hover:bg-zinc-700 transition"
                    >
                        + Gorjeta
                    </button>
                    <button 
                        onClick={() => setTipoExtra('Cota Artística')}
                        className="flex-1 py-1.5 bg-zinc-800/80 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold hover:bg-zinc-700 transition"
                    >
                        + Cota Artística
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2 p-2 bg-black/40 border border-white/10 rounded-lg">
                    <span className="text-xs text-zinc-400 font-bold">Valor para {tipoExtra}:</span>
                    <div className="flex gap-2 h-9">
                        <input 
                            type="number" 
                            inputMode="decimal"
                            step="0.01" 
                            placeholder="R$ 0,00" 
                            value={extraValorInput}
                            onChange={(e) => setExtraValorInput(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 text-sm text-white outline-none focus:border-orange-500"
                        />
                        <button 
                            onClick={() => {
                                const val = parseFloat(extraValorInput.replace(',', '.'));
                                if (!val || val <= 0) {
                                    showToast('error', 'Atenção', 'Digite um valor válido');
                                    return;
                                }
                                setComanda(prev => [...prev, {
                                    id: `extra-${Date.now()}-${Math.random()}`,
                                    nome: tipoExtra,
                                    descricao: '',
                                    preco: val,
                                    categoria: 'Adicional',
                                    ativo: true,
                                    quantidade: 1
                                }]);
                                setTipoExtra(null);
                                setExtraValorInput('');
                            }}
                            className="px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center justify-center font-bold transition"
                        >
                            <Check size={16} />
                        </button>
                        <button 
                            onClick={() => { setTipoExtra(null); setExtraValorInput(''); }}
                            className="px-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg flex items-center justify-center font-bold text-xs transition"
                        >
                            X
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    useEffect(() => {
        let timeoutId: NodeJS.Timeout
        if (nomeCliente.length >= 2) {
            timeoutId = setTimeout(async () => {
                const { data, error } = await supabase
                    .from('clientes')
                    .select('id, nome, telefone, limite_credito, credito_utilizado, limite_ilimitado')
                    .ilike('nome', `%${nomeCliente}%`)
                    .limit(5)
                
                if (!error && data) {
                    setSugestoesClientes(data as ClienteSugerido[])
                    setMostrarSugestoes(true)
                }
            }, 400)
        } else {
            setSugestoesClientes([])
            setMostrarSugestoes(false)
            setClientePermiteFiado(false)
            setClienteCreditoDisponivel(null)
            setClienteLimiteTotal(null)
            setSplitMetodo(null)
            setValorPrimarioInput('')
            setValorSecundarioInput('')
            setMetodoPagamento(prev => prev === 'pagamento_posterior' ? 'pix' : prev)
        }
        return () => clearTimeout(timeoutId)
    }, [nomeCliente])

    const selecionarClienteSugestao = (cliente: ClienteSugerido) => {
        setNomeCliente(cliente.nome)
        setTelefone(cliente.telefone)
        
        let podeFiado = false;
        let creditoDisp: number | null = null;
        let limiteTotal: number | null = null;

        if (cliente.limite_ilimitado) {
            podeFiado = true
            creditoDisp = Infinity
            limiteTotal = Infinity
        } else if (cliente.limite_credito !== undefined && cliente.credito_utilizado !== undefined) {
            const restante = cliente.limite_credito - cliente.credito_utilizado
            if (restante > 0) podeFiado = true
            creditoDisp = restante
            limiteTotal = cliente.limite_credito
        }
        setClientePermiteFiado(podeFiado)
        setClienteCreditoDisponivel(creditoDisp)
        setClienteLimiteTotal(limiteTotal)
        setSplitMetodo(null)
        setValorPrimarioInput('')
        setValorSecundarioInput('')
        setMostrarSugestoes(false)
    }


    // Lida com seleção/deselecão de modalidades de pagamento (multi-select de até 2)
    const toggleMetodo = (metodo: 'pix' | 'cartao' | 'dinheiro' | 'pagamento_posterior') => {
        if (metodo === 'pagamento_posterior' && !clientePermiteFiado) return
        
        if (metodoPagamento === metodo) {
            // Desseleciona primário: se há secundário, promove-o
            if (splitMetodo) {
                setMetodoPagamento(splitMetodo as typeof metodoPagamento)
                setSplitMetodo(null)
                setValorPrimarioInput('')
                setValorSecundarioInput('')
            } else {
                setMetodoPagamento(null)
            }
        } else if (splitMetodo === metodo) {
            // Desseleciona secundário
            setSplitMetodo(null)
            setValorPrimarioInput('')
            setValorSecundarioInput('')
        } else if (!metodoPagamento) {
            // Sem primário: define este como primário
            setMetodoPagamento(metodo)
            setValorPrimarioInput('')
            setValorSecundarioInput('')
        } else {
            // Já tem primário → define como secundário e pré-divide os valores
            setSplitMetodo(metodo)
            // Preencher com base no crédito (se fiado envolvido) ou 50/50
            const isPrFiado = metodoPagamento === 'pagamento_posterior'
            const isSecFiado = metodo === 'pagamento_posterior'
            const temCredito = clienteCreditoDisponivel !== null && clienteCreditoDisponivel !== Infinity
            
            if ((isPrFiado || isSecFiado) && temCredito && clienteCreditoDisponivel! < total) {
                const credito = clienteCreditoDisponivel!
                if (isPrFiado) {
                    setValorPrimarioInput(credito.toFixed(2))
                    setValorSecundarioInput((total - credito).toFixed(2))
                } else {
                    setValorSecundarioInput(credito.toFixed(2))
                    setValorPrimarioInput((total - credito).toFixed(2))
                }
            } else {
                const metade = (total / 2).toFixed(2)
                setValorPrimarioInput(metade)
                setValorSecundarioInput((total - parseFloat(metade)).toFixed(2))
            }
        }
    }

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
                showToast('error', '🔴 Conta Fechada', `A Mesa ${mesaFull.numero_mesa} já foi atendida e está aguardando entrega.`)
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

    function adicionarAoItem(produto: Produto, delta: number, variacao?: { id: string, nome: string, valor: number }) {
        setComanda(prev => {
            const itemExistenteIndex = prev.findIndex(item => 
                variacao ? (item.id === produto.id && item.variacao_id === variacao.id) : (item.id === produto.id && !item.variacao_id)
            )

            if (itemExistenteIndex >= 0) {
                const novaComanda = prev.map((item, idx) => 
                    idx === itemExistenteIndex 
                        ? { ...item, quantidade: item.quantidade + delta } 
                        : item
                ).filter(item => item.quantidade > 0)
                return novaComanda
            } else if (delta > 0) {
                const novoItem: ItemComanda = {
                    id: produto.id,
                    nome: produto.nome,
                    descricao: produto.descricao,
                    preco: variacao ? variacao.valor : produto.preco,
                    categoria: produto.categoria,
                    ativo: produto.ativo,
                    quantidade: 1,
                    variacao_id: variacao?.id,
                    variacao_nome: variacao?.nome,
                    opcao_selecionada: (produto as any).opcao_selecionada
                }
                return [...prev, novoItem]
            }
            return prev
        })
    }

    function alterarQuantidade(item: ItemComanda, delta: number) {
        setComanda(prev => {
            return prev.map(i => {
                const isSame = i.id === item.id && i.variacao_id === item.variacao_id
                if (isSame) {
                    const novaQuantidade = i.quantidade + delta
                    return novaQuantidade > 0 ? { ...i, quantidade: novaQuantidade } : null
                }
                return i
            }).filter((i): i is ItemComanda => i !== null)
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

        // Validar e preparar split de pagamento
        const splitAtivo = splitMetodo !== null
        if (splitAtivo) {
            const vp = parseFloat(valorPrimarioInput.replace(',', '.')) || 0
            const vs = parseFloat(valorSecundarioInput.replace(',', '.')) || 0
            const soma = parseFloat((vp + vs).toFixed(2))
            if (Math.abs(soma - total) > 0.01) {
                showToast('error', 'Atenção', `A soma dos pagamentos (R$ ${soma.toFixed(2)}) deve ser igual ao total (R$ ${total.toFixed(2)})`)
                return
            }

            // Validar: se Fiado está no split, o valor alocado para ele NÃO pode ultrapassar o crédito disponível
            if (clienteCreditoDisponivel !== null && clienteCreditoDisponivel !== Infinity) {
                const valorFiado = metodoPagamento === 'pagamento_posterior' ? vp : splitMetodo === 'pagamento_posterior' ? vs : 0
                if (valorFiado > clienteCreditoDisponivel + 0.01) {
                    showToast('error', 'Limite de Crédito Excedido',
                        `O valor no Fiado (R$ ${valorFiado.toFixed(2)}) ultrapassa o crédito disponível do cliente (R$ ${clienteCreditoDisponivel.toFixed(2)}). Reduza o valor do Fiado.`)
                    return
                }
            }
        } else if (metodoPagamento === 'pagamento_posterior'
            && clienteCreditoDisponivel !== null
            && clienteCreditoDisponivel !== Infinity
            && clienteCreditoDisponivel < total) {
            showToast('error', 'Atenção', 'Selecione como pagar o restante além do crédito disponível')
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
            nome: `${item.nome}${item.opcao_selecionada ? ` - Sabor: ${item.opcao_selecionada}` : ''}${item.variacao_nome ? ` (${item.variacao_nome})` : ''}`,
            quantidade: item.quantidade,
            preco: item.preco,
            subtotal: item.preco * item.quantidade,
            variacao_id: item.variacao_id || null,
            variacao_nome: item.variacao_nome || null,
            opcao_selecionada: item.opcao_selecionada || null
        }))

        const notasPDV = numeroMesa ? `MESA: ${numeroMesa}` : 'PDV Balcão'
        let objObservacoes = observacoes ? `${notasPDV}\n${observacoes}` : notasPDV

        const valorTrocoNumero = (metodoPagamento === 'dinheiro' && precisaTroco) ? parseFloat(trocoPara.replace(/[^\d.,]/g, '').replace(',', '.')) : null;

        // Calcular divisão de pagamento (suporta qualquer combinação de 2 métodos)
        let valorPrincipal: number | null = null
        let valorSecundario: number | null = null
        let metodoSecundario: string | null = null
        
        if (splitMetodo) {
            // Split livre entre dois métodos
            valorPrincipal = parseFloat(valorPrimarioInput.replace(',', '.')) || total
            valorSecundario = parseFloat(valorSecundarioInput.replace(',', '.')) || 0
            metodoSecundario = splitMetodo
        } else if (metodoPagamento === 'pagamento_posterior' && clienteCreditoDisponivel !== null) {
            // Fiado sem split: registra o valor integral no pagamento principal
            valorPrincipal = clienteCreditoDisponivel === Infinity ? total : Math.min(clienteCreditoDisponivel, total)
        }

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
                garcom_nome: garcomNome || null,
                pagamento_principal_valor: valorPrincipal,
                pagamento_secundario_metodo: metodoSecundario,
                pagamento_secundario_valor: valorSecundario
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
            setClientePermiteFiado(false)
            setClienteCreditoDisponivel(null)
            setClienteLimiteTotal(null)
            setSplitMetodo(null)

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
            <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-5xl mx-auto h-full pt-4 px-3 pb-4 sm:p-4 overflow-y-auto overflow-x-hidden">
                <div className="flex items-center gap-3 mb-2">
                    <button 
                        onClick={() => window.location.href = '/dashboard'} 
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center justify-center lg:hidden"
                        title="Voltar para Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-0.5 sm:mb-1">Acessar PDV</h1>
                        <p className="text-white/70 text-xs sm:text-base">Selecione onde o cliente será atendido antes de abrir o cardápio.</p>
                    </div>
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
                        const statusLabel = isEmAtendimento ? `Em Atend.` : isOcupada ? 'Conta Fechada' : 'Livre'
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
            {/* Header de Atendimento - fixo no topo no mobile */}
            <div className="fixed top-0 left-0 right-0 z-[100] flex items-center gap-3 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-3 text-white lg:hidden shadow-xl">
                <button 
                    onClick={voltarDaMesa} 
                    className="p-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-xl transition-all flex items-center justify-center shrink-0 shadow-md"
                    title="Voltar para seleção de mesas"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col min-width-0">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider leading-none mb-0.5">Em Atendimento</span>
                    <div className="font-extrabold text-lg leading-tight truncate">
                        Mesa {mesaEscolhida.numero_mesa}
                    </div>
                </div>
            </div>
            
            {/* Spacer para compensar o header fixo no mobile */}
            <div className="h-[68px] lg:hidden shrink-0" />


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
                    <div className="relative w-full">
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Nome do Cliente"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                            onFocus={() => nomeCliente.length >= 2 && setMostrarSugestoes(true)}
                            onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                        />
                        {mostrarSugestoes && sugestoesClientes.length > 0 && (
                            <ul className={styles.suggestionsList}>
                                {sugestoesClientes.map(c => (
                                    <li key={c.id} onMouseDown={() => selecionarClienteSugestao(c)} className={styles.suggestionItem}>
                                        <div className="font-semibold text-white truncate leading-tight">{c.nome}</div>
                                        <div className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5">{c.telefone}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
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
                            <div key={`${item.id}-${item.variacao_id || 'base'}`} className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400 w-6 shrink-0">{item.quantidade}x</span>
                                <span className="text-white flex-1 truncate">
                                    {item.nome} {item.variacao_nome && `(${item.variacao_nome})`}
                                    <span className="text-zinc-500 text-[10px] ml-1">(R$ {item.preco.toFixed(0)})</span>
                                </span>
                                <span className="text-white font-semibold ml-2 shrink-0">R$ {(item.preco * item.quantidade).toFixed(0)}</span>
                            </div>
                        ))}

                        {renderBotoesExtra()}

                        {/* Total + Botão Finalizar */}
                        <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t border-white/10 flex-wrap">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold leading-tight">Total</span>
                                <span className="text-orange-500 font-black text-lg leading-tight">R$ {total.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={finalizarPedido}
                                disabled={enviando}
                                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm px-6 py-2.5 rounded-xl transition shadow-lg active:scale-95 shrink-0"
                            >
                                {enviando ? '...' : 'FINALIZAR ✓'}
                            </button>
                        </div>

                        {/* Mobile Payment Area (Nova Versão Responsiva) */}
                        <div className={styles.paymentAreaMobile}>

                            {/* Indicador de crédito */}
                            {clientePermiteFiado && clienteCreditoDisponivel !== null && (
                                <div className={`${styles.creditIndicatorMobile}`} style={{
                                    backgroundColor: clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#052e16' : '#2d1010',
                                    borderColor: clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#166534' : '#7f1d1d'
                                }}>
                                    <span className="text-zinc-400">💳 Crédito:</span>
                                    <span style={{ fontWeight: 600, color: clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#4ade80' : '#f87171' }}>
                                        {clienteCreditoDisponivel === Infinity ? 'Ilimitado ✓'
                                            : clienteCreditoDisponivel >= total ? `R$ ${clienteCreditoDisponivel.toFixed(2)} ✓`
                                            : `R$ ${clienteCreditoDisponivel.toFixed(2)} — faltam R$ ${(total - clienteCreditoDisponivel).toFixed(2)}`}
                                    </span>
                                </div>
                            )}

                            {/* Pílulas multi-select (até 2 métodos) */}
                            <p className={styles.splitLabel}>Toque para selecionar até 2 formas de pagamento:</p>
                            <div className={styles.paymentPillsContainer}>
                                {(['pix', 'cartao', 'dinheiro'] as const).map(m => {
                                    const isPrimary = metodoPagamento === m
                                    const isSplit = splitMetodo === m
                                    const isActive = isPrimary || isSplit
                                    return (
                                        <button key={m} onClick={() => toggleMetodo(m)}
                                            className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-all flex-1 min-w-[30%] flex items-center justify-center gap-1 ${isActive ? 'bg-orange-600 text-white ring-1 ring-orange-400' : 'bg-zinc-800 text-zinc-400 border border-white/5'}`}>
                                            {m === 'pix' ? '⚡ Pix' : m === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}
                                            {isSplit && <span className="opacity-70">(2º)</span>}
                                        </button>
                                    )
                                })}
                                {clientePermiteFiado && (
                                    <button onClick={() => toggleMetodo('pagamento_posterior')}
                                        className={`px-3 py-1.5 text-xs rounded-full font-bold transition-all flex-1 min-w-[30%] flex items-center justify-center gap-1 ${metodoPagamento === 'pagamento_posterior' || splitMetodo === 'pagamento_posterior' ? 'bg-emerald-600 text-white ring-1 ring-emerald-400' : 'bg-zinc-800 text-emerald-500 border border-white/5'}`}>
                                        Fiado
                                        {splitMetodo === 'pagamento_posterior' && <span className="opacity-70">(2º)</span>}
                                    </button>
                                )}
                            </div>

                            {/* Inputs de valor quando 2 métodos selecionados */}
                            {splitMetodo && metodoPagamento && (
                                <div className={styles.splitPaymentBox}>
                                    <p className={styles.splitLabel}>
                                        Defina o valor de cada forma <span className="text-orange-500 font-bold ml-1">(Total: R$ {total.toFixed(2)})</span>
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <div className={styles.splitInputRow}>
                                            <span className={styles.splitInputLabel}>
                                                {metodoPagamento === 'pix' ? '⚡ Pix' : metodoPagamento === 'cartao' ? '💳 Cartão' : metodoPagamento === 'dinheiro' ? '💵 Dinheiro' : '🤝 Fiado'}:
                                            </span>
                                            <input
                                                type="number" inputMode="decimal" placeholder="R$ 0,00"
                                                className={styles.splitInputField}
                                                value={valorPrimarioInput}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    setValorPrimarioInput(v)
                                                    const parsed = parseFloat(v.replace(',', '.')) || 0
                                                    setValorSecundarioInput(Math.max(0, total - parsed).toFixed(2))
                                                }}
                                            />
                                        </div>
                                        <div className={styles.splitInputRow}>
                                            <span className={styles.splitInputLabel}>
                                                {splitMetodo === 'pix' ? '⚡ Pix' : splitMetodo === 'cartao' ? '💳 Cartão' : splitMetodo === 'dinheiro' ? '💵 Dinheiro' : '🤝 Fiado'}:
                                            </span>
                                            <input
                                                type="number" inputMode="decimal" placeholder="R$ 0,00"
                                                className={styles.splitInputField}
                                                value={valorSecundarioInput}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    setValorSecundarioInput(v)
                                                    const parsed = parseFloat(v.replace(',', '.')) || 0
                                                    setValorPrimarioInput(Math.max(0, total - parsed).toFixed(2))
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* Indicador de soma */}
                                    {(() => {
                                        const soma = (parseFloat(valorPrimarioInput || '0') + parseFloat(valorSecundarioInput || '0'))
                                        const diff = parseFloat((total - soma).toFixed(2))
                                        if (Math.abs(diff) < 0.01) return (
                                            <p className={`${styles.splitStatus} text-green-400`}>✓ Soma correta: R$ {soma.toFixed(2)}</p>
                                        )
                                        return (
                                            <p className={`${styles.splitStatus} ${diff > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                                {diff > 0 ? `Faltam R$ ${diff.toFixed(2)}` : `Excede R$ ${Math.abs(diff).toFixed(2)}`}
                                            </p>
                                        )
                                    })()}
                                </div>
                            )}

                            {(metodoPagamento === 'dinheiro' || splitMetodo === 'dinheiro') && (
                                <div className="mt-3 bg-black/20 p-2 rounded-lg border border-white/5">
                                    <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                                        <input type="checkbox" checked={precisaTroco} onChange={(e) => setPrecisaTroco(e.target.checked)} className="accent-orange-500 w-4 h-4" />
                                        Precisa de troco?
                                    </label>
                                    {precisaTroco && (
                                        <input 
                                            type="text" 
                                            placeholder="Troco para... " 
                                            value={trocoPara} 
                                            onChange={(e) => setTrocoPara(e.target.value)} 
                                            className="w-full mt-2 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none" 
                                        />
                                    )}
                                </div>
                            )}
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
                        const hasVariations = produto.tem_variacoes && produto.variacoes_preco && produto.variacoes_preco.length > 0
                        const qty = getQuantidade(produto.id)
                        
                        return (
                            <div
                                key={produto.id}
                                className={`${styles.productCard} ${qty > 0 ? styles.selectedCard : ''}`}
                                onClick={() => {
                                    if (hasVariations) {
                                        setProdutoParaVariacao(produto)
                                    } else {
                                        adicionarAoItem(produto, 1)
                                    }
                                }}
                            >
                                <div className={styles.productIconWrapper}>
                                    {getCategoryIcon(produto.categoria)}
                                </div>
                                <div className={styles.productName}>{produto.nome}</div>

                                <div className={styles.cardActionArea}>
                                    {!hasVariations && (
                                        <>
                                            <button
                                                className={styles.qtyBtn}
                                                onClick={(e) => { e.stopPropagation(); adicionarAoItem(produto, -1) }}
                                                disabled={qty === 0}
                                            >
                                                <Minus size={14} />
                                            </button>

                                            <div className={styles.priceDisplay}>
                                                {qty === 0 ? `R$ ${produto.preco.toFixed(0)}` : qty}
                                            </div>

                                            <button
                                                className={styles.qtyBtn}
                                                onClick={(e) => { e.stopPropagation(); adicionarAoItem(produto, 1) }}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </>
                                    )}
                                    {hasVariations && (
                                        <div className={styles.priceDisplay}>
                                            Variável
                                        </div>
                                    )}
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
                        <div className="relative w-full">
                            <input
                                type="text"
                                className={styles.inputField}
                                placeholder="Nome do Cliente"
                                value={nomeCliente}
                                onChange={(e) => setNomeCliente(e.target.value)}
                                onFocus={() => nomeCliente.length >= 2 && setMostrarSugestoes(true)}
                                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                            />
                            {mostrarSugestoes && sugestoesClientes.length > 0 && (
                                <ul className={styles.suggestionsList}>
                                    {sugestoesClientes.map(c => (
                                        <li key={c.id} onMouseDown={() => selecionarClienteSugestao(c)} className={styles.suggestionItem}>
                                            <div className="font-semibold text-white truncate leading-tight">{c.nome}</div>
                                            <div className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5">{c.telefone}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
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
                            <div key={`${item.id}-${item.variacao_id || 'base'}`} className={styles.resumoItem}>
                                <div className={styles.resumoItemQty}>{item.quantidade}x</div>
                                <div className={styles.resumoItemName}>
                                    {item.nome} {item.variacao_nome && `(${item.variacao_nome})`} <span className={styles.itemMuted}>(R$ {item.preco.toFixed(0)})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-zinc-900 rounded p-1 mr-2">
                                        <button onClick={() => alterarQuantidade(item, -1)} className="text-zinc-500 hover:text-white"><Minus size={12} /></button>
                                        <span className="text-[10px] text-white font-bold w-3 text-center">{item.quantidade}</span>
                                        <button onClick={() => alterarQuantidade(item, 1)} className="text-zinc-500 hover:text-white"><Plus size={12} /></button>
                                    </div>
                                    <div className={styles.resumoItemPrice}>R$ {(item.preco * item.quantidade).toFixed(0)}</div>
                                    <button 
                                        onClick={() => setComanda(prev => prev.filter(i => i.id !== item.id || i.variacao_id !== item.variacao_id))}
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

                    <div className="px-4">
                        {renderBotoesExtra()}
                    </div>

                    <div className={styles.paymentSection}>
                        <h3 className={styles.paymentTitle}>
                            Tipo de Pagamento <ChevronDown size={14} className={styles.chevronIcon} />
                        </h3>

                        {/* Indicador sutil de crédito do cliente */}
                        {clientePermiteFiado && clienteCreditoDisponivel !== null && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '6px 12px', marginBottom: '8px',
                                backgroundColor: clienteCreditoDisponivel === Infinity ? '#052e16' : clienteCreditoDisponivel >= total ? '#052e16' : '#2d1010',
                                borderRadius: '8px', border: `1px solid ${clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#166534' : '#7f1d1d'}`,
                                fontSize: '0.75rem'
                            }}>
                                <span style={{ color: '#a1a1aa' }}>💳 Crédito do cliente:</span>
                                <span style={{
                                    fontWeight: 600,
                                    color: clienteCreditoDisponivel === Infinity ? '#4ade80'
                                        : clienteCreditoDisponivel >= total ? '#4ade80' : '#f87171'
                                }}>
                                    {clienteCreditoDisponivel === Infinity ? 'Ilimitado'
                                        : clienteCreditoDisponivel >= total
                                        ? `R$ ${clienteCreditoDisponivel.toFixed(2)} disponível ✓`
                                        : `R$ ${clienteCreditoDisponivel.toFixed(2)} de R$ ${clienteLimiteTotal?.toFixed(2)} — faltam R$ ${(total - clienteCreditoDisponivel).toFixed(2)}`
                                    }
                                </span>
                            </div>
                        )}

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
                            {clientePermiteFiado && (
                                <button
                                    className={`${styles.paymentBtn} ${metodoPagamento === 'pagamento_posterior' ? styles.paymentSelected : ''}`}
                                    onClick={() => { setMetodoPagamento('pagamento_posterior'); setSplitMetodo(null) }}
                                    style={{ borderColor: metodoPagamento === 'pagamento_posterior' ? '#10b981' : '#333', color: metodoPagamento === 'pagamento_posterior' ? '#10b981' : '#a3a3a3' }}
                                >
                                    {metodoPagamento === 'pagamento_posterior' && <span className={styles.radioDot} style={{ backgroundColor: '#10b981' }} />} Pagar Depois (Fiado)
                                </button>
                            )}
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

                        {/* Split Payment: aparece se crédito < total */}
                        {metodoPagamento === 'pagamento_posterior'
                            && clienteCreditoDisponivel !== null
                            && clienteCreditoDisponivel !== Infinity
                            && clienteCreditoDisponivel < total && (
                            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#131313', borderRadius: '10px', border: '1px solid #3f3f46' }}>
                                <p style={{ fontSize: '0.72rem', color: '#a1a1aa', marginBottom: '8px' }}>
                                    💡 O crédito cobre <strong style={{color:'#4ade80'}}>R$ {clienteCreditoDisponivel.toFixed(2)}</strong>.
                                    Pague os outros <strong style={{color:'#f97316'}}>R$ {(total - clienteCreditoDisponivel).toFixed(2)}</strong> com:
                                </p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {(['pix', 'cartao', 'dinheiro'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setSplitMetodo(m)}
                                            style={{
                                                padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                                border: splitMetodo === m ? '1px solid #f97316' : '1px solid #3f3f46',
                                                backgroundColor: splitMetodo === m ? '#431407' : '#1a1a1a',
                                                color: splitMetodo === m ? '#fb923c' : '#a1a1aa',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {m === 'pix' ? '⚡ Pix' : m === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}
                                        </button>
                                    ))}
                                </div>
                                {splitMetodo && (
                                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#71717a' }}>
                                        <span>🟢 Fiado: R$ {clienteCreditoDisponivel.toFixed(2)}</span>
                                        <span>🟠 {splitMetodo === 'pix' ? 'Pix' : splitMetodo === 'cartao' ? 'Cartão' : 'Dinheiro'}: R$ {(total - clienteCreditoDisponivel).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}
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

            {/* Modal de Variações e Sabores */}
            {produtoParaVariacao && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-white leading-tight">{produtoParaVariacao.nome}</h3>
                                <p className="text-zinc-500 text-sm">Configure o item abaixo:</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setProdutoParaVariacao(null)
                                    setOpcaoSelecionadaPDV(null)
                                    setVariacaoSelecionadaPDV(null)
                                }}
                                className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-1">
                            {/* Sabores */}
                            {produtoParaVariacao.tem_opcoes && produtoParaVariacao.opcoes?.opcoes && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">1. Escolha o Sabor</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {produtoParaVariacao.opcoes.opcoes.map((opt: any) => (
                                            <button
                                                key={opt.nome}
                                                onClick={() => setOpcaoSelecionadaPDV(opt.nome)}
                                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                                    opcaoSelecionadaPDV === opt.nome 
                                                        ? 'bg-purple-600/20 border-purple-500 text-white' 
                                                        : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/20'
                                                }`}
                                            >
                                                {opt.nome}
                                                {opt.preco != null && (
                                                    <div className="text-[9px] text-purple-400 mt-1">
                                                        + R$ {Number(opt.preco).toFixed(2)}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Variações / Tamanhos (Só exibe se o sabor selecionado não tem preço fixo) */}
                            {produtoParaVariacao.tem_variacoes && produtoParaVariacao.variacoes_preco && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                        {produtoParaVariacao.tem_opcoes ? '2. Escolha o Tamanho' : 'Escolha a Opção'}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {produtoParaVariacao.variacoes_preco.map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => setVariacaoSelecionadaPDV(v)}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                    variacaoSelecionadaPDV?.id === v.id 
                                                        ? 'bg-orange-600/20 border-orange-500 text-white' 
                                                        : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/20'
                                                }`}
                                            >
                                                <span className="font-bold">{v.nome}</span>
                                                <span className="text-orange-500 font-black">R$ {v.valor.toFixed(2)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/5 space-y-3">
                            {/* Resumo de Preço */}
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500 text-sm font-bold">Total do Item:</span>
                                <span className="text-2xl font-black text-white">
                                    R$ {(() => {
                                        const opt = produtoParaVariacao.opcoes?.opcoes?.find((o:any) => o.nome === opcaoSelecionadaPDV);
                                        if (opt?.preco != null) return Number(opt.preco).toFixed(2);
                                        if (variacaoSelecionadaPDV) return variacaoSelecionadaPDV.valor.toFixed(2);
                                        return produtoParaVariacao.preco.toFixed(2);
                                    })()}
                                </span>
                            </div>

                            <button
                                onClick={() => {
                                    const optObj = produtoParaVariacao.opcoes?.opcoes?.find((o:any) => o.nome === opcaoSelecionadaPDV);
                                    const finalPrice = optObj?.preco != null ? Number(optObj.preco) 
                                                     : variacaoSelecionadaPDV ? variacaoSelecionadaPDV.valor 
                                                     : produtoParaVariacao.preco;

                                    // Adicionar o item com os metadados corretos
                                    const itemComanda: any = {
                                        ...produtoParaVariacao,
                                        preco: finalPrice,
                                        opcao_selecionada: opcaoSelecionadaPDV || undefined,
                                        variacao_id: variacaoSelecionadaPDV?.id,
                                        variacao_nome: variacaoSelecionadaPDV?.nome
                                    };

                                    setComanda(prev => {
                                        // Busca item identico (mesmo id, sabor e variação)
                                        const idx = prev.findIndex(i => 
                                            i.id === itemComanda.id && 
                                            i.opcao_selecionada === itemComanda.opcao_selecionada && 
                                            i.variacao_id === itemComanda.variacao_id
                                        );

                                        if (idx >= 0) {
                                            return prev.map((i, n) => n === idx ? { ...i, quantidade: i.quantidade + 1 } : i);
                                        }
                                        return [...prev, { ...itemComanda, quantidade: 1 }];
                                    });

                                    setProdutoParaVariacao(null);
                                    setOpcaoSelecionadaPDV(null);
                                    setVariacaoSelecionadaPDV(null);
                                    showToast('success', 'Adicionado!', `${produtoParaVariacao.nome}`);
                                }}
                                disabled={(produtoParaVariacao.tem_opcoes && !opcaoSelecionadaPDV) || (produtoParaVariacao.tem_variacoes && !variacaoSelecionadaPDV && !(produtoParaVariacao.opcoes?.opcoes?.find((o:any) => o.nome === opcaoSelecionadaPDV)?.preco != null))}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                            >
                                ADICIONAR À COMANDA
                            </button>
                            
                            <button
                                onClick={() => {
                                    setProdutoParaVariacao(null)
                                    setOpcaoSelecionadaPDV(null)
                                    setVariacaoSelecionadaPDV(null)
                                }}
                                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold rounded-xl transition-colors"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
