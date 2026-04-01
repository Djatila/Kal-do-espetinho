import fs from 'fs';

const filePath = 'app/(dashboard)/dashboard/pdv/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Find the mobile payment area block and replace it
const oldBlock = /\/\* Mobile Payment Area \*\/[\s\S]*?<\/div>\n\s*<\/div>/;

const newBlock = `/* Mobile Payment Area */
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
                                            : \`R$ \${clienteCreditoDisponivel.toFixed(2)} disponível — faltam R$ \${(total - clienteCreditoDisponivel).toFixed(2)}\`
                                        }
                                    </span>
                                </div>
                            )}

                            {/* Pílulas de pagamento principal */}
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

                            {/* Split Mobile: quando Pagar Depois E crédito < total */}
                            {metodoPagamento === 'pagamento_posterior'
                                && clienteCreditoDisponivel !== null
                                && clienteCreditoDisponivel !== Infinity
                                && clienteCreditoDisponivel < total && (
                                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#131313', borderRadius: '10px', border: '1px solid #3f3f46' }}>
                                    <p style={{ fontSize: '0.68rem', color: '#a1a1aa', marginBottom: '8px', lineHeight: 1.4 }}>
                                        Fiado cobre <strong style={{ color: '#4ade80' }}>R$ {clienteCreditoDisponivel.toFixed(2)}</strong>. Escolha como pagar os outros <strong style={{ color: '#f97316' }}>R$ {(total - clienteCreditoDisponivel).toFixed(2)}</strong>:
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
                    </div>`;

// Use line-based replacement — find the start and end markers
const lines = content.split('\n');
let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('/* Mobile Payment Area */') && startIdx === -1) startIdx = i;
    if (startIdx !== -1 && lines[i].trim() === '</div>' && i > startIdx + 5) {
        // Look for the closing div of the payment area (2 levels up)
        endIdx = i;
        // check next line is also </div> - that closes the outer flex-col
        if (i + 1 < lines.length && lines[i+1].trim() === '</div>') {
            break;
        }
    }
}

console.log(`Found mobile payment area: lines ${startIdx+1} to ${endIdx+1}`);

if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock.split('\n'));
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log('Mobile Payment Area rebuilt successfully!');
} else {
    console.error('Could not locate Mobile Payment Area block');
}
