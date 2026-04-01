'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Printer, Upload, ImageIcon, Store, Receipt, Calendar, User, Package, StickyNote } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'
import styles from './page.module.css'

export default function ComprovantePage() {
    const supabase = createClient()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [configId, setConfigId] = useState<string | null>(null)

    const [comprovanteData, setComprovanteData] = useState({
        comprovante_logo_url: '',
        comprovante_mensagem: 'Obrigado pela preferência!',
        nome_restaurante: 'Kal do Espetinho',
        logo_url: '' // Global fallback
    })

    useEffect(() => {
        loadConfig()
    }, [])

    async function loadConfig() {
        setLoading(true)
        const { data, error } = await supabase
            .from('configuracoes')
            .select('id, comprovante_logo_url, comprovante_mensagem, nome_restaurante, logo_url')
            .maybeSingle()

        if (error) {
            console.error('Erro ao carregar', error)
            showToast('error', 'Erro', 'Não foi possível carregar as configurações do comprovante.')
        } else if (data) {
            setConfigId(data.id)
            setComprovanteData({
                comprovante_logo_url: data.comprovante_logo_url || '',
                comprovante_mensagem: data.comprovante_mensagem || 'Obrigado pela preferência!',
                nome_restaurante: data.nome_restaurante || 'Kal do Espetinho',
                logo_url: data.logo_url || ''
            })
        }
        setLoading(false)
    }

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploadingLogo(true)
            const file = event.target.files?.[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `comprovante_${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('logos') // Using the existing valid bucket
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath)

            setComprovanteData(prev => ({ ...prev, comprovante_logo_url: publicUrl }))
            showToast('success', 'Upload Finalizado', 'Clique em Salvar para definir esta logo no comprovante.')
        } catch (error: any) {
            showToast('error', 'Erro no upload', error.message)
        } finally {
            setUploadingLogo(false)
        }
    }

    const handleSave = async () => {
        if (!configId) return

        const { error } = await supabase
            .from('configuracoes')
            .update({
                comprovante_logo_url: comprovanteData.comprovante_logo_url,
                comprovante_mensagem: comprovanteData.comprovante_mensagem
            })
            .eq('id', configId)

        if (error) {
            showToast('error', 'Erro ao salvar', error.message)
        } else {
            showToast('success', 'Salvo com sucesso', 'As informações do comprovante foram atualizadas.')
        }
    }

    const currentLogo = comprovanteData.comprovante_logo_url || comprovanteData.logo_url;

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando layout do comprovante...</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Comprovante de Impressão</h1>
                <p className={styles.subtitle}>Personalize as informações e a logo do recibo do cliente (Via Cliente e Via Entregador)</p>
            </div>

            <div className={styles.content}>
                {/* Form Section */}
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Receipt size={20} />
                                Dados do Comprovante
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Upload Area */}
                            <div className="flex flex-col items-center gap-4 p-4 border border-dashed border-border rounded-lg bg-muted/30">
                                <label className="text-sm font-medium w-full text-center">Logo Específica do Comprovante</label>
                                <div className="relative rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border" style={{ width: '120px', height: '120px' }}>
                                    {currentLogo ? (
                                        <Image
                                            src={currentLogo}
                                            alt="Logo do Comprovante"
                                            width={120}
                                            height={120}
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
                                        {uploadingLogo ? 'Enviando...' : 'Carregar Nova Logo'}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                    {comprovanteData.comprovante_logo_url && (
                                        <Button
                                            variant="ghost"
                                            className="text-destructive h-8 text-xs hover:bg-destructive/10"
                                            onClick={() => setComprovanteData(pr => ({ ...pr, comprovante_logo_url: '' }))}
                                        >
                                            Remover logo específica
                                        </Button>
                                    )}
                                    <p className="text-xs text-muted-foreground text-center max-w-[250px]">
                                        Se nenhuma imagem for enviada, a logo principal do restaurante será usada. (Apenas formatos suportados pelas impressoras térmicas).
                                    </p>
                                </div>
                            </div>

                            {/* Text Fields */}
                            <div className="space-y-4">
                                <Input
                                    label="Mensagem de Rodapé"
                                    value={comprovanteData.comprovante_mensagem}
                                    onChange={(e) => setComprovanteData({ ...comprovanteData, comprovante_mensagem: e.target.value })}
                                    placeholder="Ex: Obrigado pela preferência!"
                                />
                            </div>

                            <Button onClick={handleSave} className="w-full mt-4">
                                Salvar Configurações
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Printer size={20} />
                            Pré-visualização (Simulação Térmica 80mm)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className={styles.previewContainer}>
                        <div className={styles.receipt}>
                            {/* Via Cliente */}
                            <div className={styles.receiptHeader}>
                                {currentLogo && (
                                    <img src={currentLogo} alt="Logo" className={styles.logoImage} />
                                )}
                                <div className={styles.storeName}>{comprovanteData.nome_restaurante}</div>
                                <div className={styles.orderNumber}>Pedido #192</div>
                                <span className={styles.statusPill}>Pendente</span>
                                
                                <div className={styles.dateTime}>
                                    <Calendar size={14} className="inline mr-1" />
                                    01/04/2026 — 11:50
                                </div>
                                <div className={styles.greeting}>
                                    {comprovanteData.comprovante_mensagem}
                                </div>
                            </div>

                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>
                                    <User size={16} /> Dados do Cliente
                                </div>
                                <div className={styles.infoRow}>
                                    <strong>Nome:</strong> <span>Vanessa</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <strong>Telefone:</strong> <span>(73) 99113-4414</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <strong>Tipo:</strong> <span>Retirada no Local</span>
                                </div>
                                <div style={{height: '10px'}}></div>
                                <div className={styles.infoRow}>
                                    <strong>Pagamento 1:</strong> <span>Pagamento Poster. (R$ 50,00)</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <strong>Pagamento 2:</strong> <span>Pix (R$ 16,00)</span>
                                </div>
                            </div>

                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>
                                    <Package size={16} /> Itens do Pedido
                                </div>
                                <div className={styles.infoItem}>
                                    <span>3x Marmitex G</span>
                                    <span>R$ 66,00</span>
                                </div>
                            </div>

                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>
                                    <StickyNote size={16} /> Observações
                                    <span style={{marginLeft: 'auto', fontWeight: 'bold', fontSize: '1.1rem'}}>R$ 66,00</span>
                                </div>
                            </div>

                            <div className={styles.dashedSeparator}>
                                <span className={styles.cutInstruction}>Destacar e entregar ao entregador:</span>
                            </div>

                            {/* Via Entregador / Cozinha */}
                            <div className={styles.secondPart}>
                                <div className={styles.secondPartHeader}>
                                    <div className={styles.orderNumber} style={{fontSize: '1.1rem'}}>Pedido #192</div>
                                </div>
                                
                                <div className={styles.section}>
                                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                        {currentLogo && (
                                            <img src={currentLogo} alt="Logo" style={{width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #000'}} />
                                        )}
                                        <div style={{flex: 1}}>
                                            <div className={styles.secondPartTitle}>Pedido #192</div>
                                            <div className={styles.secondPartInfo}>Cliente: <strong>Vanessa</strong></div>
                                            <div className={styles.secondPartInfo}>Telefone: (73) 99113-4414</div>
                                            <div className={styles.secondPartInfo}>Pedido: 3x Marmitex G</div>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px'}}>
                                        <div><Calendar size={14} className="inline mr-1" /> 01/04/2026 — 11:50</div>
                                        <strong style={{fontSize: '1.1rem'}}>R$ 66,00</strong>
                                    </div>
                                </div>
                                <div className={styles.greeting} style={{marginTop: '15px'}}>
                                    {comprovanteData.comprovante_mensagem}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
