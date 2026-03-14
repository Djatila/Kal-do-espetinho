# 🗺️ Mapeamento Técnico — Nita Quentinhas
> **Propósito:** Documento de migração das regras de negócio, lógica de dados e integrações do projeto Nita Quentinhas para outro projeto com interface visual já finalizada.
> **Auditado por:** Arquiteto de Software Sênior — Leitura apenas, nenhum arquivo foi modificado.
> **Data da auditoria:** 2026-03-01
> **Stack:** Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + Realtime + Auth)

---

## 1. Estrutura do Banco de Dados

O banco de dados é hospedado no **Supabase** com PostgreSQL. Todas as tabelas usam Row Level Security (RLS).

### 1.1 Tabelas Principais

#### `pedidos_online` *(Tabela central do sistema de pedidos)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária (auto-gerada) |
| `numero_pedido` | `SERIAL UNIQUE` | Número sequencial legível pelo cliente |
| `cliente_nome` | `TEXT NOT NULL` | Nome do cliente |
| `cliente_telefone` | `TEXT NOT NULL` | Telefone do cliente |
| `cliente_endereco` | `TEXT` | Endereço de entrega (nullable) |
| `cliente_id` | `UUID` | FK → `clientes.id` (nullable, vinculado após sistema dual) |
| `tipo_entrega` | `TEXT` | `'retirada'` ou `'delivery'` |
| `itens` | `JSONB NOT NULL` | Array de itens do pedido (ver estrutura abaixo) |
| `subtotal` | `NUMERIC(10,2)` | Soma dos itens sem taxa |
| `taxa_entrega` | `NUMERIC(10,2)` | Taxa de entrega (0 para retirada) |
| `total` | `NUMERIC(10,2)` | Valor final = subtotal + taxa_entrega |
| `observacoes` | `TEXT` | Observações gerais do pedido |
| `metodo_pagamento` | `TEXT` | `'pix'`, `'cartao'`, `'dinheiro'`, `'pagamento_posterior'` |
| `precisa_troco` | `BOOLEAN` | Se o cliente precisa de troco (só para dinheiro) |
| `valor_para_troco` | `NUMERIC(10,2)` | Valor entregue em dinheiro para calcular troco |
| `status` | `TEXT NOT NULL` | Ver status possíveis abaixo |
| `historico_complementos` | `JSONB` | Array de complementos adicionados após a criação |
| `created_at` | `TIMESTAMPTZ` | Data/hora de criação |
| `updated_at` | `TIMESTAMPTZ` | Atualizado automaticamente via trigger |

**Status possíveis de um pedido:**
- `pendente` — Pedido recebido, aguardando confirmação
- `confirmado` — Confirmado pela cozinha
- `preparando` — Em preparo
- `pronto` — Pronto para retirada/entrega
- `entregue` — Entregue ao cliente
- `cancelado` — Cancelado

**Fluxo progressivo de status (linear):**
```
pendente → confirmado → preparando → pronto → entregue
```
*(Cancelado pode ser aplicado apenas quando o status é `pendente`)*

**Estrutura do campo `itens` (JSONB):**
```json
[
  {
    "id": "uuid-do-produto",
    "nome": "Marmitex M",
    "quantidade": 2,
    "preco": 18.00,
    "subtotal": 36.00
  }
]
```

---

#### `produtos` *(Cardápio)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `nome` | `TEXT NOT NULL` | Nome do produto |
| `descricao` | `TEXT` | Descrição do produto (nullable) |
| `preco` | `NUMERIC(10,2)` | Preço unitário |
| `categoria` | `TEXT` | Categoria livre (ex: `'marmitex'`, `'bebida'`, `'adicional'`) |
| `ativo` | `BOOLEAN` | Se `true`, aparece no cardápio público |
| `created_at` | `TIMESTAMPTZ` | Data de criação |
| `updated_at` | `TIMESTAMPTZ` | Atualizado automaticamente via trigger |

**Produtos padrão inseridos na criação:**
- `Marmitex P` (R$ 15) · `Marmitex M` (R$ 18) · `Marmitex G` (R$ 22)
- `Refrigerante Lata` (R$ 5) · `Refrigerante 2L` (R$ 10) · `Suco Natural` (R$ 8) · `Água Mineral` (R$ 3)
- `Sobremesa` (R$ 6)
- `Adicional Proteína` (R$ 8) · `Adicional Acompanhamento` (R$ 5)

