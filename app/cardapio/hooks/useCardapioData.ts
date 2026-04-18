import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Produto, ConfiguracaoCardapio, PromoSettings } from '../types'

export function useCardapioData() {
    const supabase = createClient()
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [loading, setLoading] = useState(true)
    const [configuracao, setConfiguracao] = useState<ConfiguracaoCardapio>({
        nome_restaurante: 'Cardápio Online',
        logo_url: '',
        taxa_entrega_padrao: 0,
        chave_pix: '',
        whatsapp_loja: '',
        layout_cardapio: 'padrao',
        webhook_n8n: '',
        banner_url: '',
        banner_titulo: 'SABOR PREMIUM',
        banner_subtitulo: 'O melhor espetinho da cidade em um ambiente exclusivo.',
        produtos_destaque_bolha: [],
        mensagem_boas_vindas_bot: ''
    })
    const [promoSettings, setPromoSettings] = useState<PromoSettings>({
        isActive: false,
        title: "",
        productName: "",
        description: "",
        price: 0,
        image: "",
        badgeText: ""
    })
    const [isPromoOpen, setIsPromoOpen] = useState(false)

    useEffect(() => {
        loadProdutos()
        loadConfiguracao()
    }, [])

    async function loadProdutos() {
        setLoading(true)
        const { data } = await supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true)
            .order('categoria', { ascending: true })
            .order('nome', { ascending: true })

        if (data) {
            const today = new Date().getDay();
            let dayString = 'seg-sex';
            if (today === 0) dayString = 'domingo';
            else if (today === 6) dayString = 'sabado';

            const filteredData = data.filter((p: any) => {
                const dias = p.dias_semana || [];
                if (dias.length === 0) return true; // Mostra a semana toda
                return dias.includes(dayString);
            });

            setProdutos(filteredData as Produto[])
        }
        setLoading(false)
    }

    async function loadConfiguracao() {
        const { data: configData } = await supabase
            .from('configuracoes')
            .select('*')
            .maybeSingle()

        if (configData) {
            const configParsed = {
                nome_restaurante: configData.nome_restaurante || 'Cardápio Online',
                logo_url: configData.logo_url || '',
                taxa_entrega_padrao: configData.taxa_entrega_padrao || 0,
                chave_pix: configData.chave_pix || '',
                whatsapp_loja: configData.whatsapp_loja || '',
                layout_cardapio: configData.layout_cardapio || 'padrao',
                webhook_n8n: configData.webhook_n8n || '',
                banner_url: configData.banner_url || '',
                banner_titulo: configData.banner_titulo || 'SABOR PREMIUM',
                banner_subtitulo: configData.banner_subtitulo || 'O melhor espetinho da cidade em um ambiente exclusivo.',
                produtos_destaque_bolha: configData.produtos_destaque_bolha || [],
                mensagem_boas_vindas_bot: configData.mensagem_boas_vindas_bot || ''
            }
            setConfiguracao(configParsed)

            // Atualizar Promoção
            if (configData.promo_ativa) {
                setPromoSettings({
                    isActive: configData.promo_ativa,
                    title: configData.promo_titulo || '',
                    productName: configData.promo_produto_nome || '',
                    description: configData.promo_descricao || '',
                    price: Number(configData.promo_preco) || 0,
                    image: configData.promo_imagem_url || '',
                    badgeText: configData.promo_badge_texto || ''
                })

                // Tentar abrir após carregar, respeitando a sessão dinâmica
                setTimeout(() => {
                    const sessionKey = `kalPromoSeen_${configData.promo_titulo || 'default'}`
                    const hasSeenPromo = sessionStorage.getItem(sessionKey)
                    if (!hasSeenPromo) {
                        setIsPromoOpen(true)
                    }
                }, 1500)
            } else {
                setPromoSettings(prev => ({ ...prev, isActive: false }))
            }
        }
    }

    const categorias = ['todos', ...Array.from(new Set(produtos.map(p => p.categoria)))]

    return {
        produtos,
        loading,
        configuracao,
        promoSettings,
        categorias,
        isPromoOpen,
        setIsPromoOpen
    }
}
