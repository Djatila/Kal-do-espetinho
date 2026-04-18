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
- **Cardápio Público:** Funcional com carrinho, sistema dual de cliente (Crédito/Informal) e suporte a complementos em tempo real. O assistente Kal AI foi restaurado e agora é processado via server-side bridge. Os selos de recomendação foram simplificados (estrela agora é parte do texto).
- **Dashboard Admin:** Cards de pedidos com bordas neon laranja pulsantes. Selos de "Gorjeta" e "Cota Artística" reorganizados para aparecerem abaixo do número do pedido, melhorando a escaneabilidade.
- **Otimização de Performance:** Campo de busca no admin agora possui *debounce* e estado local, eliminando o lag de digitação.
- **Logística de Entrega:** Fluxo dinâmico implementado com suporte ao status "Saiu para entrega".
- **Estabilidade:** Build da Vercel corrigido após resolução de conflitos de tipos.

---

## 📋 Próximos Passos (Prioridades)
1. **Refatoração:** Concluir a modularização total da `app/cardapio/page.tsx` aproveitando os novos subcomponentes.
2. **Fidelidade:** Iniciar o planejamento do sistema de pontuação/fidelidade para clientes recorrentes.
3. **Monitoramento:** Validar a experiência do chat Kal AI com usuários reais para ajustes finos de contexto.
4. **Logística:** Monitorar webhooks para garantir que o novo status "Saiu para entrega" dispare as notificações corretamente.

---

## 📏 Regras e Padrões
- **Design:** Dark Mode como padrão, acentos em Laranja (`#f97316`), estética premium, botões Neon Orange e cards com *glow* sutil no dashboard.
- **Animações:** Uso de `rubberBand` para status e `flyToCart` para adição de itens.
- **Segurança IA:** Nunca chamar chaves de API diretamente no frontend; usar sempre o bridge `/api/bot`.
- **Código:**
  - Componentes Funcionais com TypeScript.
  - Tipagem rigorosa para `ConfiguracaoCardapio` e `OrderStatus`.
- **Mobile First:** Interface focada em touch e navegação rápida via polegar.

---

*Última atualização: 2026-04-18 (Refinamento de layouts de selos no cardápio e dashboard, Otimização de busca, Restauração Kal AI)*