---

#### `clientes` *(Base de clientes com sistema dual)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `nome` | `TEXT NOT NULL` | Nome do cliente |
| `telefone` | `TEXT NOT NULL` | Telefone (usado para identificação) |
| `endereco` | `TEXT` | Endereço principal |
| `bairro` | `TEXT` | Bairro |
| `cidade` | `TEXT` | Cidade (default: `'São Paulo'`) |
| `cep` | `TEXT` | CEP |
| `observacoes` | `TEXT` | Observações internas sobre o cliente |
| `ativo` | `BOOLEAN` | Se o cliente está ativo |
| `tipo_cliente` | `TEXT` | `'credito'` (autenticado) ou `'informal'` (sem login) |
| `user_id` | `UUID` | FK → `auth.users` (apenas clientes `credito`) |
| `limite_credito` | `NUMERIC(10,2)` | Limite para pagamento posterior |
| `credito_utilizado` | `NUMERIC(10,2)` | Crédito já utilizado |
| `status` | `TEXT` | `'ativo'`, `'inativo'` ou `'bloqueado'` |
| `total_pedidos` | `INTEGER` | Contador automático via trigger |
| `total_gasto` | `NUMERIC(10,2)` | Gasto total via trigger |
| `ultima_compra` | `TIMESTAMPTZ` | Data da última compra via trigger |

---

#### `configuracoes` *(Single-row — configuração global do restaurante)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `nome_restaurante` | `TEXT` | Nome exibido no cardápio |
| `endereco_restaurante` | `TEXT` | Endereço do estabelecimento |
| `telefone_restaurante` | `TEXT` | Telefone de contato |
| `email_contato` | `TEXT` | Email de contato |
| `taxa_entrega_padrao` | `NUMERIC(10,2)` | Taxa de delivery aplicada automaticamente |
| `logo_url` | `TEXT` | URL da logo (armazenada no Storage do Supabase) |

---

#### `vendas` *(Vendas internas — painel admin)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `data` | `TIMESTAMPTZ` | Data e hora da venda |
| `tipo` | `TEXT` | `'local'` ou `'delivery'` |
| `forma_pagamento` | `TEXT` | Forma de pagamento |
| `quantidade` | `INTEGER` | Quantidade de itens |
| `valor` | `NUMERIC(10,2)` | Valor unitário |
| `total` | `NUMERIC(10,2)` | Calculado automaticamente via trigger |
| `observacoes` | `TEXT` | Observações |
| `cliente_id` | `UUID` | FK → `clientes.id` |
| `taxa_entrega` | `NUMERIC(10,2)` | Taxa de entrega |
| `criado_por` | `UUID` | FK → `usuarios.id` |

---

#### `itens_venda` *(Itens das vendas internas — join table)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `venda_id` | `UUID` | FK → `vendas.id` (CASCADE DELETE) |
| `produto_id` | `UUID` | FK → `produtos.id` (RESTRICT delete) |
| `quantidade` | `INTEGER` | Quantidade deste produto |
| `preco_unitario` | `NUMERIC(10,2)` | Preço no momento da venda |
| `subtotal` | `NUMERIC(10,2)` | **GENERATED ALWAYS** = `quantidade * preco_unitario` |
| `observacoes` | `TEXT` | Observações do item |

---

#### `despesas` *(Controle financeiro de saídas)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `data` | `TIMESTAMPTZ` | Data da despesa |
| `categoria` | `TEXT` | Ex: `'Ingredientes'`, `'Gás'`, `'Embalagens'` |
| `descricao` | `TEXT` | Descrição da despesa |
| `valor` | `NUMERIC(10,2)` | Valor da despesa |
| `fornecedor` | `TEXT` | Nome do fornecedor |
| `criado_por` | `UUID` | FK → `usuarios.id` |

---

#### `fluxo_caixa` *(Resumo diário — calculado por triggers)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `data` | `DATE UNIQUE` | Data do dia |
| `entrada_total` | `NUMERIC(10,2)` | Soma de todas as vendas do dia |
| `saida_total` | `NUMERIC(10,2)` | Soma de todas as despesas do dia |
| `saldo_do_dia` | `NUMERIC(10,2)` | `entrada_total - saida_total` |
| `saldo_acumulado` | `NUMERIC(10,2)` | Saldo acumulado histórico |

