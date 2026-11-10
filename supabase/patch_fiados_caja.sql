-- ==============================================================================
-- PARCHE: Separación Fiados vs Ingresos Cobrados + Abonos a Caja
-- Ejecutar en SQL Editor de Supabase si la BD ya existe
-- ==============================================================================

-- 1) Columna para créditos otorgados en el turno (NO es ingreso cobrado)
ALTER TABLE cajas
  ADD COLUMN IF NOT EXISTS total_fiados_otorgados NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- 2) Trigger de ventas: efectivo/digital solo si NO es fiado; fiado suma a créditos
CREATE OR REPLACE FUNCTION trg_actualizar_totales_caja()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.caja_id IS NOT NULL AND NEW.estado = 'completada' THEN
        IF NEW.metodo_pago = 'fiado' THEN
            -- Crédito por cobrar: NO suma a ingresos cobrados
            UPDATE cajas
            SET total_fiados_otorgados = COALESCE(total_fiados_otorgados, 0) + NEW.total,
                updated_at = NOW()
            WHERE id = NEW.caja_id;
        ELSIF NEW.metodo_pago = 'efectivo' THEN
            UPDATE cajas
            SET total_ventas_efectivo = total_ventas_efectivo + NEW.total,
                updated_at = NOW()
            WHERE id = NEW.caja_id;
        ELSIF NEW.metodo_pago IN ('yape', 'plin') THEN
            UPDATE cajas
            SET total_ventas_digital = total_ventas_digital + NEW.total,
                updated_at = NOW()
            WHERE id = NEW.caja_id;
        ELSIF NEW.metodo_pago = 'mixto' THEN
            UPDATE cajas
            SET total_ventas_efectivo = total_ventas_efectivo + COALESCE(NEW.monto_efectivo, 0),
                total_ventas_digital = total_ventas_digital + COALESCE(NEW.monto_digital, 0),
                updated_at = NOW()
            WHERE id = NEW.caja_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_caja_venta ON ventas;
CREATE TRIGGER trigger_actualizar_caja_venta
AFTER INSERT ON ventas
FOR EACH ROW
EXECUTE FUNCTION trg_actualizar_totales_caja();

-- 3) Los abonos de deuda ingresan a caja desde la API (server.js),
--    no vía trigger, para evitar doble conteo con la lógica de la aplicación.

-- 4) Stock: descuento solo desde la API (quitar trigger legacy si existe)
DROP TRIGGER IF EXISTS trigger_descontar_stock ON detalle_ventas;
