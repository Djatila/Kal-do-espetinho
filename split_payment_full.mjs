import fs from 'fs';

const filePath = 'app/(dashboard)/dashboard/pdv/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// ============================================================
// 1. STATES: Add valorPrimarioInput, valorSecundarioInput
//    and update splitMetodo type to include pagamento_posterior
// ============================================================
content = content.replace(
    `const [splitMetodo, setSplitMetodo] = useState<'pix' | 'cartao' | 'dinheiro' | null>(null)`,
    `const [splitMetodo, setSplitMetodo] = useState<'pix' | 'cartao' | 'dinheiro' | 'pagamento_posterior' | null>(null)
    const [valorPrimarioInput, setValorPrimarioInput] = useState<string>('')
    const [valorSecundarioInput, setValorSecundarioInput] = useState<string>('')`
);

// ============================================================
// 2. ADD toggleMetodo FUNCTION after selecionarClienteSugestao
// ============================================================
const toggleFn = `
    // Lida com seleção/deselecão de modalidades de pagamento (multi-select de até 2)
    const toggleMetodo = (metodo: 'pix' | 'cartao' | 'dinheiro' | 'pagamento_posterior') => {
        if (metodo === 'pagamento_posterior' && !clientePermiteFiado) return
        
        if (metodoPagamento === metodo) {
            // Desseleciona primário: se há secundário, promove-o
            if (splitMetodo) {
                setMetodoPagamento(splitMetodo as typeof metodoPagamento)
                setSplitMetodo(null)
                setValorPrimarioInput('')
                setValorSecundarioInput('')
            } else {
                setMetodoPagamento(null)
            }
        } else if (splitMetodo === metodo) {
            // Desseleciona secundário
            setSplitMetodo(null)
            setValorPrimarioInput('')
            setValorSecundarioInput('')
        } else if (!metodoPagamento) {
            // Sem primário: define este como primário
            setMetodoPagamento(metodo)
            setValorPrimarioInput('')
            setValorSecundarioInput('')
        } else {
            // Já tem primário → define como secundário e pré-divide os valores
            setSplitMetodo(metodo)
            // Preencher com base no crédito (se fiado envolvido) ou 50/50
            const isPrFiado = metodoPagamento === 'pagamento_posterior'
            const isSecFiado = metodo === 'pagamento_posterior'
            const temCredito = clienteCreditoDisponivel !== null && clienteCreditoDisponivel !== Infinity
            
            if ((isPrFiado || isSecFiado) && temCredito && clienteCreditoDisponivel! < total) {
                const credito = clienteCreditoDisponivel!
                if (isPrFiado) {
                    setValorPrimarioInput(credito.toFixed(2))
                    setValorSecundarioInput((total - credito).toFixed(2))
                } else {
                    setValorSecundarioInput(credito.toFixed(2))
                    setValorPrimarioInput((total - credito).toFixed(2))
                }
            } else {
                const metade = (total / 2).toFixed(2)
                setValorPrimarioInput(metade)
                setValorSecundarioInput((total - parseFloat(metade)).toFixed(2))
            }
        }
    }

`;

// Insert after selecionarClienteSugestao function closing brace
const markerAfterSelecionarCliente = `        setMostrarSugestoes(false)
    }

`;
content = content.replace(markerAfterSelecionarCliente, markerAfterSelecionarCliente + toggleFn);

// ============================================================
// 3. UPDATE selecionarClienteSugestao: reset split inputs
// ============================================================
content = content.replace(
    `        setSplitMetodo(null)
        setMostrarSugestoes(false)
    }`,
    `        setSplitMetodo(null)
        setValorPrimarioInput('')
        setValorSecundarioInput('')
        setMostrarSugestoes(false)
    }`
);

// ============================================================
// 4. UPDATE finalizarPedido: remove old split validation, add new
// ============================================================
// Remove old precisaSplit check
content = content.replace(
    `        // Validar split: se crédito não cobre tudo, exige método secundário
        const precisaSplit = metodoPagamento === 'pagamento_posterior'
            && clienteCreditoDisponivel !== null
            && clienteCreditoDisponivel !== Infinity
            && clienteCreditoDisponivel < total
        if (precisaSplit && !splitMetodo) {
            showToast('error', 'Atenção', 'Selecione como pagar o restante além do crédito')
            return
        }

        setEnviando(true)`,
    `        // Validar e preparar split de pagamento
        const splitAtivo = splitMetodo !== null
        if (splitAtivo) {
            const vp = parseFloat(valorPrimarioInput.replace(',', '.')) || 0
            const vs = parseFloat(valorSecundarioInput.replace(',', '.')) || 0
            const soma = parseFloat((vp + vs).toFixed(2))
            if (Math.abs(soma - total) > 0.01) {
                showToast('error', 'Atenção', \`A soma dos pagamentos (R$ \${soma.toFixed(2)}) deve ser igual ao total (R$ \${total.toFixed(2)})\`)
                return
            }
        } else if (metodoPagamento === 'pagamento_posterior'
            && clienteCreditoDisponivel !== null
            && clienteCreditoDisponivel !== Infinity
            && clienteCreditoDisponivel < total) {
            showToast('error', 'Atenção', 'Selecione como pagar o restante além do crédito disponível')
            return
        }

        setEnviando(true)`
);