---

#### `usuarios` *(Perfil público dos admins — espelho do auth.users)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | FK → `auth.users` (PK) |
| `nome` | `TEXT` | Nome do administrador |
| `email` | `TEXT` | Email do administrador |

---

#### `categorias` *(Categorias de despesas e vendas internas)*
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID` | Chave primária |
| `nome` | `TEXT` | Nome da categoria (ex: `'Ingredientes'`) |
| `tipo` | `TEXT` | `'entrada'` ou `'saida'` |

---

### 1.2 Triggers do Banco de Dados

| Trigger | Tabela | Evento | Função Chamada | Efeito |
|---------|--------|--------|----------------|--------|
| `trigger_atualizar_updated_at_pedido` | `pedidos_online` | `BEFORE UPDATE` | `atualizar_updated_at_pedido()` | Mantém `updated_at` atualizado |
| `trigger_atualizar_updated_at_produto` | `produtos` | `BEFORE UPDATE` | `atualizar_updated_at_produto()` | Mantém `updated_at` atualizado |
| `trigger_atualizar_total_venda` | `itens_venda` | `AFTER INSERT/UPDATE/DELETE` | `atualizar_total_venda()` | Recalcula `total` na tabela `vendas` |
| `on_venda_change` | `vendas` | `AFTER INSERT/UPDATE/DELETE` | `update_fluxo_caixa()` | Recalcula `fluxo_caixa` do dia |
| `on_despesa_change` | `despesas` | `AFTER INSERT/UPDATE/DELETE` | `update_fluxo_caixa()` | Recalcula `fluxo_caixa` do dia |
| `trigger_atualizar_estatisticas_cliente` | `vendas` | `AFTER INSERT/UPDATE` | `atualizar_estatisticas_cliente()` | Atualiza totais na tabela `clientes` |
| `trigger_atualizar_estatisticas_cliente_pedido` | `pedidos_online` | `AFTER INSERT` | `atualizar_estatisticas_cliente_pedido()` | Atualiza totais de clientes via pedido online |
| `on_auth_user_created` | `auth.users` | `AFTER INSERT` | `handle_new_user()` | Cria perfil em `usuarios` para admins |
| `on_auth_customer_created` | `auth.users` | `AFTER INSERT` | `handle_new_customer()` | Vincula `clientes.user_id` para clientes crédito |

---

## 2. Lógica de Negócio e Fluxo de Pedidos

### 2.1 Gerenciamento do Carrinho de Compras

**Arquivo:** `app/cardapio/page.tsx`

O carrinho é gerenciado **localmente no cliente** usando duas estratégias combinadas:

- **`useState<ItemCarrinho[]>`** — Estado reativo em memória
- **`localStorage`** — Persistência entre recarregamentos de página

```typescript
// Estrutura de um item no carrinho
interface ItemCarrinho extends Produto {
    quantidade: number
    // herda: id, nome, descricao, preco, categoria, ativo
}

// Carregar do localStorage ao montar o componente
useEffect(() => {
    const carrinhoSalvo = localStorage.getItem('carrinho')
    if (carrinhoSalvo) {
        setCarrinho(JSON.parse(carrinhoSalvo))
    }
    setCarrinhoCarregado(true)
}, [])

