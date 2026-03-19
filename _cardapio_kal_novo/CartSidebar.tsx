import React, { useMemo, useState } from 'react';
import { X, Trash2, ShoppingBag, Send, MapPin, Store, CreditCard, Banknote, QrCode, Utensils, Copy, Check, AlertCircle, MessageSquare, Clock } from 'lucide-react';
import { CartItem, OrderDetails, Order } from './types';

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
  allowPayLater?: boolean;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  limiteCredito?: number;
  creditoUtilizado?: number;
}

const CartSidebar: React.FC<CartSidebarProps> = ({
  isOpen,
  onClose,
  cart,
  onRemove,
  onUpdateQuantity,
  whatsappNumber,
  pixKey,
  deliveryFee,
  onPlaceOrder,
  allowPayLater,
  initialCustomerName,
  initialCustomerPhone,
  limiteCredito = 0,
  creditoUtilizado = 0
}) => {
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
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Sincroniza dados iniciais do cliente quando mudam no pai (identificação)
  React.useEffect(() => {
    if (initialCustomerName || initialCustomerPhone) {
      setOrderDetails(prev => ({
        ...prev,
        customerName: initialCustomerName || prev.customerName,
        customerPhone: initialCustomerPhone || prev.customerPhone
      }));
    }
  }, [initialCustomerName, initialCustomerPhone]);

  // Calcula subtotal (apenas itens)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  // Calcula frete
  const currentDeliveryFee = orderDetails.deliveryMethod === 'delivery' ? deliveryFee : 0;

  // Calcula total final
  const total = subtotal + currentDeliveryFee;
  // limiteDisponivel = quanto o cliente ainda pode gastar no crédito
  const limiteDisponivel = limiteCredito - creditoUtilizado;

  // Função auxiliar para classes de input com erro
  const getInputClass = (fieldName: string, isAddress = false) => {
    const hasError = isAddress ? errors[`address.${fieldName}`] : errors[fieldName];

    return `w-full bg-neutral-950 border rounded-lg p-3 text-white text-sm focus:outline-none transition-all duration-300 ${hasError
      ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse placeholder-red-400/50'
      : 'border-neutral-800 focus:border-orange-500'
      }`;
  };

  const handleInputChange = (field: string, value: any) => {
    setOrderDetails((prev: OrderDetails) => ({ ...prev, [field]: value }));
    // Limpa o erro ao digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setOrderDetails((prev: OrderDetails) => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
    // Limpa o erro ao digitar
    if (errors[`address.${field}`]) {
      setErrors((prev: Record<string, boolean>) => ({ ...prev, [`address.${field}`]: false }));
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
        if (orderDetails.changeFor.trim()) {
          alert(`O valor para troco deve ser maior que o total (R$ ${total.toFixed(2)}).`);
        }
      }
    }

    // Validação Pagar Depois
    if (orderDetails.paymentMethod === 'pay_later') {
      if (total > limiteDisponivel) {
        setShowLimitWarning(true);
        return;
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
      status: 'pendente',
      createdAt: Date.now()
    };

    try {
      await onPlaceOrder(newOrder);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
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
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-neutral-900 border-l border-orange-500/30 z-[160] transform transition-transform duration-300 shadow-neon flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

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
                  {(errors.customerName || errors.customerPhone) && <span className="text-xs text-orange-500 font-bold animate-pulse flex items-center gap-1"><AlertCircle size={12} /> Preencha os dados</span>}
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
                  <button onClick={() => handleInputChange('deliveryMethod', 'table')} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'table' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:text-white'}`}>
                    <Utensils size={20} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase">Mesa</span>
                  </button>
                  <button onClick={() => handleInputChange('deliveryMethod', 'delivery')} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'delivery' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:text-white'}`}>
                    <MapPin size={20} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase">Entrega</span>
                  </button>
                  <button onClick={() => handleInputChange('deliveryMethod', 'pickup')} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${orderDetails.deliveryMethod === 'pickup' ? 'bg-orange-600/20 border-orange-500 text-orange-500' : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:text-white'}`}>
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
                      <div className="col-span-2"><input type="text" placeholder="Rua / Avenida *" value={orderDetails.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className={getInputClass('street', true)} /></div>
                      <div className="col-span-1"><input type="text" placeholder="Nº *" value={orderDetails.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className={getInputClass('number', true)} /></div>
                    </div>
                    <input type="text" placeholder="Bairro *" value={orderDetails.address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} className={getInputClass('neighborhood', true)} />
                    <input type="text" placeholder="Complemento" value={orderDetails.address.complement} onChange={(e) => handleAddressChange('complement', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                )}

                {orderDetails.deliveryMethod === 'table' && (
                  <div className="animate-fade-in bg-orange-600/5 p-4 rounded-xl border border-orange-500/20 shadow-inner">
                    <label className="block text-white font-bold text-sm uppercase tracking-widest mb-2 text-center">Número da Mesa *</label>
                    {errors.tableNumber && <p className="text-xs text-orange-500 font-bold mb-2 animate-pulse text-center flex items-center justify-center gap-1"><AlertCircle size={12} /> Por favor, informe sua mesa</p>}
                    <input
                      type="text"
                      placeholder="coloque o numero da sua mesa aqui"
                      value={orderDetails.tableNumber}
                      onChange={(e) => handleInputChange('tableNumber', e.target.value)}
                      className={`${getInputClass('tableNumber')} text-lg text-center font-medium placeholder:font-normal placeholder:text-neutral-600`}
                    />
                  </div>
                )}

                {/* Observações */}
                <div className="mt-4 animate-fade-in">
                  <label className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider mb-2">
                    <MessageSquare size={14} className="text-orange-500" /> Observações
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
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'pix' ? 'bg-orange-600/20 border-orange-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'}`}>
                    <input type="radio" name="payment" className="hidden" checked={orderDetails.paymentMethod === 'pix'} onChange={() => handleInputChange('paymentMethod', 'pix')} />
                    <img src="/pix-logo.png" alt="Pix" className="w-5 h-5 object-contain" />
                    <span className="text-sm font-medium">PIX (Chave/QR Code)</span>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'credit_card' ? 'bg-orange-600/20 border-orange-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'}`}>
                    <input type="radio" name="payment" className="hidden" checked={orderDetails.paymentMethod === 'credit_card'} onChange={() => handleInputChange('paymentMethod', 'credit_card')} />
                    <CreditCard size={18} className="text-blue-400" /><span className="text-sm font-medium">Cartão</span>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'cash' ? 'bg-orange-600/20 border-orange-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'}`}>
                    <input type="radio" name="payment" className="hidden" checked={orderDetails.paymentMethod === 'cash'} onChange={() => handleInputChange('paymentMethod', 'cash')} />
                    <Banknote size={18} className="text-green-400" /><span className="text-sm font-medium">Dinheiro</span>
                  </label>
                  {allowPayLater && (
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${orderDetails.paymentMethod === 'pay_later' ? 'bg-orange-600/20 border-orange-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'}`}>
                        <input type="radio" name="payment" className="hidden" checked={orderDetails.paymentMethod === 'pay_later'} onChange={() => handleInputChange('paymentMethod', 'pay_later')} />
                        <Clock size={18} className="text-yellow-400" /><span className="text-sm font-medium">Pagar Depois</span>
                      </label>
                      {limiteCredito > 0 && orderDetails.paymentMethod === 'pay_later' && (
                        <div className={`p-3 text-sm rounded-lg border ${limiteDisponivel / limiteCredito <= 0.35 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                          <p className="font-bold flex items-center justify-between">
                            Limite Restante: <span>R$ {limiteDisponivel.toFixed(2)}</span>
                          </p>
                          {limiteDisponivel / limiteCredito <= 0.35 && (
                            <p className="text-xs mt-1 text-orange-500">Seu limite está atingindo a cota máxima em breve.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {orderDetails.paymentMethod === 'cash' && (
                    <div className="ml-8 mt-2 p-3 bg-neutral-950 border border-neutral-700 rounded-lg">
                      <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={orderDetails.needChange} onChange={(e) => handleInputChange('needChange', e.target.checked)} className="accent-orange-500" /><span className="text-sm text-neutral-300">Precisa de troco?</span></label>
                      {orderDetails.needChange && (
                        <div>
                          <input type="text" placeholder="Troco para... *" value={orderDetails.changeFor} onChange={(e) => handleInputChange('changeFor', e.target.value)} className={getInputClass('changeFor')} />
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
                          {copiedPix ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
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

      {showLimitWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1a1a] border border-neutral-800 rounded-xl p-6 w-full max-w-sm relative shadow-2xl flex flex-col items-center text-center">

            <button
              onClick={() => setShowLimitWarning(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={24} className="text-orange-500" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Limite Insuficiente</h3>
            <p className="text-neutral-400 text-sm mb-4">
              *Seu limite está abaixo do valor da compra*
            </p>

            <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-500 text-sm">Valor do Pedido:</span>
                <span className="text-white font-bold">R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-sm">Seu Limite Atual:</span>
                <span className="text-orange-500 font-bold">R$ {limiteDisponivel.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-neutral-300 text-sm mb-6">
              Fale com a gerência pelo WhatsApp abaixo para solicitar mais limite e liberar sua comanda.
            </p>

            <a
              href={`https://wa.me/55${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá Kal! Estou tentando finalizar meu pedido de R$ ${total.toFixed(2)}, mas meu limite de crédito disponível é de R$ ${limiteDisponivel.toFixed(2)}. Consegue me dar uma forcinha e aumentar meu limite para eu liberar essa comanda?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(249,115,22,0.5)] mb-3"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Falar com o Kal
            </a>

            <button
              onClick={() => setShowLimitWarning(false)}
              className="w-full py-2 bg-transparent text-neutral-400 hover:text-white transition-colors text-sm font-medium border border-neutral-800 rounded-xl"
            >
              Voltar ao Carrinho
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CartSidebar;