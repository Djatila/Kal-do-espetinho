'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { UtensilsCrossed, MonitorSmartphone } from 'lucide-react'
import styles from './page.module.css'

export default function LoginPage() {
    const [loginMode, setLoginMode] = useState<'admin' | 'atendente'>('admin')
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        if (loginMode === 'atendente') {
            const cleanPhone = phone.replace(/\D/g, '')
            if (cleanPhone.length < 10) {
                setError('Digite um número de celular válido com DDD (ex: 21999999999)')
                setLoading(false)
                return
            }
            
            const fakeEmail = `${cleanPhone}@garcom.kal`
            const { error } = await supabase.auth.signInWithPassword({
                email: fakeEmail,
                password,
            })

            if (error) {
                setError('Celular ou senha inválidos.')
            } else {
                router.push('/dashboard/pdv')
                router.refresh()
            }
            setLoading(false)
            return
        }

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: name,
                    },
                },
            })

            if (error) {
                setError(error.message)
            } else {
                setMessage('Conta criada! Verifique seu email para confirmar (se necessário) ou faça login.')
                setIsSignUp(false)
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        }
        setLoading(false)
    }

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <CardHeader>
                    <CardTitle>Kal do Espetinho</CardTitle>
                    <CardDescription>
                        Acesse o sistema de gestão
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    
                    <div className="flex bg-muted p-1 rounded-lg mb-6 w-full max-w-sm mx-auto">
                        <button
                            type="button"
                            onClick={() => { setLoginMode('admin'); setError(null); }}
                            className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${loginMode === 'admin' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <UtensilsCrossed size={16} />
                            Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginMode('atendente'); setError(null); }}
                            className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${loginMode === 'atendente' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <MonitorSmartphone size={16} />
                            Atendente
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className={styles.form}>
                        {loginMode === 'admin' ? (
                            <>
                                {isSignUp && (
                                    <Input
                                        label="Nome"
                                        type="text"
                                        placeholder="Seu nome"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                )}
                                <Input
                                    label="Email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </>
                        ) : (
                                <Input
                                    label="Celular"
                                    type="tel"
                                    placeholder="(21) 99999-9999"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                        )}
                        
                        <Input
                            label="Senha"
                            type="password"
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {message && <p className="text-sm text-green-500">{message}</p>}
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Carregando...' : (loginMode === 'admin' ? (isSignUp ? 'Criar Conta' : 'Entrar como Admin') : 'Acessar PDV')}
                        </Button>
                    </form>
                </CardContent>
                {loginMode === 'admin' && (
                    <CardFooter className={styles.footer}>
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-muted-foreground hover:text-primary underline bg-transparent border-none cursor-pointer"
                        >
                            {isSignUp ? 'Já tem uma conta? Entre aqui.' : 'Não tem conta? Crie uma agora.'}
                        </button>
                    </CardFooter>
                )}
            </Card>
        </div>
    )
}