// Salvar no localStorage a cada mudança de estado
useEffect(() => {
    if (carrinhoCarregado) {
        localStorage.setItem('carrinho', JSON.stringify(carrinho))
    }
}, [carrinho, carrinhoCarregado])
```

**Funções de manipulação do carrinho:**
- `adicionarAoCarrinho(produto)` — Incrementa quantidade se já existe; adiciona novo item caso contrário
- `alterarQuantidade(produtoId, delta)` — Incrementa ou decrementa; remove o item se chegar a 0
- `removerDoCarrinho(produtoId)` — Remove o item pelo `id`

**Cálculo de totais:**
```typescript
const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0)
const taxaAplicada = dadosCliente.tipo_entrega === 'delivery' ? taxaEntrega : 0
const total = subtotal + taxaAplicada
// taxaEntrega vem da tabela `configuracoes`.taxa_entrega_padrao
```

---

### 2.2 Identificação do Cliente (Sistema Dual)

**Arquivo:** `app/cardapio/page.tsx` + `components/cliente/ClienteIdentificationModal.tsx`

Existem **dois tipos de cliente**:

| Tipo | Descrição | Autenticação |
|------|-----------|--------------|
| `credito` | Cliente pré-cadastrado pelo admin, pode usar "Pagar Depois" | Supabase Auth (e-mail/senha) |
| `informal` | Se identifica apenas com nome e telefone | Sem login; gravado em `sessionStorage` |

**Fluxo de verificação de sessão:**
```typescript
async function checkClienteSession() {
    // 1. Verificar sessionStorage primeiro (fastest path)
    const savedClienteId = sessionStorage.getItem('clienteId')
    const savedTipoCliente = sessionStorage.getItem('tipoCliente')

    if (savedClienteId && savedTipoCliente) {
        // Sessão já existe, usa dados salvos
        setClienteId(savedClienteId)
        setTipoCliente(savedTipoCliente)
        await loadClienteData(savedClienteId)
    } else {
        // 2. Verificar se há usuário autenticado (cliente crédito)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            // Buscar cliente vinculado ao user_id na tabela clientes
            const { data: cliente } = await supabase
                .from('clientes')
                .select('id')
                .eq('user_id', user.id)
                .single()
            // Se encontrar: seta como 'credito', salva no sessionStorage
            // Se não encontrar: abre modal de identificação
        } else {
            // 3. Nenhum usuário: abre modal de identificação
            setMostrarIdentificacao(true)
        }
    }
}
```

---

### 2.3 Função de Finalização do Pedido

**Arquivo:** `app/cardapio/page.tsx`  
**Função:** `finalizarPedido()` — chamada pelo botão "Confirmar Pedido" no modal de checkout

**Validações realizadas antes do envio:**
1. `cliente_nome` e `cliente_telefone` são obrigatórios
2. Se `tipo_entrega === 'delivery'`, `endereco` é obrigatório
3. `metodo_pagamento` deve estar selecionado
4. Se `metodo_pagamento === 'dinheiro'` e `precisa_troco === true`, `valor_para_troco` deve ser ≥ `total`
5. O carrinho não pode estar vazio

**Modo Normal — Criação de novo pedido:**
```typescript
// Transforma o estado do carrinho em itens formatados para o JSONB
const itens = carrinho.map(item => ({
    id: item.id,
    nome: item.nome,
    quantidade: item.quantidade,
    preco: item.preco,
    subtotal: item.preco * item.quantidade
}))

// INSERT na tabela pedidos_online
const { data, error } = await supabase
    .from('pedidos_online')
    .insert({
        cliente_id: clienteId,           // UUID do cliente (se identificado)
        cliente_nome: dadosCliente.nome,
        cliente_telefone: dadosCliente.telefone,
        cliente_endereco: dadosCliente.endereco || null,
        tipo_entrega: dadosCliente.tipo_entrega,
        metodo_pagamento: dadosCliente.metodo_pagamento,
        precisa_troco: dadosCliente.precisa_troco,
        valor_para_troco: dadosCliente.precisa_troco ? parseFloat(dadosCliente.valor_para_troco) : null,
        itens: itens,
        subtotal: subtotal,
        taxa_entrega: taxaAplicada,
        total: total,
        observacoes: dadosCliente.observacoes || null,
        status: 'pendente'               // Status inicial SEMPRE 'pendente'
    })
    .select('numero_pedido')
    .single()

// Após sucesso:
// - setPedidoConfirmado(data.numero_pedido)
// - setCarrinho([])
// - localStorage.removeItem('carrinho')
```

**Modo Complemento — Adição de itens a pedido existente:**
```typescript
// Busca o pedido original pelo numero_pedido
// Mescla os novos itens com os existentes no campo JSONB
// Atualiza subtotal e total somando com os valores originais
// Salva um historico_complementos[] com data, itens, subtotal e total do complemento

await supabase
    .from('pedidos_online')
    .update({
        itens: novosItens,                        // Array mesclado
        subtotal: pedidoOriginal.subtotal + subtotal,
        total: pedidoOriginal.total + total,
        historico_complementos: historico         // Array de registros históricos
    })
    .eq('numero_pedido', pedidoComplementoNumero)
