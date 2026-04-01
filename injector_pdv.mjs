import fs from 'fs';

const p = 'app/(dashboard)/dashboard/pdv/page.tsx';
let txt = fs.readFileSync(p, 'utf-8');

const normalize = str => str.replace(/\r\n/g, '\n');
let modifiedTxt = normalize(txt);

// 1. Injetar a interface ClienteSugerido se não existir
if (!modifiedTxt.includes('interface ClienteSugerido')) {
    const intTarget = `interface Mesa {
    id: string
    numero_mesa: string
    status: 'livre' | 'ocupada' | 'em_atendimento'
    garcom_atual_nome?: string | null
    garcom_atual_id?: string | null
}`;
    const intRep = `interface Mesa {
    id: string
    numero_mesa: string
    status: 'livre' | 'ocupada' | 'em_atendimento'
    garcom_atual_nome?: string | null
    garcom_atual_id?: string | null
}

interface ClienteSugerido {
    id: string
    nome: string
    telefone: string
    limite_ilimitado?: boolean
    limite_credito?: number
    credito_utilizado?: number
}`;
    modifiedTxt = modifiedTxt.replace(normalize(intTarget), normalize(intRep));
}

// 2. Estados de Sugestões / Pagar Depois e metodo de pagamento custom
if (!modifiedTxt.includes('const [sugestoesClientes, setSugestoesClientes]')) {
    const stateTarget = `    const [telefone, setTelefone] = useState('')
    const [observacoes, setObservacoes] = useState('')
    const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao' | 'dinheiro' | null>('pix')`;
    
    const stateRep = `    const [telefone, setTelefone] = useState('')
    const [observacoes, setObservacoes] = useState('')

    // Estados Autocomplete e Crédito
    const [sugestoesClientes, setSugestoesClientes] = useState<ClienteSugerido[]>([])
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
    const [clientePermiteFiado, setClientePermiteFiado] = useState(false)

    const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao' | 'dinheiro' | 'fiado' | null>('pix')`;

    modifiedTxt = modifiedTxt.replace(normalize(stateTarget), normalize(stateRep));
}

// 3. Adicionar Lógica do useEffect e Selector
if (!modifiedTxt.includes('const selecionarClienteSugestao')) {
    const fxTarget = `    useEffect(() => {
        loadProdutos()`;
    
    const fxRep = `    useEffect(() => {
        let timeoutId: NodeJS.Timeout
        if (nomeCliente.length >= 2) {
            timeoutId = setTimeout(async () => {
                const { data, error } = await supabase
                    .from('clientes')
                    .select('id, nome, telefone, limite_credito, credito_utilizado, limite_ilimitado')
                    .ilike('nome', \`%\${nomeCliente}%\`)
                    .limit(5)
                
                if (!error && data) {
                    setSugestoesClientes(data as ClienteSugerido[])
                    setMostrarSugestoes(true)
                }
            }, 400)
        } else {
            setSugestoesClientes([])
            setMostrarSugestoes(false)
            setClientePermiteFiado(false)
            if (metodoPagamento === 'fiado') setMetodoPagamento('pix')
        }
        return () => clearTimeout(timeoutId)
    }, [nomeCliente])

    const selecionarClienteSugestao = (cliente: ClienteSugerido) => {
        setNomeCliente(cliente.nome)
        setTelefone(cliente.telefone)
        
        let podeFiado = false;
        if (cliente.limite_ilimitado) podeFiado = true;
        else if (cliente.limite_credito && cliente.credito_utilizado !== undefined) {
             if ((cliente.limite_credito - cliente.credito_utilizado) > 0) podeFiado = true;
        }
        setClientePermiteFiado(podeFiado)
        setMostrarSugestoes(false)
    }

    useEffect(() => {
        loadProdutos()`;
        
    modifiedTxt = modifiedTxt.replace(normalize(fxTarget), normalize(fxRep));
}

// 4. Inputs com Autocomplete 
const inputT1 = `                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Nome do Cliente"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                    />`;
const inputR1 = `                    <div className="relative w-full">
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Nome do Cliente"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                            onFocus={() => nomeCliente.length >= 2 && setMostrarSugestoes(true)}
                            onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                        />
                        {mostrarSugestoes && sugestoesClientes.length > 0 && (
                            <ul className={styles.suggestionsList}>
                                {sugestoesClientes.map(c => (
                                    <li key={c.id} onMouseDown={() => selecionarClienteSugestao(c)} className={styles.suggestionItem}>
                                        <div className="font-semibold text-white truncate leading-tight">{c.nome}</div>
                                        <div className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5">{c.telefone} {c.limite_ilimitado || (c.limite_credito && c.limite_credito - (c.credito_utilizado || 0) > 0) ? ' - Cliente VIP (Crédito)' : ''}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>`;

modifiedTxt = modifiedTxt.replace(normalize(inputT1), normalize(inputR1));

