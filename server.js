const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

let supabase = null;
let isSupabaseConfigured = false;

if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    isSupabaseConfigured = true;
    console.log('✅ Supabase Client configurado correctamente.');
  } catch (err) {
    console.warn('⚠️ Error al inicializar cliente Supabase:', err.message);
  }
} else {
  console.log('ℹ️ Supabase no configurado en variables de entorno. Iniciando en modo local/fallback.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================================================
// BASE DE DATOS LOCAL EN MEMORIA (FALLBACK / MOCK DATA REALISTA)
// Permite que la app funcione al 100% incluso antes de configurar Supabase
// ==============================================================================
let mockData = {
  cajas: [
    {
      id: 'caja-activa-01',
      fecha: new Date().toISOString().split('T')[0],
      hora_apertura: new Date().toISOString(),
      hora_cierre: null,
      monto_inicial: 100.00,
      total_ventas_efectivo: 85.50,
      total_ventas_digital: 52.00,
      total_gastos: 15.00,
      monto_cierre_efectivo: null,
      monto_cierre_digital: null,
      diferencia_efectivo: 0,
      diferencia_digital: 0,
      estado: 'abierta',
      observaciones: 'Apertura con sencillo en monedas de S/ 1, S/ 2 y S/ 5'
    },
    {
      id: 'caja-cerrada-02',
      fecha: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      hora_apertura: new Date(Date.now() - 86400000 - 36000000).toISOString(),
      hora_cierre: new Date(Date.now() - 86400000 + 3600000).toISOString(),
      monto_inicial: 80.00,
      total_ventas_efectivo: 245.50,
      total_ventas_digital: 178.00,
      total_gastos: 22.00,
      monto_cierre_efectivo: 303.50,
      monto_cierre_digital: 178.00,
      diferencia_efectivo: 0,
      diferencia_digital: 0,
      estado: 'cerrada',
      observaciones: 'Corte exacto del día anterior'
    },
    {
      id: 'caja-cerrada-03',
      fecha: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      hora_apertura: new Date(Date.now() - 172800000 - 36000000).toISOString(),
      hora_cierre: new Date(Date.now() - 172800000 + 7200000).toISOString(),
      monto_inicial: 100.00,
      total_ventas_efectivo: 312.00,
      total_ventas_digital: 210.50,
      total_gastos: 35.00,
      monto_cierre_efectivo: 372.00,
      monto_cierre_digital: 210.50,
      diferencia_efectivo: -5.00,
      diferencia_digital: 0,
      estado: 'cerrada',
      observaciones: 'Faltante menor de S/ 5.00 en efectivo'
    }
  ],
  movimientos_caja: [
    {
      id: 'mov-1',
      caja_id: 'caja-activa-01',
      tipo: 'gasto_chica',
      monto: 15.00,
      descripcion: 'Compra de bolsas plásticas y papel higiénico',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  productos: [
    { id: '1', codigo_barras: '7750106001017', nombre: 'Inca Kola 500ml Retornable', categoria: 'Bebidas', precio_venta: 2.50, precio_costo: 1.80, stock_actual: 24, stock_minimo: 6, unidad_medida: 'unidad', activo: true },
    { id: '2', codigo_barras: '7750106001024', nombre: 'Coca Cola 1.5L No Retornable', categoria: 'Bebidas', precio_venta: 7.50, precio_costo: 5.80, stock_actual: 12, stock_minimo: 4, unidad_medida: 'unidad', activo: true },
    { id: '3', codigo_barras: '7750150000010', nombre: 'Arroz Costeño Extra 1kg', categoria: 'Abarrotes', precio_venta: 4.80, precio_costo: 3.90, stock_actual: 30, stock_minimo: 10, unidad_medida: 'kg', activo: true },
    { id: '4', codigo_barras: '7750243000030', nombre: 'Aceite Primor Clásico 900ml', categoria: 'Abarrotes', precio_venta: 8.50, precio_costo: 6.90, stock_actual: 15, stock_minimo: 5, unidad_medida: 'unidad', activo: true },
    { id: '5', codigo_barras: '7750885000011', nombre: 'Leche Gloria Azul 400g', categoria: 'Lácteos', precio_venta: 4.20, precio_costo: 3.40, stock_actual: 48, stock_minimo: 12, unidad_medida: 'unidad', activo: true },
    { id: '6', codigo_barras: '7750885000028', nombre: 'Yogurt Gloria Fresa 1L', categoria: 'Lácteos', precio_venta: 6.80, precio_costo: 5.20, stock_actual: 8, stock_minimo: 3, unidad_medida: 'unidad', activo: true },
    { id: '7', codigo_barras: 'HUEVOS-PARDOS', nombre: 'Huevo Pardo Calidad (Kilo)', categoria: 'Abarrotes', precio_venta: 8.50, precio_costo: 6.80, stock_actual: 20, stock_minimo: 5, unidad_medida: 'kg', activo: true },
    { id: '8', codigo_barras: 'PAN-FRANCES', nombre: 'Pan Francés (Bolsa x 10)', categoria: 'Panadería', precio_venta: 3.00, precio_costo: 2.00, stock_actual: 15, stock_minimo: 5, unidad_medida: 'paquete', activo: true },
    { id: '9', codigo_barras: '7750000000012', nombre: 'Fideos Don Vittorio Spaghetti 450g', categoria: 'Abarrotes', precio_venta: 3.20, precio_costo: 2.40, stock_actual: 25, stock_minimo: 8, unidad_medida: 'unidad', activo: true },
    { id: '10', codigo_barras: '7750000000029', nombre: 'Azúcar Rubia Paramonga 1kg', categoria: 'Abarrotes', precio_venta: 4.00, precio_costo: 3.20, stock_actual: 25, stock_minimo: 6, unidad_medida: 'kg', activo: true },
    { id: '11', codigo_barras: '7750000000036', nombre: 'Galletas Sublime Chocolate 30g', categoria: 'Golosinas', precio_venta: 1.50, precio_costo: 1.00, stock_actual: 4, stock_minimo: 10, unidad_medida: 'unidad', activo: true },
    { id: '12', codigo_barras: '7750000000043', nombre: 'Atún Campomar en Trozos 170g', categoria: 'Conservas', precio_venta: 5.50, precio_costo: 4.20, stock_actual: 18, stock_minimo: 5, unidad_medida: 'unidad', activo: true },
    { id: '13', codigo_barras: '7750000000050', nombre: 'Detergente Ace Floral 850g', categoria: 'Limpieza', precio_venta: 7.90, precio_costo: 6.10, stock_actual: 10, stock_minimo: 3, unidad_medida: 'unidad', activo: true },
    { id: '14', codigo_barras: '7750000000067', nombre: 'Jabón Bolívar Blanco 210g', categoria: 'Limpieza', precio_venta: 3.80, precio_costo: 2.90, stock_actual: 2, stock_minimo: 5, unidad_medida: 'unidad', activo: true }
  ],
  ventas: [
    {
      id: 'v-101',
      caja_id: 'caja-activa-01',
      codigo_ticket: 'TKB-00101',
      total: 25.50,
      metodo_pago: 'efectivo',
      monto_recibido: 30.00,
      vuelto: 4.50,
      monto_efectivo: 25.50,
      monto_digital: 0,
      num_operacion: null,
      telefono_cliente: null,
      nombre_cliente: 'Cliente Mostrador',
      estado: 'completada',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      detalles: [
        { producto_id: '4', nombre_producto: 'Aceite Primor Clásico 900ml', cantidad: 1, precio_unitario: 8.50, subtotal: 8.50 },
        { producto_id: '3', nombre_producto: 'Arroz Costeño Extra 1kg', cantidad: 2, precio_unitario: 4.80, subtotal: 9.60 },
        { producto_id: '7', nombre_producto: 'Huevo Pardo Calidad (Kilo)', cantidad: 0.87, precio_unitario: 8.50, subtotal: 7.40 }
      ]
    },
    {
      id: 'v-102',
      caja_id: 'caja-activa-01',
      codigo_ticket: 'TKB-00102',
      total: 32.00,
      metodo_pago: 'yape',
      monto_recibido: 32.00,
      vuelto: 0,
      monto_efectivo: 0,
      monto_digital: 32.00,
      num_operacion: 'YAP-98124',
      telefono_cliente: '945-812-309',
      nombre_cliente: 'Marco Antonio',
      estado: 'completada',
      created_at: new Date(Date.now() - 4800000).toISOString(),
      detalles: [
        { producto_id: '5', nombre_producto: 'Leche Gloria Azul 400g', cantidad: 4, precio_unitario: 4.20, subtotal: 16.80 },
        { producto_id: '2', nombre_producto: 'Coca Cola 1.5L No Retornable', cantidad: 2, precio_unitario: 7.50, subtotal: 15.00 },
        { producto_id: '8', nombre_producto: 'Pan Francés (Bolsa x 10)', cantidad: 1, precio_unitario: 3.00, subtotal: 3.00 }
      ]
    },
    {
      id: 'v-103',
      caja_id: 'caja-activa-01',
      codigo_ticket: 'TKB-00103',
      total: 20.00,
      metodo_pago: 'plin',
      monto_recibido: 20.00,
      vuelto: 0,
      monto_efectivo: 0,
      monto_digital: 20.00,
      num_operacion: 'PLN-44910',
      telefono_cliente: '998-112-233',
      nombre_cliente: 'Lucía Fernández',
      estado: 'completada',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      detalles: [
        { producto_id: '13', nombre_producto: 'Detergente Ace Floral 850g', cantidad: 2, precio_unitario: 7.90, subtotal: 15.80 },
        { producto_id: '11', nombre_producto: 'Galletas Sublime Chocolate 30g', cantidad: 2, precio_unitario: 1.50, subtotal: 3.00 }
      ]
    }
  ],
  clientes_fiados: [
    {
      id: 'cli-1',
      nombre: 'Doña Carmen Rosa Ramos',
      telefono: '987-654-321',
      direccion: 'Mz. B Lote 14 - Jr. Los Álamos',
      limite_credito: 250.00,
      saldo_total: 42.50,
      activo: true
    },
    {
      id: 'cli-2',
      nombre: 'Don Julio Mendoza',
      telefono: '991-223-344',
      direccion: 'Pasaje San Martín 105',
      limite_credito: 150.00,
      saldo_total: 18.00,
      activo: true
    },
    {
      id: 'cli-3',
      nombre: 'Sra. Patricia Valdivia',
      telefono: '976-543-210',
      direccion: 'Av. El Sol 432',
      limite_credito: 300.00,
      saldo_total: 0.00,
      activo: true
    }
  ],
  deudas_fiados: [
    {
      id: 'deuda-1',
      cliente_id: 'cli-1',
      monto_original: 42.50,
      saldo_pendiente: 42.50,
      concepto: '1 Aceite Primor + 2 Leches Gloria + 1kg Arroz Costeño',
      estado: 'pendiente',
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'deuda-2',
      cliente_id: 'cli-2',
      monto_original: 18.00,
      saldo_pendiente: 18.00,
      concepto: '2 Gaseosas Coca Cola 1.5L + Bolsa Pan Francés',
      estado: 'pendiente',
      created_at: new Date(Date.now() - 43200000).toISOString()
    }
  ],
  abonos_fiados: [],
  pedidos_proveedor: [
    {
      id: 'ped-1',
      producto_id: '11',
      nombre_item: 'Galletas Sublime Chocolate 30g (Caja x 24)',
      cantidad_sugerida: 2,
      proveedor: 'Distribuidora Nestlé',
      estado: 'pendiente',
      notas: 'Quedan solo 4 unidades en mostrador'
    },
    {
      id: 'ped-2',
      producto_id: '14',
      nombre_item: 'Jabón Bolívar Blanco 210g (Fardo x 12)',
      cantidad_sugerida: 3,
      proveedor: 'Alicorp Distribución',
      estado: 'pendiente',
      notas: 'Stock crítico: solo 2 unidades'
    },
    {
      id: 'ped-3',
      producto_id: '5',
      nombre_item: 'Leche Gloria Azul 400g (Caja x 24)',
      cantidad_sugerida: 2,
      proveedor: 'Gloria Perú',
      estado: 'pedido',
      notas: 'Pedido confirmado para entrega mañana'
    }
  ]
};

// ==============================================================================
// RUTAS DE ESTADO Y CONFIGURACIÓN
// ==============================================================================
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured,
    supabaseUrl: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 15)}...` : null,
    mode: isSupabaseConfigured ? 'supabase' : 'local-mock',
    serverTime: new Date().toISOString()
  });
});

// Guardar credenciales de Supabase en tiempo de ejecución (opcional desde la interfaz)
app.post('/api/config/supabase', (req, res) => {
  const { url, key } = req.body;
  if (!url || !key) {
    return res.status(400).json({ error: 'URL y Anon Key son requeridos.' });
  }
  try {
    supabase = createClient(url, key);
    isSupabaseConfigured = true;
    res.json({ ok: true, message: 'Conectado a Supabase exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al conectar: ' + err.message });
  }
});

// ==============================================================================
// MÓDULO 1: APERTURA Y CIERRE DE CAJA
// ==============================================================================
// Obtener caja actualmente abierta
app.get('/api/caja/activa', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('estado', 'abierta')
        .order('hora_apertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return res.json({ caja: data || null });
    }

    const cajaActiva = mockData.cajas.find(c => c.estado === 'abierta') || null;
    res.json({ caja: cajaActiva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Abrir nueva caja
app.post('/api/caja/abrir', async (req, res) => {
  const { monto_inicial, observaciones } = req.body;
  const fondo = parseFloat(monto_inicial) || 0;

  try {
    if (isSupabaseConfigured) {
      // Verificar si ya hay una abierta
      const { data: abierta } = await supabase
        .from('cajas')
        .select('id')
        .eq('estado', 'abierta')
        .maybeSingle();

      if (abierta) {
        return res.status(400).json({ error: 'Ya existe una caja abierta en curso.' });
      }

      const { data, error } = await supabase
        .from('cajas')
        .insert([{
          monto_inicial: fondo,
          observaciones: observaciones || 'Apertura de turno',
          estado: 'abierta'
        }])
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, caja: data });
    }

    // Mock
    const abierta = mockData.cajas.find(c => c.estado === 'abierta');
    if (abierta) {
      return res.status(400).json({ error: 'Ya existe una caja abierta.' });
    }

    const nuevaCaja = {
      id: 'caja-' + Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      hora_apertura: new Date().toISOString(),
      hora_cierre: null,
      monto_inicial: fondo,
      total_ventas_efectivo: 0,
      total_ventas_digital: 0,
      total_gastos: 0,
      monto_cierre_efectivo: null,
      monto_cierre_digital: null,
      diferencia_efectivo: 0,
      diferencia_digital: 0,
      estado: 'abierta',
      observaciones: observaciones || 'Apertura de turno'
    };
    mockData.cajas.unshift(nuevaCaja);
    res.json({ ok: true, caja: nuevaCaja });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cerrar caja (Corte Diario con cálculo de cuadre)
app.post('/api/caja/cerrar', async (req, res) => {
  const { caja_id, monto_cierre_efectivo, monto_cierre_digital, observaciones } = req.body;
  const conteoEfectivo = parseFloat(monto_cierre_efectivo) || 0;
  const conteoDigital = parseFloat(monto_cierre_digital) || 0;

  try {
    if (isSupabaseConfigured) {
      const { data: caja, error: errCaja } = await supabase
        .from('cajas')
        .select('*')
        .eq('id', caja_id)
        .single();

      if (errCaja || !caja) return res.status(404).json({ error: 'Caja no encontrada' });

      const esperadoEfectivo = (parseFloat(caja.monto_inicial) + parseFloat(caja.total_ventas_efectivo)) - parseFloat(caja.total_gastos);
      const esperadoDigital = parseFloat(caja.total_ventas_digital);

      const difEfectivo = conteoEfectivo - esperadoEfectivo;
      const difDigital = conteoDigital - esperadoDigital;

      const { data, error } = await supabase
        .from('cajas')
        .update({
          hora_cierre: new Date().toISOString(),
          monto_cierre_efectivo: conteoEfectivo,
          monto_cierre_digital: conteoDigital,
          diferencia_efectivo: difEfectivo,
          diferencia_digital: difDigital,
          estado: 'cerrada',
          observaciones: observaciones || caja.observaciones
        })
        .eq('id', caja_id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, caja: data, esperadoEfectivo, esperadoDigital, difEfectivo, difDigital });
    }

    const caja = mockData.cajas.find(c => c.id === caja_id);
    if (!caja) return res.status(404).json({ error: 'Caja no encontrada' });

    const esperadoEfectivo = (caja.monto_inicial + caja.total_ventas_efectivo) - caja.total_gastos;
    const esperadoDigital = caja.total_ventas_digital;
    const difEfectivo = conteoEfectivo - esperadoEfectivo;
    const difDigital = conteoDigital - esperadoDigital;

    caja.hora_cierre = new Date().toISOString();
    caja.monto_cierre_efectivo = conteoEfectivo;
    caja.monto_cierre_digital = conteoDigital;
    caja.diferencia_efectivo = difEfectivo;
    caja.diferencia_digital = difDigital;
    caja.estado = 'cerrada';
    if (observaciones) caja.observaciones = observaciones;

    res.json({ ok: true, caja, esperadoEfectivo, esperadoDigital, difEfectivo, difDigital });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar gasto de caja chica o movimiento
app.post('/api/caja/movimiento', async (req, res) => {
  const { caja_id, tipo, monto, descripcion } = req.body;
  const numMonto = parseFloat(monto);

  if (!numMonto || numMonto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('movimientos_caja')
        .insert([{ caja_id, tipo: tipo || 'gasto_chica', monto: numMonto, descripcion }])
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, movimiento: data });
    }

    const mov = {
      id: 'mov-' + Date.now(),
      caja_id,
      tipo: tipo || 'gasto_chica',
      monto: numMonto,
      descripcion,
      created_at: new Date().toISOString()
    };
    mockData.movimientos_caja.unshift(mov);

    const caja = mockData.cajas.find(c => c.id === caja_id);
    if (caja && (mov.tipo === 'gasto_chica' || mov.tipo === 'compra_proveedor')) {
      caja.total_gastos += numMonto;
    }

    res.json({ ok: true, movimiento: mov });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar movimientos de caja
app.get('/api/caja/:caja_id/movimientos', async (req, res) => {
  const { caja_id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('caja_id', caja_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ movimientos: data });
    }

    const lista = mockData.movimientos_caja.filter(m => m.caja_id === caja_id);
    res.json({ movimientos: lista });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial de cajas cerradas
app.get('/api/caja/historial', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('estado', 'cerrada')
        .order('fecha', { ascending: false })
        .order('hora_cierre', { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.json({ cajas: data || [] });
    }

    const cerradas = mockData.cajas
      .filter(c => c.estado === 'cerrada')
      .sort((a, b) => {
        const fechaA = new Date(b.hora_cierre || b.fecha).getTime();
        const fechaB = new Date(a.hora_cierre || a.fecha).getTime();
        return fechaA - fechaB;
      });

    res.json({ cajas: cerradas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// MÓDULO 2: CATÁLOGO DE PRODUCTOS (CRUD Y ALERTAS)
// ==============================================================================
app.get('/api/productos', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      return res.json({ productos: data });
    }

    res.json({ productos: mockData.productos.filter(p => p.activo) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', async (req, res) => {
  const { codigo_barras, nombre, categoria, precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida, imagen_url } = req.body;
  if (!nombre || precio_venta == null) {
    return res.status(400).json({ error: 'Nombre y precio de venta son obligatorios.' });
  }

  const nuevoProd = {
    codigo_barras: codigo_barras?.trim() || null,
    nombre: nombre.trim(),
    categoria: categoria?.trim() || 'Abarrotes',
    precio_venta: parseFloat(precio_venta),
    precio_costo: parseFloat(precio_costo) || 0,
    stock_actual: parseFloat(stock_actual) || 0,
    stock_minimo: parseFloat(stock_minimo) || 5,
    unidad_medida: unidad_medida || 'unidad',
    imagen_url: imagen_url?.trim() || null,
    activo: true
  };

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('productos')
        .insert([nuevoProd])
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, producto: data });
    }

    nuevoProd.id = 'prod-' + Date.now();
    mockData.productos.push(nuevoProd);
    res.json({ ok: true, producto: nuevoProd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Importación masiva de productos (Excel / CSV)
app.post('/api/productos/bulk', async (req, res) => {
  const { productos } = req.body;
  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Lista de productos vacía o inválida.' });
  }

  const procesados = productos.map(p => ({
    codigo_barras: p.codigo_barras ? String(p.codigo_barras).trim() : null,
    nombre: String(p.nombre || 'Producto').trim(),
    categoria: String(p.categoria || 'Abarrotes').trim(),
    precio_venta: Math.max(0, parseFloat(p.precio_venta) || 0),
    precio_costo: Math.max(0, parseFloat(p.precio_costo) || 0),
    stock_actual: Math.max(0, parseFloat(p.stock_actual) || 0),
    stock_minimo: Math.max(0, parseFloat(p.stock_minimo) || 5),
    unidad_medida: String(p.unidad_medida || 'unidad').trim(),
    imagen_url: p.imagen_url ? String(p.imagen_url).trim() : null,
    activo: true
  }));

  try {
    if (isSupabaseConfigured) {
      // Upsert por código de barras si está disponible, o insert
      const conCodigo = procesados.filter(p => p.codigo_barras);
      const sinCodigo = procesados.filter(p => !p.codigo_barras);

      let insertados = [];

      if (conCodigo.length > 0) {
        const { data: upsertData, error: errUpsert } = await supabase
          .from('productos')
          .upsert(conCodigo, { onConflict: 'codigo_barras' })
          .select();
        if (errUpsert) throw errUpsert;
        if (upsertData) insertados.push(...upsertData);
      }

      if (sinCodigo.length > 0) {
        const { data: insData, error: errIns } = await supabase
          .from('productos')
          .insert(sinCodigo)
          .select();
        if (errIns) throw errIns;
        if (insData) insertados.push(...insData);
      }

      return res.json({ ok: true, count: insertados.length, productos: insertados });
    }

    // Modo local / mock
    let count = 0;
    for (const p of procesados) {
      let existente = null;
      if (p.codigo_barras) {
        existente = mockData.productos.find(x => x.codigo_barras === p.codigo_barras);
      }
      if (existente) {
        Object.assign(existente, p);
      } else {
        p.id = 'prod-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        mockData.productos.push(p);
      }
      count++;
    }

    res.json({ ok: true, count, productos: mockData.productos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('productos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, producto: data });
    }

    const index = mockData.productos.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });

    mockData.productos[index] = { ...mockData.productos[index], ...updates };
    res.json({ ok: true, producto: mockData.productos[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
      return res.json({ ok: true });
    }

    const prod = mockData.productos.find(p => p.id === id);
    if (prod) prod.activo = false;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// MÓDULO 3: PUNTO DE VENTA (POS / REGISTRO DE VENTAS Y YAPE/PLIN)
// ==============================================================================
app.post('/api/ventas', async (req, res) => {
  const {
    caja_id,
    metodo_pago,
    monto_recibido,
    num_operacion,
    telefono_cliente,
    nombre_cliente,
    cliente_id,
    concepto,
    items
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'El carrito no contiene productos' });
  }

  if (metodo_pago === 'fiado' && !cliente_id) {
    return res.status(400).json({ error: 'Debes seleccionar un cliente para registrar el fiado' });
  }

  const total = items.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);
  const ticketCode = 'TKB-' + Math.floor(10000 + Math.random() * 90000);
  const esFiado = metodo_pago === 'fiado';
  const recibido = esFiado ? 0 : (parseFloat(monto_recibido) || total);
  const vuelto = metodo_pago === 'efectivo' ? Math.max(0, recibido - total) : 0;

  // Fiado: nunca suma efectivo ni digital a caja (trigger SQL también ignora 'fiado')
  const monto_efectivo = esFiado
    ? 0
    : ((metodo_pago === 'efectivo') ? total : (metodo_pago === 'mixto' ? (req.body.monto_efectivo || 0) : 0));
  const monto_digital = esFiado
    ? 0
    : ((metodo_pago === 'yape' || metodo_pago === 'plin') ? total : (metodo_pago === 'mixto' ? (req.body.monto_digital || 0) : 0));

  try {
    if (isSupabaseConfigured) {
      // 1. Insertar venta
      const { data: venta, error: errVenta } = await supabase
        .from('ventas')
        .insert([{
          caja_id: caja_id || null,
          codigo_ticket: ticketCode,
          total,
          metodo_pago,
          monto_recibido: esFiado ? 0 : recibido,
          vuelto: esFiado ? 0 : vuelto,
          monto_efectivo,
          monto_digital,
          num_operacion: num_operacion || null,
          telefono_cliente: telefono_cliente || null,
          nombre_cliente: nombre_cliente || 'Cliente General',
          estado: 'completada'
        }])
        .select()
        .single();

      if (errVenta) throw errVenta;

      // 2. Insertar detalles de la venta (el trigger en postgres descontará stock automáticamente)
      const detallesInsert = items.map(it => ({
        venta_id: venta.id,
        producto_id: it.producto_id,
        nombre_producto: it.nombre,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.precio_unitario * it.cantidad
      }));

      const { error: errDet } = await supabase.from('detalle_ventas').insert(detallesInsert);
      if (errDet) throw errDet;

      // 3. Venta fiada: registrar deuda obligatoria (stock ya descontado; caja no se incrementa)
      let deudaGenerada = null;
      if (esFiado) {
        const resumenConcepto = concepto || items.map(it => `${it.cantidad}x ${it.nombre}`).join(' + ');
        const { data: deuda, error: errDeuda } = await supabase
          .from('deudas_fiados')
          .insert([{
            cliente_id,
            venta_id: venta.id,
            monto_original: total,
            saldo_pendiente: total,
            concepto: resumenConcepto,
            estado: 'pendiente'
          }])
          .select()
          .single();

        if (errDeuda) throw errDeuda;
        deudaGenerada = deuda;
      }

      return res.json({ ok: true, venta, items: detallesInsert, deuda: deudaGenerada });
    }

    // Mock local
    const venta = {
      id: 'v-' + Date.now(),
      caja_id,
      codigo_ticket: ticketCode,
      total,
      metodo_pago,
      monto_recibido: esFiado ? 0 : recibido,
      vuelto: esFiado ? 0 : vuelto,
      monto_efectivo,
      monto_digital,
      num_operacion: num_operacion || null,
      telefono_cliente: telefono_cliente || null,
      nombre_cliente: nombre_cliente || 'Cliente General',
      estado: 'completada',
      created_at: new Date().toISOString(),
      detalles: items.map(it => ({
        producto_id: it.producto_id,
        nombre_producto: it.nombre,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.precio_unitario * it.cantidad
      }))
    };

    // Descontar inventario en memoria
    for (const it of items) {
      const prod = mockData.productos.find(p => p.id === it.producto_id);
      if (prod) {
        prod.stock_actual = Math.max(0, prod.stock_actual - it.cantidad);
      }
    }

    // Actualizar caja en memoria (SOLO efectivo o digital, NUNCA fiado)
    const caja = mockData.cajas.find(c => c.id === caja_id);
    if (caja && !esFiado) {
      if (metodo_pago === 'efectivo') caja.total_ventas_efectivo += total;
      else if (metodo_pago === 'yape' || metodo_pago === 'plin') caja.total_ventas_digital += total;
      else if (metodo_pago === 'mixto') {
        caja.total_ventas_efectivo += monto_efectivo;
        caja.total_ventas_digital += monto_digital;
      }
    }

    // Fiado: registrar deuda en libreta (mock)
    let deudaMock = null;
    if (esFiado) {
      const resumenConcepto = concepto || items.map(it => `${it.cantidad}x ${it.nombre}`).join(' + ');
      deudaMock = {
        id: 'deuda-' + Date.now(),
        cliente_id,
        venta_id: venta.id,
        monto_original: total,
        saldo_pendiente: total,
        concepto: resumenConcepto,
        estado: 'pendiente',
        created_at: new Date().toISOString()
      };
      mockData.deudas_fiados.unshift(deudaMock);

      const cli = mockData.clientes_fiados.find(c => c.id === cliente_id);
      if (cli) {
        cli.saldo_total = (cli.saldo_total || 0) + total;
      }
    }

    mockData.ventas.unshift(venta);
    res.json({ ok: true, venta, items: venta.detalles, deuda: deudaMock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar ventas recientes y pagos digitales
app.get('/api/ventas', async (req, res) => {
  const { metodo, limite } = req.query;
  const limitCount = parseInt(limite) || 50;

  try {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('ventas')
        .select('*, detalle_ventas(*)')
        .order('created_at', { ascending: false })
        .limit(limitCount);

      if (metodo) {
        query = query.eq('metodo_pago', metodo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.json({ ventas: data });
    }

    let list = mockData.ventas;
    if (metodo) {
      list = list.filter(v => v.metodo_pago === metodo);
    }
    res.json({ ventas: list.slice(0, limitCount) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// MÓDULO 4: LIBRETA DE FIADOS (CUENTAS POR COBRAR)
// ==============================================================================
// Listar clientes fiadores y sus deudas
app.get('/api/fiados/clientes', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('clientes_fiados')
        .select('*, deudas_fiados(*)')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      return res.json({ clientes: data });
    }

    const conDeudas = mockData.clientes_fiados.map(cli => ({
      ...cli,
      deudas_fiados: mockData.deudas_fiados.filter(d => d.cliente_id === cli.id)
    }));
    res.json({ clientes: conDeudas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear cliente fiador
app.post('/api/fiados/clientes', async (req, res) => {
  const { nombre, telefono, direccion, limite_credito } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });

  const nuevo = {
    nombre: nombre.trim(),
    telefono: telefono?.trim() || '',
    direccion: direccion?.trim() || '',
    limite_credito: parseFloat(limite_credito) || 200.00,
    saldo_total: 0.00,
    activo: true
  };

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('clientes_fiados')
        .insert([nuevo])
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, cliente: data });
    }

    nuevo.id = 'cli-' + Date.now();
    mockData.clientes_fiados.push(nuevo);
    res.json({ ok: true, cliente: nuevo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar nuevo fiado a un cliente
app.post('/api/fiados/deudas', async (req, res) => {
  const { cliente_id, monto, concepto } = req.body;
  const numMonto = parseFloat(monto);

  if (!cliente_id || !numMonto || numMonto <= 0) {
    return res.status(400).json({ error: 'Cliente y monto válido requeridos' });
  }

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('deudas_fiados')
        .insert([{
          cliente_id,
          monto_original: numMonto,
          saldo_pendiente: numMonto,
          concepto: concepto || 'Compra a cuenta',
          estado: 'pendiente'
        }])
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, deuda: data });
    }

    const nuevaDeuda = {
      id: 'deuda-' + Date.now(),
      cliente_id,
      monto_original: numMonto,
      saldo_pendiente: numMonto,
      concepto: concepto || 'Compra a cuenta',
      estado: 'pendiente',
      created_at: new Date().toISOString()
    };
    mockData.deudas_fiados.unshift(nuevaDeuda);

    const cliente = mockData.clientes_fiados.find(c => c.id === cliente_id);
    if (cliente) {
      cliente.saldo_total = (cliente.saldo_total || 0) + numMonto;
    }

    res.json({ ok: true, deuda: nuevaDeuda });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar Abono o Liquidación de deuda
app.post('/api/fiados/abonos', async (req, res) => {
  const { cliente_id, deuda_id, monto, metodo_pago, num_operacion, notas, caja_id } = req.body;
  const abonoMonto = parseFloat(monto);

  if (!cliente_id || !abonoMonto || abonoMonto <= 0) {
    return res.status(400).json({ error: 'Datos de abono incompletos o monto inválido' });
  }

  try {
    if (isSupabaseConfigured) {
      // 1. Insertar abono
      const { data: abono, error: errAbono } = await supabase
        .from('abonos_fiados')
        .insert([{
          cliente_id,
          deuda_id: deuda_id || null,
          caja_id: caja_id || null,
          monto: abonoMonto,
          metodo_pago: metodo_pago || 'efectivo',
          num_operacion: num_operacion || null,
          notas: notas || 'Abono a cuenta'
        }])
        .select()
        .single();

      if (errAbono) throw errAbono;

      // 2. Descontar de deudas pendientes
      if (deuda_id) {
        const { data: deuda } = await supabase.from('deudas_fiados').select('*').eq('id', deuda_id).single();
        if (deuda) {
          const nuevoSaldo = Math.max(0, deuda.saldo_pendiente - abonoMonto);
          const nuevoEstado = nuevoSaldo === 0 ? 'pagado' : 'parcial';
          await supabase.from('deudas_fiados').update({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado }).eq('id', deuda_id);
        }
      } else {
        // Reducir en cascada las deudas más antiguas
        const { data: deudasPendientes } = await supabase
          .from('deudas_fiados')
          .select('*')
          .eq('cliente_id', cliente_id)
          .neq('estado', 'pagado')
          .order('created_at', { ascending: true });

        let restante = abonoMonto;
        for (const d of (deudasPendientes || [])) {
          if (restante <= 0) break;
          const descontar = Math.min(d.saldo_pendiente, restante);
          const nSaldo = d.saldo_pendiente - descontar;
          const nEst = nSaldo === 0 ? 'pagado' : 'parcial';
          await supabase.from('deudas_fiados').update({ saldo_pendiente: nSaldo, estado: nEst }).eq('id', d.id);
          restante -= descontar;
        }
      }

      return res.json({ ok: true, abono });
    }

    // Mock local
    const nuevoAbono = {
      id: 'abono-' + Date.now(),
      cliente_id,
      deuda_id: deuda_id || null,
      monto: abonoMonto,
      metodo_pago: metodo_pago || 'efectivo',
      num_operacion,
      notas: notas || 'Abono a cuenta',
      created_at: new Date().toISOString()
    };
    mockData.abonos_fiados.unshift(nuevoAbono);

    // Actualizar deudas en memoria
    let restante = abonoMonto;
    const deudasCliente = mockData.deudas_fiados
      .filter(d => d.cliente_id === cliente_id && d.estado !== 'pagado')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    for (const d of deudasCliente) {
      if (restante <= 0) break;
      const desc = Math.min(d.saldo_pendiente, restante);
      d.saldo_pendiente -= desc;
      d.estado = d.saldo_pendiente <= 0.001 ? 'pagado' : 'parcial';
      restante -= desc;
    }

    // Actualizar saldo total del cliente
    const cliente = mockData.clientes_fiados.find(c => c.id === cliente_id);
    if (cliente) {
      const sumPendiente = mockData.deudas_fiados
        .filter(d => d.cliente_id === cliente_id && d.estado !== 'pagado')
        .reduce((sum, d) => sum + d.saldo_pendiente, 0);
      cliente.saldo_total = sumPendiente;
    }

    res.json({ ok: true, abono: nuevoAbono });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// MÓDULO 5: GESTIÓN DE PEDIDOS Y PROVEEDORES
// ==============================================================================
app.get('/api/pedidos', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('pedidos_proveedor')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ pedidos: data });
    }

    res.json({ pedidos: mockData.pedidos_proveedor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { producto_id, nombre_item, cantidad_sugerida, proveedor, notas } = req.body;
  if (!nombre_item) return res.status(400).json({ error: 'Nombre del item es requerido' });

  const nuevoItem = {
    producto_id: producto_id || null,
    nombre_item: nombre_item.trim(),
    cantidad_sugerida: parseFloat(cantidad_sugerida) || 1,
    proveedor: proveedor?.trim() || 'General',
    estado: 'pendiente',
    notas: notas?.trim() || ''
  };

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('pedidos_proveedor')
        .insert([nuevoItem])
        .select()
        .single();

      if (error) throw error;
      return res.json({ ok: true, pedido: data });
    }

    nuevoItem.id = 'ped-' + Date.now();
    nuevoItem.created_at = new Date().toISOString();
    mockData.pedidos_proveedor.unshift(nuevoItem);
    res.json({ ok: true, pedido: nuevoItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambiar estado de pedido (pendiente -> pedido -> recibido)
app.put('/api/pedidos/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado, reabastecer_stock } = req.body;

  try {
    if (isSupabaseConfigured) {
      const { data: pedido, error: errPed } = await supabase
        .from('pedidos_proveedor')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (errPed) throw errPed;

      // Si se marca como recibido y está vinculado a un producto, opcionalmente incrementar stock
      if (estado === 'recibido' && reabastecer_stock && pedido.producto_id) {
        const { data: prod } = await supabase.from('productos').select('stock_actual').eq('id', pedido.producto_id).single();
        if (prod) {
          await supabase.from('productos')
            .update({ stock_actual: prod.stock_actual + pedido.cantidad_sugerida })
            .eq('id', pedido.producto_id);
        }
      }

      return res.json({ ok: true, pedido });
    }

    const item = mockData.pedidos_proveedor.find(p => p.id === id);
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado' });

    item.estado = estado;
    if (estado === 'recibido' && reabastecer_stock && item.producto_id) {
      const prod = mockData.productos.find(p => p.id === item.producto_id);
      if (prod) {
        prod.stock_actual += item.cantidad_sugerida;
      }
    }

    res.json({ ok: true, pedido: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// MÓDULO 6: REPORTES BÁSICOS Y BITÁCORA
// ==============================================================================
app.get('/api/reportes/resumen', async (req, res) => {
  try {
    let productos = [];
    let ventas = [];
    let clientes = [];
    let deudas = [];
    let cajaActiva = null;

    if (isSupabaseConfigured) {
      const [rProd, rVentas, rCli, rDeudas, rCaja] = await Promise.all([
        supabase.from('productos').select('*').eq('activo', true),
        supabase.from('ventas').select('*, detalle_ventas(*)').order('created_at', { ascending: false }).limit(200),
        supabase.from('clientes_fiados').select('*').eq('activo', true),
        supabase.from('deudas_fiados').select('*').neq('estado', 'pagado'),
        supabase.from('cajas').select('*').eq('estado', 'abierta').order('hora_apertura', { ascending: false }).limit(1).maybeSingle()
      ]);

      productos = rProd.data || [];
      ventas = rVentas.data || [];
      clientes = rCli.data || [];
      deudas = rDeudas.data || [];
      cajaActiva = rCaja.data || null;
    } else {
      productos = mockData.productos;
      ventas = mockData.ventas;
      clientes = mockData.clientes_fiados;
      deudas = mockData.deudas_fiados.filter(d => d.estado !== 'pagado');
      cajaActiva = mockData.cajas.find(c => c.estado === 'abierta') || null;
    }

    // Cálculos de ventas de hoy
    const hoyStr = new Date().toISOString().split('T')[0];
    const ventasHoy = ventas.filter(v => v.created_at && v.created_at.startsWith(hoyStr));

    const totalVentasHoy = ventasHoy.reduce((s, v) => s + (parseFloat(v.total) || 0), 0);
    const ventasEfectivoHoy = ventasHoy.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + (parseFloat(v.total) || 0), 0);
    const ventasDigitalHoy = ventasHoy.filter(v => v.metodo_pago === 'yape' || v.metodo_pago === 'plin').reduce((s, v) => s + (parseFloat(v.total) || 0), 0);

    // Total fiados por cobrar
    const totalPorCobrar = deudas.reduce((s, d) => s + (parseFloat(d.saldo_pendiente) || 0), 0);

    // Alertas de stock bajo
    const productosStockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo);

    // Ranking de productos más vendidos
    const conteoProductos = {};
    for (const v of ventas) {
      const items = v.detalle_ventas || v.detalles || [];
      for (const item of items) {
        const key = item.nombre_producto || 'Item';
        if (!conteoProductos[key]) {
          conteoProductos[key] = { nombre: key, cantidad: 0, total: 0 };
        }
        conteoProductos[key].cantidad += parseFloat(item.cantidad) || 0;
        conteoProductos[key].total += (parseFloat(item.precio_unitario) || 0) * (parseFloat(item.cantidad) || 0);
      }
    }

    const ranking = Object.values(conteoProductos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    res.json({
      totalVentasHoy,
      ventasEfectivoHoy,
      ventasDigitalHoy,
      totalPorCobrar,
      numClientesConDeuda: clientes.filter(c => c.saldo_total > 0).length,
      productosStockBajoCount: productosStockBajo.length,
      productosStockBajo,
      rankingTopVentas: ranking,
      cajaActiva
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback a frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Sistema de Gestión Bodega activo en puerto: ${PORT}`);
  console.log(`📍 URL local: http://localhost:${PORT}`);
  console.log(`📡 Modo de datos: ${isSupabaseConfigured ? 'Supabase Cloud (PostgreSQL)' : 'Local Fallback / Standby'}`);
  console.log(`=======================================================`);
});
