'use client'

import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="flex w-full h-[calc(100vh-80px)] items-center justify-center bg-neutral-950/20 backdrop-blur-sm rounded-2xl animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner em Laranja Neon do Kal */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
          {/* Fogo pulsante no centro */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-orange-600 rounded-full blur-md animate-pulse"></div>
        </div>
        
        {/* Animação progressiva de textos Kal */}
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 animate-pulse">
            Carregando sua Sessão...
          </h2>
          <p className="text-sm text-neutral-400">Preparando as frigideiras e as informações</p>
        </div>

        {/* Barra de esqueleto inferior */}
        <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden mt-4">
          <div className="w-1/2 h-full bg-orange-500/50 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        </div>
      </div>
    </div>
  )
}
