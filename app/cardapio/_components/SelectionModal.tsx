import React from 'react'
import { X, Plus } from 'lucide-react'
import { Produto, VariacaoPreco } from '../types'

interface SelectionModalProps {
  produtoParaVariacao: Produto | null
  setProdutoParaVariacao: (p: Produto | null) => void
  opcaoInterna: string | null
  setOpcaoInterna: (val: string | null) => void
  variacaoInterna: VariacaoPreco | null
  setVariacaoInterna: (val: VariacaoPreco | null) => void
  onAddToCart: (produto: Produto, variacao?: VariacaoPreco, opcao?: string, evento?: React.MouseEvent) => void
  triggerCartAnimation: (image: string, x: number, y: number) => void
}

export function SelectionModal({
  produtoParaVariacao,
  setProdutoParaVariacao,
  opcaoInterna,
  setOpcaoInterna,
  variacaoInterna,
  setVariacaoInterna,
  onAddToCart,
  triggerCartAnimation
}: SelectionModalProps) {
  
  if (!produtoParaVariacao) return null

  // Normaliza e agrupa opcoes dinamicamente
  const opcoesRaw: { nome: string, preco?: number }[] = Array.isArray((produtoParaVariacao as any).opcoes)
      ? (produtoParaVariacao as any).opcoes.map((o: any) => typeof o === 'string' ? { nome: o } : o)
      : [];

  const opcoesMap = new Map<string, { nome: string, preco?: number, precos?: Record<string, number> }>();
  const nomesVariacoesMap = (produtoParaVariacao.variacoes_preco || []).map((v: any) => ({
      original: v.nome,
      clean: v.nome.trim().toLowerCase()
  }));

  opcoesRaw.forEach(opt => {
      let baseName = opt.nome;
      let foundSizeOriginal: string | null = null;

      for (const size of nomesVariacoesMap) {
          const suffix = ' ' + size.clean;
          if (opt.nome.toLowerCase().trim().endsWith(suffix)) {
              const rawBase = opt.nome.toLowerCase().trim().replace(new RegExp(suffix + '$', 'i'), '').trim();
              // Capitalize first letter
              baseName = rawBase.charAt(0).toUpperCase() + rawBase.slice(1);
              foundSizeOriginal = size.original;
              break;
          }
      }

      if (foundSizeOriginal && opt.preco != null) {
          let existing = opcoesMap.get(baseName);
          if (!existing) {
              existing = { nome: baseName, precos: {} };
              opcoesMap.set(baseName, existing);
          }
          if (!existing.precos) existing.precos = {};
          existing.precos[foundSizeOriginal] = opt.preco;
      } else {
          opcoesMap.set(opt.nome, { ...opt });
      }
  });

  const opcoesNorm = Array.from(opcoesMap.values());

  const optObj = opcaoInterna ? opcoesNorm.find(o => o.nome === opcaoInterna) : undefined;
  const precosEspecificos = optObj?.precos || {};
  const hasPrecosEspecificos = Object.keys(precosEspecificos).length > 0;

  // Calcula preço a exibir em tempo real
  const precoOpcao = optObj?.preco;
  const precoVariacao = variacaoInterna ? (precosEspecificos[variacaoInterna.nome] ?? variacaoInterna.valor) : undefined;
  
  // Regra: preco da variação > preco do sabor > preco base
  const precoFinal = precoVariacao ?? precoOpcao ?? produtoParaVariacao.preco;
  
  const missingOpcao = produtoParaVariacao.tem_opcoes && opcoesNorm.length > 0 && !opcaoInterna;
  // Se o sabor selecionado já tem preço próprio E não tem preços por variação, a porção é dispensada
  const missingVariacao = produtoParaVariacao.tem_variacoes && !variacaoInterna && (precoOpcao == null || hasPrecosEspecificos);
  const canAdd = !missingOpcao && !missingVariacao;

  // Ordem dos passos: sabores primeiro, porções depois
  const stepSabor = 1
  const stepPorcao = produtoParaVariacao.tem_opcoes ? 2 : 1

  return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-orange-500/20 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh]">
              {/* Imagem do Cabeçalho */}
              <div className="relative h-36 flex-shrink-0">
                  <img 
                      src={produtoParaVariacao.imagem_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300'} 
                      alt={produtoParaVariacao.nome}
                      className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                  <button 
                      onClick={() => {
                          setProdutoParaVariacao(null)
                          setVariacaoInterna(null)
                          setOpcaoInterna(null)
                      }}
                      className="absolute top-3 right-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)] hover:bg-orange-600 transition-colors z-10"
                  >
                      <X size={18} />
                  </button>
                  <div className="absolute bottom-3 left-5 right-5">
                      <h3 className="text-lg font-bold text-white leading-tight">{produtoParaVariacao.nome}</h3>
                      {produtoParaVariacao.descricao && (
                          <p className="text-[11px] text-neutral-400 line-clamp-1 italic mt-0.5">
                              {produtoParaVariacao.descricao}
                          </p>
                      )}
                  </div>
              </div>
              
              {/* Corpo com scroll */}
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">

                  {/* ── SABORES (sempre primeiro) ── */}
                  {produtoParaVariacao.tem_opcoes && opcoesNorm.length > 0 && (
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <p className="text-[11px] font-black text-purple-400 uppercase tracking-widest">{stepSabor}. Escolha o Sabor</p>
                              {missingOpcao && <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full animate-pulse font-bold">Obrigatório</span>}
                              {opcaoInterna && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">✓ {opcaoInterna}</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 items-start">
                              {opcoesNorm.map((opcao) => (
                                  <button
                                      key={opcao.nome}
                                      onClick={() => {
                                          setOpcaoInterna(opcao.nome)
                                          setTimeout(() => {
                                              document.getElementById('online-sessao-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                          }, 100);
                                      }}
                                      className={`flex flex-col items-start rounded-2xl border text-left transition-all active:scale-95 ${
                                          opcao.preco != null ? 'p-3' : 'py-2 px-3'
                                      } ${
                                          opcaoInterna === opcao.nome 
                                              ? 'bg-purple-600/20 border-purple-400 ring-1 ring-purple-500' 
                                              : 'bg-neutral-800/50 border-neutral-700 hover:border-purple-500/40'
                                      }`}
                                  >
                                      <div className="flex items-center gap-2 w-full">
                                          <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                                              opcaoInterna === opcao.nome ? 'border-purple-400 bg-purple-500' : 'border-neutral-500'
                                          }`}>
                                              {opcaoInterna === opcao.nome && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                          </div>
                                          <span className={`text-sm font-bold leading-tight ${
                                              opcaoInterna === opcao.nome ? 'text-white' : 'text-neutral-300'
                                          }`}>{opcao.nome}</span>
                                      </div>
                                      {opcao.preco != null && !opcao.precos && (
                                          <div className={`mt-2 ml-5 px-2 py-0.5 rounded-md text-[10px] font-black tracking-tighter w-fit shadow-lg ${
                                              opcaoInterna === opcao.nome 
                                                  ? 'bg-purple-500 text-white animate-pulse' 
                                                  : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                          }`}>
                                              R$ {Number(opcao.preco).toFixed(2).replace('.', ',')}
                                          </div>
                                      )}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* ── PORÇÕES / TAMANHOS — só exibe se o sabor não tem preço próprio, ou se tiver config "precos" ── */}
                  {produtoParaVariacao.tem_variacoes && produtoParaVariacao.variacoes_preco && (precoOpcao == null || hasPrecosEspecificos) && (
                      <div id="online-sessao-2" className="space-y-3 scroll-mt-4">
                          <div className="flex items-center justify-between">
                              <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest">{stepPorcao}. Escolha a Porção</p>
                              {missingVariacao && <span className="text-[9px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full animate-pulse font-bold">Obrigatório</span>}
                          </div>
                          <div className="flex flex-col gap-2">
                              {produtoParaVariacao.variacoes_preco.map((v) => {
                                  const precoV = precosEspecificos[v.nome] ?? v.valor;
                                  return (
                                  <button
                                      key={v.id}
                                      onClick={() => setVariacaoInterna(v)}
                                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                                          variacaoInterna?.id === v.id 
                                              ? 'bg-orange-600/20 border-orange-500 ring-1 ring-orange-500' 
                                              : 'bg-neutral-800/40 border-neutral-700 hover:border-neutral-500'
                                      }`}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                              variacaoInterna?.id === v.id ? 'border-orange-500 bg-orange-500' : 'border-neutral-500'
                                          }`}>
                                              {variacaoInterna?.id === v.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                          </div>
                                          <span className={`text-sm font-bold ${
                                              variacaoInterna?.id === v.id ? 'text-white' : 'text-neutral-300'
                                          }`}>{v.nome}</span>
                                      </div>
                                      <span className="text-sm font-black text-orange-500">R$ {Number(precoV).toFixed(2).replace('.', ',')}</span>
                                  </button>
                                  )
                              })}
                          </div>
                      </div>
                  )}
              </div>

              {/* Botão de Adicionar com preview de preço */}
              <div className="px-5 pb-5 pt-3 bg-neutral-900 border-t border-neutral-800 flex flex-col gap-2">
                  {/* Preview de preço */}
                  {canAdd && (
                      <div className="flex items-center justify-between bg-neutral-800/60 rounded-xl px-4 py-2">
                          <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Total por item</span>
                          <span className="text-lg font-black text-orange-400">R$ {Number(precoFinal).toFixed(2).replace('.', ',')}</span>
                      </div>
                  )}
                  <button
                      disabled={!canAdd}
                      onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          triggerCartAnimation(produtoParaVariacao.imagem_url || '', rect.left + rect.width / 2, rect.top + rect.height/2);
                          
                          // Passa o preço correto já calculado
                          const variacaoFinal = variacaoInterna 
                              ? { ...variacaoInterna, valor: precoVariacao! }
                              : (precoOpcao != null ? { id: 'opcao', nome: '', valor: precoOpcao } : undefined);
                          
                          onAddToCart(
                              { ...produtoParaVariacao, preco: precoFinal },
                              variacaoInterna ? { ...variacaoInterna, valor: precoFinal } : undefined,
                              opcaoInterna || undefined,
                              e
                          );
                          
                          // Não fecha o modal, apenas reseta a seleção
                          setVariacaoInterna(null);
                          setOpcaoInterna(null);
                      }}
                      className={`w-full py-3.5 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-xl ${
                          !canAdd
                              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-700'
                              : 'bg-gradient-to-r from-orange-600 to-orange-500 text-white active:scale-[0.97]'
                      }`}
                  >
                      <Plus size={18} strokeWidth={3} />
                      {canAdd ? 'Adicionar ao Carrinho' : (missingOpcao ? 'Escolha o Sabor' : 'Escolha a Porção')}
                  </button>
              </div>
          </div>
      </div>
  )
}
