'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { Upload, ImageIcon } from 'lucide-react'

export default function NovoProdutoPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const { showToast } = useToast()

    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        preco: '',
        categoria: 'marmitex',
        ativo: true,
        imagem_url: ''
    })
    const [uploading, setUploading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.from('produtos').insert({
            nome: formData.nome,
            descricao: formData.descricao || null,
            preco: Number(formData.preco),
            categoria: formData.categoria,
            ativo: formData.ativo,
            imagem_url: formData.imagem_url || null
        })

        if (error) {
            showToast('error', 'Erro ao salvar', error.message)
            setLoading(false)
        } else {
            showToast('success', 'Produto cadastrado!', 'O produto foi criado com sucesso.')
            router.push('/dashboard/produtos')
            router.refresh()
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('produtos')
            .upload(filePath, file)

        if (uploadError) {
            showToast('error', 'Erro no upload', uploadError.message)
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('produtos')
                .getPublicUrl(filePath)

            setFormData({ ...formData, imagem_url: publicUrl })
            showToast('success', 'Imagem enviada!', 'Continue preenchendo os dados do produto.')
        }
        setUploading(false)
    }

    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/produtos">
                    <Button variant="ghost">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Novo Produto</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Cadastrar Produto</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <Input
                            label="Nome do Produto"
                            type="text"
                            placeholder="Ex: Marmitex P"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            required
                        />

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Descrição (Opcional)</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.descricao}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Descrição do produto..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Preço (R$)"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.preco}
                                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                                required
                            />

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Categoria</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.categoria}
                                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                >
                                    <option value="marmitex">Marmitex</option>
                                    <option value="bebida">Bebida</option>
                                    <option value="sobremesa">Sobremesa</option>
                                    <option value="adicional">Adicional</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="ativo"
                                checked={formData.ativo}
                                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor="ativo" className="text-sm font-medium">
                                Produto ativo (disponível para venda)
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Imagem do Produto (Opcional)</label>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={formData.imagem_url}
                                        onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                                        placeholder="URL da imagem ou faça upload..."
                                        className="flex-1"
                                    />
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                        />
                                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 transition-colors font-medium shadow-sm">
                                            {uploading ? (
                                                <span className="animate-spin whitespace-nowrap">⏳</span>
                                            ) : (
                                                <Upload size={16} />
                                            )}
                                            Upload
                                        </div>
                                    </label>
                                </div>
                                {formData.imagem_url && (
                                    <div className="relative aspect-video w-full max-w-[200px] rounded-md overflow-hidden border bg-muted group">
                                        <img
                                            src={formData.imagem_url}
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

                        <div className="flex justify-end gap-4 mt-4">
                            <Link href="/dashboard/produtos">
                                <Button type="button" variant="secondary">Cancelar</Button>
                            </Link>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Salvando...' : 'Salvar Produto'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
