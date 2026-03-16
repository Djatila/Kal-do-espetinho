'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Edit, Power, PowerOff, Search, ExternalLink, Zap, Save, Upload, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { Input } from '@/components/ui/Input'

export default function CardapioPage() {
    const [produtos, setProdutos] = useState<any[]>([])
    const [filteredProdutos, setFilteredProdutos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategoria, setFilterCategoria] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')

    // Estados da Promoção
    const [promoLoading, setPromoLoading] = useState(false)
    const [uploadingPromo, setUploadingPromo] = useState(false)
    const [configId, setConfigId] = useState<string | null>(null)
    const [promo, setPromo] = useState({
        promo_ativa: false,
        promo_titulo: '',
        promo_produto_nome: '',
        promo_descricao: '',
        promo_preco: 0,
        promo_imagem_url: '',
        promo_badge_texto: ''
    })

    const supabase = createClient()
    const { showToast } = useToast()

    async function loadData() {
        setLoading(true)

        // Carregar Produtos
        const { data: prods } = await supabase
            .from('produtos')
            .select('*')
            .order('categoria')
            .order('nome')

        setProdutos(prods || [])
        setFilteredProdutos(prods || [])

        // Carregar Configuração da Promoção
        const { data: config } = await supabase
            .from('configuracoes')
            .select('*')
            .single()

        if (config) {
            setConfigId(config.id)
            setPromo({
                promo_ativa: config.promo_ativa || false,
                promo_titulo: config.promo_titulo || '',
                promo_produto_nome: config.promo_produto_nome || '',
                promo_descricao: config.promo_descricao || '',
                promo_preco: config.promo_preco || 0,
                promo_imagem_url: config.promo_imagem_url || '',
                promo_badge_texto: config.promo_badge_texto || ''
            })
        }

        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        let filtered = [...produtos]

        if (filterCategoria !== 'all') {
            filtered = filtered.filter(p => p.categoria === filterCategoria)
        }

        if (filterStatus === 'ativo') {
            filtered = filtered.filter(p => p.ativo === true)
        } else if (filterStatus === 'inativo') {
            filtered = filtered.filter(p => p.ativo === false)
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.descricao && p.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        setFilteredProdutos(filtered)
    }, [searchTerm, filterCategoria, filterStatus, produtos])

    async function toggleAtivo(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from('produtos')
            .update({ ativo: !currentStatus })
            .eq('id', id)

        if (error) {
            showToast('error', 'Erro ao atualizar', error.message)
        } else {
            showToast('success', 'Status atualizado!', `Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`)
            loadData()
        }
    }

    async function handleSavePromo() {
        if (!configId) return

        setPromoLoading(true)
        const { error } = await supabase
            .from('configuracoes')
            .update(promo)
            .eq('id', configId)

        if (error) {
            showToast('error', 'Erro ao salvar promoção', error.message)
        } else {
            showToast('success', 'Promoção salva!', 'As alterações já estão valendo no cardápio online.')
        }
        setPromoLoading(false)
    }

    async function handlePromoImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingPromo(true)
        const fileExt = file.name.split('.').pop()
        const fileName = `promo-${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('promos')
            .upload(filePath, file)

        if (uploadError) {
            showToast('error', 'Erro no upload', uploadError.message)
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('promos')
                .getPublicUrl(filePath)

            setPromo({ ...promo, promo_imagem_url: publicUrl })
            showToast('success', 'Imagem enviada!', 'Não esqueça de salvar as alterações da promoção.')
        }
        setUploadingPromo(false)
    }

    const categorias = Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean)))
    const produtosAtivos = produtos.filter(p => p.ativo).length

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Cardápio Online</h1>
                    <p className="text-muted-foreground">
                        Gerencie os produtos que aparecem no cardápio online
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/cardapio" target="_blank">
                        <Button variant="secondary">
                            <ExternalLink size={16} className="mr-2" />
                            Ver Cardápio Online
                        </Button>
                    </Link>
                    <Link href="/dashboard/produtos/novo">
                        <Button>
                            <Plus size={16} className="mr-2" />
                            Novo Produto
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Gestão do Pop-up de Promoção */}
            <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="text-orange-500" size={20} />
                        <CardTitle>Pop-up de Promoção (Prato do Dia)</CardTitle>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm font-medium">{promo.promo_ativa ? 'Ativado' : 'Desativado'}</span>
                            <input
                                type="checkbox"
                                checked={promo.promo_ativa}
                                onChange={(e) => setPromo({ ...promo, promo_ativa: e.target.checked })}
                                className="h-5 w-5 accent-orange-500"
                            />
                        </label>
                        <Button
                            onClick={handleSavePromo}
                            disabled={promoLoading}
                            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm"
                        >
                            <Save size={16} className="mr-2" />
                            {promoLoading ? 'Salvando...' : 'Salvar Promoção'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-3">
                            <Input
                                label="Título do Pop-up"
                                value={promo.promo_titulo}
                                onChange={(e) => setPromo({ ...promo, promo_titulo: e.target.value })}
                                placeholder="Ex: PRATO DO DIA"
                            />
                            <Input
                                label="Nome do Produto para o Carrinho"
                                value={promo.promo_produto_nome}
                                onChange={(e) => setPromo({ ...promo, promo_produto_nome: e.target.value })}
                                placeholder="Ex: Tábua do Kal"
                            />
                            <Input
                                label="Texto do Selo (Badge)"
                                value={promo.promo_badge_texto}
                                onChange={(e) => setPromo({ ...promo, promo_badge_texto: e.target.value })}
                                placeholder="Ex: RECOMENDAÇÃO DA CHEFA"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Descrição da Oferta</label>
                                <textarea
                                    className="w-full p-2 border border-input rounded-md text-sm min-h-[106px]"
                                    value={promo.promo_descricao}
                                    onChange={(e) => setPromo({ ...promo, promo_descricao: e.target.value })}
                                    placeholder="Descreva a promoção..."
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Input
                                label="Preço Promocional (R$)"
                                type="number"
                                value={promo.promo_preco}
                                onChange={(e) => setPromo({ ...promo, promo_preco: Number(e.target.value) })}
                            />
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Imagem da Promoção</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={promo.promo_imagem_url}
                                            onChange={(e) => setPromo({ ...promo, promo_imagem_url: e.target.value })}
                                            placeholder="URL da imagem ou faça upload..."
                                            className="flex-1"
                                        />
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handlePromoImageUpload}
                                                disabled={uploadingPromo}
                                            />
                                            <div className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 transition-colors font-medium shadow-sm">
                                                {uploadingPromo ? (
                                                    <span className="animate-spin whitespace-nowrap">⏳</span>
                                                ) : (
                                                    <Upload size={16} />
                                                )}
                                                Upload
                                            </div>
                                        </label>
                                    </div>
                                    {promo.promo_imagem_url && (
                                        <div className="relative aspect-video w-full rounded-md overflow-hidden border bg-muted group">
                                            <img
                                                src={promo.promo_imagem_url}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <ImageIcon className="text-white" size={24} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{produtos.length}</div>
                        <p className="text-sm text-muted-foreground">Total de Produtos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{produtosAtivos}</div>
                        <p className="text-sm text-muted-foreground">Produtos Ativos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-600">{produtos.length - produtosAtivos}</div>
                        <p className="text-sm text-muted-foreground">Produtos Inativos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                className="w-full pl-10 pr-3 py-2 border border-input rounded-md text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-3 py-2 border border-input rounded-md text-sm"
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                        >
                            <option value="all">Todas as categorias</option>
                            {categorias.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            className="px-3 py-2 border border-input rounded-md text-sm"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Todos os status</option>
                            <option value="ativo">Ativos (visíveis no cardápio)</option>
                            <option value="inativo">Inativos (ocultos no cardápio)</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Produtos */}
            <Card>
                <CardHeader>
                    <CardTitle>Produtos no Cardápio ({filteredProdutos.length} itens)</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center py-8 text-muted-foreground">Carregando produtos...</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        <th className="p-4 font-medium text-muted-foreground">Nome</th>
                                        <th className="p-4 font-medium text-muted-foreground">Categoria</th>
                                        <th className="p-4 font-medium text-muted-foreground">Preço</th>
                                        <th className="p-4 font-medium text-muted-foreground">Status</th>
                                        <th className="p-4 font-medium text-muted-foreground">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProdutos.map((produto) => (
                                        <tr key={produto.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td className="p-4">
                                                <div>
                                                    <div className="font-medium">{produto.nome}</div>
                                                    {produto.descricao && (
                                                        <div className="text-sm text-muted-foreground">{produto.descricao}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: '#f3f4f6',
                                                    color: '#374151'
                                                }}>
                                                    {produto.categoria || 'Sem categoria'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium">R$ {Number(produto.preco).toFixed(2)}</td>
                                            <td className="p-4">
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: produto.ativo ? '#dcfce7' : '#fee2e2',
                                                    color: produto.ativo ? '#15803d' : '#991b1b'
                                                }}>
                                                    {produto.ativo ? '✓ Visível' : '✗ Oculto'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <Link href={`/dashboard/produtos/${produto.id}/editar`}>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                                                        >
                                                            <Edit size={16} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        className={`h-8 w-8 p-0 ${produto.ativo ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700'}`}
                                                        onClick={() => toggleAtivo(produto.id, produto.ativo)}
                                                        title={produto.ativo ? 'Ocultar do cardápio' : 'Mostrar no cardápio'}
                                                    >
                                                        {produto.ativo ? <PowerOff size={16} /> : <Power size={16} />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProdutos.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                {searchTerm || filterCategoria !== 'all' || filterStatus !== 'all'
                                                    ? 'Nenhum produto encontrado com os filtros aplicados.'
                                                    : 'Nenhum produto cadastrado. Clique em "Novo Produto" para começar.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Informação sobre sincronização */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="text-blue-600 text-2xl">ℹ️</div>
                        <div>
                            <h3 className="font-semibold text-blue-900 mb-1">Sincronização Automática</h3>
                            <p className="text-sm text-blue-800">
                                Produtos marcados como <strong>"Visível"</strong> aparecem automaticamente no cardápio online.
                                Produtos <strong>"Ocultos"</strong> não são exibidos para os clientes, mas permanecem salvos no sistema.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
