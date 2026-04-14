import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacidadePage() {
  return (
    <div className="kal-bg min-h-screen text-neutral-200 font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-neutral-900 border border-orange-500/20 rounded-2xl p-6 sm:p-10 shadow-lg">
        
        {/* Botão Voltar */}
        <Link href="/cardapio" className="inline-flex items-center text-orange-500 hover:text-orange-400 font-medium mb-8 transition-colors">
          <ChevronLeft size={20} />
          Voltar para o Cardápio
        </Link>
        
        <h1 className="text-3xl font-display font-bold text-white mb-2">POLÍTICA DE PRIVACIDADE – KAL DO ESPETINHO</h1>
        <p className="text-sm text-neutral-400 mb-8 border-b border-neutral-800 pb-4">Última atualização: 14/04/2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
          <p>Esta Política de Privacidade descreve como coletamos, utilizamos e protegemos os dados dos usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">1. DADOS COLETADOS</h2>
            <p className="mb-2">Podemos coletar os seguintes dados:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Nome</li>
              <li>Telefone</li>
              <li>Endereço</li>
              <li>Informações de pedidos</li>
              <li>Dados de navegação (cookies)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">2. FINALIDADE DO USO DOS DADOS</h2>
            <p className="mb-2">Os dados são utilizados para:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Processar pedidos</li>
              <li>Entrar em contato com o cliente</li>
              <li>Melhorar a experiência do usuário</li>
              <li>Garantir a segurança da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">3. COMPARTILHAMENTO DE DADOS</h2>
            <p className="mb-2"><strong className="text-white">Não vendemos dados pessoais.</strong> Os dados podem ser compartilhados com:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Serviços de pagamento (ex: Pix, operadoras de cartão)</li>
              <li>Serviços de hospedagem e tecnologia</li>
              <li>Autoridades legais, quando exigido por lei</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">4. ARMAZENAMENTO E SEGURANÇA</h2>
            <p>Adotamos medidas para proteger os dados dos usuários, porém nenhum sistema é totalmente seguro.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">5. USO DE COOKIES</h2>
            <p className="mb-2">Utilizamos cookies para:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Melhorar a navegação</li>
              <li>Entender o comportamento do usuário</li>
            </ul>
            <p className="mt-2 text-neutral-400 italic">O usuário pode desativar cookies no navegador.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">6. DIREITOS DO USUÁRIO</h2>
            <p className="mb-2">O usuário pode, a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>Solicitar acesso aos seus dados</li>
              <li>Corrigir informações incorretas</li>
              <li>Solicitar exclusão dos dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">7. RETENÇÃO DE DADOS</h2>
            <p>Os dados serão mantidos pelo tempo necessário para cumprir as finalidades descritas ou conforme exigido por lei.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">8. ALTERAÇÕES NA POLÍTICA</h2>
            <p>Esta política pode ser atualizada periodicamente.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-orange-500 mb-2">9. CONTATO</h2>
            <p>Para dúvidas ou solicitações:<br />Email: <a href="mailto:kaldoespetinho@hotmail.com" className="text-orange-400 hover:text-orange-300 transition-colors">kaldoespetinho@hotmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
