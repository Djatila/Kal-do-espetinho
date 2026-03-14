-- ============================================
-- SCRIPT: Tabela de Configurações do Restaurante
-- ============================================

-- 1. Criar tabela de configurações (single row pattern)
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome_restaurante TEXT DEFAULT 'Kal do Espetinho',
  endereco_restaurante TEXT,
  telefone_restaurante TEXT,
  email_contato TEXT,
  taxa_entrega_padrao NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS (Permitir tudo para autenticados - simplificado para sistema single-tenant)
CREATE POLICY "Configurações visíveis para autenticados"
  ON public.configuracoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Configurações editáveis por autenticados"
  ON public.configuracoes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Configurações inseríveis por autenticados"
  ON public.configuracoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Inserir configuração inicial se não existir
INSERT INTO public.configuracoes (nome_restaurante)
SELECT 'Kal do Espetinho'
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes);
