import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || user.user_metadata?.role === 'cliente') {
            return NextResponse.json({ error: 'Acesso negado: Requer privilégios de administrador ou atendente.' }, { status: 401 })
        }

        const body = await request.json()
        const { nome, telefone, senha, endereco, observacoes, tipo_cliente, limite_credito, limite_ilimitado } = body

        const supabaseAdmin = createAdminClient()

        // 1. Upsert na tabela clientes (garantir que existe e é crédito)
        // Primeiro verificamos se já existe pelo telefone
        const { data: existingClient } = await supabaseAdmin
            .from('clientes')
            .select('id, user_id')
            .eq('telefone', telefone)
            .single()

        let clienteId = existingClient?.id

        if (existingClient) {
            // Atualizar
            const { error: updateError } = await supabaseAdmin
                .from('clientes')
                .update({
                    nome,
                    endereco,
                    observacoes,
                    tipo_cliente: 'credito', // Forçar crédito
                    status: 'ativo',
                    limite_credito: limite_credito || 0,
                    limite_ilimitado: limite_ilimitado || false
                })
                .eq('id', existingClient.id)

            if (updateError) throw updateError
        } else {
            // Criar novo
            const { data: newClient, error: insertError } = await supabaseAdmin
                .from('clientes')
                .insert({
                    nome,
                    telefone,
                    endereco,
                    observacoes,
                    tipo_cliente: 'credito',
                    status: 'ativo',
                    limite_credito: limite_credito || 0,
                    limite_ilimitado: limite_ilimitado || false
                })
                .select('id')
                .single()

            if (insertError) throw insertError
            clienteId = newClient.id
        }

        // 2. Gerenciar usuário no Auth
        const email = `${telefone.replace(/\D/g, '')}@nita.app`

        // Verificar se usuário Auth já existe
        // Nota: admin.createUser falha se email existir.
        // Podemos tentar criar e se falhar com "User already registered", tentamos atualizar a senha.

        // Mas antes, se o cliente já tinha user_id, talvez devêssemos atualizar aquele user.
        let authUserId = existingClient?.user_id

        if (authUserId) {
            // Usuário já vinculado, atualizar dados, senha apenas se informada
            const updateParams: any = {
                user_metadata: { nome, telefone }
            }

            if (senha && senha.trim().length >= 6) {
                updateParams.password = senha
            }

            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
                authUserId,
                updateParams
            )
            if (updateAuthError) throw updateAuthError
        } else {
            // Tentar criar usuário
            // Se o email já existir mas não estiver vinculado (caso raro de desincronia), o createUser falhará.
            // Vamos tentar listar pelo email para ter certeza.
            const { data: users } = await supabaseAdmin.auth.admin.listUsers()
            // listUsers não filtra por email diretamente na API JS antiga, mas vamos tentar createUser direto.

            const { data: newUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: senha,
                email_confirm: true,
                user_metadata: {
                    nome,
                    telefone,
                    role: 'cliente'
                }
            })

            if (createAuthError) {
                // Se erro for "Email already registered", precisamos achar esse usuário e atualizar a senha
                if (createAuthError.message.includes('already registered')) {
                    // Como não temos o ID, e listUsers pode ser pesado, vamos assumir que o fluxo normal
                    // é que se existe no Auth, deveria estar no user_id do cliente.
                    // Se não está, é uma desincronia.
                    // Vamos tentar pegar o ID de alguma forma? 
                    // Na verdade, se falhar aqui, retornamos erro pedindo para contatar suporte ou deletar o usuário manualmente.
                    throw new Error('Usuário já existe no sistema de autenticação mas não está vinculado. Contate o suporte.')
                }
                throw createAuthError
            }

            // O trigger deve vincular, mas podemos garantir aqui
            if (newUser.user) {
                await supabaseAdmin
                    .from('clientes')
                    .update({ user_id: newUser.user.id })
                    .eq('id', clienteId)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Erro ao criar cliente crédito:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
