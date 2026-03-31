import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
    try {
        const supabaseAdmin = createAdminClient()
        const { data, error } = await supabaseAdmin.auth.admin.listUsers()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Filter only users created as 'atendente' via metadata
        const atendentes = data.users.filter(u => u.user_metadata && u.user_metadata.funcao === 'atendente').map(u => ({
            id: u.id,
            nome: u.user_metadata.nome || 'Sem Nome',
            telefone: u.user_metadata.telefone || 'Sem Celular',
            criado_em: u.created_at
        }))

        return NextResponse.json({ atendentes })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { nome, telefone, senha } = body

        if (!nome || !telefone || !senha) {
            return NextResponse.json(
                { error: 'Nome, telefone e senha são obrigatórios.' },
                { status: 400 }
            )
        }

        const supabaseAdmin = createAdminClient()
        const cleanPhone = telefone.replace(/\D/g, '')
        const email = `${cleanPhone}@garcom.kal`

        // check if user already exists
        const { data: currentUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers()
        if (!searchError && currentUsers.users.some(u => u.email === email)) {
            return NextResponse.json(
                { error: 'Já existe um atendente com este celular.' },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: senha,
            email_confirm: true,
            user_metadata: {
                nome,
                telefone: cleanPhone,
                funcao: 'atendente'
            }
        })

        if (error) {
            console.error('Erro ao criar atendente:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, user: data.user })
    } catch (err: any) {
        console.error('Erro geral na api:', err)
        return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, nome, telefone, senha } = body

        if (!id || !nome || !telefone) {
            return NextResponse.json(
                { error: 'ID, Nome e telefone são obrigatórios.' },
                { status: 400 }
            )
        }

        const supabaseAdmin = createAdminClient()
        const cleanPhone = telefone.replace(/\D/g, '')
        const email = `${cleanPhone}@garcom.kal`

        const updates: any = {
            email,
            user_metadata: {
                nome,
                telefone: cleanPhone,
                funcao: 'atendente'
            }
        }

        if (senha && senha.length >= 6) {
            updates.password = senha
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates)

        if (error) {
            console.error('Erro ao atualizar atendente:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, user: data.user })
    } catch (err: any) {
        console.error('Erro geral na api:', err)
        return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID do usuário não fornecido' }, { status: 400 })
        }

        const supabaseAdmin = createAdminClient()
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
