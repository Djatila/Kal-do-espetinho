import React, { useMemo, useState } from 'react';
import { X, Trash2, ShoppingBag, Send, MapPin, Store, CreditCard, Banknote, QrCode, Utensils, Copy, Check, AlertCircle, MessageSquare } from 'lucide-react';
import { CartItem, OrderDetails, Order } from '../types';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  whatsappNumber: string;
  pixKey: string;
  deliveryFee: number;
  onPlaceOrder: (order: Order) => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, cart, onRemove, onUpdateQuantity, whatsappNumber, pixKey, deliveryFee, onPlaceOrder }) => {
  // Estado do formulário
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    customerName: '',
    customerPhone: '',
    deliveryMethod: 'table',
    tableNumber: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      complement: ''
    },
    paymentMethod: 'pix',
    needChange: false,
    changeFor: '',
    observations: ''
  });

  // Estado para erros de validação
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [copiedPix, setCopiedPix] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcula subtotal (apenas itens)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  // Calcula frete
  const currentDeliveryFee = orderDetails.deliveryMethod === 'delivery' ? deliveryFee : 0;

  // Calcula total final
  const total = subtotal + currentDeliveryFee;

  // Função auxiliar para classes de input com erro
  const getInputClass = (fieldName: string, isAddress = false) => {
    const hasError = isAddress ? errors[`address.${fieldName}`] : errors[fieldName];
    
    return `w-full bg-neutral-950 border rounded-lg p-3 text-white text-sm focus:outline-none transition-all duration-300 ${
      hasError 
        ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse placeholder-red-400/50' 
        : 'border-neutral-800 focus:border-orange-500'
    }`;
  };

  const handleInputChange = (field: string, value: any) => {
    setOrderDetails(prev => ({ ...prev, [field]: value }));
    // Limpa o erro ao digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setOrderDetails(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
    // Limpa o erro ao digitar
    if (errors[`address.${field}`]) {
      setErrors(prev => ({ ...prev, [`address.${field}`]: false }));
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const newErrors: Record<string, boolean> = {};
    let hasError = false;

    // Validação Campos Básicos
    if (!orderDetails.customerName.trim()) { newErrors.customerName = true; hasError = true; }
    if (!orderDetails.customerPhone.trim()) { newErrors.customerPhone = true; hasError = true; }
    
    // Validação Delivery
    if (orderDetails.deliveryMethod === 'delivery') {
      if (!orderDetails.address.street.trim()) { newErrors['address.street'] = true; hasError = true; }
      if (!orderDetails.address.number.trim()) { newErrors['address.number'] = true; hasError = true; }
      if (!orderDetails.address.neighborhood.trim()) { newErrors['address.neighborhood'] = true; hasError = true; }
    }

    // Validação Mesa
    if (orderDetails.deliveryMethod === 'table') {
      if (!orderDetails.tableNumber.trim()) { newErrors.tableNumber = true; hasError = true; }
    }
    
    // Validação Troco
    if (orderDetails.paymentMethod === 'cash' && orderDetails.needChange) {
      const val = parseFloat(orderDetails.changeFor.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(val) || val < total) {
        newErrors.changeFor = true; 
        hasError = true;
        // Se for erro de valor inválido (não vazio), alertamos também
        if (!orderDetails.changeFor.trim()) {
           // Apenas highlight visual se estiver vazio
        } else {
           alert(`O valor para troco deve ser maior que o total (R$ ${total.toFixed(2)}).`);
        }
      }
    }

    if (hasError) {
      setErrors(newErrors);
      // Vibrate para celular (feedback tátil)
      if (navigator.vibrate) navigator.vibrate(200);
      return;
    }

    setIsSubmitting(true);

    // Create Order Object
    const newOrder: Order = {
      id: `#${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      customer: orderDetails,
      items: cart,
      total: total,
      deliveryFee: currentDeliveryFee > 0 ? currentDeliveryFee : undefined,
      status: 'pending',
      createdAt: Date.now()
    };

    // Simulate Network delay slightly for UX
    setTimeout(() => {
      onPlaceOrder(newOrder);
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  const getChangeValue = () => {
      const cleanValue = orderDetails.changeFor.replace(/[^\d.,]/g, '').replace(',', '.');
      const val = parseFloat(cleanValue);
      if (isNaN(val)) return 0;
      return val - total;
  };
  const changeVal = getChangeValue();

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-neutral-900 border-l border-orange-500/30 z-50 transform transition-transform duration-300 shadow-neon flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 shrink-0">
            <h2 className="text-xl font-display font-bold text-orange-500 flex items-center gap-2">
              <ShoppingBag className="text-orange-500" />
              Finalizar Pedido
            </h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {/* Items */}
            <div>
              <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Itens</h3>
              {cart.length === 0 ? (
                <div className="text-center py-10 text-neutral-500"><p>Seu carrinho está vazio.</p></div>
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
                          <button onClick={() => onRemove(item.id)} className="text-neutral-600 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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
                {/* User Info */}
                <div>
                   <div className="flex justify-between items-center mb-3">
                      <h3 className="text-white font-bold text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Seus Dados</h3>
                      {(errors.customerName || errors.customerPhone) && <span className="text-xs text-orange-500 font-bold animate-pulse flex items-center gap-1"><AlertCircle size={12}/> Preencha os dados</span>}
                   </div>
                   <div className="space-y-3">
                     <input 
                        type="text" 
                        placeholder="Seu Nome Completo *"
                        value={orderDetails.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                        className={getInputClass('customerName')}
                      />
                     <input 
                        type="text" 
                        placeholder="Seu WhatsApp (com DDD) *"
                        value={orderDetails.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className={getInputClass('customerPhone')}
                      />
                   </div>
                </div>

                <hr className="border-neutral-800" />
                {/* Delivery */}
                <div>
                  <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Modo de Pedido</h3>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button onClick={() => handleInputChange('deliveryMethod', 'table')} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'table' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
                      <Utensils size={20} className="mb-1" />
                      <span className="text-[10px] font-bold uppercase">Mesa</span>
                    </button>
                    <button onClick={() => handleInputChange('deliveryMethod', 'delivery')} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'delivery' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
                      <MapPin size={20} className="mb-1" />
                      <span className="text-[10px] font-bold uppercase">Entrega</span>
                    </button>
                    <button onClick={() => handleInputChange('deliveryMethod', 'pickup')} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'pickup' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
                      <Store size={20} className="mb-1" />
                      <span className="text-[10px] font-bold uppercase">Retirada</span>
                    </button>
                  </div>

                  {orderDetails.deliveryMethod === 'delivery' && (
                    <div className="space-y-3 animate-fade-in">
                       <div className="bg-orange-900/20 border border-orange-500/30 p-3 rounded-lg flex items-center justify-between mb-2">
                         <span className="text-orange-400 text-xs font-bold uppercase">Taxa de Entrega</span>
                         <span className="text-white font-bold">R$ {deliveryFee.toFixed(2)}</span>
                       </div>
                       {(errors['address.street'] || errors['address.number'] || errors['address.neighborhood']) && <p className="text-xs text-orange-500 font-bold mb-1 animate-pulse">Endereço obrigatório</p>}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2"><input type="text" placeholder="Rua / Avenida *" value={orderDetails.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className={getInputClass('street', true)}/></div>
                        <div className="col-span-1"><input type="text" placeholder="Nº *" value={orderDetails.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className={getInputClass('number', true)}/></div>
                      </div>
                      <input type="text" placeholder="Bairro *" value={orderDetails.address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} className={getInputClass('neighborhood', true)}/>
                      <input type="text" placeholder="Complemento" value={orderDetails.address.complement} onChange={(e) => handleAddressChange('complement', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none"/>
                    </div>
                  )}

                  {orderDetails.deliveryMethod === 'table' && (
                    <div className="animate-fade-in">
                       {errors.tableNumber && <p className="text-xs text-orange-500 font-bold mb-1 animate-pulse">Informe o número da mesa</p>}
                       <input type="text" placeholder="Número da Mesa *" value={orderDetails.tableNumber} onChange={(e) => handleInputChange('tableNumber', e.target.value)} className={`${getInputClass('tableNumber')} text-lg font-bold text-center`}/>
                    </div>
                  )}

                  {/* Observações */}
                  <div className="mt-4 animate-fade-in">
                     <label className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider mb-2">
                        <MessageSquare size={14} className="text-orange-500"/> Observações
                     </label>
                     <textarea 
                        value={orderDetails.observations}
                        onChange={(e) => handleInputChange('observations', e.target.value)}
                        placeholder="Ex: Sem cebola, ponto da carne, retirar maionese..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none h-20 resize-none"
                     />
                  </div>
                </div>

                <hr className="border-neutral-800" />
                {/* Payment */}
                <div>
                   <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider border-l-2 border-orange-500 pl-2">Pagamento</h3>
                   <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'pix' ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-800/30 border-neutral-800'}`}>
                        <input type="radio" name="payment" className="hidden" checked={orderDetails.paymentMethod === 'pix'} onChange={() => handleInputChange('paymentMethod', 'pix')}/>
                        <QrCode size={18} className="text-teal-400" /><span className="text-sm text-white">PIX (Chave/QR Code)</span>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'credit_card' ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-800/30 border-neutral-800'}`}>
                        <input type="radio" name="payment" className="hidden" checked={orderDetails.paymentMethod === 'credit_card'} onChange={() => handleInputChange('paymentMethod', 'credit_card')}/>
                        <CreditCard size={18} className="text-blue-400" /><span className="text-sm text-white">Cartão de Crédito</span>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'cash' ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-800/30 border-neutral-800'}`}>
                        <input type="radio" name="payment" className="hidden" checked={orderDetails.paymentMethod === 'cash'} onChange={() => handleInputChange('paymentMethod', 'cash')}/>
                        <Banknote size={18} className="text-green-400" /><span className="text-sm text-white">Dinheiro</span>
                      </label>

                      {orderDetails.paymentMethod === 'cash' && (
                        <div className="ml-8 mt-2 p-3 bg-neutral-950 border border-neutral-700 rounded-lg">
                          <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={orderDetails.needChange} onChange={(e) => handleInputChange('needChange', e.target.checked)} className="accent-orange-500"/><span className="text-sm text-neutral-300">Precisa de troco?</span></label>
                          {orderDetails.needChange && (
                             <div>
                               <input type="text" placeholder="Troco para... *" value={orderDetails.changeFor} onChange={(e) => handleInputChange('changeFor', e.target.value)} className={getInputClass('changeFor')}/>
                               {changeVal > 0 && <p className="text-xs text-orange-400 mt-2 font-bold">Receber: R$ {changeVal.toFixed(2)}</p>}
                             </div>
                          )}
                        </div>
                      )}

                      {orderDetails.paymentMethod === 'pix' && pixKey && (
                        <div className="ml-0 mt-2 p-4 bg-neutral-950 border border-teal-900/50 rounded-lg text-center animate-fade-in">
                          <p className="text-teal-500 text-xs font-bold mb-2 uppercase">Chave PIX para Pagamento</p>
                          <div className="flex items-center gap-2 bg-black p-2 rounded border border-neutral-800 mb-2">
                             <code className="text-white text-sm flex-1 truncate">{pixKey}</code>
                             <button onClick={handleCopyPix} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300">
                               {copiedPix ? <Check size={16} className="text-green-500"/> : <Copy size={16}/>}
                             </button>
                          </div>
                          <p className="text-[10px] text-neutral-500">Copie a chave e pague no seu app de banco. Mostre o comprovante ao garçom/entregador.</p>
                        </div>
                      )}
                   </div>
                </div>
              </>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-5 bg-neutral-950 border-t border-neutral-800 space-y-2 shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center text-sm text-neutral-400">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {currentDeliveryFee > 0 && (
                <div className="flex justify-between items-center text-sm text-orange-400 font-bold">
                   <span>Taxa de Entrega</span>
                   <span>R$ {currentDeliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t border-neutral-800 pt-2 mt-2">
                <span className="text-neutral-300">Total</span>
                <span className="text-orange-500 text-xl">R$ {total.toFixed(2)}</span>
              </div>
              
              <button 
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-neon hover:shadow-neon-strong mt-2"
              >
                {isSubmitting ? 'Enviando...' : (
                   <><Send size={20} /> Finalizar Pedido</>
                )}
              </button>
            </div>
          )}
      </div>
    </>
  );
};

export default CartSidebar;