# 🏪 Sistema Integral de Gestión para Bodega (Minimarket)

Sistema web transaccional full-stack de alto rendimiento diseñado específicamente para la operativa diaria de bodegas y minimarkets de mostrador. Optimizado con un enfoque **Mobile-First** táctil (celular o tablet en mostrador) y de escritorio, con soporte nativo para **Supabase (PostgreSQL)**, pagos con **Yape / Plin**, control de **Efectivo y Cuadre de Caja Mixto**, **Libreta de Fiados** y despliegue directo en **Render**.

---

## 🚀 Características Principales y Módulos

### 💵 Módulo 1: Apertura y Cierre de Caja (Control de Efectivo y Cuadre Mixto)
- **Fondo Inicial:** Registro obligatorio de sencillo/monedas de apertura para dar vuelto.
- **Flujo en Tiempo Real:** Suma automática de ventas en efectivo, gastos menores (salidas de caja chica para bolsas, pagos menores) y separación exacta de ingresos digitales (Yape/Plin).
- **Corte Diario y Arqueo:** Al cerrar el turno, contrasta el conteo físico de billetes/monedas contra el saldo teórico del sistema y el acumulado en la app digital, calculando automáticamente **Cuadre Exacto**, **Sobrante (+)** o **Faltante (-)**.

### 📦 Módulo 2: Catálogo de Productos y Precios
- **CRUD Completo:** Alta, modificación, desactivación y consulta de productos con precio de venta, costo, código de barras y unidad de medida.
- **Alertas Visuales de Stock:** Indicador dinámico en verde (saludable), ámbar con pulso suave (stock bajo $\le$ mínimo) y rojo pulsante (producto agotado = 0).
- **Filtros Ágiles:** Búsqueda en tiempo real por nombre, código de barras o categoría.

### ⚡ Módulo 3: Punto de Venta (POS / Registro de Ventas)
- **Interfaz Táctil Rápida:** Grilla de productos con selección en un toque y soporte para lector de código de barras.
- **Métodos de Pago:**
  - **Efectivo:** Botones de denominación rápida (S/ 10, S/ 20, S/ 50, S/ 100, Exacto) y cálculo automático del vuelto/cambio.
  - **Yape / Plin:** Registro de número de operación (voucher) y teléfono del cliente.
  - **Mixto:** Registro dividido entre efectivo y digital.
- **Apartado de Pagos Digitales:** Pantalla dedicada para auditar y verificar rápidamente en mostrador los "Yapeos" del día contra la app del celular.
- **Stock en Tiempo Real:** Cada venta descuenta inmediatamente el inventario e impacta en la caja activa.
- **Ticket Térmico:** Generación e impresión de comprobante formato 58mm / 80mm.

### 📖 Módulo 4: Libreta de Fiados (Cuentas por Cobrar)
- **Gestión de Clientes Fiadores:** Registro de clientes con límite de crédito, teléfono y dirección.
- **Anotación de Deudas:** Registro detallado de productos fiados con fecha y concepto.
- **Abonos y Liquidación:** Botón para registrar abonos parciales o liquidar la deuda por completo (en efectivo o Yape), recalculando el saldo en tiempo real.

### 🚚 Módulo 5: Gestión de Pedidos y Proveedores
- **Lista de Reabastecimiento:** Registro digital de pedidos a proveedores para evitar notas o papeles sueltos.
- **Sugeridos Inteligentes:** Generación automática de compras a partir de los productos con stock bajo o agotados.
- **Recepción de Mercadería:** Al marcar un pedido como recibido, el sistema puede sumar automáticamente las cantidades al stock del inventario.

### 📊 Módulo 6: Reportes y Bitácora del Día
- Total facturado del día desglosado en **Efectivo** y **Digital (Yape/Plin)**.
- Total acumulado en **Fiados por cobrar**.
- **Top 5** productos de mayor rotación y volumen de ventas.
- Panel de productos críticos que requieren compra inmediata.

---

## 🛠️ Stack Tecnológico

- **Backend:** Node.js + Express (API REST ligera, rápida y modular).
- **Base de Datos:** **Supabase** (PostgreSQL) con disparadores (Triggers) para descuento de stock automático y recálculo de saldos de fiados.
- **Modo Standby / Fallback Local:** Incluye un motor en memoria precargado para probar el sistema de inmediato incluso antes de conectar Supabase.
- **Frontend:** HTML5 semántico, CSS3 moderno con **Tailwind CSS**, JavaScript Vanilla modular y **Lucide Icons**.
- **Diseño:** 100% Responsivo (Mobile-First para mostrador en celular o tablet, más layout completo para PC de escritorio) con soporte para **Modo Claro / Modo Oscuro**.
- **Efectos:** Sonidos hápticos con Web Audio API (beeps de escaneo, cobro y alerta).