```

---

### 2.4 Atualização de Status pelo Admin

**Arquivo:** `app/(dashboard)/dashboard/pedidos/page.tsx`  
**Função:** `atualizarStatus(pedidoId, novoStatus)`

```typescript
async function atualizarStatus(pedidoId: string, novoStatus: Pedido['status']) {
    await supabase
        .from('pedidos_online')
        .update({ status: novoStatus })
        .eq('id', pedidoId)
    // O trigger `atualizar_updated_at_pedido` atualiza automaticamente o campo updated_at
}
```

O avanço de status pode ser feito de duas formas na interface admin:
1. **Botão rápido** em cada card — avança para o próximo status na sequência linear
2. **Modal de detalhes** — permite selecionar qualquer status diretamente

---

### 2.5 Exclusão de Pedidos

**Arquivo:** `app/(dashboard)/dashboard/pedidos/page.tsx`  
**Função:** `excluirPedido(pedidoId)`

```typescript
async function excluirPedido(pedidoId: string) {
    // Confirmação via dialog nativo do browser
    // Se confirmado, faz DELETE na tabela pedidos_online
    await supabase.from('pedidos_online').delete().eq('id', pedidoId)
}
```

---

## 3. Funcionalidades em Tempo Real e Notificações (O Bip)

### 3.1 Listener Realtime do Supabase

**Arquivo:** `app/(dashboard)/dashboard/pedidos/page.tsx`  
**Função:** `setupRealtimeSubscription()` — chamada dentro do `useEffect` inicial da página de pedidos do admin.

O Supabase Realtime foi habilitado para a tabela `pedidos_online` via:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_online;
```

**Implementação do listener:**
```typescript
function setupRealtimeSubscription() {
    const channel = supabase
        .channel('pedidos_online_changes')      // Nome do canal (arbitrário)
        .on(
            'postgres_changes',                  // Escuta mudanças do PostgreSQL
            {
                event: '*',                      // INSERT, UPDATE e DELETE
                schema: 'public',
                table: 'pedidos_online'
            },
            (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Adiciona o novo pedido no topo da lista
                    setPedidos(prev => [payload.new as Pedido, ...prev])
                    // >>> DISPARA O BIP <<<
                    audioRef.current?.play()
                    // >>> DISPARA NOTIFICAÇÃO DO NAVEGADOR <<<
                    new Notification('Novo Pedido!', { body: `Pedido #${novoPedido.numero_pedido} de ${novoPedido.cliente_nome}` })

                } else if (payload.eventType === 'UPDATE') {
                    // Substitui o pedido atualizado na lista
                    setPedidos(prev => prev.map(p =>
                        p.id === payload.new.id ? payload.new as Pedido : p
                    ))

                } else if (payload.eventType === 'DELETE') {
                    // Remove o pedido deletado da lista
                    setPedidos(prev => prev.filter(p => p.id !== payload.old.id))
                }
            }
        )
        .subscribe()

    return () => supabase.removeChannel(channel) // cleanup no unmount
}
```

---

### 3.2 Sistema de Alerta Sonoro (O Bip)

**Arquivo:** `app/(dashboard)/dashboard/pedidos/page.tsx`

O áudio é criado como um **elemento de áudio programático em memória** (sem arquivo de áudio externo), usando um som WAV codificado em **Base64 diretamente no código**.

```typescript
// Criação do elemento de áudio (no useEffect inicial)
audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10...')
// ^ String Base64 de um som WAV curto embutida literalmente no código-fonte

