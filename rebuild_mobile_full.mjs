import fs from 'fs';

const filePath = 'app/(dashboard)/dashboard/pdv/page.tsx';
let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// Find line with "Mobile: lista de itens" (start of mobile section)
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Mobile: lista de itens + total + finalizar')) {
        startLine = i - 1; // include the {comanda.length > 0 && ( line
        break;
    }
}

// Find the second {comanda.length === 0 && ( block (end marker)
let endLine = -1;
for (let i = startLine + 1; i < lines.length; i++) {
    if (lines[i].includes('LEFT COLUMN: Menu, Search, Tabs')) {
        endLine = i - 2; // stop before the blank line + LEFT COLUMN comment
        break;
    }
}

console.log(`Mobile section: lines ${startLine+1} to ${endLine+1}`);

const newMobileSection = `                {/* Mobile: lista de itens + total + finalizar */}
                {comanda.length > 0 && (
                    <div className="flex flex-col gap-1 bg-zinc-800/80 rounded-xl px-3 py-2 border border-white/10 lg:hidden">
                        {comanda.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400 w-6 shrink-0">{item.quantidade}x</span>
                                <span className="text-white flex-1 truncate">
                                    {item.nome}
                                    <span className="text-zinc-500 text-[10px] ml-1">(R$ {item.preco.toFixed(0)})</span>
                                </span>
                                <span className="text-white font-semibold ml-2 shrink-0">R$ {(item.preco * item.quantidade).toFixed(0)}</span>
                            </div>
                        ))}

                        {/* Total + Botão Finalizar */}
                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/10">
                            <span className="text-orange-400 font-bold text-base">Total: R$ {total.toFixed(0)}</span>
                            <button
                                onClick={finalizarPedido}
                                disabled={enviando}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-1.5 rounded-lg transition active:scale-95"
                            >
                                {enviando ? 'Enviando...' : 'Finalizar ✓'}
                            </button>
                        </div>

                        {/* Mobile Payment Area */}
                        <div className="mt-2 pt-2 border-t border-white/10">

                            {/* Indicador sutil de crédito */}
                            {clientePermiteFiado && clienteCreditoDisponivel !== null && (
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '5px 10px', marginBottom: '8px', borderRadius: '8px', fontSize: '0.7rem',
                                    backgroundColor: clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#052e16' : '#2d1010',
                                    border: \`1px solid \${clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#166534' : '#7f1d1d'}\`
                                }}>
                                    <span style={{ color: '#a1a1aa' }}>Crédito:</span>
                                    <span style={{ fontWeight: 600, color: clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#4ade80' : '#f87171' }}>
                                        {clienteCreditoDisponivel === Infinity
                                            ? 'Ilimitado ✓'
                                            : clienteCreditoDisponivel >= total
                                            ? \`R$ \${clienteCreditoDisponivel.toFixed(2)} disponível ✓\`
                                            : \`R$ \${clienteCreditoDisponivel.toFixed(2)} — faltam R$ \${(total - clienteCreditoDisponivel).toFixed(2)}\`
                                        }
                                    </span>
                                </div>
                            )}

                            {/* Pílulas de pagamento */}
                            <div className="flex gap-2 w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                <button onClick={() => setMetodoPagamento('pix')} className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap \${metodoPagamento === 'pix' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}\`}>Pix</button>
                                <button onClick={() => setMetodoPagamento('cartao')} className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap \${metodoPagamento === 'cartao' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}\`}>Cartão</button>
                                <button onClick={() => setMetodoPagamento('dinheiro')} className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap \${metodoPagamento === 'dinheiro' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}\`}>Dinheiro</button>
                                {clientePermiteFiado && (
                                    <button
                                        onClick={() => { setMetodoPagamento('pagamento_posterior'); setSplitMetodo(null) }}
                                        className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap font-bold \${metodoPagamento === 'pagamento_posterior' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-emerald-500'}\`}
                                    >Pagar Depois</button>
                                )}
                            </div>

                            {metodoPagamento === 'dinheiro' && (
                                <div className="mt-2 text-xs text-white/80">
                                    <label><input type="checkbox" checked={precisaTroco} onChange={(e) => setPrecisaTroco(e.target.checked)} className="mr-1 accent-orange-500" />Precisa de troco?</label>
                                    {precisaTroco && <input type="text" placeholder="Troco para... " value={trocoPara} onChange={(e) => setTrocoPara(e.target.value)} className="w-full mt-1 bg-black/30 border border-white/10 rounded px-2 py-1 outline-none text-white focus:border-orange-500" />}
                                </div>
                            )}

                            {/* Split Mobile: crédito insuficiente → escolha como pagar o restante */}
                            {metodoPagamento === 'pagamento_posterior'
                                && clienteCreditoDisponivel !== null
                                && clienteCreditoDisponivel !== Infinity
                                && clienteCreditoDisponivel < total && (
                                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#131313', borderRadius: '10px', border: '1px solid #3f3f46' }}>
                                    <p style={{ fontSize: '0.68rem', color: '#a1a1aa', marginBottom: '8px', lineHeight: 1.4 }}>
                                        Fiado cobre <strong style={{ color: '#4ade80' }}>R$ {clienteCreditoDisponivel.toFixed(2)}</strong>. Pague os outros <strong style={{ color: '#f97316' }}>R$ {(total - clienteCreditoDisponivel).toFixed(2)}</strong> com:
                                    </p>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {(['pix', 'cartao', 'dinheiro'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setSplitMetodo(m)}
                                                style={{
                                                    padding: '5px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                                                    border: splitMetodo === m ? '1px solid #f97316' : '1px solid #3f3f46',
                                                    backgroundColor: splitMetodo === m ? '#431407' : '#1a1a1a',
                                                    color: splitMetodo === m ? '#fb923c' : '#a1a1aa',
                                                }}
                                            >
                                                {m === 'pix' ? '⚡ Pix' : m === 'cartao' ? 'Cartão' : 'Dinheiro'}
                                            </button>
                                        ))}
                                    </div>
                                    {splitMetodo && (
                                        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#71717a' }}>
                                            <span>Fiado: R$ {clienteCreditoDisponivel.toFixed(2)}</span>
                                            <span>{splitMetodo === 'pix' ? 'Pix' : splitMetodo === 'cartao' ? 'Cartão' : 'Dinheiro'}: R$ {(total - clienteCreditoDisponivel).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                )}
                {comanda.length === 0 && (
                    <div className="flex items-center justify-between gap-2 bg-zinc-800/50 rounded-xl px-3 py-2 border border-white/10 lg:hidden">
                        <span className="text-zinc-500 text-sm italic">Nenhum item adicionado</span>
                        <button
                            disabled
                            className="bg-orange-500 opacity-40 cursor-not-allowed text-white font-bold text-sm px-4 py-1.5 rounded-lg"
                        >
                            Finalizar ✓
                        </button>
                    </div>
                )}`;

// Replace the section
lines.splice(startLine, endLine - startLine + 1, ...newMobileSection.split('\n'));

fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log('Mobile section fully rebuilt! Lines replaced:', endLine - startLine + 1, 'with', newMobileSection.split('\n').length);
