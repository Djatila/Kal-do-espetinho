import { useState, useEffect } from 'react'
import { ItemCarrinho, Produto, VariacaoPreco } from '../types'
import { useToast } from '@/components/ui/Toast'

export function useCart() {
    const { showToast } = useToast()
    const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
    const [carrinhoCarregado, setCarrinhoCarregado] = useState(false)
    const [mostrarCarrinho, setMostrarCarrinho] = useState(false)

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

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0)
    const cartCount = carrinho.reduce((acc, item) => acc + item.quantidade, 0)

    function adicionarAoCarrinho(produto: Produto, variacao?: VariacaoPreco, opcao?: string) {
        const itemExistente = carrinho.find(item => {
            const isSameProd = item.id === produto.id
            const isSameVar = variacao ? item.variacao_id === variacao.id : !item.variacao_id
            const isSameOpcao = opcao ? item.opcao_selecionada === opcao : !item.opcao_selecionada
            return isSameProd && isSameVar && isSameOpcao
        })

        if (itemExistente) {
            setCarrinho(carrinho.map(item => {
                const isSameProd = item.id === produto.id
                const isSameVar = variacao ? item.variacao_id === variacao.id : !item.variacao_id
                const isSameOpcao = opcao ? item.opcao_selecionada === opcao : !item.opcao_selecionada
                
                return (isSameProd && isSameVar && isSameOpcao) 
                    ? { ...item, quantidade: item.quantidade + 1 } 
                    : item
            }))
        } else {
            const novoItem: ItemCarrinho = {
                id: produto.id,
                nome: produto.nome,
                descricao: produto.descricao,
                preco: variacao ? variacao.valor : produto.preco,
                categoria: produto.categoria,
                ativo: produto.ativo,
                imagem_url: produto.imagem_url,
                quantidade: 1,
                variacao_id: variacao?.id,
                variacao_nome: variacao?.nome,
                opcao_selecionada: opcao
            }
            setCarrinho([...carrinho, novoItem])
        }
        
        const feedbackNome = `${produto.nome}${variacao ? ` (${variacao.nome})` : ''}${opcao ? ` - ${opcao}` : ''}`
        showToast('success', 'Adicionado ao carrinho', `${feedbackNome} foi adicionado!`)
    }

    function alterarQuantidade(itemUniqueKey: string, delta: number) {
        setCarrinho(carrinho.map(item => {
            const key = `${item.id}${item.variacao_id ? `-${item.variacao_id}` : ''}${item.opcao_selecionada ? `-${item.opcao_selecionada}` : ''}`
            if (key === itemUniqueKey) {
                const novaQuantidade = item.quantidade + delta
                return novaQuantidade > 0 ? { ...item, quantidade: novaQuantidade } : item
            }
            return item
        }).filter(item => item.quantidade > 0))
    }

    function removerDoCarrinho(itemUniqueKey: string) {
        setCarrinho(carrinho.filter(item => {
             const key = `${item.id}${item.variacao_id ? `-${item.variacao_id}` : ''}${item.opcao_selecionada ? `-${item.opcao_selecionada}` : ''}`
             return key !== itemUniqueKey
        }))
    }

    function limparCarrinho() {
        setCarrinho([])
    }

    return {
        carrinho,
        setCarrinho,
        subtotal,
        cartCount,
        mostrarCarrinho,
        setMostrarCarrinho,
        adicionarAoCarrinho,
        alterarQuantidade,
        removerDoCarrinho,
        limparCarrinho
    }
}