---

## 📁 Estructura del Proyecto

```text
sistema_central/
├── package.json               # Dependencias y scripts de Node.js
├── server.js                  # Servidor Express y API REST conectada a Supabase
├── render.yaml                # Especificación Blueprint para despliegue en Render
├── .env.example               # Plantilla de variables de entorno
├── .gitignore
├── README.md                  # Documentación integral
├── supabase/
│   └── schema.sql             # Script SQL completo: tablas, índices, triggers y seed
└── public/
    ├── index.html             # Interfaz web responsiva SPA
    ├── css/
    │   └── styles.css         # Estilos personalizados, temas y reglas de impresión
    └── js/
        ├── api.js             # Capa cliente HTTP y sistema de notificaciones/sonido
        ├── app.js             # Orquestador principal, temas y navegación
        └── modules/
            ├── caja.js        # Módulo 1: Turnos, caja chica y corte
            ├── productos.js   # Módulo 2: CRUD de catálogo y alertas
            ├── pos.js         # Módulo 3: Punto de venta y pagos Yape/Plin
            ├── fiados.js      # Módulo 4: Libreta de fiados y abonos
            ├── pedidos.js     # Módulo 5: Reabastecimiento a proveedores
            └── reportes.js    # Módulo 6: Métricas y top productos
```

---

## 🗄️ Configuración de la Base de Datos en Supabase

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. En el panel izquierdo de Supabase, dirígete a **SQL Editor**.
3. Abre el archivo [`supabase/schema.sql`](file:///home/cristhian/Documentos/sistema_central/supabase/schema.sql) de este repositorio, copia todo su contenido, pégalo en el editor de Supabase y presiona **Run**.
4. El script creará:
   - Las 8 tablas (`cajas`, `movimientos_caja`, `productos`, `ventas`, `detalle_ventas`, `clientes_fiados`, `deudas_fiados`, `pedidos_proveedor`).
   - Los disparadores automáticos (descuento de inventario, sumatoria de ventas a la caja activa, saldos de fiados).
   - Datos semilla de productos peruanos típicos (Inca Kola, Leche Gloria, Aceite Primor, Arroz, etc.).
5. Ve a **Project Settings -> API** y copia:
   - **Project URL**
   - **Project API Key (anon / public)**

---

## 💻 Ejecución Local

1. Clona o abre el directorio del proyecto:
   ```bash
   cd sistema_central
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. (Opcional) Configura tus credenciales creando un archivo `.env`:
   ```bash
   cp .env.example .env
   ```
   Edita `.env` con tu `SUPABASE_URL` y `SUPABASE_ANON_KEY`. *Si no las configuras, el sistema arranca automáticamente en modo local con datos simulados realistas.*
4. Inicia el servidor:
   ```bash
   npm start
   ```
5. Abre en tu navegador:
   ```text
   http://localhost:3000
   ```

---

## ☁️ Despliegue en Render (Paso a Paso)

Este proyecto está configurado para desplegarse como un **Web Service gratuito en Render**:

### Opción A: Despliegue con Blueprint (`render.yaml`)
1. Sube este proyecto a tu repositorio de GitHub o GitLab.
2. Ingresa a [render.com](https://render.com) e inicia sesión.
3. Haz clic en **New + -> Blueprint**.
4. Conecta tu repositorio. Render detectará automáticamente el archivo `render.yaml`.
5. En la sección de variables de entorno, ingresa tu `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
6. Haz clic en **Apply**.

### Opción B: Despliegue Manual como Web Service
1. En Render, presiona **New + -> Web Service**.
2. Conecta tu repositorio.
3. Configura los siguientes campos:
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
4. En **Environment Variables**, añade:
   - `SUPABASE_URL` = `https://tu-proyecto.supabase.co`
   - `SUPABASE_ANON_KEY` = `tu_anon_key`
5. Haz clic en **Create Web Service**. ¡En 1 minuto tu bodega estará en línea con HTTPS gratuito!

---

## ⌨️ Atajos Rápidos en Mostrador

- <kbd>F2</kbd>: Abre inmediatamente la ventana de cobro del carrito actual.
- <kbd>Enter</kbd> en el buscador: Si coincide con un código de barras exacto, agrega el producto al carrito al instante.
- <kbd>Esc</kbd>: Cierra cualquier modal abierto.
