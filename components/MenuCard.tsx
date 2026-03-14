import React from 'react';
import { MenuItem } from '../types';
import { Plus, ShoppingCart, Star } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, event: React.MouseEvent) => void;
  variant?: 'standard' | 'minimal';
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd, variant = 'standard' }) => {
  
  // === ESTILO MINIMALISTA (BASEADO NO PRINT) ===
  if (variant === 'minimal') {
    return (
      <div className="group relative bg-neutral-900 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
        {/* Parte Superior: Imagem */}
        <div className="relative h-40 w-full overflow-hidden">
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Tag "Popular" no canto superior esquerdo (Estilo Print) */}
          {item.popular && (
            <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
              Popular
            </span>
          )}
          
          {/* Botão de Carrinho Flutuante (Estilo Print - Rosa/Vermelho Redondo) */}
          <button 
            onClick={(e) => onAdd(item, e)}
            className="absolute bottom-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-2.5 rounded-xl shadow-lg transform transition-transform active:scale-95 flex items-center justify-center"
            aria-label="Adicionar"
          >
            <ShoppingCart size={18} fill="currentColor" />
          </button>
        </div>

        {/* Parte Inferior: Infos */}
        <div className="p-3 bg-neutral-900">
          <h3 className="text-sm font-bold text-white mb-1 leading-tight line-clamp-1">
            {item.name}
          </h3>
          <p className="text-[11px] text-neutral-400 mb-3 line-clamp-2 leading-relaxed h-[34px]">
            {item.description}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-rose-500">
              R$ {item.price.toFixed(2).replace('.', ',')}
            </span>
            <div className="flex items-center gap-1 text-xs text-neutral-400 font-bold">
               <Star size={12} className="text-yellow-400" fill="currentColor" />
               4.8
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === ESTILO PADRÃO (LARGO) ===
  return (
    <div className="group relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-neon">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent opacity-80" />
        {item.popular && (
          <span className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            ⭐ Popular
          </span>
        )}
      </div>
      
      <div className="p-4 relative">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-display font-bold text-white leading-tight group-hover:text-orange-500 transition-colors">
            {item.name}
          </h3>
        </div>
        
        <p className="text-neutral-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
          {item.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-bold text-orange-400">
            R$ {item.price.toFixed(2).replace('.', ',')}
          </span>
          
          <button 
            onClick={(e) => onAdd(item, e)}
            className="flex items-center gap-1 bg-neutral-800 hover:bg-orange-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95"
            aria-label={`Adicionar ${item.name} ao carrinho`}
          >
            <Plus size={18} />
            <span className="text-sm font-semibold">Adicionar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;