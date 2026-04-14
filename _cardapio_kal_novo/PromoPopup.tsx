import React, { useEffect, useState } from 'react';
import { X, Plus, Star } from 'lucide-react';
import { PromoSettings, MenuItem, Category } from './types';

interface PromoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PromoSettings;
  onAddToCart: (item: MenuItem) => void;
}

const PromoPopup: React.FC<PromoPopupProps> = ({ isOpen, onClose, settings, onAddToCart }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay pequeno para animação de entrada
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const handleAddToCart = () => {
    // Cria um item temporário baseado na promo para adicionar ao carrinho
    const promoItem: MenuItem = {
      id: `promo-${Date.now()}`,
      name: settings.productName || settings.title, // Usa o nome real do produto se disponível
      description: settings.description,
      price: settings.price,
      category: Category.PORCOES, // Categoria genérica ou poderia ser passada
      image: settings.image,
      popular: true
    };
    onAddToCart(promoItem);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

      {/* Backdrop com Blur */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Card Minimalista */}
      <div
        className={`relative w-full max-w-sm bg-neutral-900 rounded-2xl overflow-hidden shadow-neon-strong border border-orange-500/30 transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'}`}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-colors"
        >
          <X size={20} />
        </button>

        {/* Imagem */}
        <div className="relative h-64">
          <img
            src={settings.image}
            alt={settings.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />

          <div className="absolute top-2 left-1.5">
            <span className="bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
              <Star size={10} fill="currentColor" /> {settings.badgeText || 'Destaque'}
            </span>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 text-center -mt-6 relative z-10">
          <h2 className="text-2xl font-display font-bold text-white mb-2 leading-none uppercase">
            {settings.title}
          </h2>
          <div className="w-12 h-1 bg-orange-500 mx-auto mb-3 rounded-full" />
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            {settings.description}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-neutral-800 rounded-xl p-3 border border-neutral-700">
              <span className="text-xs text-neutral-500 uppercase font-bold block">Apenas</span>
              <span className="text-xl font-bold text-white">R$ {settings.price.toFixed(2)}</span>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-4 rounded-xl shadow-neon transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Eu Quero!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoPopup;