-- ==============================================================================
-- SISTEMA INTEGRAL DE GESTIÓN PARA BODEGAS (MINIMARKET)
-- Base de Datos PostgreSQL para Supabase
-- ==============================================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLA: cajas (Control de Turnos, Fondos y Cortes Diarios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS cajas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hora_cierre TIMESTAMPTZ,
    monto_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Sencillo inicial
    total_ventas_efectivo NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Solo ingresos cobrados (contado + abonos)
    total_ventas_digital NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Yape / Plin cobrados
    total_fiados_otorgados NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Créditos del turno (NO es ingreso)
    total_gastos NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Salidas caja chica
    monto_cierre_efectivo NUMERIC(12, 2), -- Conteo físico al cerrar
    monto_cierre_digital NUMERIC(12, 2), -- Total validado en app Yape/Plin
    diferencia_efectivo NUMERIC(12, 2) DEFAULT 0.00, -- Sobrante (+) o Faltante (-)
    diferencia_digital NUMERIC(12, 2) DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: movimientos_caja (Entradas extraordinarias y Gastos de Caja Chica)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caja_id UUID REFERENCES cajas(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('gasto_chica', 'ingreso_extra', 'compra_proveedor')),
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    descripcion VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: productos (Catálogo, Precios, Categorías y Alertas de Stock)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_barras VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(60) NOT NULL DEFAULT 'Abarrotes',
    precio_venta NUMERIC(10, 2) NOT NULL CHECK (precio_venta >= 0),
    precio_costo NUMERIC(10, 2) DEFAULT 0.00 CHECK (precio_costo >= 0),
    stock_actual NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo NUMERIC(10, 2) NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    unidad_medida VARCHAR(20) DEFAULT 'unidad', -- unidad, kg, litro, paquete
    imagen_url TEXT, -- URL de foto del producto
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: ventas (Cabecera de Transacciones con Soporte Efectivo y Yape/Plin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caja_id UUID REFERENCES cajas(id) ON DELETE SET NULL,
    codigo_ticket VARCHAR(20) UNIQUE NOT NULL,
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'yape', 'plin', 'mixto', 'fiado')),
    monto_recibido NUMERIC(12, 2) DEFAULT 0.00,
    vuelto NUMERIC(12, 2) DEFAULT 0.00,
    monto_efectivo NUMERIC(12, 2) DEFAULT 0.00,
    monto_digital NUMERIC(12, 2) DEFAULT 0.00,
    num_operacion VARCHAR(50), -- Código de confirmación de Yape o Plin
    telefono_cliente VARCHAR(30), -- Teléfono asociado al Yapeo
    nombre_cliente VARCHAR(100) DEFAULT 'Cliente General',
    estado VARCHAR(20) NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'anulada')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: detalle_ventas (Líneas de Producto por Venta)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: clientes_fiados (Libreta de Clientes con Crédito)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS clientes_fiados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(30),
    direccion VARCHAR(200),
    limite_credito NUMERIC(12, 2) DEFAULT 200.00,
    saldo_total NUMERIC(12, 2) DEFAULT 0.00 CHECK (saldo_total >= 0),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: deudas_fiados (Registros individuales de Fiados y Compras a Crédito)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS deudas_fiados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes_fiados(id) ON DELETE CASCADE,
    venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
    monto_original NUMERIC(12, 2) NOT NULL CHECK (monto_original > 0),
    saldo_pendiente NUMERIC(12, 2) NOT NULL CHECK (saldo_pendiente >= 0),
    concepto TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: abonos_fiados (Historial de Pagos Parciales o Totales de Fiados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS abonos_fiados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes_fiados(id) ON DELETE CASCADE,
    deuda_id UUID REFERENCES deudas_fiados(id) ON DELETE SET NULL,
    caja_id UUID REFERENCES cajas(id) ON DELETE SET NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'yape', 'plin')),
    num_operacion VARCHAR(50),
    notas VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLA: pedidos_proveedor (Lista de Reabastecimiento / Pedidos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pedidos_proveedor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    nombre_item VARCHAR(150) NOT NULL,
    cantidad_sugerida NUMERIC(10, 2) NOT NULL DEFAULT 1,
    proveedor VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pedido', 'recibido')),
    notas VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARA ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_ventas_caja ON ventas(caja_id);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo ON ventas(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at);
CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_fiados_cliente ON deudas_fiados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cajas_estado ON cajas(estado);

-- ==============================================================================
-- FUNCIONES Y TRIGGERS PARA INTEGRIDAD Y AUTOMATIZACIÓN
-- ==============================================================================

-- 1. Stock: el descuento lo hace la API con UPDATE directo a productos
--    (evita doble descuento si también hubiera un trigger).
DROP TRIGGER IF EXISTS trigger_descontar_stock ON detalle_ventas;

-- 2. Actualizar saldo acumulado del cliente fiado al registrar deuda o abono
CREATE OR REPLACE FUNCTION trg_actualizar_saldo_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_id UUID;
    v_total_pendiente NUMERIC(12, 2);
BEGIN
    v_cliente_id := COALESCE(NEW.cliente_id, OLD.cliente_id);
    
    SELECT COALESCE(SUM(saldo_pendiente), 0)
    INTO v_total_pendiente
    FROM deudas_fiados
    WHERE cliente_id = v_cliente_id AND estado != 'pagado';
    
    UPDATE clientes_fiados
    SET saldo_total = v_total_pendiente,
        updated_at = NOW()
    WHERE id = v_cliente_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_saldo_deuda ON deudas_fiados;
CREATE TRIGGER trigger_actualizar_saldo_deuda
AFTER INSERT OR UPDATE OR DELETE ON deudas_fiados
FOR EACH ROW
EXECUTE FUNCTION trg_actualizar_saldo_cliente();

-- 3. Actualizar totales de caja al vender
--    - efectivo / yape / plin / mixto → ingresos cobrados
--    - fiado → solo créditos otorgados (NO suma a efectivo ni digital)
CREATE OR REPLACE FUNCTION trg_actualizar_totales_caja()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.caja_id IS NOT NULL AND NEW.estado = 'completada' THEN
        IF NEW.metodo_pago = 'fiado' THEN
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

-- 4. Nota: los abonos de fiados actualizan la caja desde la API (server.js)
--    para evitar doble conteo. El monto del abono SÍ suma a ingresos cobrados.

-- 5. Actualizar total de gastos de caja chica y compras a proveedores
CREATE OR REPLACE FUNCTION trg_actualizar_gastos_caja()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo IN ('gasto_chica', 'compra_proveedor') THEN
        UPDATE cajas
        SET total_gastos = total_gastos + NEW.monto,
            updated_at = NOW()
        WHERE id = NEW.caja_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_gastos ON movimientos_caja;
CREATE TRIGGER trigger_actualizar_gastos
AFTER INSERT ON movimientos_caja
FOR EACH ROW
EXECUTE FUNCTION trg_actualizar_gastos_caja();

-- ==============================================================================
-- DATOS INICIALES SEMILLA (SEED DATA REALISTA PARA BODEGA)
-- ==============================================================================
INSERT INTO productos (codigo_barras, nombre, categoria, precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida)
VALUES
('7750106001017', 'Inca Kola 500ml Retornable', 'Bebidas', 2.50, 1.80, 24, 6, 'unidad'),
('7750106001024', 'Coca Cola 1.5L No Retornable', 'Bebidas', 7.50, 5.80, 12, 4, 'unidad'),
('7750150000010', 'Arroz Costeño Extra 1kg', 'Abarrotes', 4.80, 3.90, 30, 10, 'kg'),
('7750243000030', 'Aceite Primor Clásico 900ml', 'Abarrotes', 8.50, 6.90, 15, 5, 'unidad'),
('7750885000011', 'Leche Gloria Azul 400g', 'Lácteos', 4.20, 3.40, 48, 12, 'unidad'),
('7750885000028', 'Yogurt Gloria Fresa 1L', 'Lácteos', 6.80, 5.20, 8, 3, 'unidad'),
('HUEVOS-PARDOS', 'Huevo Pardo Calidad (Kilo)', 'Abarrotes', 8.50, 6.80, 20, 5, 'kg'),
('PAN-FRANCES', 'Pan Francés (Bolsa x 10)', 'Panadería', 3.00, 2.00, 15, 5, 'paquete'),
('7750000000012', 'Fideos Don Vittorio Spaghetti 450g', 'Abarrotes', 3.20, 2.40, 25, 8, 'unidad'),
('7750000000029', 'Azúcar Rubia Paramonga 1kg', 'Abarrotes', 4.00, 3.20, 25, 6, 'kg'),
('7750000000036', 'Galletas Sublime Chocolate 30g', 'Golosinas', 1.50, 1.00, 4, 10, 'unidad'), -- Alerta de stock bajo!
('7750000000043', 'Atún Campomar en Trozos 170g', 'Conservas', 5.50, 4.20, 18, 5, 'unidad'),
('7750000000050', 'Detergente Ace Floral 850g', 'Limpieza', 7.90, 6.10, 10, 3, 'unidad'),
('7750000000067', 'Jabón Bolívar Blanco 210g', 'Limpieza', 3.80, 2.90, 2, 5, 'unidad') -- Alerta de stock crítico!
ON CONFLICT (codigo_barras) DO NOTHING;

-- Clientes iniciales para la Libreta de Fiados
INSERT INTO clientes_fiados (nombre, telefono, direccion, limite_credito, saldo_total)
VALUES
('Doña Carmen Rosa Ramos', '987654321', 'Mz. B Lote 14 - Jr. Los Álamos', 250.00, 42.50),
('Don Julio Mendoza', '991223344', 'Pasaje San Martín 105', 150.00, 18.00),
('Sra. Patricia Valdivia', '976543210', 'Av. El Sol 432', 300.00, 0.00)
ON CONFLICT DO NOTHING;

-- Deudas de ejemplo vinculadas
DO $$
DECLARE
    v_cliente_carmen UUID;
    v_cliente_julio UUID;
BEGIN
    SELECT id INTO v_cliente_carmen FROM clientes_fiados WHERE nombre LIKE 'Doña Carmen%' LIMIT 1;
    SELECT id INTO v_cliente_julio FROM clientes_fiados WHERE nombre LIKE 'Don Julio%' LIMIT 1;

    IF v_cliente_carmen IS NOT NULL THEN
        INSERT INTO deudas_fiados (cliente_id, monto_original, saldo_pendiente, concepto, estado)
        VALUES (v_cliente_carmen, 42.50, 42.50, '1 Aceite Primor + 2 Leches Gloria + 1kg Arroz Costeño', 'pendiente')
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_cliente_julio IS NOT NULL THEN
        INSERT INTO deudas_fiados (cliente_id, monto_original, saldo_pendiente, concepto, estado)
        VALUES (v_cliente_julio, 18.00, 18.00, '2 Gaseosas Coca Cola 1.5L + Bolsa Pan Francés', 'pendiente')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Pedidos sugeridos para proveedores
INSERT INTO pedidos_proveedor (nombre_item, cantidad_sugerida, proveedor, estado, notas)
VALUES
('Galletas Sublime Chocolate 30g (Caja x 24)', 2, 'Distribuidora Nestlé', 'pendiente', 'Stock bajo en tienda'),
('Jabón Bolívar Blanco 210g (Fardo x 12)', 3, 'Alicorp Distribución', 'pendiente', 'Quedan solo 2 unidades'),
('Leche Gloria Azul 400g (Caja x 24)', 2, 'Gloria Perú', 'pedido', 'Pedido programado para mañana martes')
ON CONFLICT DO NOTHING;

-- Habilitar Row Level Security (RLS) pero permitir acceso con Anon para lectura/escritura en punto de venta
ALTER TABLE cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_fiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas_fiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_fiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedor ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso anónimo / autenticado público para agilidad en bodega:
CREATE POLICY "Permitir todo a cajas" ON cajas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a movimientos_caja" ON movimientos_caja FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a productos" ON productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a ventas" ON ventas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a detalle_ventas" ON detalle_ventas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a clientes_fiados" ON clientes_fiados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a deudas_fiados" ON deudas_fiados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a abonos_fiados" ON abonos_fiados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a pedidos_proveedor" ON pedidos_proveedor FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- MIGRACIÓN / ACTUALIZACIONES PARA BASES DE DATOS EXISTENTES
-- ==============================================================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE cajas ADD COLUMN IF NOT EXISTS total_fiados_otorgados NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_tipo_check;
ALTER TABLE movimientos_caja ADD CONSTRAINT movimientos_caja_tipo_check 
CHECK (tipo IN ('gasto_chica', 'ingreso_extra', 'compra_proveedor'));

