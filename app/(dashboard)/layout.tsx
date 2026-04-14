import { Sidebar } from '@/components/layout/Sidebar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import styles from './layout.module.css'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role === 'cliente') {
        redirect('/login')
    }

    return (
        <div className={styles.layoutContainer}>
            <div className={styles.sidebarWrapper}>
                <Sidebar />
            </div>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    )
}
