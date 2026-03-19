-- Function that recalculates `credito_utilizado` accurately for a specific client
CREATE OR REPLACE FUNCTION public.recalcular_credito_cliente(target_client_id UUID)
RETURNS VOID AS $$
DECLARE
  vendas_credito NUMERIC;
  pedidos_credito NUMERIC;
BEGIN
  -- 1. Sum up all 'vendas' where forma_pagamento is 'pagamento_posterior'
  SELECT COALESCE(SUM(total), 0) INTO vendas_credito
  FROM public.vendas
  WHERE cliente_id = target_client_id
    AND forma_pagamento = 'pagamento_posterior';

  -- 2. Sum up all 'pedidos_online' where metodo_pagamento is 'pagamento_posterior'
  --    Excluding cancelled orders if necessary. Assuming status != 'cancelado'.
  SELECT COALESCE(SUM(total), 0) INTO pedidos_credito
  FROM public.pedidos_online
  WHERE cliente_id = target_client_id
    AND metodo_pagamento = 'pagamento_posterior'
    AND status != 'cancelado';

  -- 3. Update the student/cliente record
  UPDATE public.clientes
  SET credito_utilizado = (vendas_credito + pedidos_credito)
  WHERE id = target_client_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the trigger for pedidos_online to update things correctly
CREATE OR REPLACE FUNCTION public.atualizar_estatisticas_cliente_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cliente_id IS NOT NULL THEN
    UPDATE public.clientes
    SET 
      total_pedidos = total_pedidos + 1,
      total_gasto = total_gasto + NEW.total,
      ultima_compra = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.cliente_id;
    
    PERFORM public.recalcular_credito_cliente(NEW.cliente_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger for UPDATE/DELETE on pedidos_online for recalculating credit
CREATE OR REPLACE FUNCTION public.atualizar_estatisticas_cliente_pedido_upd_del()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.cliente_id IS NOT NULL THEN
      PERFORM public.recalcular_credito_cliente(OLD.cliente_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.cliente_id IS NOT NULL THEN
    -- Only recalculate if total, status, or method changes
    IF NEW.total IS DISTINCT FROM OLD.total 
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.metodo_pagamento IS DISTINCT FROM OLD.metodo_pagamento THEN
      PERFORM public.recalcular_credito_cliente(NEW.cliente_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_estatisticas_cliente_pedido_upd_del ON public.pedidos_online;
CREATE TRIGGER trigger_atualizar_estatisticas_cliente_pedido_upd_del
  AFTER UPDATE OR DELETE ON public.pedidos_online
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_estatisticas_cliente_pedido_upd_del();


-- 6. Also fix the vendas trigger
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
        ultima_compra = (
          SELECT MAX(data)
          FROM public.vendas
          WHERE cliente_id = target_id
        ),
        updated_at = NOW()
      WHERE id = target_id;
      
      PERFORM public.recalcular_credito_cliente(target_id);
  END IF;
  
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recalculate for all current clients just in case
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.clientes LOOP
    PERFORM public.recalcular_credito_cliente(rec.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
