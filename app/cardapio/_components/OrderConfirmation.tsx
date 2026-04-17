import React from 'react'
import styles from './OrderConfirmation.module.css'
import { DadosCliente, ItemCarrinho } from '../types'
import { Check, Plus, X, Hourglass, Utensils, Truck, CheckCircle2 } from 'lucide-react'

interface OrderConfirmationProps {
  pedidoConfirmado: number
  modoComplemento: boolean
  confirmacoMinimizada: boolean
  setConfirmacoMinimizada: (val: boolean) => void
  verificandoStatus: boolean
  handleAdicionarItens: (numero: number) => void
  carrinho: ItemCarrinho[]
  setMostrarCarrinho: (val: boolean) => void
  dadosCliente: DadosCliente
  tipoCliente: string | null
  orderStatus: string | null
  setMostrarConfirmacaoCancelamento: (val: boolean) => void
  statusCancelamento: string | null
  
  // Bloqueio props
  mostrarModalBloqueio: boolean
  solicitacaoStatus: string | null
  setMostrarModalBloqueio: (val: boolean) => void
  setSolicitacaoStatus: (val: string | null) => void
  resetarEstadoTotal: () => void
}

export function OrderConfirmation({
  pedidoConfirmado,
  modoComplemento,
  confirmacoMinimizada,
  setConfirmacoMinimizada,
  verificandoStatus,
  handleAdicionarItens,
  carrinho,
  setMostrarCarrinho,
  dadosCliente,
  tipoCliente,
  orderStatus,
  setMostrarConfirmacaoCancelamento,
  statusCancelamento,
  mostrarModalBloqueio,
  solicitacaoStatus,
  setMostrarModalBloqueio,
  setSolicitacaoStatus,
  resetarEstadoTotal
}: OrderConfirmationProps) {
  
  if (!pedidoConfirmado || (modoComplemento && confirmacoMinimizada)) {
    return null
  }

  // Mapeamento de Status para exibição amigável
  const statusDisplay: Record<string, { label: string, color: string, icon: any }> = {
    'pendente':           { label: 'AGUARDANDO CONFIRMAÇÃO', color: '#f59e0b', icon: Hourglass },
    'confirmado':         { label: 'PEDIDO CONFIRMADO',      color: '#22c55e', icon: CheckCircle2 },
    'preparando':         { label: 'EM PREPARAÇÃO',          color: '#3b82f6', icon: Utensils },
    'pronto':             { 
      label: dadosCliente.tipo_entrega === 'delivery' ? 'PEDIDO PRONTO' : 'PRONTO PARA RETIRADA', 
      color: '#8b5cf6', 
      icon: CheckCircle2 
    },
    'saiu_para_entrega':  { label: 'SAIU PARA ENTREGA',      color: '#ec4899', icon: Truck },
    'entregue':           { label: 'ENTREGUE ✅',             color: '#10b981', icon: CheckCircle2 },
    'cancelado':          { label: 'PEDIDO CANCELADO',       color: '#ef4444', icon: X }
  }

  const currentStatus = statusDisplay[orderStatus || 'pendente'] || statusDisplay['pendente']
  const StatusIcon = currentStatus.icon

  return (
    <div className={styles.confirmacao}>
      <div className={styles.confirmacaoCard}>
        
        {/* Corpo do Conteúdo */}
        <div className={styles.contentBody}>
            <div className={styles.confirmacaoIcone}>
                <Check size={36} strokeWidth={3} />
            </div>
            
            <h1>Pedido Recebido</h1>

            {/* Header com Numero e Botão de Adição */}
            <div className={styles.pedidoHeaderBox}>
                <p className={styles.numeroPedido}>
                    Pedido <strong>#{pedidoConfirmado}</strong>
                </p>
                {!['entregue', 'cancelado'].includes(orderStatus || '') && (
                    <button
                        className={styles.botaoAdicionar}
                        disabled={verificandoStatus}
                        onClick={() => {
                            console.log('Botão Adicionar Itens clicado');
                            handleAdicionarItens(pedidoConfirmado);
                        }}
                    >
                        {verificandoStatus ? 'Aguarde...' : '+ Adicionar Itens'}
                    </button>
                )}
            </div>

            <p className={styles.instrucaoTexto}>
                Seu pedido foi recebido aguarde as próximas etapas pelo Whatsapp.
            </p>

            {orderStatus !== 'entregue' && orderStatus !== 'cancelado' && (
                <p className={styles.textoEntrega}>
                    {orderStatus === 'saiu_para_entrega' 
                        ? '🚀 Seu pedido saiu para entrega e chegará em poucos minutos!'
                        : orderStatus === 'pronto' && dadosCliente.tipo_entrega === 'delivery'
                            ? '✅ Seu pedido está pronto e o entregador já está se preparando!'
                            : dadosCliente.tipo_entrega === 'delivery'
                                ? '🛵 Seu pedido será entregue em breve no seu endereço!'
                                : orderStatus === 'pronto'
                                    ? '🏪 Seu pedido está pronto! Você já pode vir buscar.'
                                    : '🏪 Você pode retirar seu pedido em breve no local.'
                    }
                </p>
            )}

            {/* Card de Limite de Crédito (se aplicável ao tipo de cliente) */}
            {tipoCliente === 'credito' && dadosCliente.limite_credito !== undefined && (
                <div className={styles.limiteCard}>
                    <p className={styles.limiteLabel}>Seu Limite Restante</p>
                    <p className={styles.limiteValor}>
                        R$ {((dadosCliente.limite_credito || 0) - (dadosCliente.credito_utilizado || 0)).toFixed(2)}
                    </p>
                </div>
            )}

            {/* Feedback de Bloqueio/Autorização */}
            {mostrarModalBloqueio && (
                <div style={{
                    marginBottom: '2rem',
                    padding: '1rem',
                    borderRadius: '1.25rem',
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    textAlign: 'center'
                }}>
                    <p style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                        {solicitacaoStatus === 'pendente' ? 'Analisando seu pedido...' : 'Ops! Não foi possível'}
                    </p>
                    <p style={{ color: '#ccc', fontSize: '0.8rem' }}>
                        {solicitacaoStatus === 'pendente' 
                            ? 'O atendente já está conferindo sua solicitação para adicionar novos itens.' 
                            : 'Fale com o atendente pessoalmente para adicionar mais coisas ao seu pedido.'}
                    </p>
                    {solicitacaoStatus === 'recusado' && (
                        <button 
                            onClick={() => { setMostrarModalBloqueio(false); setSolicitacaoStatus(null) }}
                            style={{ 
                                marginTop: '0.6rem', 
                                background: '#ef4444', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '0.5rem 1.25rem', 
                                borderRadius: '0.75rem', 
                                fontSize: '0.8rem', 
                                fontWeight: 'bold', 
                                cursor: 'pointer' 
                            }}
                        >
                            Entendi
                        </button>
                    )}
                </div>
            )}

            {/* Botão Novo Pedido (VERDE) - Visível quando entregue */}
            {orderStatus === 'entregue' && (
                <button
                    className={styles.botaoNovoPedido}
                    onClick={() => {
                        console.log('Botão Novo Pedido clicado');
                        resetarEstadoTotal();
                    }}
                >
                    <CheckCircle2 size={22} />
                    FAZER NOVO PEDIDO
                </button>
            )}

            {/* Botão Cancelar com Lógica baseada em Status */}
            {!['pronto', 'saiu_para_entrega', 'entregue', 'cancelado'].includes(orderStatus || '') && (
                <button
                    className={styles.botaoCancelar}
                    onClick={() => {
                        console.log('Botão Cancelar clicado');
                        setMostrarConfirmacaoCancelamento(true);
                    }}
                    disabled={statusCancelamento !== null}
                >
                    <X size={20} strokeWidth={2.5} />
                    {statusCancelamento === 'cancelando' ? 'Cancelando...' : 'Cancelar Pedido'}
                </button>
            )}
        </div>

        {/* Rodapé de Status */}
        <div className={styles.statusFooter}>
            <p className={styles.statusLabel}>Status do seu pedido:</p>
            <div className={styles.statusIndicator}>
                <StatusIcon size={18} />
                {currentStatus.label}
            </div>
        </div>

      </div>
    </div>
  )
}
