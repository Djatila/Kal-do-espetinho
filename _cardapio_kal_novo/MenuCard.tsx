import React from 'react';
import { MenuItem } from './types';
import { Plus, ShoppingCart, Star } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, event: React.MouseEvent) => void;
  variant?: 'standard' | 'minimal' | 'lista';
  customBadge?: string;
  isHighlight?: boolean;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd, variant = 'standard', customBadge, isHighlight }) => {

  // === ESTILO LISTA (HORIZONTAL - COR LARANJA NEON KAL) ===
  if (variant === 'lista') {
    const imgSize = isHighlight ? '112px' : '88px';
    return (
      <div
        className={`group relative flex items-center gap-3 bg-neutral-900 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-orange-500/20 hover:border-orange-500/60 ${isHighlight ? 'my-2' : ''}`}
        style={{ borderLeft: isHighlight ? '5px solid #f97316' : '4px solid #f97316' }}
      >
        {/* Imagem quadrada à esquerda */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ minWidth: imgSize, width: imgSize, height: imgSize, borderRadius: '0 12px 12px 0' }}>
          <img
            src={item.image || '/placeholder-food.jpg'}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Conteúdo central */}
        <div className={`flex-1 py-3 pr-4 min-w-0 ${isHighlight ? 'py-4' : ''}`}>
          {(customBadge || item.isTopSeller) && (
            <span className={`inline-flex items-center gap-1 text-white ${isHighlight ? 'text-[10px]' : 'text-[9px]'} font-black px-2 py-0.5 rounded uppercase tracking-wider mb-1 shadow-sm ${customBadge ? 'bg-gradient-to-r from-amber-600 to-yellow-500' : 'bg-gradient-to-r from-red-600 to-orange-500'}`}>
              {customBadge ? <><Star size={8} fill="currentColor" /> {customBadge}</> : 'O MAIS VENDIDO 🔥'}
            </span>
          )}
          <div className="flex justify-between items-start pr-2">
            <h3 className={`${isHighlight ? 'text-base font-black' : 'text-sm font-bold'} text-white leading-tight line-clamp-2 mb-0.5 group-hover:text-orange-400 transition-colors`}>
              {item.name}
            </h3>
            {item.rating && (
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-bold ml-2 shrink-0 mt-1">
                <Star size={10} className="text-yellow-400" fill="currentColor" />
                {item.rating}
              </div>
            )}
          </div>
          <p className={`${isHighlight ? 'text-sm' : 'text-xs'} text-neutral-400 line-clamp-2 leading-relaxed mb-2 pr-10`}>
            {item.description}
          </p>
          <div className="pr-10">
            <span className={`${isHighlight ? 'text-lg font-black' : 'text-base font-extrabold'} text-orange-400`}>
              {item.tem_variacoes ? 'Ver opções' : `R$ ${item.price.toFixed(2).replace('.', ',')}`}
            </span>
          </div>
        </div>

        {/* Botão + canto inferior direito */}
        <button
          onClick={(e) => onAdd(item, e)}
          className={`absolute bottom-3 right-3 ${isHighlight ? 'h-10' : 'h-9'} rounded-full ${item.tem_variacoes ? 'px-3 bg-neutral-800 border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white' : `${isHighlight ? 'w-10' : 'w-9'} bg-orange-600 hover:bg-orange-500 text-white`} flex items-center justify-center shadow-lg active:scale-95 transition-all`}
          aria-label={item.tem_variacoes ? 'Ver opções' : `Adicionar ${item.name}`}
        >
          {item.tem_variacoes ? <span className="text-[10px] font-bold uppercase tracking-wider">Escolher</span> : <Plus size={isHighlight ? 22 : 20} strokeWidth={3} />}
        </button>
      </div>
    );
  }

  // === ESTILO MINIMALISTA (BASEADO NO PRINT) ===
  if (variant === 'minimal') {
    return (
      <div className="group relative bg-neutral-900 border border-orange-500/20 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:border-orange-500/50">
        {/* Parte Superior: Imagem */}
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Tag Top Seller ou Popular */}
          {item.isTopSeller ? (
            <span className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
              Mais Vendido 🔥
            </span>
          ) : item.popular ? (
            <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
              Popular
            </span>
          ) : null}

          {/* Botão de Carrinho Flutuante (Laranja Neon) */}
          <button
            onClick={(e) => onAdd(item, e)}
            className={`absolute bottom-2 right-2 ${item.tem_variacoes ? 'px-3 h-8 bg-neutral-900 border border-orange-600 rounded-lg text-orange-500' : 'bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-xl'} shadow-lg transform transition-transform active:scale-95 flex items-center justify-center`}
            aria-label={item.tem_variacoes ? 'Escolher' : 'Adicionar'}
          >
            {item.tem_variacoes ? <span className="text-[10px] font-bold uppercase">Escolher</span> : <ShoppingCart size={18} fill="currentColor" />}
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
            <span className="text-base font-bold text-orange-500">
              {item.tem_variacoes ? 'Ver opções' : `R$ ${item.price.toFixed(2).replace('.', ',')}`}
            </span>
            <div className="flex items-center gap-1 text-xs text-neutral-400 font-bold">
              <Star size={12} className={item.isTopSeller ? "text-orange-500" : "text-yellow-400"} fill="currentColor" />
              {item.rating || '4.5'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === ESTILO PADRÃO (LARGO) ===
  return (
    <div className="group relative bg-neutral-900 border border-orange-500/20 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-neon">
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent opacity-80" />
        
        {item.isTopSeller ? (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            🔥 O Mais Vendido
          </span>
        ) : item.popular ? (
          <span className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            ⭐ Popular
          </span>
        ) : null}
      </div>

      <div className="p-4 relative">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-display font-bold text-white leading-tight group-hover:text-orange-500 transition-colors pr-8">
            {item.name}
          </h3>
          <div className="flex items-center gap-1 text-sm font-bold text-neutral-400 absolute right-4 top-4">
            <Star size={14} className={item.isTopSeller ? "text-orange-500" : "text-yellow-400"} fill="currentColor" />
            {item.rating || '4.5'}
          </div>
        </div>

        <p className="text-neutral-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
          {item.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-bold text-orange-400">
            {item.tem_variacoes ? 'Ver opções' : `R$ ${item.price.toFixed(2).replace('.', ',')}`}
          </span>

          <button
            onClick={(e) => onAdd(item, e)}
            className={`flex items-center gap-1 ${item.tem_variacoes ? 'bg-neutral-800 border border-orange-500 text-orange-500 hover:bg-orange-600 hover:text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'} px-3 py-2 rounded-lg transition-colors duration-200 active:scale-95 shadow-md`}
            aria-label={item.tem_variacoes ? 'Escolher opções' : `Adicionar ${item.name} ao carrinho`}
          >
            {item.tem_variacoes ? <span className="text-sm font-bold">Escolher</span> : (
              <>
                <Plus size={18} />
                <span className="text-sm font-semibold">Adicionar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;