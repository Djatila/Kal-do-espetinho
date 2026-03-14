'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Store, User, Lock, Save, Bell, Upload, ImageIcon, QrCode } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'

export default function ConfiguracoesPage() {
    const supabase = createClient()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Estados para Configurações do Restaurante
    const [configId, setConfigId] = useState<string | null>(null)
    const [restaurante, setRestaurante] = useState({
        nome_restaurante: '',
        email_contato: '',
        telefone_restaurante: '',
        endereco_restaurante: '',
        taxa_entrega_padrao: 0,
        cargo_usuario: 'Atendente',
        logo_url: '',
        chave_pix: '',
        whatsapp_loja: '',
        layout_cardapio: 'padrao',
        webhook_n8n: ''
    })

    // Estados para Perfil do Usuário
    const [perfil, setPerfil] = useState({
        nome: '',
        email: ''
    })

    // Estados para Senha
    const [senhas, setSenhas] = useState({
        nova: '',
        confirmar: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)

        // Carregar Usuário
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setPerfil({
                nome: user.user_metadata.nome || '',
                email: user.email || ''
            })
        }

        // Carregar Configurações do Restaurante
        const { data: config, error: configError } = await supabase
            .from('configuracoes')
            .select('*')
            .single()

        if (configError) {
            console.error('Erro ao carregar configurações:', configError)
            // Se o erro for que não encontrou linhas, vamos tentar criar
            if (configError.code === 'PGRST116') {
                console.log('Nenhuma configuração encontrada, criando padrão...')
                const { data: newConfig, error: createError } = await supabase
                    .from('configuracoes')
                    .insert({ nome_restaurante: 'Kal do Espetinho' })
                    .select()
                    .single()

                if (createError) {
                    console.error('Erro ao criar configuração padrão:', createError)
                    showToast('error', 'Erro', 'Não foi possível inicializar as configurações.')
                } else if (newConfig) {
                    setConfigId(newConfig.id)
                    setRestaurante({
                        nome_restaurante: newConfig.nome_restaurante || '',
                        email_contato: '',
                        telefone_restaurante: '',
                        endereco_restaurante: '',
                        taxa_entrega_padrao: 0,
                        cargo_usuario: 'Atendente',
                        logo_url: '',
                        chave_pix: '',
                        whatsapp_loja: '',
                        layout_cardapio: 'padrao',
                        webhook_n8n: ''
                    })
                }
            }
        } else if (config) {
            setConfigId(config.id)
            setRestaurante({
                nome_restaurante: config.nome_restaurante || '',
                email_contato: config.email_contato || '',
                telefone_restaurante: config.telefone_restaurante || '',
                endereco_restaurante: config.endereco_restaurante || '',
                taxa_entrega_padrao: config.taxa_entrega_padrao || 0,
                cargo_usuario: config.cargo_usuario || 'Atendente',
                logo_url: config.logo_url || '',
                chave_pix: config.chave_pix || '',
                whatsapp_loja: config.whatsapp_loja || '',
                layout_cardapio: config.layout_cardapio || 'padrao',
                webhook_n8n: config.webhook_n8n || ''
            })
        }

        setLoading(false)
    }

    const handleSaveRestaurante = async () => {
        if (!configId) {
            showToast('error', 'Erro', 'Configuração não carregada. Recarregue a página.')
            return
        }

        const { error } = await supabase
            .from('configuracoes')
            .update(restaurante)
            .eq('id', configId)

        if (error) {
            console.error('Erro ao salvar:', error)
            // Erro de permissão (RLS)
            if (error.code === '42501' || error.message.includes('policy') || error.message.includes('new row violates row-level security policy')) {
                showToast('error', 'Atenção Necessária', 'Para salvar, você precisa rodar o script SQL no Supabase. Veja as instruções no chat.')
            } else {
                showToast('error', 'Erro ao salvar', error.message)
            }
        } else {
            showToast('success', 'Sucesso', 'Informações do restaurante atualizadas!')
        }
    }

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploadingLogo(true)
            const file = event.target.files?.[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath)

            setRestaurante(prev => ({ ...prev, logo_url: publicUrl }))
            showToast('success', 'Sucesso', 'Logo carregada com sucesso! Clique em Salvar para confirmar.')
        } catch (error: any) {
            showToast('error', 'Erro no upload', error.message)
        } finally {
            setUploadingLogo(false)
        }
    }

    const handleUpdateProfile = async () => {
        const { error } = await supabase.auth.updateUser({
            email: perfil.email,
            data: { nome: perfil.nome }
        })

        if (error) {
            showToast('error', 'Erro ao atualizar perfil', error.message)
        } else {
            showToast('success', 'Sucesso', 'Perfil atualizado! Se alterou o email, confirme na sua caixa de entrada.')
        }
    }

    const handleChangePassword = async () => {
        if (senhas.nova !== senhas.confirmar) {
            showToast('error', 'Erro', 'As senhas não coincidem.')
            return
        }

        if (senhas.nova.length < 6) {
            showToast('error', 'Erro', 'A senha deve ter pelo menos 6 caracteres.')
            return
        }

        const { error } = await supabase.auth.updateUser({
            password: senhas.nova
        })

        if (error) {
            showToast('error', 'Erro ao alterar senha', error.message)
        } else {
            showToast('success', 'Sucesso', 'Senha alterada com sucesso!')
            setSenhas({ nova: '', confirmar: '' })
        }
    }

    if (loading) {
        return <div className="p-8 text-center">Carregando configurações...</div>
    }

    return (
        <div className="flex flex-col gap-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold">Configurações</h1>
                <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações do Restaurante */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Store size={20} />
                            Informações do Restaurante
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Logo Upload */}
                        <div className="flex flex-col items-center gap-4 p-4 border border-dashed border-border rounded-lg bg-muted/30">
                            <div className="relative rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border" style={{ width: '128px', height: '128px' }}>
                                {restaurante.logo_url ? (
                                    <Image
                                        src={restaurante.logo_url}
                                        alt="Logo do Restaurante"
                                        width={128}
                                        height={128}
                                        className="object-cover w-full h-full"
                                        style={{ objectFit: 'cover' }}
                                    />
                                ) : (
                                    <ImageIcon size={40} className="text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="h-8 text-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                >
                                    <Upload size={16} className="mr-2" />
                                    {uploadingLogo ? 'Enviando...' : 'Alterar Logo'}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                />
                                <p className="text-xs text-muted-foreground">Recomendado: 500x500px (PNG ou JPG)</p>
                            </div>
                        </div>

                        <Input
                            label="Nome do Restaurante"
                            value={restaurante.nome_restaurante}
                            onChange={(e) => setRestaurante({ ...restaurante, nome_restaurante: e.target.value })}
                        />
                        <Input
                            label="Email de Contato"
                            type="email"
                            value={restaurante.email_contato}
                            onChange={(e) => setRestaurante({ ...restaurante, email_contato: e.target.value })}
                        />
                        <Input
                            label="Telefone"
                            value={restaurante.telefone_restaurante}
                            onChange={(e) => setRestaurante({ ...restaurante, telefone_restaurante: e.target.value })}
                        />
                        <Input
                            label="Endereço"
                            value={restaurante.endereco_restaurante}
                            onChange={(e) => setRestaurante({ ...restaurante, endereco_restaurante: e.target.value })}
                        />
                        <Input
                            label="WhatsApp Loja"
                            value={restaurante.whatsapp_loja}
                            onChange={(e) => setRestaurante({ ...restaurante, whatsapp_loja: e.target.value })}
                            placeholder="Ex: 5511999999999"
                        />

                        <div className="space-y-1">
                            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <QrCode size={16} className="text-primary" />
                                Chave PIX
                            </label>
                            <Input
                                value={restaurante.chave_pix}
                                onChange={(e) => setRestaurante({ ...restaurante, chave_pix: e.target.value })}
                                placeholder="Ex: email@exemplo.com, CPF, telefone ou chave aleatória"
                            />
                            <p className="text-xs text-muted-foreground">Esta chave será exibida automaticamente no carrinho quando o cliente escolher PIX como pagamento.</p>
                        </div>

                        <div className="space-y-2 mt-4">
                            <label className="text-sm font-medium text-foreground">Layout do Cardápio</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    className="p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                                    style={{
                                        backgroundColor: restaurante.layout_cardapio === 'padrao' ? 'var(--primary)' : 'var(--muted)',
                                        color: restaurante.layout_cardapio === 'padrao' ? 'var(--primary-foreground)' : 'var(--foreground)',
                                        borderColor: restaurante.layout_cardapio === 'padrao' ? 'var(--primary)' : 'var(--border)',
                                        boxShadow: restaurante.layout_cardapio === 'padrao' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
                                        opacity: restaurante.layout_cardapio === 'padrao' ? 1 : 0.7
                                    }}
                                    onClick={() => setRestaurante({ ...restaurante, layout_cardapio: 'padrao' })}
                                >
                                    <div className="w-8 h-10 rounded bg-current opacity-80" />
                                    <span className="font-bold text-sm">Padrão (Grande)</span>
                                </button>
                                <button
                                    className="p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                                    style={{
                                        backgroundColor: restaurante.layout_cardapio === 'minimalista' ? 'var(--primary)' : 'var(--muted)',
                                        color: restaurante.layout_cardapio === 'minimalista' ? 'var(--primary-foreground)' : 'var(--foreground)',
                                        borderColor: restaurante.layout_cardapio === 'minimalista' ? 'var(--primary)' : 'var(--border)',
                                        boxShadow: restaurante.layout_cardapio === 'minimalista' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
                                        opacity: restaurante.layout_cardapio === 'minimalista' ? 1 : 0.7
                                    }}
                                    onClick={() => setRestaurante({ ...restaurante, layout_cardapio: 'minimalista' })}
                                >
                                    <div className="w-8 h-8 rounded bg-current opacity-80" />
                                    <span className="font-bold text-sm text-center">Minimalista<br />(Pequeno)</span>
                                </button>
                            </div>
                        </div>

                        <Input
                            label="Taxa de Entrega Padrão (R$)"
                            type="number"
                            value={restaurante.taxa_entrega_padrao}
                            onChange={(e) => setRestaurante({ ...restaurante, taxa_entrega_padrao: Number(e.target.value) })}
                        />

                        <Input
                            label="Webhook n8n (Integração)"
                            value={restaurante.webhook_n8n}
                            onChange={(e) => setRestaurante({ ...restaurante, webhook_n8n: e.target.value })}
                            placeholder="https://seu-n8n.com/webhook/..."
                        />

                        <Button className="w-full" onClick={handleSaveRestaurante}>
                            <Save size={16} className="mr-2" />
                            Salvar Alterações
                        </Button>
                    </CardContent>
                </Card>

                {/* Perfil do Usuário */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User size={20} />
                            Perfil do Usuário
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            label="Nome Completo"
                            value={perfil.nome}
                            onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={perfil.email}
                            onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                        />
                        <Button className="w-full" onClick={handleUpdateProfile}>
                            <Save size={16} className="mr-2" />
                            Atualizar Perfil
                        </Button>
                    </CardContent>
                </Card>

                {/* Segurança */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock size={20} />
                            Segurança
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            label="Nova Senha"
                            type="password"
                            value={senhas.nova}
                            onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
                            placeholder="Mínimo 6 caracteres"
                        />
                        <Input
                            label="Confirmar Nova Senha"
                            type="password"
                            value={senhas.confirmar}
                            onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })}
                            placeholder="Repita a senha"
                        />
                        <Button className="w-full" onClick={handleChangePassword}>
                            <Save size={16} className="mr-2" />
                            Alterar Senha
                        </Button>
                    </CardContent>
                </Card>

                {/* Notificações (Mock Visual - Funcionalidade Futura) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell size={20} />
                            Notificações
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border border-border rounded-md">
                            <div>
                                <p className="font-medium">Vendas Realizadas</p>
                                <p className="text-sm text-muted-foreground">Receber notificação de novas vendas</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-md">
                            <div>
                                <p className="font-medium">Despesas Cadastradas</p>
                                <p className="text-sm text-muted-foreground">Receber notificação de novas despesas</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-md">
                            <div>
                                <p className="font-medium">Relatórios Diários</p>
                                <p className="text-sm text-muted-foreground">Receber resumo diário por email</p>
                            </div>
                            <input type="checkbox" className="h-5 w-5 accent-primary" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
