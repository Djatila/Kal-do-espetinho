'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import styles from './page.module.css'

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
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
                        {isSignUp ? 'Crie sua conta para começar' : 'Entre para gerenciar o sistema'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className={styles.form}>
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
                            {loading ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className={styles.footer}>
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-muted-foreground hover:text-primary underline bg-transparent border-none cursor-pointer"
                    >
                        {isSignUp ? 'Já tem uma conta? Entre aqui.' : 'Não tem conta? Crie uma agora.'}
                    </button>
                </CardFooter>
            </Card>
        </div>
    )
}
