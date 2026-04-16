'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Trash2, X, AlertTriangle, Info, Plus, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const STORAGE_KEY = 'categorias_deletadas'

function getDeletedCats(): string[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

function addDeletedCat(cat: string) {
    const current = getDeletedCats()
    if (!current.includes(cat)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, cat]))
    }
}

interface CategoriaSelectorProps {
    value: string
    onChange: (value: string) => void
    categorias: string[]
    onCategoriasChange: (categorias: string[]) => void
    criandoNova: boolean
    onCriandoNovaChange: (v: boolean) => void
    novaCategoria: string
    onNovaCategoriaChange: (v: string) => void
}

// Modal de aviso: categoria com produtos vinculados
function ModalCategoriaVinculada({
    categoria,
    count,
    onClose,
}: {
    categoria: string
    count: number
    onClose: () => void
}) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--background)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{
                        background: '#fef3c7', borderRadius: '50%', width: 40, height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <AlertTriangle size={20} color="#d97706" />
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Categoria em uso</h2>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                    A categoria <strong style={{ color: 'var(--foreground)' }}>
                        &ldquo;{categoria.charAt(0).toUpperCase() + categoria.slice(1)}&rdquo;
                    </strong> possui{' '}
                    <strong style={{ color: '#d97706' }}>
                        {count} produto{count !== 1 ? 's' : ''} vinculado{count !== 1 ? 's' : ''}
                    </strong>.
                </p>

                <div style={{
                    background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px',
                    padding: '0.75rem 1rem', marginBottom: '1.25rem',
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                }}>
                    <Info size={15} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.82rem', color: '#9a3412', margin: 0, lineHeight: 1.5 }}>
                        Para excluir esta categoria, primeiro remova ou mude a categoria de todos os produtos associados a ela. Depois tente novamente.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px',
                        padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                    }}>
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    )
}

