import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
    try {
        const { numero_pedido, cliente_id } = await request.json()

        if (!numero_pedido) {
            return NextResponse.json({ error: 'Número do pedido é obrigatório' }, { status: 400 })
        }

        const supabaseAdmin = createAdminClient()

        // 1. Validar se o pedido existe
        const { data: order, error } = await supabaseAdmin
            .from('pedidos_online')
            .select('status, cliente_id')
            .eq('numero_pedido', numero_pedido)
            .single()

        if (error || !order) {
            return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
        }

        // 2. Segurança: se o pedido pertence a um cliente cadastrado,
        // garantimos que só este cliente (ou a própria loja via admin bypass) pode cancelar.
        if (order.cliente_id && order.cliente_id !== cliente_id) {
            return NextResponse.json({ error: 'Acesso negado: Você não tem permissão para cancelar este pedido.' }, { status: 403 })
        }

        // 3. Regra de negócio: só cancela se estiver pendente ou confirmado
        if (order.status !== 'pendente' && order.status !== 'confirmado') {
            return NextResponse.json({ error: 'O pedido já está em preparação e não pode ser cancelado online. Contate o suporte.' }, { status: 400 })
        }

        // 4. Efetuar o cancelamento passando por cima do RLS via Admin Client
        const { error: updateError } = await supabaseAdmin
            .from('pedidos_online')
            .update({
                status: 'cancelado',
                observacoes: 'Cancelado pelo cliente'
            })
            .eq('numero_pedido', numero_pedido)

        if (updateError) throw updateError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Erro no cancelamento da API:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