const inputT2 = `                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Nome do Cliente"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                        />`;
const inputR2 = `                        <div className="relative w-full">
                            <input
                                type="text"
                                className={styles.inputField}
                                placeholder="Nome do Cliente"
                                value={nomeCliente}
                                onChange={(e) => setNomeCliente(e.target.value)}
                                onFocus={() => nomeCliente.length >= 2 && setMostrarSugestoes(true)}
                                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                            />
                            {mostrarSugestoes && sugestoesClientes.length > 0 && (
                                <ul className={styles.suggestionsList}>
                                    {sugestoesClientes.map(c => (
                                        <li key={c.id} onMouseDown={() => selecionarClienteSugestao(c)} className={styles.suggestionItem}>
                                            <div className="font-semibold text-white truncate leading-tight">{c.nome}</div>
                                            <div className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5">{c.telefone} {c.limite_ilimitado || (c.limite_credito && c.limite_credito - (c.credito_utilizado || 0) > 0) ? ' - Cliente VIP (Crédito)' : ''}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>`;
modifiedTxt = modifiedTxt.replace(normalize(inputT2), normalize(inputR2));

// 5. Pagamentos Options
if (!modifiedTxt.includes("onClick={() => setMetodoPagamento('fiado')}")) {
    const payTarget = `                            <button
                                className={\`\${styles.paymentBtn} \${metodoPagamento === 'dinheiro' ? styles.paymentSelected : ''}\`}
                                onClick={() => setMetodoPagamento('dinheiro')}
                            >
                                {metodoPagamento === 'dinheiro' && <span className={styles.radioDot} />} Dinheiro
                            </button>`;
    
    const payRep = `                            <button
                                className={\`\${styles.paymentBtn} \${metodoPagamento === 'dinheiro' ? styles.paymentSelected : ''}\`}
                                onClick={() => setMetodoPagamento('dinheiro')}
                            >
                                {metodoPagamento === 'dinheiro' && <span className={styles.radioDot} />} Dinheiro
                            </button>
                            {clientePermiteFiado && (
                                <button
                                    className={\`\${styles.paymentBtn} \${metodoPagamento === 'fiado' ? styles.paymentSelected : ''}\`}
                                    onClick={() => setMetodoPagamento('fiado')}
                                    style={{ borderColor: metodoPagamento === 'fiado' ? '#10b981' : '#333', color: metodoPagamento === 'fiado' ? '#10b981' : '#a3a3a3' }}
                                >
                                    {metodoPagamento === 'fiado' && <span className={styles.radioDot} style={{ backgroundColor: '#10b981' }} />} Pagar Depois (Fiado)
                                </button>
                            )}`;
    modifiedTxt = modifiedTxt.replace(normalize(payTarget), normalize(payRep));
}

// Correção MOBILE UI (Sumir painel de pagamentos na frente do celular. Adicionar os seletores ao painel de Celular):
// Linha 520 (Mobile render):
if (modifiedTxt.includes('<!-- Mobile Payment Area -->') === false) {
    const mobileBottom = `                                onClick={finalizarPedido}
                                disabled={enviando}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-1.5 rounded-lg transition active:scale-95"
                            >
                                {enviando ? 'Enviando...' : 'Finalizar ✓'}
                            </button>
                        </div>
                    </div>
                )}`;
                
    const mobileBottomRep = `                                onClick={finalizarPedido}
                                disabled={enviando}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-1.5 rounded-lg transition active:scale-95"
                            >
                                {enviando ? 'Enviando...' : 'Finalizar ✓'}
                            </button>
                        </div>
                        {/* Mobile Payment Area */}
                        <div className="mt-2 pt-2 border-t border-white/10">
                             <div className="flex gap-2 w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                 <button onClick={() => setMetodoPagamento('pix')} className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap \${metodoPagamento === 'pix' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}\`}>Pix</button>
                                 <button onClick={() => setMetodoPagamento('cartao')} className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap \${metodoPagamento === 'cartao' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}\`}>Cartão</button>
                                 <button onClick={() => setMetodoPagamento('dinheiro')} className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap \${metodoPagamento === 'dinheiro' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}\`}>Dinheiro</button>
                                 {clientePermiteFiado && <button onClick={() => setMetodoPagamento('fiado')} className={\`px-3 py-1 text-xs rounded-full whitespace-nowrap font-bold \${metodoPagamento === 'fiado' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-emerald-500'}\`}>Pagar Depois</button>}
                             </div>
                             {metodoPagamento === 'dinheiro' && (
                                <div className="mt-2 text-xs text-white/80">
                                   <label><input type="checkbox" checked={precisaTroco} onChange={(e) => setPrecisaTroco(e.target.checked)} className="mr-1 accent-orange-500"/>Precisa de troco?</label>
                                   {precisaTroco && <input type="text" placeholder="Troco para... " value={trocoPara} onChange={(e) => setTrocoPara(e.target.value)} className="w-full mt-1 bg-black/30 border border-white/10 rounded px-2 py-1 outline-none text-white focus:border-orange-500" />}
                                </div>
                             )}
                        </div>
                    </div>
                )}`;
    modifiedTxt = modifiedTxt.replace(normalize(mobileBottom), normalize(mobileBottomRep));
}

fs.writeFileSync(p, modifiedTxt, 'utf-8');
console.log('Injector PDV Completado com sucesso!');
