export interface VariacaoPreco {
    id: string
    nome: string
    valor: number
}

export interface Opcao {
    nome: string
    preco?: number
}

export interface Produto {
    id: string
    nome: string
    descricao: string
    preco: number
    categoria: string
    ativo: boolean
    imagem_url?: string
    vendas?: number
    tem_variacoes?: boolean
    variacoes_preco?: VariacaoPreco[]
    tem_opcoes?: boolean
    opcoes?: Opcao[]
    dias_semana?: string[]
    destaque?: boolean
}

export interface ItemCarrinho {
    id: string
    nome: string
    descricao: string
    preco: number
    categoria: string
    ativo: boolean
    imagem_url?: string
    quantidade: number
    variacao_id?: string
    variacao_nome?: string
    opcao_selecionada?: string
}

export interface DadosCliente {
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

export interface ConfiguracaoCardapio {
    nome_restaurante: string
    logo_url: string
    taxa_entrega_padrao: number
    chave_pix: string
    whatsapp_loja: string
    layout_cardapio: string
    webhook_n8n: string
    banner_url: string
    banner_titulo: string
    banner_subtitulo: string
    produtos_destaque_bolha: string[]
    promo_ativa?: boolean
    promo_titulo?: string
    promo_produto_nome?: string
    promo_descricao?: string
    promo_preco?: number
    promo_imagem_url?: string
    promo_badge_texto?: string
}

export interface PromoSettings {
    isActive: boolean
    title: string
    productName: string
    description: string
    price: number
    image: string
    badgeText: string
}