// ============================================================
// 5. UPDATE finalizarPedido: payment value calculation
// ============================================================
content = content.replace(
    `        // Calcular divisão de pagamento
        let valorPrincipal: number | null = null
        let valorSecundario: number | null = null
        let metodoSecundario: string | null = null
        
        if (metodoPagamento === 'pagamento_posterior' && clienteCreditoDisponivel !== null) {
            if (clienteCreditoDisponivel === Infinity) {
                // Limite ilimitado: tudo vai como fiado
                valorPrincipal = total
            } else if (clienteCreditoDisponivel >= total) {
                // Crédito cobre tudo
                valorPrincipal = total
            } else {
                // Split: parte no fiado, parte no método secundário
                valorPrincipal = clienteCreditoDisponivel
                valorSecundario = parseFloat((total - clienteCreditoDisponivel).toFixed(2))
                metodoSecundario = splitMetodo
            }
        }`,
    `        // Calcular divisão de pagamento (suporta qualquer combinação de 2 métodos)
        let valorPrincipal: number | null = null
        let valorSecundario: number | null = null
        let metodoSecundario: string | null = null
        
        if (splitMetodo) {
            // Split livre entre dois métodos
            valorPrincipal = parseFloat(valorPrimarioInput.replace(',', '.')) || total
            valorSecundario = parseFloat(valorSecundarioInput.replace(',', '.')) || 0
            metodoSecundario = splitMetodo
        } else if (metodoPagamento === 'pagamento_posterior' && clienteCreditoDisponivel !== null) {
            // Fiado sem split: registra o valor integral no pagamento principal
            valorPrincipal = clienteCreditoDisponivel === Infinity ? total : Math.min(clienteCreditoDisponivel, total)
        }`
);

// ============================================================
// 6. UPDATE reset after success: add input resets
// ============================================================
content = content.replace(
    `            setClientePermiteFiado(false)
            setClienteCreditoDisponivel(null)
            setClienteLimiteTotal(null)
            setSplitMetodo(null)`,
    `            setClientePermiteFiado(false)
            setClienteCreditoDisponivel(null)
            setClienteLimiteTotal(null)
            setSplitMetodo(null)
            setValorPrimarioInput('')
            setValorSecundarioInput('')`
);

// ============================================================
// 7. REWRITE Mobile Payment Area
// ============================================================
const oldMobilePayment = `                        {/* Mobile Payment Area */}
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

                        </div>`;