// Disparo do som (dentro do handler do evento INSERT do Realtime)
if (audioRef.current) {
    audioRef.current.play().catch(e => console.log('Erro ao tocar som:', e))
    // .catch() é necessário pois browsers modernos bloqueiam autoplay sem interação do usuário
}
```

**Referência React usada:**
```typescript
const audioRef = useRef<HTMLAudioElement | null>(null)
```

**Resumo do fluxo completo do bip:**
1. Admin abre a página `/dashboard/pedidos`
2. `useEffect` cria o `Audio` em memória e chama `setupRealtimeSubscription()`
3. Um cliente finaliza um pedido → INSERT em `pedidos_online` no banco
4. Supabase detecta o INSERT via `supabase_realtime` publication
5. O evento `'INSERT'` chega para todos os clientes subscritos no canal `'pedidos_online_changes'`
6. O handler chama `audioRef.current.play()` ← **este é o bip**
7. Simultaneamente, é criada uma notificação nativa do navegador (se permissão concedida)

---

## 4. Rotas e Endpoints (Consultas Supabase)

O projeto **não possui API REST própria**. Todas as consultas ao banco são feitas diretamente pelo front-end usando o **Supabase Client SDK** (`@supabase/ssr`).

### 4.1 Cliente Supabase

**Arquivo:** `utils/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,    // URL do projeto Supabase
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Chave anon pública
  )
}
```

---

### 4.2 Mapa Completo de Consultas por Funcionalidade

#### Cardápio Público (`/cardapio`)

| Operação | Tabela | Tipo | Detalhamento |
|----------|--------|------|--------------|
| Buscar cardápio | `produtos` | `SELECT` | Somente `ativo = true`, ordenado por `categoria` e `nome` |
| Buscar configurações | `configuracoes` | `SELECT` | Campos: `taxa_entrega_padrao`, `nome_restaurante`, `logo_url` |
| Buscar dados do cliente | `clientes` | `SELECT` | Por `id` (pk) ou `user_id` |
| Criar pedido | `pedidos_online` | `INSERT` | Retorna `numero_pedido` |
| Adicionar complemento | `pedidos_online` | `UPDATE` | Por `numero_pedido`; atualiza `itens`, `subtotal`, `total`, `historico_complementos` |
| Verificar cliente coligado | `clientes` | `SELECT` | Por `user_id` (do `supabase.auth.getUser()`) |
| Logout do cliente | — | `supabase.auth.signOut()` | Limpa `sessionStorage` e recarrega a página |

#### Painel Admin — Pedidos (`/dashboard/pedidos`)

| Operação | Tabela | Tipo | Detalhamento |
|----------|--------|------|--------------|
| Listar todos os pedidos | `pedidos_online` | `SELECT *` | Ordenado por `created_at DESC` |
| Atualizar status de pedido | `pedidos_online` | `UPDATE` | Campo `status`, por `id` |
| Excluir pedido | `pedidos_online` | `DELETE` | Por `id` |
| Escutar novos pedidos (Realtime) | `pedidos_online` | `SUBSCRIPTION` | Canal `'pedidos_online_changes'`, evento `*` |

#### Verificação de Elegibilidade de Crédito

| Operação | Tipo | Detalhamento |
|----------|------|--------------|
| `check_credit_eligibility(phone)` | RPC (função PL/pgSQL) | Retorna `boolean` — verifica se telefone está na tabela `clientes` com `tipo_cliente = 'credito'` |

---

## 5. Informações Complementares para Migração

### 5.1 Dependências de Autenticação

- **Admins** usam `supabase.auth` normalmente (e-mail/senha) → perfil criado automaticamente em `usuarios` via trigger `on_auth_user_created`
- **Clientes crédito** também usam `supabase.auth` → vinculação ao registro em `clientes` feita via trigger `on_auth_customer_created`
- **Clientes informais** NÃO usam autenticação → identificados apenas por nome/telefone, sessão salva em `sessionStorage`

### 5.2 Variáveis de Ambiente Necessárias

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### 5.3 RLS — Políticas Críticas a Replicar

| Tabela | Anônimo (sem login) | Autenticado (admin) |
|--------|---------------------|---------------------|
| `pedidos_online` | Pode INSERT e SELECT | Pode tudo (UPDATE, DELETE) |
| `produtos` | **Sem acesso** | Pode tudo |
| `clientes` | Pode INSERT (só `tipo_cliente = 'informal'`) | Pode tudo |
| `configuracoes` | **Sem acesso** | Pode tudo |

> ⚠️ **Atenção:** A tabela `pedidos_online` permite INSERT e SELECT anônimos intencionalmente, para que clientes sem login possam fazer pedidos e acompanhá-los. Isso é uma decisão de design do projeto original.

### 5.4 Realtime — Pré-requisito no Supabase

Para que o painel admin receba pedidos em tempo real, a tabela `pedidos_online` deve estar na publicação `supabase_realtime`. Execute no SQL Editor do Supabase destino:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_online;
```

### 5.5 Funcionalidade de Impressão de Pedido

**Arquivo:** `app/(dashboard)/dashboard/pedidos/page.tsx`  
**Função:** `imprimirPedido(pedido)`

Abre uma nova aba do navegador com HTML puro contendo todos os detalhes do pedido (dados do cliente, itens, totais, troco) e dispara `window.print()` automaticamente via `window.onload`. Não usa nenhuma biblioteca externa de impressão.
