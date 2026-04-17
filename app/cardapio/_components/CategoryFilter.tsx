import React from 'react'

interface CategoryFilterProps {
  categorias: string[]
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
}

export function CategoryFilter({ categorias, selectedCategory, setSelectedCategory }: CategoryFilterProps) {
  return (
    <div className="sticky top-20 z-20 bg-black/95 border-b border-orange-900/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-x-auto scrollbar-hide">
        <div className="flex justify-start gap-3">
          {categorias.map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)} 
              className={`whitespace-nowrap px-5 py-2 rounded-full text-[13px] font-bold border transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 ${
                selectedCategory === cat 
                  ? 'bg-orange-600 border-orange-600 text-white shadow-orange-900/50' 
                  : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-orange-500/50 hover:text-orange-400'
              }`}
            >
              {cat === 'todos' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
