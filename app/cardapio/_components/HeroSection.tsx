import React from 'react'

interface HeroSectionProps {
  bannerUrl?: string
  titulo: string
  subtitulo: string
}

export function HeroSection({ bannerUrl, titulo, subtitulo }: HeroSectionProps) {
  const defaultBanner = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2574&auto=format&fit=crop"
  
  return (
    <div className="relative mt-20 h-[28vh] sm:h-[35vh] w-full overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0">
        <img 
          src={bannerUrl || defaultBanner} 
          alt="Banner" 
          className="w-full h-full object-cover opacity-75" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-[#0a0a0a]/40 to-transparent" />
      </div>
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-4 drop-shadow-2xl">
          {titulo.split(' ').map((word, i, arr) => {
            if (i === arr.length - 1) {
              return <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">{word}</span>
            }
            return word + ' '
          })}
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-8">
          {subtitulo}
        </p>
      </div>
    </div>
  )
}
