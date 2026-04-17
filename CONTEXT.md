# 🧠 PROJETO: KAL DO ESPETINHO (FUSÃO KAL) - CONTEXTO

Este arquivo serve como Memória de Longo Prazo para situar o assistente IA sobre o estado do projeto, stack tecnológica e padrões estabelecidos.

---

## 🛠 Tech Stack
- **Core:** Next.js 14 (App Router), React 18, TypeScript.
- **Backend/DB:** Supabase (Auth, PostgreSQL, Realtime, SSR).
- **Styling:** Tailwind CSS + Vanilla CSS (Módulos).
- **IA:** Google Gemini SDK (`@google/genai`).
- **Relatórios:** jsPDF, jspdf-autotable, xlsx.
- **Dashboard:** Recharts.
- **Ícones:** Lucide React.
- **Deployment:** Vercel.

---

## 📂 Estrutura de Arquivos
- `/app`: Rotas principais (App Router).
  - `/cardapio`: Página pública do cardápio (atualmente monolítica).
  - `/(dashboard)`: Rotas protegidas do administrador.
  - `/api`: Endpoints de backend (ex: cancelamento, webhooks).
- `/_cardapio_kal_novo`: Componentes da nova versão do cardápio (Modularizado).
- `/components`: Componentes reutilizáveis (UI, Cliente, Layout).
- `/supabase`: Migrações SQL e definições de banco.
- `/services`: Lógica de serviços externos (ex: Gemini).
- `/utils`: Utils de Supabase, webhooks e helpers.
- `/types`: Definições de interfaces TypeScript globais.

---

## 🚀 Estado Atual
- **Cardápio Público:** Funcional com carrinho, sistema dual de cliente (Crédito/Informal) e suporte a complementos em tempo real.
- **Admin Dashboard:** Kanban de pedidos funcional, editor de produtos, gestão de promoções e configurações globais.
- **Realtime:** Implementado para novos pedidos (som de bip) e atualizações de status.
- **IA:** Assistente Gemini integrado para suporte ao cliente no cardápio.
- **Recente:** Correção de logos circulares para compartilhamento social (WhatsApp) e tags Open Graph.

---

## 📋 Próximos Passos (Prioridades)
1. **Refatoração:** Quebrar `app/cardapio/page.tsx` (>2000 linhas) em componentes menores.
2. **Precificação:** Finalizar sistema de preços baseado em sabores/variações premium.
3. **UX/UI:** Polimento no modal de seleção de opções e transições mobile.
4. **Performance:** Otimizar carregamento de imagens e limites de cache (Vercel/CDN).
5. **Dashboard:** Implementar relatórios financeiros mais detalhados baseados na tabela `fluxo_caixa`.

---

## 📏 Regras e Padrões
- **Design:** Dark Mode como padrão, acentos em Laranja (`#f97316`), estética premium e "limpa".
- **Código:**
  - Componentes Funcionais com TypeScript.
  - Preferência por `lucide-react` para ícones.
  - Supabase: Uso de `createClient` (SSR/Browser) conforme o contexto.
  - Nomenclatura: PascalCase para componentes, camelCase para funções/variáveis.
- **Banco de Dados:** Regras de negócio pesadas (totais, estatísticas) devem ser mantidas via Triggers no Supabase sempre que possível.
- **Mobile First:** A maioria dos usuários acessa via celular; interações devem ser otimizadas para touch.

---

*Última atualização: 2026-04-17*
