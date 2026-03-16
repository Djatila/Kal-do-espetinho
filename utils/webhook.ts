/**
 * Utilitário para envio de notificações via Webhook (n8n)
 */

const WEBHOOK_URL = 'https://achronychous-anabelle-transstellar.ngrok-free.dev/webhook/whatsapp-order-notification-cr?loja=kal_espetinho';

export type WorkflowType = 'delivery_order' | 'order_status_update';

interface WebhookPayload {
    workflow_type: WorkflowType;
    phone_number: string;
    message_data: {
        order_number: number;
        customer_name: string;
        items: any[];
        delivery_type: string;
        address: string | null;
        delivery_fee: number;
        payment_method: string;
        total: number;
        status?: string;
        new_status?: string;
    };
}

/**
 * Envia um disparo de webhook para o n8n
 */
export async function sendOrderWebhook(
    workflowType: WorkflowType,
    order: any,
    newStatus?: string
) {
    try {
        // Limpar o número do telefone (deixar apenas dígitos)
        const cleanPhone = order.cliente_telefone.replace(/\D/g, '');

        // Garantir que tenha o prefixo 55 se não tiver
        const phoneNumber = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        const payload: WebhookPayload = {
            workflow_type: workflowType,
            phone_number: phoneNumber,
            message_data: {
                order_number: order.numero_pedido,
                customer_name: order.cliente_nome,
                items: order.itens.map((item: any) => ({
                    nome: item.nome,
                    preco: item.preco,
                    quantidade: item.quantidade
                })),
                delivery_type: order.tipo_entrega,
                address: order.cliente_endereco,
                delivery_fee: order.taxa_entrega || 0,
                payment_method: order.metodo_pagamento || 'Não informado',
                total: order.total,
            }
        };

        if (workflowType === 'order_status_update') {
            payload.message_data.new_status = newStatus;
        } else {
            payload.message_data.status = order.status;
        }

        console.log(`🚀 [Webhook] Enviando ${workflowType} para ${phoneNumber}...`);

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        console.log(`✅ [Webhook] Sucesso: ${workflowType}`);
        return true;
    } catch (error) {
        console.error(`❌ [Webhook] Erro ao enviar:`, error);
        return false;
    }
}
