import React from 'react'
import { Flame, X, MessageSquare, MapPin } from 'lucide-react'
import { ConfiguracaoCardapio } from '../types'

interface InfoModalsProps {
  mostrarQuemSomos: boolean
  setMostrarQuemSomos: (val: boolean) => void
  mostrarContato: boolean
  setMostrarContato: (val: boolean) => void
  configuracao: ConfiguracaoCardapio
}

export function InfoModals({
  mostrarQuemSomos,
  setMostrarQuemSomos,
  mostrarContato,
  setMostrarContato,
  configuracao
}: InfoModalsProps) {
  return (
    <>
      {mostrarQuemSomos && (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setMostrarQuemSomos(false)}
        >
            <div
                className="bg-neutral-900 border border-orange-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative bg-gradient-to-br from-orange-600 to-red-700 px-6 pt-8 pb-6">
                    <button
                        onClick={() => setMostrarQuemSomos(false)}
                        className="absolute top-4 right-4 bg-black/30 p-1.5 rounded-full text-white hover:bg-black/50 transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Flame className="text-white" size={22} fill="currentColor" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-white">Quem Somos</h2>
                    </div>
                    <p className="text-orange-100 text-sm">Conheça a nossa história</p>
                </div>

                <div className="px-6 py-6 space-y-4">
                    <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                        O <strong className="text-white">Kal do Espetinho</strong> nasceu em Arataca - BA com um único propósito: oferecer sabor de verdade com um atendimento que faz a diferença. Aqui, cada espetinho é preparado com carinho, ingredientes frescos e aquele tempero especial que só a gente tem.
                    </p>
                    <p className="text-neutral-500 text-sm leading-relaxed">
                        Muito mais do que uma casa de espetinhos — somos um ponto de encontro, um espaço de sabores e experiências únicas. Venha nos visitar ou faça seu pedido pelo cardápio online!
                    </p>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        {[
                            { icon: '🔥', label: 'Artesanal', desc: 'Feito na hora' },
                            { icon: '📍', label: 'Arataca - BA', desc: 'Venha nos visitar' },
                            { icon: '⭐', label: 'Qualidade', desc: 'Sempre premium' },
                        ].map((item, i) => (
                            <div key={i} className="bg-neutral-800/60 border border-neutral-700 rounded-2xl p-3 text-center">
                                <div className="text-xl mb-1">{item.icon}</div>
                                <p className="text-white font-bold text-[11px]">{item.label}</p>
                                <p className="text-neutral-500 text-[10px]">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setMostrarQuemSomos(false)}
                        className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm transition-colors mt-2"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}

      {mostrarContato && (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setMostrarContato(false)}
        >
            <div
                className="bg-neutral-900 border border-orange-500/20 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative bg-gradient-to-br from-green-700 to-green-900 px-6 pt-8 pb-6">
                    <button
                        onClick={() => setMostrarContato(false)}
                        className="absolute top-4 right-4 bg-black/30 p-1.5 rounded-full text-white hover:bg-black/50 transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <MessageSquare className="text-white" size={22} />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-white">Contato</h2>
                    </div>
                    <p className="text-green-200 text-sm">Fale com a gente!</p>
                </div>

                <div className="px-6 py-6 space-y-4">
                    <div className="flex items-center gap-3 bg-neutral-800/50 rounded-2xl p-4 border border-neutral-700">
                        <MapPin size={20} className="text-orange-500 flex-shrink-0" />
                        <div>
                            <p className="text-white font-bold text-sm">Localização</p>
                            <p className="text-neutral-400 text-xs">Arataca - BA</p>
                        </div>
                    </div>

                    {configuracao.whatsapp_loja && (
                        <a
                            href={`https://wa.me/55${configuracao.whatsapp_loja.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-4 rounded-2xl transition-all active:scale-95 shadow-lg w-full justify-center"
                            onClick={() => setMostrarContato(false)}
                        >
                            <MessageSquare size={20} />
                            Chamar no WhatsApp
                        </a>
                    )}

                    <button
                        onClick={() => setMostrarContato(false)}
                        className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  )
}
