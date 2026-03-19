-- ============================================
-- SCRIPT DE ATUALIZAÇÃO: LIMITE DE CRÉDITO
-- ============================================

-- 1. Adicionar coluna limite_ilimitado se não existir
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS limite_ilimitado BOOLEAN DEFAULT false;

-- 2. Atualizar função para incluir o cálculo de crédito utilizado
-- Nota: Aqui estamos assumindo que TODO o gasto do cliente consome seu limite de crédito
-- se ele for do tipo 'credito'.
-- 2. Atualizar função para incluir o cálculo de crédito utilizado
CREATE OR REPLACE FUNCTION public.atualizar_estatisticas_cliente()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.cliente_id, OLD.cliente_id);
  
  IF target_id IS NOT NULL THEN
      UPDATE public.clientes
      SET 
        total_pedidos = (
          SELECT COUNT(*) 
          FROM public.vendas 
          WHERE cliente_id = target_id
        ),
        total_gasto = (
          SELECT COALESCE(SUM(total), 0) 
          FROM public.vendas 
          WHERE cliente_id = target_id
        ),
        credito_utilizado = (
          SELECT COALESCE(SUM(total), 0) 
          FROM public.vendas 
          WHERE cliente_id = target_id
        ),
        ultima_compra = (
          SELECT MAX(data)
          FROM public.vendas
          WHERE cliente_id = target_id
        ),
        updated_at = NOW()
      WHERE id = target_id;
  END IF;
  
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Garantir que o trigger existe (já criado na migration anterior, mas bom reforçar)
DROP TRIGGER IF EXISTS trigger_atualizar_estatisticas_cliente ON public.vendas;
CREATE TRIGGER trigger_atualizar_estatisticas_cliente
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_estatisticas_cliente();

-- ============================================
-- FIM DO SCRIPT
-- ============================================