const newMobilePayment = `                        {/* Mobile Payment Area */}
                        <div className="mt-2 pt-2 border-t border-white/10">

                            {/* Indicador de crédito */}
                            {clientePermiteFiado && clienteCreditoDisponivel !== null && (
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '5px 10px', marginBottom: '8px', borderRadius: '8px', fontSize: '0.68rem',
                                    backgroundColor: clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#052e16' : '#2d1010',
                                    border: \`1px solid \${clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#166534' : '#7f1d1d'}\`
                                }}>
                                    <span style={{ color: '#a1a1aa' }}>💳 Crédito:</span>
                                    <span style={{ fontWeight: 600, color: clienteCreditoDisponivel === Infinity || clienteCreditoDisponivel >= total ? '#4ade80' : '#f87171' }}>
                                        {clienteCreditoDisponivel === Infinity ? 'Ilimitado ✓'
                                            : clienteCreditoDisponivel >= total ? \`R$ \${clienteCreditoDisponivel.toFixed(2)} ✓\`
                                            : \`R$ \${clienteCreditoDisponivel.toFixed(2)} — faltam R$ \${(total - clienteCreditoDisponivel).toFixed(2)}\`}
                                    </span>
                                </div>
                            )}

                            {/* Pílulas multi-select (até 2 métodos) */}
                            <p style={{ fontSize: '0.62rem', color: '#71717a', marginBottom: '5px' }}>Toque para selecionar até 2 formas de pagamento:</p>
                            <div className="flex gap-2 w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                {(['pix', 'cartao', 'dinheiro'] as const).map(m => {
                                    const isPrimary = metodoPagamento === m
                                    const isSplit = splitMetodo === m
                                    const isActive = isPrimary || isSplit
                                    return (
                                        <button key={m} onClick={() => toggleMetodo(m)}
                                            className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap font-semibold transition-all \${isActive ? 'bg-orange-600 text-white ring-1 ring-orange-400' : 'bg-zinc-800 text-zinc-400'}\`}>
                                            {m === 'pix' ? '⚡ Pix' : m === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}
                                            {isSplit && <span className="ml-1 text-orange-300">2º</span>}
                                        </button>
                                    )
                                })}
                                {clientePermiteFiado && (
                                    <button onClick={() => toggleMetodo('pagamento_posterior')}
                                        className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap font-bold transition-all \${metodoPagamento === 'pagamento_posterior' || splitMetodo === 'pagamento_posterior' ? 'bg-emerald-600 text-white ring-1 ring-emerald-400' : 'bg-zinc-800 text-emerald-500'}\`}>
                                        Fiado
                                        {splitMetodo === 'pagamento_posterior' && <span className="ml-1 text-emerald-300">2º</span>}
                                    </button>
                                )}
                            </div>

                            {/* Inputs de valor quando 2 métodos selecionados */}
                            {splitMetodo && metodoPagamento && (
                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#131313', borderRadius: '10px', border: '1px solid #3f3f46' }}>
                                    <p style={{ fontSize: '0.65rem', color: '#a1a1aa', marginBottom: '8px' }}>
                                        Defina o valor de cada forma de pagamento <span style={{ color: '#f97316' }}>(Total: R$ {total.toFixed(2)})</span>
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#a1a1aa', width: '70px', flexShrink: 0 }}>
                                                {metodoPagamento === 'pix' ? '⚡ Pix' : metodoPagamento === 'cartao' ? '💳 Cartão' : metodoPagamento === 'dinheiro' ? '💵 Dinheiro' : '🤝 Fiado'}:
                                            </span>
                                            <input
                                                type="number" inputMode="decimal" placeholder="R$ 0,00"
                                                value={valorPrimarioInput}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    setValorPrimarioInput(v)
                                                    const parsed = parseFloat(v.replace(',', '.')) || 0
                                                    setValorSecundarioInput(Math.max(0, total - parsed).toFixed(2))
                                                }}
                                                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #3f3f46', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#a1a1aa', width: '70px', flexShrink: 0 }}>
                                                {splitMetodo === 'pix' ? '⚡ Pix' : splitMetodo === 'cartao' ? '💳 Cartão' : splitMetodo === 'dinheiro' ? '💵 Dinheiro' : '🤝 Fiado'}:
                                            </span>
                                            <input
                                                type="number" inputMode="decimal" placeholder="R$ 0,00"
                                                value={valorSecundarioInput}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    setValorSecundarioInput(v)
                                                    const parsed = parseFloat(v.replace(',', '.')) || 0
                                                    setValorPrimarioInput(Math.max(0, total - parsed).toFixed(2))
                                                }}
                                                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #3f3f46', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    {/* Indicador de soma */}
                                    {(() => {
                                        const soma = (parseFloat(valorPrimarioInput || '0') + parseFloat(valorSecundarioInput || '0'))
                                        const diff = parseFloat((total - soma).toFixed(2))
                                        if (Math.abs(diff) < 0.01) return (
                                            <p style={{ marginTop: '6px', fontSize: '0.65rem', color: '#4ade80' }}>✓ Soma correta: R$ {soma.toFixed(2)}</p>
                                        )
                                        return (
                                            <p style={{ marginTop: '6px', fontSize: '0.65rem', color: diff > 0 ? '#f97316' : '#f87171' }}>
                                                {diff > 0 ? \`Faltam R$ \${diff.toFixed(2)}\` : \`Excede R$ \${Math.abs(diff).toFixed(2)}\`}
                                            </p>
                                        )
                                    })()}
                                </div>
                            )}

                            {(metodoPagamento === 'dinheiro' || splitMetodo === 'dinheiro') && (
                                <div className="mt-2 text-xs text-white/80">
                                    <label><input type="checkbox" checked={precisaTroco} onChange={(e) => setPrecisaTroco(e.target.checked)} className="mr-1 accent-orange-500" />Precisa de troco?</label>
                                    {precisaTroco && <input type="text" placeholder="Troco para... " value={trocoPara} onChange={(e) => setTrocoPara(e.target.value)} className="w-full mt-1 bg-black/30 border border-white/10 rounded px-2 py-1 outline-none text-white focus:border-orange-500" />}
                                </div>
                            )}

                        </div>`;

if (content.includes(oldMobilePayment)) {
    content = content.replace(oldMobilePayment, newMobilePayment);
    console.log('✓ Mobile Payment Area rebuilt');
} else {
    console.error('✗ Mobile Payment Area not found! Check for differences.');
    process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ All changes applied successfully!');
