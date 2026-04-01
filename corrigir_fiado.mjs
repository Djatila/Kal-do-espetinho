import fs from 'fs';

const path = 'app/(dashboard)/dashboard/pdv/page.tsx';
let txt = fs.readFileSync(path, 'utf-8');

txt = txt.replace(/'fiado'/g, "'pagamento_posterior'");
txt = txt.replace(/clientePermiteFiado/g, "clientePermiteFiado"); // Keep same state variable name

fs.writeFileSync(path, txt, 'utf-8');
console.log('Script de correcao do Pagamento Posterior executado');
