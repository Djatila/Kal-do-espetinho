import React, { useRef } from 'react'
import { Flame, ShoppingBag, LogOut } from 'lucide-react'

import { DadosCliente } from '../types'

interface CardapioHeaderProps {
  nomeRestaurante: string
  categorias: string[]
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  cartCount: number
  setMostrarCarrinho: (val: boolean) => void
  cartIconRef: React.RefObject<HTMLDivElement>
  tipoCliente: string | null
  dadosCliente: DadosCliente
  setMostrarQuemSomos: (val: boolean) => void
  setMostrarContato: (val: boolean) => void
  handleLogout: () => Promise<void>
}

export function CardapioHeader({
  nomeRestaurante,
  categorias,
  selectedCategory,
  setSelectedCategory,
  cartCount,
  setMostrarCarrinho,
  cartIconRef,
  tipoCliente,
  dadosCliente,
  setMostrarQuemSomos,
  setMostrarContato,
  handleLogout
}: CardapioHeaderProps) {
  
  // Format the name slightly for the "KAL DO ESPETINHO" look if possible
  const safeNome = nomeRestaurante || 'KAL DO ESPETINHO'
  const partesNome = safeNome.split(' ')
  const ultimaPalavra = partesNome.length > 1 ? partesNome.pop() : ''
  const restoNome = partesNome.join(' ')

  return (
    <nav className="fixed top-0 w-full z-30 bg-black/80 backdrop-blur-md border-b border-orange-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-orange-600 p-2 rounded-lg shadow-neon">
              <Flame className="text-white" size={24} fill="currentColor" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wider leading-none uppercase">
                {restoNome ? `${restoNome} ` : ''}
                {ultimaPalavra ? <span className="text-orange-500">{ultimaPalavra}</span> : nomeRestaurante}
              </h1>
              <span className="text-[10px] sm:text-xs text-neutral-400 font-sans tracking-widest uppercase">
                Arataca - Ba
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
                onClick={() => setMostrarQuemSomos(true)}
                className="text-xs font-bold uppercase tracking-widest text-neutral-300 hover:text-orange-400 transition-colors"
            >
                Quem Somos
            </button>
            <button
                onClick={() => setMostrarContato(true)}
                className="text-xs font-bold uppercase tracking-widest text-neutral-300 hover:text-orange-400 transition-colors"
            >
                Contato
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Infos do Cliente (se logado) */}
            {tipoCliente && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Olá,</span>
                  <span className="text-xs text-white font-black uppercase tracking-widest truncate max-w-[100px]">
                    {dadosCliente.nome || 'Cliente'}
                  </span>
                </div>
                
                {/* Avatar Pill (Como no print) */}
                <div className="flex items-center gap-2 bg-neutral-900 border border-orange-500/20 px-2 py-1.5 rounded-full shadow-inner">
                   <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white">
                      <span className="text-[10px] font-black uppercase">{dadosCliente.nome?.charAt(0) || 'K'}</span>
                   </div>
                   <span className="text-[10px] font-black text-white uppercase tracking-tighter md:hidden">
                    {dadosCliente.nome?.split(' ')[0] || 'Cliente'}
                   </span>
                </div>

                {/* Botão Logout */}
                <button 
                  onClick={handleLogout}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                  title="Sair da sessão"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}

            <div 
              ref={cartIconRef} 
              className="relative p-2 text-white hover:text-orange-500 transition-colors group cursor-pointer" 
              onClick={() => setMostrarCarrinho(true)}
            >
              <ShoppingBag size={28} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-neon">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </nav>
  )
}
