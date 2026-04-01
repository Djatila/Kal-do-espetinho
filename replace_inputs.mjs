import fs from 'fs';

const p = 'app/(dashboard)/dashboard/pdv/page.tsx';
let txt = fs.readFileSync(p, 'utf-8');

const normalize = str => str.replace(/\r\n/g, '\n');
let normalizedTxt = normalize(txt);

const t1 = `                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Nome do Cliente"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                    />`;

const r1 = `                    <div className="relative w-full">
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
                                        <div className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5">{c.telefone}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>`;

normalizedTxt = normalizedTxt.replace(normalize(t1), normalize(r1));


const t2 = `                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Nome do Cliente"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                        />`;

const r2 = `                        <div className="relative w-full">
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
                                            <div className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5">{c.telefone}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>`;

normalizedTxt = normalizedTxt.replace(normalize(t2), normalize(r2));

fs.writeFileSync(p, normalizedTxt, 'utf-8');
console.log('Feito.');
