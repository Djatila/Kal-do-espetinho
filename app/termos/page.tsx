import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermosPage() {
  return (
    <div className="kal-bg min-h-screen text-neutral-200 font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-neutral-900 border border-orange-500/20 rounded-2xl p-6 sm:p-10 shadow-lg">
        
        {/* Botão Voltar */}
        <Link href="/cardapio" className="inline-flex items-center text-orange-500 hover:text-orange-400 font-medium mb-8 transition-colors">
          <ChevronLeft size={20} />
          Voltar para o Cardápio
        </Link>
        
        <h1 className="text-3xl font-display font-bold text-white mb-2">TERMOS DE USO – KAL DO ESPETINHO</h1>
        <p className="text-sm text-neutral-400 mb-8 border-b border-neutral-800 pb-4">Última atualização: 14/04/2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
          <p>Bem-vindo ao Kal do Espetinho. Ao acessar ou utilizar nosso aplicativo web, você concorda com os presentes Termos de Uso.</p>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">1. SOBRE O SERVIÇO</h2>
            <p>O Kal do Espetinho é uma plataforma online destinada à divulgação e comercialização de produtos alimentícios, como espetinhos, bebidas e porções, permitindo que clientes realizem pedidos e interajam com o estabelecimento.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">2. ACEITAÇÃO DOS TERMOS</h2>
            <p>Ao utilizar a plataforma, o usuário declara ter lido, compreendido e aceitado estes termos.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">3. CADASTRO DO USUÁRIO</h2>
            <p className="mb-2">Para realizar pedidos, o usuário poderá fornecer informações como:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Nome</li>
              <li>Telefone</li>
              <li>Endereço (quando necessário)</li>
            </ul>
            <p className="mt-2 text-neutral-400 italic">O usuário se compromete a fornecer dados verdadeiros e atualizados.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">4. USO DA PLATAFORMA</h2>
            <p className="mb-2">O usuário concorda em:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Utilizar a plataforma de forma legal e respeitosa</li>
              <li>Não praticar fraudes ou atividades ilícitas</li>
              <li>Não prejudicar o funcionamento do sistema</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">5. PEDIDOS E PAGAMENTOS</h2>
            <p className="mb-2">Os pedidos realizados através da plataforma estão sujeitos à confirmação. As formas de pagamento serão informadas no momento da compra e podem incluir:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Dinheiro</li>
              <li>Pix</li>
              <li>Cartão (se disponível)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">6. CANCELAMENTOS</h2>
            <p>Pedidos podem ser cancelados dentro de um prazo razoável antes da preparação. Após o início do preparo, o cancelamento pode não ser possível.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">7. RESPONSABILIDADES</h2>
            <p className="mb-2">O Kal do Espetinho se compromete com a qualidade dos produtos, porém não se responsabiliza por:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Erros no preenchimento de dados pelo usuário</li>
              <li>Problemas causados por terceiros (internet, aplicativos de pagamento)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">8. PROPRIEDADE INTELECTUAL</h2>
            <p>Todo o conteúdo da plataforma (nome, marca, imagens, textos) pertence ao Kal do Espetinho e não pode ser utilizado sem autorização.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">9. ALTERAÇÕES DOS TERMOS</h2>
            <p>Estes termos podem ser atualizados a qualquer momento, sendo recomendada a revisão periódica.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">10. CONTATO</h2>
            <p>Em caso de dúvidas:<br />Email: <a href="mailto:kaldoespetinho@hotmail.com" className="text-orange-400 hover:text-orange-300 transition-colors">kaldoespetinho@hotmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
