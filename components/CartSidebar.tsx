import React, { useMemo, useState } from 'react';
import { X, Trash2, ShoppingBag, Send, MapPin, Store, CreditCard, Banknote, QrCode } from 'lucide-react';
import { CartItem, OrderDetails } from '../types';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  whatsappNumber: string;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, cart, onRemove, onUpdateQuantity, whatsappNumber }) => {
  // Estado do formulário
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    customerName: '',
    deliveryMethod: 'delivery',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      complement: ''
    },
    paymentMethod: 'pix',
    needChange: false,
    changeFor: ''
  });

  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const handleInputChange = (field: string, value: any) => {
    setOrderDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setOrderDetails(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    // Validação básica
    if (!orderDetails.customerName.trim()) {
      alert("Por favor, digite seu nome.");
      return;
    }
    if (orderDetails.deliveryMethod === 'delivery' && (!orderDetails.address.street || !orderDetails.address.number || !orderDetails.address.neighborhood)) {
      alert("Por favor, preencha o endereço de entrega.");
      return;
    }
    
    // Validação e cálculo do troco
    let changeAmount = 0;
    let paidAmount = 0;

    if (orderDetails.paymentMethod === 'cash' && orderDetails.needChange) {
      if (!orderDetails.changeFor) {
        alert("Por favor, informe para quanto precisa de troco.");
        return;
      }
      
      // Sanitização e conversão
      const cleanValue = orderDetails.changeFor.replace(/[^\d.,]/g, '').replace(',', '.');
      paidAmount = parseFloat(cleanValue);
      
      if (isNaN(paidAmount) || paidAmount < total) {
        alert(`O valor para troco (R$ ${paidAmount.toFixed(2)}) deve ser maior que o total do pedido (R$ ${total.toFixed(2)}).`);
        return;
      }

      changeAmount = paidAmount - total;
    }

    // Construção da mensagem
    let message = `*🔥 NOVO PEDIDO - KAL DO ESPETINHO 🔥*\n\n`;
    
    message += `*Cliente:* ${orderDetails.customerName}\n`;
    message += `*Tipo:* ${orderDetails.deliveryMethod === 'delivery' ? '🛵 Entrega' : '🏪 Retirada no Local'}\n\n`;

    message += `*🛒 ITENS DO PEDIDO:*\n`;
    cart.forEach(item => {
      message += `▪️ ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\n*💰 TOTAL: R$ ${total.toFixed(2)}*\n`;
    message += `----------------------------------\n`;

    if (orderDetails.deliveryMethod === 'delivery') {
      message += `*📍 ENDEREÇO DE ENTREGA:*\n`;
      message += `${orderDetails.address.street}, ${orderDetails.address.number}\n`;
      message += `Bairro: ${orderDetails.address.neighborhood}\n`;
      if (orderDetails.address.complement) message += `Comp: ${orderDetails.address.complement}\n`;
      message += `----------------------------------\n`;
    }

    message += `*💳 FORMA DE PAGAMENTO:*\n`;
    switch (orderDetails.paymentMethod) {
      case 'pix': message += `✅ PIX`; break;
      case 'credit_card': message += `💳 Cartão de Crédito`; break;
      case 'debit_card': message += `💳 Cartão de Débito`; break;
      case 'cash': 
        message += `💵 Dinheiro`;
        if (orderDetails.needChange) {
          message += `\n⚠️ *Precisa de troco para:* R$ ${paidAmount.toFixed(2)}`;
          message += `\n👉 *Levar de troco:* R$ ${changeAmount.toFixed(2)}`;
        } else {
          message += `\n(Não precisa de troco)`;
        }
        break;
    }

    // Usar o número dinâmico passado via props
    const targetNumber = whatsappNumber.replace(/\D/g, ''); 
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${targetNumber}?text=${encodedMessage}`, '_blank');
  };

  // Helper para exibir o valor restante do troco na UI
  const getChangeValue = () => {
      const cleanValue = orderDetails.changeFor.replace(/[^\d.,]/g, '').replace(',', '.');
      const val = parseFloat(cleanValue);
      if (isNaN(val)) return 0;
      return val - total;
  };
  const changeVal = getChangeValue();

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-neutral-900 border-l border-orange-500/30 z-50 transform transition-transform duration-300 shadow-neon flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          {/* Header */}
          <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 shrink-0">
            <h2 className="text-xl font-display font-bold text-orange-500 flex items-center gap-2">
              <ShoppingBag className="text-orange-500" />
              Seu Pedido
            </h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {/* 1. Items List */}
            <div>
              <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Itens</h3>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-neutral-500 space-y-4">
                  <ShoppingBag size={48} className="opacity-20" />
                  <p>Seu carrinho está vazio.</p>
                  <button onClick={onClose} className="text-orange-500 hover:underline">
                    Ver Cardápio
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 bg-neutral-800/30 p-3 rounded-lg border border-neutral-800">
                      <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-md" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                        <p className="text-orange-400 font-bold text-xs">R$ {item.price.toFixed(2)}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 bg-neutral-900 rounded px-2 py-0.5">
                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="text-neutral-400 hover:text-white">-</button>
                            <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="text-neutral-400 hover:text-white">+</button>
                          </div>
                          <button onClick={() => onRemove(item.id)} className="text-neutral-600 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <>
                <hr className="border-neutral-800" />

                {/* 2. Personal Info */}
                <div>
                   <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Seus Dados</h3>
                   <input 
                      type="text" 
                      placeholder="Seu Nome Completo"
                      value={orderDetails.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none"
                    />
                </div>

                <hr className="border-neutral-800" />

                {/* 3. Delivery Method */}
                <div>
                  <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Entrega</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button 
                      onClick={() => handleInputChange('deliveryMethod', 'delivery')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'delivery' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}
                    >
                      <MapPin size={20} className="mb-1" />
                      <span className="text-xs font-bold">Entrega</span>
                    </button>
                    <button 
                      onClick={() => handleInputChange('deliveryMethod', 'pickup')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'pickup' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}
                    >
                      <Store size={20} className="mb-1" />
                      <span className="text-xs font-bold">Retirada</span>
                    </button>
                  </div>

                  {orderDetails.deliveryMethod === 'delivery' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                           <input 
                              type="text" 
                              placeholder="Rua / Avenida"
                              value={orderDetails.address.street}
                              onChange={(e) => handleAddressChange('street', e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none"
                           />
                        </div>
                        <div className="col-span-1">
                           <input 
                              type="text" 
                              placeholder="Nº"
                              value={orderDetails.address.number}
                              onChange={(e) => handleAddressChange('number', e.target.value)}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none"
                           />
                        </div>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Bairro"
                        value={orderDetails.address.neighborhood}
                        onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Complemento (opcional)"
                        value={orderDetails.address.complement}
                        onChange={(e) => handleAddressChange('complement', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700 text-center">
                      <p className="text-orange-400 font-bold text-sm">📍 Endereço para Retirada:</p>
                      <p className="text-neutral-300 text-sm">Av. Principal do Espetinho, 123</p>
                      <p className="text-neutral-400 text-xs">Centro - São Paulo/SP</p>
                    </div>
                  )}
                </div>

                <hr className="border-neutral-800" />

                {/* 4. Payment Method */}
                <div>
                   <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Pagamento</h3>
                   <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'pix' ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-800/30 border-neutral-800 hover:border-neutral-600'}`}>
                        <input type="radio" name="payment" className="hidden" 
                          checked={orderDetails.paymentMethod === 'pix'} 
                          onChange={() => handleInputChange('paymentMethod', 'pix')}
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${orderDetails.paymentMethod === 'pix' ? 'border-orange-500' : 'border-neutral-500'}`}>
                          {orderDetails.paymentMethod === 'pix' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                        </div>
                        <QrCode size={18} className="text-teal-400" />
                        <span className="text-sm text-white">PIX</span>
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'credit_card' ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-800/30 border-neutral-800 hover:border-neutral-600'}`}>
                        <input type="radio" name="payment" className="hidden" 
                          checked={orderDetails.paymentMethod === 'credit_card'} 
                          onChange={() => handleInputChange('paymentMethod', 'credit_card')}
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${orderDetails.paymentMethod === 'credit_card' ? 'border-orange-500' : 'border-neutral-500'}`}>
                          {orderDetails.paymentMethod === 'credit_card' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                        </div>
                        <CreditCard size={18} className="text-blue-400" />
                        <span className="text-sm text-white">Cartão de Crédito (Maquininha)</span>
                      </label>
                      
                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'debit_card' ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-800/30 border-neutral-800 hover:border-neutral-600'}`}>
                        <input type="radio" name="payment" className="hidden" 
                          checked={orderDetails.paymentMethod === 'debit_card'} 
                          onChange={() => handleInputChange('paymentMethod', 'debit_card')}
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${orderDetails.paymentMethod === 'debit_card' ? 'border-orange-500' : 'border-neutral-500'}`}>
                          {orderDetails.paymentMethod === 'debit_card' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                        </div>
                        <CreditCard size={18} className="text-purple-400" />
                        <span className="text-sm text-white">Cartão de Débito (Maquininha)</span>
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'cash' ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-800/30 border-neutral-800 hover:border-neutral-600'}`}>
                        <input type="radio" name="payment" className="hidden" 
                          checked={orderDetails.paymentMethod === 'cash'} 
                          onChange={() => handleInputChange('paymentMethod', 'cash')}
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${orderDetails.paymentMethod === 'cash' ? 'border-orange-500' : 'border-neutral-500'}`}>
                          {orderDetails.paymentMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                        </div>
                        <Banknote size={18} className="text-green-400" />
                        <span className="text-sm text-white">Dinheiro</span>
                      </label>

                      {/* Configuração de Troco */}
                      {orderDetails.paymentMethod === 'cash' && (
                        <div className="ml-8 mt-2 p-3 bg-neutral-950 border border-neutral-700 rounded-lg">
                          <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={orderDetails.needChange}
                              onChange={(e) => handleInputChange('needChange', e.target.checked)}
                              className="accent-orange-500"
                            />
                            <span className="text-sm text-neutral-300">Precisa de troco?</span>
                          </label>
                          
                          {orderDetails.needChange && (
                             <div>
                               <label className="block text-xs text-neutral-500 mb-1">Vou pagar com nota de:</label>
                               <input 
                                type="text" 
                                placeholder="Ex: 50,00"
                                value={orderDetails.changeFor}
                                onChange={(e) => handleInputChange('changeFor', e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                              />
                              {changeVal > 0 && (
                                <p className="text-xs text-orange-400 mt-2 font-bold">
                                  Troco a receber: R$ {changeVal.toFixed(2)}
                                </p>
                              )}
                              {changeVal < 0 && orderDetails.changeFor && (
                                <p className="text-xs text-red-400 mt-2">
                                  Valor insuficiente. Total: R$ {total.toFixed(2)}
                                </p>
                              )}
                             </div>
                          )}
                        </div>
                      )}
                   </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-5 bg-neutral-950 border-t border-neutral-800 space-y-4 shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-neutral-300">Total</span>
                <span className="text-orange-500 text-xl">R$ {total.toFixed(2)}</span>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-neon hover:shadow-neon-strong"
              >
                <Send size={20} />
                Enviar Pedido no WhatsApp
              </button>
            </div>
          )}
      </div>
    </>
  );
};

export default CartSidebar;