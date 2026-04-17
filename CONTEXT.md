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
- **Logística de Entrega:** Fluxo dinâmico implementado. O sistema agora diferencia "Pronto para Retirada" de "Pedido Pronto" (Delivery), e inclui o novo status "Saiu para entrega" com feedback visual no admin e cliente.
- **Navegação e Categorias:** Corrigido o bug de visibilidade das categorias (Lost Start) e padronizado o termo "Todos". O menu agora é 100% responsivo e acessível.
- **UX/UI Admin:** Adicionada animação `rubberBand` (pulo elástico) nos status dos pedidos para feedback tátil/visual de ações bem-sucedidas.
- **Bug Fixes:** Resolvidos erros de tipagem TypeScript que afetavam o build na Vercel e corrigida a constraint do banco de dados no Supabase.

---

## 📋 Próximos Passos (Prioridades)
1. **Monitoramento Logístico:** Validar o recebimento dos webhooks n8n para o novo status "Saiu para entrega".
2. **Performance:** Otimizar carregamento de mídias e logos (fixação do logo circular).
3. **Refatoração:** Concluir a modularização da `app/cardapio/page.tsx` para os novos subcomponentes criados.
4. **Fidelidade:** Iniciar o planejamento do sistema de pontuação para clientes frequentes.

---

## 📏 Regras e Padrões
- **Design:** Dark Mode como padrão, acentos em Laranja (`#f97316`), estética premium e "limpa", botões de fechar (X) com efeito Neon Orange.
- **Animações:** Uso de `rubberBand` para gatilhos de status e `animate-bounce` para indicadores de quantidade (carrinho).
- **Flexbox:** Evitar `justify-center` em listas horizontais com scroll para prevenir o bug de "Lost Start"; usar `justify-start` com padding adequado.
- **Código:**
  - Componentes Funcionais com TypeScript.
  - Tipagem rigorosa para `OrderStatus` (centralizar em `types.ts`).
  - Nomenclatura: PascalCase para componentes, camelCase para funções/variáveis.
- **Banco de Dados:** Regras de negócio pesadas (totais, estatísticas) devem ser mantidas via Triggers no Supabase sempre que possível.
- **Mobile First:** A maioria dos usuários acessa via celular; interações devem ser otimizadas para touch.

---

*Última atualização: 2026-04-17 (Refinação de Status de Entrega, Animações Admin e Fix de Categorias)*
