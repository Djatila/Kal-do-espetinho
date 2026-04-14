import React from 'react';
import { MenuItem } from './types';

interface HighlightCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, event: React.MouseEvent) => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ item, onAdd }) => {
  return (
    <div
      className="flex flex-col items-center gap-2 snap-center shrink-0 w-20 sm:w-24 group cursor-pointer"
      onClick={(e) => onAdd(item, e)}
    >
      {/* Circular Image Container - Half size (w-16/20 instead of w-32/40) */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20">
        {/* Glow / Border Effect - Thinner border (2px) */}
        <div className="absolute inset-0 rounded-full border-2 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)] z-10 transition-transform group-hover:scale-105" />

        {/* The Image */}
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-black relative">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>

      {/* Info - Smaller text for the small card */}
      <div className="text-center space-y-0.5">
        <h4 className="text-white font-bold text-[10px] sm:text-[11px] font-sans group-hover:text-orange-500 transition-colors line-clamp-1">
          {item.name}
        </h4>
        <div className="text-orange-500 font-display font-bold text-xs sm:text-sm">
          R$ {item.price.toFixed(2).replace('.', ',')}
        </div>
      </div>
    </div>
  );
};

export default HighlightCard;