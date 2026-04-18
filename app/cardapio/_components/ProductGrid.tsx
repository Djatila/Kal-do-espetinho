import React from 'react'
import { Produto, VariacaoPreco } from '../types'
import MenuCard from '@/_cardapio_kal_novo/MenuCard'
import HighlightCard from '@/_cardapio_kal_novo/HighlightCard'

interface ProductGridProps {
  produtos: Produto[]
  selectedCategory: string
  layoutCardapio: string
  onAdd: (produto: Produto, variacao?: VariacaoPreco, opcao?: string, evento?: React.MouseEvent) => void
  produtosDestaqueBolha: string[]
}

export function ProductGrid({
  produtos,
  selectedCategory,
  layoutCardapio,
  onAdd,
  produtosDestaqueBolha
}: ProductGridProps) {
  
  const filteredItems = (selectedCategory === 'todos' 
    ? produtos 
    : produtos.filter(p => p.categoria === selectedCategory)).sort((a, b) => (b.vendas || 0) - (a.vendas || 0))

  const maxVendas = Math.max(...produtos.map(p => p.vendas || 0), 0);
  const topSellersIds = produtos.filter(p => (p.vendas || 0) === maxVendas && maxVendas > 0).map(p => p.id);

  const highlights = produtos.filter(p => p.destaque === true)

  return (
    <main id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {highlights.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-display font-bold text-white mb-6 border-l-4 border-orange-500 pl-3">
            ⭐ Promoções/Recomendações
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {highlights.map(item => {
              const itemVendas = item.vendas || 0;
              let ratingRate = 4.5;
              if (maxVendas > 0) {
                 ratingRate = 4.5 + (0.5 * (itemVendas / maxVendas));
              }

              const highlightItemAdapter: any = {
                id: item.id,
                name: item.nome,
                description: item.descricao,
                price: item.preco,
                category: item.categoria,
                image: item.imagem_url || '',
                vendas: item.vendas,
                tem_variacoes: item.tem_variacoes,
                variacoes_preco: item.variacoes_preco,
                tem_opcoes: item.tem_opcoes,
                opcoes: item.opcoes,
                popular: item.vendas ? item.vendas > 20 : false,
                isTopSeller: topSellersIds.includes(item.id),
                rating: ratingRate.toFixed(1)
              }
              return (
                <div key={`hl-${item.id}`} className="animate-fade-in-up">
                    <MenuCard 
                        item={highlightItemAdapter} 
                        variant="lista"
                        customBadge={(item as any).titulo_destaque || '⭐ RECOMENDAÇÃO DO CHEFE KAL'}
                        isHighlight={true}
                        onAdd={(itemData, e) => onAdd(item, undefined, undefined, e as React.MouseEvent)} 
                    />
                </div>
              )
            })}
          </div>
          <hr className="border-neutral-800 mt-4" />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white border-l-4 border-orange-500 pl-4">
          {selectedCategory === 'todos' ? 'Nosso Cardápio' : selectedCategory}
        </h2>
      </div>

      <div
        key={selectedCategory}
        className={`grid gap-6 animate-fade-in-up ${
          layoutCardapio === 'minimal' 
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        {filteredItems.map(item => {
          const itemVendas = item.vendas || 0;
          let ratingRate = 4.5;
          if (maxVendas > 0) {
             ratingRate = 4.5 + (0.5 * (itemVendas / maxVendas));
          }

          const menuItemAdapter: any = {
              id: item.id,
              name: item.nome,
              description: item.descricao,
              price: item.preco,
              category: item.categoria,
              image: item.imagem_url || '',
              vendas: item.vendas,
              tem_variacoes: item.tem_variacoes,
              variacoes_preco: item.variacoes_preco,
              tem_opcoes: item.tem_opcoes,
              opcoes: item.opcoes,
              popular: item.vendas ? item.vendas > 20 : false,
              isTopSeller: topSellersIds.includes(item.id),
              rating: ratingRate.toFixed(1)
          }
          return (
            <MenuCard 
              key={item.id} 
              item={menuItemAdapter} 
              onAdd={(itemData, e) => {
                onAdd(item, undefined, undefined, e as React.MouseEvent)
              }} 
              variant={layoutCardapio as 'standard' | 'minimal' | 'lista'} 
            />
          )
        })}
      </div>
    </main>
  )
}
