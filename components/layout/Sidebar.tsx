'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, TrendingUp, TrendingDown, Wallet, FileText, LogOut, User, UtensilsCrossed, Users, Settings, Package, ShoppingBag, Sun, Moon, MonitorSmartphone, ArrowLeft, Menu, X, UsersRound, Square, Printer } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import styles from './Sidebar.module.css'
import { clsx } from 'clsx'
import { useTheme } from '@/components/providers/ThemeProvider'

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: TrendingUp, label: 'Vendas', href: '/dashboard/vendas' },
    { icon: ShoppingBag, label: 'Pedidos', href: '/dashboard/pedidos' },
    { icon: TrendingDown, label: 'Despesas', href: '/dashboard/despesas' },
    { icon: Package, label: 'Produtos', href: '/dashboard/produtos' },
    { icon: UtensilsCrossed, label: 'Cardápio', href: '/dashboard/cardapio' },
    { icon: Users, label: 'Clientes', href: '/dashboard/clientes' },
    { icon: Square, label: 'Mesas', href: '/dashboard/mesas' },
    { icon: Wallet, label: 'Fluxo de Caixa', href: '/dashboard/fluxo' },
    { icon: FileText, label: 'Relatórios', href: '/dashboard/relatorios' },
    { icon: UsersRound, label: 'Equipe', href: '/dashboard/equipe' },
    { icon: Settings, label: 'Configurações', href: '/dashboard/configuracoes' },
    { icon: Printer, label: 'Comprovante', href: '/dashboard/comprovante' },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { theme, setTheme } = useTheme()
    const [userName, setUserName] = useState<string>('')
    const [restaurantName, setRestaurantName] = useState<string>('Kal')
    const [userRole, setUserRole] = useState<string>('Proprietário')
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isAtendente, setIsAtendente] = useState(false)

    useEffect(() => {
        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                if (user.user_metadata?.funcao === 'atendente') {
                    setIsAtendente(true)
                    setUserRole('Atendente')
                } else {
                    // Load actual title if admin
                    const { data: config } = await supabase
                        .from('configuracoes')
                        .select('cargo_usuario')
                        .single()
                    if (config?.cargo_usuario) {
                        setUserRole(config.cargo_usuario)
                    }
                }

                if (user.user_metadata?.nome) {
                    setUserName(user.user_metadata.nome)
                } else {
                    const { data: userData } = await supabase
                        .from('usuarios')
                        .select('nome')
                        .eq('id', user.id)
                        .single()

                    if (userData?.nome) {
                        setUserName(userData.nome)
                    } else {
                        setUserName(user.email?.split('@')[0] || 'Usuário')
                    }
                }
            }
        }

        async function loadRestaurantConfig() {
            const { data: config } = await supabase
                .from('configuracoes')
                .select('nome_restaurante, logo_url')
                .single()

            if (config?.nome_restaurante) {
                setRestaurantName(config.nome_restaurante)
            }
            
            if (config?.logo_url) {
                setLogoUrl(config.logo_url)
            }
        }

        loadUser()
        loadRestaurantConfig()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const isPdvRoute = pathname?.startsWith('/dashboard/pdv')

    // Fecha o menu ao trocar de rota no mobile
    useEffect(() => {
        if (isMenuOpen) setIsMenuOpen(false)
    }, [pathname])

    return (
        <>
            {/* Só mostra o hamburger quando não está no PDV */}
            {!isPdvRoute && (
                <button
                    className={styles.mobileMenuToggle}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            )}

            {/* Overlay para fechar o menu ao clicar fora no mobile */}
            {!isPdvRoute && isMenuOpen && (
                <div className={styles.overlay} onClick={() => setIsMenuOpen(false)} />
            )}

            <aside className={clsx(
                styles.sidebar,
                isPdvRoute ? styles.hideOnMobilePdv : '',
                !isPdvRoute && isMenuOpen ? styles.sidebarOpen : ''
            )}>
                <div className={styles.header}>
                    <div className={styles.brandContainer}>
                        {logoUrl ? (
                            <div className={styles.logoWrapper}>
                                <img src={logoUrl} alt="Logo" className={styles.logo} />
                            </div>
                        ) : (
                            <div className={styles.logoPlaceholder}>
                                <UtensilsCrossed size={24} />
                            </div>
                        )}
                        <div className={styles.brandText}>
                            <h1 className={styles.title}>{restaurantName}</h1>
                        </div>
                    </div>
                </div>

                {userName && (
                    <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                            <User size={20} />
                        </div>
                        <div className={styles.userDetails}>
                            <p className={styles.userName}>{userName}</p>
                            <p className={styles.userRole}>{userRole}</p>
                        </div>
                    </div>
                )}

                <div className={styles.pdvActionContainer}>
                    <Link href="/dashboard/pdv" className={styles.pdvButton}>
                        <MonitorSmartphone size={20} />
                        <span>{isAtendente ? 'Acessar PDV' : 'PDV Atendente'}</span>
                    </Link>
                </div>

                {!isAtendente && (
                    <nav className={styles.nav}>
                        {menuItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(styles.link, isActive && styles.active)}
                                >
                                    <Icon size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>
                )}
                
                <div className={styles.footer}>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={styles.themeToggle}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </button>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <LogOut size={20} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