// Modal de confirmação: categoria vazia
function ModalConfirmarExclusao({
    categoria,
    onConfirm,
    onCancel,
    loading,
}: {
    categoria: string
    onConfirm: () => void
    onCancel: () => void
    loading: boolean
}) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'var(--background)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '2rem', maxWidth: '380px', width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{
                        background: '#fee2e2', borderRadius: '50%', width: 40, height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Trash2 size={18} color="#dc2626" />
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Excluir categoria?</h2>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    Tem certeza que deseja excluir a categoria{' '}
                    <strong style={{ color: 'var(--foreground)' }}>
                        &ldquo;{categoria.charAt(0).toUpperCase() + categoria.slice(1)}&rdquo;
                    </strong>? Ela não possui produtos vinculados.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel} disabled={loading} style={{
                        background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px',
                        padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '0.875rem',
                        cursor: 'pointer', color: 'var(--foreground)',
                    }}>
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={loading} style={{
                        background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px',
                        padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '0.875rem',
                        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                    }}>
                        {loading ? 'Excluindo...' : 'Sim, excluir'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function CategoriaSelector({
    value,
    onChange,
    categorias,
    onCategoriasChange,
    criandoNova,
    onCriandoNovaChange,
    novaCategoria,
    onNovaCategoriaChange,
}: CategoriaSelectorProps) {
    const supabase = createClient()
    const { showToast } = useToast()

    const [open, setOpen] = useState(false)
    const [modalVinculada, setModalVinculada] = useState<{ categoria: string; count: number } | null>(null)
    const [modalConfirmar, setModalConfirmar] = useState<string | null>(null)
    const [deletando, setDeletando] = useState(false)
    const [verificando, setVerificando] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fecha ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function handleSelectCat(cat: string) {
        onChange(cat)
        setOpen(false)
    }

    async function handleDeleteClick(cat: string, e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()

        setVerificando(cat)
        const { count, error } = await supabase
            .from('produtos')
            .select('*', { count: 'exact', head: true })
            .eq('categoria', cat)

        setVerificando(null)

        if (error) {
            showToast('error', 'Erro ao verificar', error.message)
            return
        }

        const total = count ?? 0
        if (total > 0) {
            setModalVinculada({ categoria: cat, count: total })
        } else {
            setModalConfirmar(cat)
        }
    }

    async function confirmarExclusao() {
        if (!modalConfirmar) return
        setDeletando(true)

        const novaLista = categorias.filter(c => c !== modalConfirmar)

        // Salva no localStorage para não voltar ao recarregar
        addDeletedCat(modalConfirmar)

        if (value === modalConfirmar) {
            onChange(novaLista[0] || '')
        }

        onCategoriasChange(novaLista)
        showToast('success', 'Categoria removida', `"${modalConfirmar}" foi removida da lista.`)
        setDeletando(false)
        setModalConfirmar(null)
    }

    const labelValue = value
        ? value.charAt(0).toUpperCase() + value.slice(1)
        : 'Selecione uma categoria'

    return (
        <>
            {modalVinculada && (
                <ModalCategoriaVinculada
                    categoria={modalVinculada.categoria}
                    count={modalVinculada.count}
                    onClose={() => setModalVinculada(null)}
                />
            )}

            {modalConfirmar && (
                <ModalConfirmarExclusao
                    categoria={modalConfirmar}
                    onConfirm={confirmarExclusao}
                    onCancel={() => setModalConfirmar(null)}
                    loading={deletando}
                />
            )}

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Categoria</label>

                {!criandoNova ? (
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        {/* Botão do dropdown */}
                        <button
                            type="button"
                            onClick={() => setOpen(prev => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                height: '2.5rem',
                                padding: '0 0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: open ? '6px 6px 0 0' : '6px',
                                background: 'var(--background)',
                                color: 'var(--foreground)',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <span>{labelValue}</span>
                            <ChevronDown
                                size={16}
                                style={{
                                    transition: 'transform 0.2s',
                                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                    color: 'var(--muted-foreground)',
                                    flexShrink: 0,
                                }}
                            />
                        </button>

                        {/* Painel suspenso */}
                        {open && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 50,
                                background: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderTop: 'none',
                                borderRadius: '0 0 6px 6px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            }}>
                                {categorias.map((cat) => (
                                    <div
                                        key={cat}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.45rem 0.75rem',
                                            borderBottom: '1px solid var(--border)',
                                            background: value === cat ? 'rgba(249,115,22,0.1)' : 'transparent',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSelectCat(cat)}
                                    >
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: value === cat ? 600 : 400,
                                            color: value === cat ? '#f97316' : 'var(--foreground)',
                                        }}>
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </span>
                                        <button
                                            type="button"
                                            title={`Excluir categoria "${cat}"`}
                                            disabled={verificando === cat}
                                            onClick={(e) => handleDeleteClick(cat, e)}
                                            style={{
                                                background: 'none', border: 'none',
                                                cursor: verificando === cat ? 'wait' : 'pointer',
                                                padding: '0.2rem', borderRadius: '4px',
                                                display: 'flex', alignItems: 'center',
                                                color: '#ef4444',
                                                opacity: verificando === cat ? 0.4 : 1,
                                                flexShrink: 0,
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#fee2e2'
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = 'none'
                                            }}
                                        >
                                            {verificando === cat
                                                ? <span style={{ fontSize: '0.7rem' }}>...</span>
                                                : <Trash2 size={13} />
                                            }
                                        </button>
                                    </div>
                                ))}

                                {/* Botão Nova Categoria no rodapé do dropdown */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setOpen(false)
                                        onCriandoNovaChange(true)
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        width: '100%', padding: '0.45rem 0.75rem',
                                        background: 'none', border: 'none',
                                        color: '#f97316', fontSize: '0.875rem', fontWeight: 600,
                                        cursor: 'pointer', justifyContent: 'center',
                                        borderTop: '1px dashed rgba(249,115,22,0.4)',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.07)'
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'none'
                                    }}
                                >
                                    <Plus size={13} />
                                    Nova Categoria
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Nome da nova categoria..."
                                value={novaCategoria}
                                onChange={(e) => onNovaCategoriaChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onCriandoNovaChange(false)}
                            className="!h-10 !w-10 !p-0"
                            title="Voltar para lista"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}
