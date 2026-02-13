import React from 'react';
import { CheckCircle, Clock, ChefHat, MapPin, XCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderTrackerProps {
  order: Order;
  onBack: () => void;
}

const OrderTracker: React.FC<OrderTrackerProps> = ({ order, onBack }) => {
  const steps: { status: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { status: 'pending', label: 'Recebido', icon: <Clock size={20} />, color: 'bg-yellow-500' },
    { status: 'preparing', label: 'Preparando', icon: <ChefHat size={20} />, color: 'bg-orange-500' },
    { status: 'ready', label: 'Pronto', icon: <CheckCircle size={20} />, color: 'bg-green-500' },
    { status: 'finished', label: order.customer.deliveryMethod === 'delivery' ? 'Entregue' : 'Finalizado', icon: <MapPin size={20} />, color: 'bg-blue-500' },
  ];

  const currentStepIndex = steps.findIndex(s => s.status === order.status);
  // Se cancelado, não mapeamos index normal
  const isCanceled = order.status === 'canceled';

  // Calculate subtotal for display
  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-neutral-400 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={20} /> Voltar ao Menu
          </button>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500 text-orange-500 mb-4 shadow-neon">
            <ShoppingBag size={32} />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Acompanhe seu Pedido</h1>
          <p className="text-neutral-400">Pedido <span className="text-orange-500 font-mono font-bold">#{order.id}</span></p>
        </div>

        {/* Status Timeline */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
          {isCanceled ? (
            <div className="text-center py-8">
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-500">Pedido Cancelado</h3>
              <p className="text-neutral-400 mt-2">Entre em contato com o estabelecimento para mais informações.</p>
            </div>
          ) : (
            <div className="space-y-6 relative">
              {/* Connecting Line */}
              <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-neutral-800" />

              {steps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex || order.status === 'finished';
                const isPending = index > currentStepIndex;

                let circleClass = 'bg-neutral-800 text-neutral-500 border-neutral-700';
                if (isActive) circleClass = `${step.color} text-white border-white shadow-neon`;
                if (isCompleted) circleClass = `${step.color} text-white border-${step.color.replace('bg-', '')} opacity-50`;

                return (
                  <div key={step.status} className="relative flex items-center gap-4 z-10">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${circleClass}`}>
                      {step.icon}
                    </div>
                    <div>
                      <h3 className={`font-bold transition-colors ${isActive ? 'text-white text-lg' : isCompleted ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {step.label}
                      </h3>
                      {isActive && <p className="text-xs text-orange-400 animate-pulse">Status atual</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-neutral-800 pb-2">Detalhes do Pedido</h3>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-neutral-300">{item.quantity}x {item.name}</span>
                <span className="text-neutral-400 font-mono">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 pt-2 space-y-1">
             <div className="flex justify-between text-sm text-neutral-400">
               <span>Subtotal</span>
               <span>R$ {subtotal.toFixed(2)}</span>
             </div>
             {order.deliveryFee && (
               <div className="flex justify-between text-sm text-orange-400 font-bold">
                 <span>Entrega</span>
                 <span>R$ {order.deliveryFee.toFixed(2)}</span>
               </div>
             )}
             <div className="flex justify-between font-bold text-lg pt-2 border-t border-neutral-800 mt-2">
               <span>Total</span>
               <span className="text-orange-500">R$ {order.total.toFixed(2)}</span>
             </div>
          </div>
          
          <div className="text-xs text-neutral-500 mt-4 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
             <p className="font-bold mb-1 uppercase tracking-wider">Dados do Cliente</p>
             <p>Nome: {order.customer.customerName}</p>
             <p>Pagamento: {order.customer.paymentMethod === 'pix' ? 'PIX' : order.customer.paymentMethod === 'cash' ? 'Dinheiro' : 'Cartão'}</p>
             {order.customer.deliveryMethod === 'delivery' && (
                <p>Endereço: {order.customer.address.street}, {order.customer.address.number}</p>
             )}
             {order.customer.deliveryMethod === 'table' && (
                <p>Mesa: {order.customer.tableNumber}</p>
             )}
             {order.customer.observations && (
               <p className="mt-2 pt-2 border-t border-neutral-800 text-neutral-400">
                 <span className="font-bold text-orange-500">Obs:</span> {order.customer.observations}
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracker;