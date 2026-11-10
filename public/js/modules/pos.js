// ==============================================================================
// MÓDULO 3: PUNTO DE VENTA (POS, FIADO DIRECTO, CÁMARA Y YAPE/PLIN)
// ==============================================================================

const POSModule = {
  productos: [],
  carrito: [],
  categoriaFiltro: 'todos',
  terminoBusqueda: '',
  metodoPagoSeleccionado: 'efectivo',
  ultimaVenta: null,

  // Escáner por Cámara (HTML5-QRCode)
  scannerInstance: null,
  escaneoPausado: false,

  async init() {
    await this.cargarProductos();
    this.bindEvents();
    this.cargarPagosDigitales();
  },

  async cargarProductos() {
    try {
      const res = await API.get('/productos');
      this.productos = res.productos || [];
      this.renderizarProductosPOS();
    } catch (err) {
      console.error('Error cargando productos POS:', err);
    }
  },

  renderizarProductosPOS() {
    const grid = document.getElementById('pos-grid-productos');
    if (!grid) return;

    const filtrados = this.productos.filter(p => {
      const matchBusqueda = !this.terminoBusqueda ||
        p.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(this.terminoBusqueda.toLowerCase()));
      const matchCat = this.categoriaFiltro === 'todos' || p.categoria === this.categoriaFiltro;
      return matchBusqueda && matchCat;
    });

    if (!filtrados.length) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
          <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto mb-2 opacity-40"></i>
          <p class="text-sm">No hay productos disponibles para venta</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    grid.innerHTML = filtrados.map(p => {
      const stock = parseFloat(p.stock_actual);
      const agotado = stock <= 0;

      return `
        <button 
          type="button"
          onclick="POSModule.agregarAlCarrito('${p.id}')"
          ${agotado ? 'disabled' : ''}
          class="text-left bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/60 shadow-xs hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between relative group ${agotado ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}"
        >
          <div>
            <div class="flex items-start gap-2.5 mb-2">
              ${p.imagen_url ? `
                <img src="${p.imagen_url}" alt="${p.nombre}" class="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-700 flex-shrink-0 bg-slate-50" onerror="this.onerror=null;this.classList.add('hidden');">
              ` : `
                <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="package" class="w-5 h-5 opacity-40"></i>
                </div>
              `}
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1 mb-0.5">
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 truncate">
                    ${p.categoria}
                  </span>
                  <span class="text-[10px] font-bold ${stock <= p.stock_minimo ? 'text-amber-500' : 'text-slate-400'} whitespace-nowrap">
                    ${stock} ${p.unidad_medida || 'und'}
                  </span>
                </div>
                <h4 class="font-bold text-slate-900 dark:text-white text-xs leading-tight line-clamp-2">
                  ${p.nombre}
                </h4>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-700/40">
            <span class="text-[10px] text-slate-400 font-medium">Precio</span>
            <span class="text-base font-black text-blue-600 dark:text-blue-400">
              S/ ${parseFloat(p.precio_venta).toFixed(2)}
            </span>
          </div>
        </button>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  agregarAlCarrito(productoId) {
    const prod = this.productos.find(p => p.id === productoId);
    if (!prod) return;

    if (prod.stock_actual <= 0) {
      showToast(`¡${prod.nombre} está agotado!`, 'warning');
      return;
    }

    const itemExistente = this.carrito.find(item => item.producto_id === prod.id);

    if (itemExistente) {
      if (itemExistente.cantidad + 1 > prod.stock_actual) {
        showToast(`Stock insuficiente. Solo quedan ${prod.stock_actual} unidades.`, 'warning');
        return;
      }
      itemExistente.cantidad += 1;
    } else {
      this.carrito.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        precio_unitario: parseFloat(prod.precio_venta),
        cantidad: 1,
        unidad_medida: prod.unidad_medida || 'und'
      });
    }

    AudioFeedback.scan();
    this.renderizarCarrito();
  },

  actualizarCantidad(productoId, delta) {
    const item = this.carrito.find(i => i.producto_id === productoId);
    if (!item) return;

    const prod = this.productos.find(p => p.id === productoId);
    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad <= 0) {
      this.eliminarDelCarrito(productoId);
      return;
    }

    if (prod && nuevaCantidad > prod.stock_actual) {
      showToast(`Stock máximo alcanzado (${prod.stock_actual})`, 'warning');
      return;
    }

    item.cantidad = nuevaCantidad;
    this.renderizarCarrito();
  },

  eliminarDelCarrito(productoId) {
    this.carrito = this.carrito.filter(i => i.producto_id !== productoId);
    this.renderizarCarrito();
  },

  vaciarCarrito() {
    if (!this.carrito.length) return;
    this.carrito = [];
    this.renderizarCarrito();
    showToast('Carrito vaciado', 'info');
  },

  calcularTotal() {
    return this.carrito.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);
  },

  renderizarCarrito() {
    const contenedor = document.getElementById('pos-carrito-items');
    const badgeCount = document.getElementById('pos-cart-badge');
    const elSubtotal = document.getElementById('pos-subtotal');
    const elTotal = document.getElementById('pos-total');
    const btnCobrar = document.getElementById('btn-abrir-pago');
    const btnFiar = document.getElementById('btn-fiar-venta');

    const total = this.calcularTotal();
    const count = this.carrito.reduce((s, i) => s + i.cantidad, 0);

    if (badgeCount) badgeCount.textContent = count;
    if (elSubtotal) elSubtotal.textContent = `S/ ${total.toFixed(2)}`;
    if (elTotal) elTotal.textContent = `S/ ${total.toFixed(2)}`;

    const hayItems = this.carrito.length > 0;

    if (btnCobrar) btnCobrar.disabled = !hayItems;
    if (btnFiar) btnFiar.disabled = !hayItems;

    if (!contenedor) return;

    if (!hayItems) {
      contenedor.innerHTML = `
        <div class="h-64 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
          <i data-lucide="shopping-cart" class="w-12 h-12 mb-3 stroke-[1.5] opacity-30"></i>
          <p class="text-sm font-medium">El carrito está vacío</p>
          <span class="text-xs text-slate-400/80 mt-1">Selecciona productos o escanea con cámara</span>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    contenedor.innerHTML = this.carrito.map(item => `
      <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-xs gap-2">
        <div class="flex-1 min-w-0">
          <h5 class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${item.nombre}</h5>
          <span class="text-[11px] text-slate-400">S/ ${item.precio_unitario.toFixed(2)} x ${item.cantidad}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <button onclick="POSModule.actualizarCantidad('${item.producto_id}', -1)" class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 font-bold text-sm">
            -
          </button>
          <span class="w-6 text-center text-xs font-bold text-slate-800 dark:text-white">
            ${item.cantidad}
          </span>
          <button onclick="POSModule.actualizarCantidad('${item.producto_id}', 1)" class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 font-bold text-sm">
            +
          </button>
        </div>

        <div class="text-right pl-2">
          <span class="text-xs font-bold text-slate-900 dark:text-slate-100">
            S/ ${(item.precio_unitario * item.cantidad).toFixed(2)}
          </span>
          <button onclick="POSModule.eliminarDelCarrito('${item.producto_id}')" class="block ml-auto text-[10px] text-rose-500 hover:text-rose-700 mt-0.5">
            Quitar
          </button>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  },

  // ============================================================================
  // COBRO Y MODAL DE PAGO
  // ============================================================================
  abrirModalCobro() {
    if (!this.carrito.length) return;
    const total = this.calcularTotal();

    document.getElementById('pago-monto-total').textContent = `S/ ${total.toFixed(2)}`;
    document.getElementById('pago-monto-recibido').value = total.toFixed(2);
    this.seleccionarMetodoPago('efectivo');
    this.calcularVuelto();

    document.getElementById('modal-cobro').classList.remove('hidden');
    document.getElementById('pago-monto-recibido').focus();
    document.getElementById('pago-monto-recibido').select();
  },

  seleccionarMetodoPago(metodo) {
    this.metodoPagoSeleccionado = metodo;

    // Actualizar botones de método
    document.querySelectorAll('.btn-metodo-pago').forEach(btn => {
      btn.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-950');
      if (btn.dataset.metodo === metodo) {
        btn.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-950');
      }
    });

    const secEfectivo = document.getElementById('pago-seccion-efectivo');
    const secDigital = document.getElementById('pago-seccion-digital');
    const secMixto = document.getElementById('pago-seccion-mixto');
    const secFiado = document.getElementById('pago-seccion-fiado');

    secEfectivo.classList.add('hidden');
    secDigital.classList.add('hidden');
    secMixto.classList.add('hidden');
    secFiado.classList.add('hidden');

    if (metodo === 'efectivo') {
      secEfectivo.classList.remove('hidden');
      this.calcularVuelto();
    } else if (metodo === 'yape' || metodo === 'plin') {
      secDigital.classList.remove('hidden');
      document.getElementById('digital-badge-tipo').textContent = metodo.toUpperCase();
      document.getElementById('digital-badge-tipo').className = `px-2 py-0.5 text-xs font-bold rounded-md text-white ${metodo === 'yape' ? 'bg-yape' : 'bg-plin'}`;
    } else if (metodo === 'mixto') {
      secMixto.classList.remove('hidden');
      const total = this.calcularTotal();
      document.getElementById('mixto-monto-digital').value = (total / 2).toFixed(2);
      document.getElementById('mixto-monto-efectivo').value = (total / 2).toFixed(2);
    } else if (metodo === 'fiado') {
      secFiado.classList.remove('hidden');
      this.togglePanelNuevoCliente('pago', false);
      this.poblarSelectorFiados('pago-fiado-cliente');
      const conceptoAutollenado = this.carrito.map(it => `${it.cantidad}x ${it.nombre}`).join(' + ');
      document.getElementById('pago-fiado-concepto').value = conceptoAutollenado;
    }
  },

  async obtenerClientesFiados() {
    // Siempre refrescar desde API para no depender solo de la caché del módulo
    if (typeof FiadosModule !== 'undefined' && typeof FiadosModule.cargarClientes === 'function') {
      await FiadosModule.cargarClientes();
      return FiadosModule.clientes || [];
    }

    const res = await API.get('/fiados/clientes');
    return res.clientes || [];
  },

  async poblarSelectorFiados(selectId, clienteSeleccionadoId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.disabled = true;
    select.innerHTML = '<option value="">-- Cargando clientes... --</option>';

    try {
      const clientes = await this.obtenerClientesFiados();

      if (!clientes.length) {
        select.innerHTML = '<option value="">-- No hay clientes registrados --</option>';
        return;
      }

      const escapeAttr = (val) => String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');

      select.innerHTML = '<option value="">-- Selecciona un cliente registrado --</option>' +
        clientes.map(c => {
          const saldo = parseFloat(c.saldo_total || 0).toFixed(2);
          const limite = parseFloat(c.limite_credito || 200).toFixed(2);
          const tel = c.telefono ? ` · ${c.telefono}` : '';
          return `
            <option value="${escapeAttr(c.id)}"
              data-saldo="${c.saldo_total || 0}"
              data-limite="${c.limite_credito || 200}"
              data-nombre="${escapeAttr(c.nombre)}">
              ${escapeAttr(c.nombre)}${escapeAttr(tel)} (Debe: S/ ${saldo} · Límite: S/ ${limite})
            </option>
          `;
        }).join('');

      if (clienteSeleccionadoId) {
        select.value = clienteSeleccionadoId;
        select.dispatchEvent(new Event('change'));
      }
    } catch (err) {
      console.error('Error poblando selector de fiados:', err);
      select.innerHTML = '<option value="">-- Error al cargar clientes --</option>';
    } finally {
      select.disabled = false;
    }
  },

  togglePanelNuevoCliente(origen, mostrar) {
    const panelId = origen === 'pago' ? 'pago-nuevo-cliente-panel' : 'fiar-nuevo-cliente-panel';
    const panel = document.getElementById(panelId);
    if (!panel) return;

    if (mostrar) {
      panel.classList.remove('hidden');
      const nombreInput = document.getElementById(origen === 'pago' ? 'pago-nuevo-fiado-nombre' : 'fiar-nuevo-nombre');
      if (nombreInput) {
        nombreInput.value = '';
        const telInput = document.getElementById(origen === 'pago' ? 'pago-nuevo-fiado-telefono' : 'fiar-nuevo-telefono');
        if (telInput) telInput.value = '';
        nombreInput.focus();
      }
    } else {
      panel.classList.add('hidden');
    }
  },

  async crearClienteRapido(origen) {
    const esPago = origen === 'pago';
    const nombreEl = document.getElementById(esPago ? 'pago-nuevo-fiado-nombre' : 'fiar-nuevo-nombre');
    const telefonoEl = document.getElementById(esPago ? 'pago-nuevo-fiado-telefono' : 'fiar-nuevo-telefono');
    const selectId = esPago ? 'pago-fiado-cliente' : 'fiar-directo-cliente-select';

    const nombre = (nombreEl?.value || '').trim();
    const telefono = (telefonoEl?.value || '').trim();

    if (!nombre) {
      showToast('Ingresa el nombre del cliente.', 'warning');
      nombreEl?.focus();
      return;
    }

    try {
      const cliente = (typeof FiadosModule !== 'undefined' && typeof FiadosModule.crearCliente === 'function')
        ? await FiadosModule.crearCliente({ nombre, telefono })
        : (await API.post('/fiados/clientes', { nombre, telefono })).cliente;

      if (!cliente?.id) throw new Error('No se pudo crear el cliente');

      this.togglePanelNuevoCliente(origen, false);
      await this.poblarSelectorFiados(selectId, cliente.id);
      AudioFeedback.success();
      showToast(`Cliente "${nombre}" registrado y seleccionado`, 'success');
    } catch (err) {
      AudioFeedback.error();
    }
  },

  actualizarInfoFiado(selectId, infoCardId, saldoActualId, limiteId, saldoNuevoId, alertaId) {
    const select = document.getElementById(selectId);
    const card = document.getElementById(infoCardId);
    const alerta = document.getElementById(alertaId);
    if (!select || !card) return;

    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
      card.classList.add('hidden');
      return;
    }

    const saldo = parseFloat(selectedOption.dataset.saldo) || 0;
    const limite = parseFloat(selectedOption.dataset.limite) || 200;
    const totalVenta = this.calcularTotal();
    const nuevoSaldo = saldo + totalVenta;

    document.getElementById(saldoActualId).textContent = `S/ ${saldo.toFixed(2)}`;
    document.getElementById(limiteId).textContent = `S/ ${limite.toFixed(2)}`;
    document.getElementById(saldoNuevoId).textContent = `S/ ${nuevoSaldo.toFixed(2)}`;

    card.classList.remove('hidden');

    if (alerta) {
      if (nuevoSaldo > limite) {
        alerta.classList.remove('hidden');
      } else {
        alerta.classList.add('hidden');
      }
    }
  },

  // ============================================================================
  // 1. FIADO DIRECTO DESDE POS
  // ============================================================================
  async abrirModalFiadoDirecto() {
    if (!this.carrito.length) {
      showToast('El carrito está vacío. Agrega productos para fiar.', 'warning');
      return;
    }

    const total = this.calcularTotal();
    document.getElementById('fiar-directo-monto-total').textContent = `S/ ${total.toFixed(2)}`;

    // Pre-llenar concepto descriptivo
    const conceptoAutollenado = this.carrito.map(it => `${it.cantidad}x ${it.nombre}`).join(' + ');
    document.getElementById('fiar-directo-concepto').value = conceptoAutollenado;
    document.getElementById('fiar-directo-info-card').classList.add('hidden');
    this.togglePanelNuevoCliente('fiar', false);

    document.getElementById('modal-fiar-directo').classList.remove('hidden');

    // Cargar clientes dinámicamente desde clientes_fiados
    await this.poblarSelectorFiados('fiar-directo-cliente-select');
    document.getElementById('fiar-directo-cliente-select').focus();
  },

  async confirmarFiadoDirecto() {
    const select = document.getElementById('fiar-directo-cliente-select');
    const clienteId = select.value;
    const concepto = document.getElementById('fiar-directo-concepto').value.trim() || 'Venta fiada en mostrador';

    if (!clienteId) {
      showToast('Selecciona un cliente de la libreta para fiar.', 'warning');
      return;
    }

    const clienteOpt = select.options[select.selectedIndex];
    const nombreCliente = clienteOpt.dataset.nombre || 'Cliente Fiador';
    const cajaActiva = CajaModule.cajaActiva;

    // Fiado: registra deuda + descuenta stock; monto_efectivo/digital en 0 (no suma a caja)
    const payload = {
      caja_id: cajaActiva ? cajaActiva.id : null,
      metodo_pago: 'fiado',
      monto_recibido: 0,
      vuelto: 0,
      monto_efectivo: 0,
      monto_digital: 0,
      cliente_id: clienteId,
      nombre_cliente: nombreCliente,
      concepto,
      items: this.carrito
    };

    try {
      const res = await API.post('/ventas', payload);
      this.ultimaVenta = res.venta;
      this.ultimaVenta.detalles = this.carrito;

      AudioFeedback.success();
      showToast(`¡Venta fiada a ${nombreCliente}! Deuda anotada · stock descontado · sin ingreso a caja.`, 'success', 4500);

      document.getElementById('modal-fiar-directo').classList.add('hidden');
      this.vaciarCarrito();

      // Refrescar inventario, caja (sin cambio de efectivo) y libreta de fiados
      await ProductosModule.cargarProductos();
      await this.cargarProductos();
      if (typeof CajaModule !== 'undefined') await CajaModule.cargarCajaActiva();
      if (typeof FiadosModule !== 'undefined') await FiadosModule.cargarClientes();
      if (typeof ReportesModule !== 'undefined') ReportesModule.cargarResumen();

      this.mostrarTicket(res.venta);
    } catch (err) {
      AudioFeedback.error();
    }
  },

  calcularVuelto() {
    const total = this.calcularTotal();
    const recibido = parseFloat(document.getElementById('pago-monto-recibido').value) || 0;
    const vuelto = Math.max(0, recibido - total);
    const faltante = Math.max(0, total - recibido);

    const elVuelto = document.getElementById('pago-vuelto-calculado');

    if (elVuelto) {
      if (recibido >= total) {
        elVuelto.textContent = `S/ ${vuelto.toFixed(2)}`;
        elVuelto.className = 'text-2xl font-black text-emerald-600 dark:text-emerald-400';
      } else {
        elVuelto.textContent = `Falta S/ ${faltante.toFixed(2)}`;
        elVuelto.className = 'text-lg font-bold text-rose-500';
      }
    }
  },

  aplicarBillete(monto) {
    const total = this.calcularTotal();
    if (monto === 'exacto') {
      document.getElementById('pago-monto-recibido').value = total.toFixed(2);
    } else {
      document.getElementById('pago-monto-recibido').value = parseFloat(monto).toFixed(2);
    }
    this.calcularVuelto();
  },

  async confirmarVenta() {
    if (!this.carrito.length) return;
    const total = this.calcularTotal();
    const cajaActiva = CajaModule.cajaActiva;

    const metodo = this.metodoPagoSeleccionado;
    let monto_recibido = total;
    let vuelto = 0;
    let num_operacion = null;
    let telefono_cliente = null;
    let cliente_id = null;
    let nombre_cliente = document.getElementById('pago-cliente-nombre').value.trim() || 'Cliente Mostrador';
    let concepto = null;
    let monto_efectivo = 0;
    let monto_digital = 0;

    if (metodo === 'efectivo') {
      monto_recibido = parseFloat(document.getElementById('pago-monto-recibido').value) || total;
      if (monto_recibido < total) {
        showToast('El monto recibido en efectivo es menor al total', 'warning');
        return;
      }
      vuelto = monto_recibido - total;
      monto_efectivo = total;
    } else if (metodo === 'yape' || metodo === 'plin') {
      num_operacion = document.getElementById('pago-num-operacion').value.trim();
      telefono_cliente = document.getElementById('pago-tel-cliente').value.trim();
      monto_digital = total;
    } else if (metodo === 'mixto') {
      monto_efectivo = parseFloat(document.getElementById('mixto-monto-efectivo').value) || 0;
      monto_digital = parseFloat(document.getElementById('mixto-monto-digital').value) || 0;
      num_operacion = document.getElementById('mixto-num-operacion').value.trim();
      telefono_cliente = document.getElementById('mixto-tel-cliente').value.trim();

      if (Math.abs((monto_efectivo + monto_digital) - total) > 0.05) {
        showToast('La suma de efectivo y digital debe ser igual al total', 'warning');
        return;
      }
    } else if (metodo === 'fiado') {
      const selectFiado = document.getElementById('pago-fiado-cliente');
      cliente_id = selectFiado.value;
      if (!cliente_id) {
        showToast('Selecciona un cliente de la libreta para fiar.', 'warning');
        return;
      }
      nombre_cliente = selectFiado.options[selectFiado.selectedIndex].dataset.nombre || 'Cliente Fiador';
      concepto = document.getElementById('pago-fiado-concepto').value.trim();
      // Fiado no ingresa efectivo ni digital a caja
      monto_recibido = 0;
      vuelto = 0;
      monto_efectivo = 0;
      monto_digital = 0;
    }

    const payload = {
      caja_id: cajaActiva ? cajaActiva.id : null,
      metodo_pago: metodo,
      monto_recibido,
      vuelto,
      monto_efectivo,
      monto_digital,
      num_operacion,
      telefono_cliente,
      cliente_id,
      nombre_cliente,
      concepto,
      items: this.carrito
    };

    try {
      const res = await API.post('/ventas', payload);
      this.ultimaVenta = res.venta;
      this.ultimaVenta.detalles = this.carrito;

      AudioFeedback.success();
      showToast(`¡Venta registrada con éxito! Ticket: ${res.venta.codigo_ticket}`, 'success');

      // Cerrar modal de pago
      document.getElementById('modal-cobro').classList.add('hidden');

      // Limpiar formulario de pago y carrito
      document.getElementById('pago-num-operacion').value = '';
      document.getElementById('pago-tel-cliente').value = '';
      document.getElementById('pago-cliente-nombre').value = '';
      this.vaciarCarrito();

      // Refrescar caja y catálogo de productos con stock actualizado
      await CajaModule.cargarCajaActiva();
      await ProductosModule.cargarProductos();
      await this.cargarProductos();
      this.cargarPagosDigitales();
      if (typeof FiadosModule !== 'undefined') await FiadosModule.cargarClientes();
      ReportesModule?.cargarResumen();

      // Abrir modal de Ticket
      this.mostrarTicket(res.venta);
    } catch (err) {
      AudioFeedback.error();
    }
  },

  mostrarTicket(venta) {
    const ticketModal = document.getElementById('modal-ticket');
    if (!ticketModal) return;

    const esFiado = venta.metodo_pago === 'fiado';
    document.getElementById('ticket-codigo').textContent = venta.codigo_ticket;
    document.getElementById('ticket-fecha').textContent = new Date().toLocaleString('es-PE');
    document.getElementById('ticket-cliente').textContent = venta.nombre_cliente || 'Cliente General';
    document.getElementById('ticket-metodo').textContent = esFiado ? 'FIADO (CUENTA POR COBRAR)' : venta.metodo_pago.toUpperCase();
    document.getElementById('ticket-total').textContent = `S/ ${parseFloat(venta.total).toFixed(2)}`;
    document.getElementById('ticket-recibido').textContent = esFiado ? 'S/ 0.00 (Fiado)' : `S/ ${parseFloat(venta.monto_recibido).toFixed(2)}`;
    document.getElementById('ticket-vuelto').textContent = esFiado ? 'S/ 0.00' : `S/ ${parseFloat(venta.vuelto).toFixed(2)}`;

    const elOperacion = document.getElementById('ticket-operacion');
    if (venta.num_operacion) {
      elOperacion.textContent = `Operación: ${venta.num_operacion} (${venta.telefono_cliente || ''})`;
      elOperacion.classList.remove('hidden');
    } else {
      elOperacion.classList.add('hidden');
    }

    const itemsCont = document.getElementById('ticket-items');
    itemsCont.innerHTML = (this.ultimaVenta?.detalles || []).map(it => `
      <div class="flex justify-between text-xs py-0.5 border-b border-dashed border-slate-200">
        <span class="truncate pr-2">${it.cantidad}x ${it.nombre}</span>
        <span class="font-mono">S/ ${(it.cantidad * it.precio_unitario).toFixed(2)}</span>
      </div>
    `).join('');

    ticketModal.classList.remove('hidden');
  },

  // ============================================================================
  // 3. ESCÁNER DE CÓDIGOS POR CÁMARA CON FOTOS (HTML5-QRCode)
  // ============================================================================
  async iniciarEscannerCamara() {
    const modal = document.getElementById('modal-camara-scanner');
    modal.classList.remove('hidden');
    document.getElementById('camara-producto-detectado').classList.add('hidden');

    if (!window.Html5Qrcode) {
      showToast('Error: Librería HTML5-QRCode no cargada', 'error');
      return;
    }

    try {
      this.scannerInstance = new Html5Qrcode("qr-reader");
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 180 },
        aspectRatio: 1.0
      };

      await this.scannerInstance.start(
        { facingMode: "environment" }, // Cámara trasera preferida
        config,
        (decodedText) => this.onCodigoDetectado(decodedText),
        (errorMessage) => {
          // Ignorar errores de frame sin código
        }
      );
    } catch (err) {
      console.error('Error iniciando cámara:', err);
      showToast('No se pudo acceder a la cámara. Revisa los permisos del navegador.', 'warning', 4000);
      modal.classList.add('hidden');
    }
  },

  async detenerEscannerCamara() {
    if (this.scannerInstance) {
      try {
        await this.scannerInstance.stop();
        this.scannerInstance.clear();
      } catch (e) {
        // Ignorar si ya estaba detenida
      }
      this.scannerInstance = null;
    }
    document.getElementById('modal-camara-scanner').classList.add('hidden');
  },

  onCodigoDetectado(decodedText) {
    if (this.escaneoPausado) return;
    this.escaneoPausado = true;

    // Pausa temporal de 1.8 segundos para evitar doble escaneo
    setTimeout(() => {
      this.escaneoPausado = false;
    }, 1800);

    const codigo = String(decodedText).trim();
    const prod = this.productos.find(p => p.codigo_barras && p.codigo_barras.trim() === codigo);

    if (prod) {
      AudioFeedback.scan();
      this.agregarAlCarrito(prod.id);

      // Mostrar tarjeta con foto del producto en el visor
      const card = document.getElementById('camara-producto-detectado');
      const fotoCont = document.getElementById('camara-producto-foto-container');
      const nombreEl = document.getElementById('camara-producto-nombre');
      const precioEl = document.getElementById('camara-producto-precio');

      nombreEl.textContent = prod.nombre;
      precioEl.textContent = `S/ ${parseFloat(prod.precio_venta).toFixed(2)}`;

      if (prod.imagen_url) {
        fotoCont.innerHTML = `<img src="${prod.imagen_url}" class="w-full h-full object-cover">`;
      } else {
        fotoCont.innerHTML = `<i data-lucide="package" class="w-6 h-6 text-emerald-600 opacity-60"></i>`;
        if (window.lucide) lucide.createIcons();
      }

      card.classList.remove('hidden');
      setTimeout(() => {
        card.classList.add('hidden');
      }, 2500);

      AudioFeedback.success();
    } else {
      AudioFeedback.error();
      showToast(`Código "${codigo}" no encontrado en el catálogo`, 'warning', 3000);
    }
  },

  // ============================================================================
  // PAGOS DIGITALES DEL DÍA (YAPE / PLIN)
  // ============================================================================
  async cargarPagosDigitales() {
    try {
      const res = await API.get('/ventas?limite=30');
      const ventas = res.ventas || [];
      const digitales = ventas.filter(v => v.metodo_pago === 'yape' || v.metodo_pago === 'plin' || (v.metodo_pago === 'mixto' && v.monto_digital > 0));

      const cont = document.getElementById('lista-pagos-digitales');
      const totalDigitalHoy = digitales.reduce((s, v) => s + (parseFloat(v.monto_digital) || parseFloat(v.total) || 0), 0);

      const elTotalDig = document.getElementById('badge-total-digitales');
      if (elTotalDig) elTotalDig.textContent = `Total Yape/Plin Hoy: S/ ${totalDigitalHoy.toFixed(2)}`;

      if (!cont) return;

      if (!digitales.length) {
        cont.innerHTML = `
          <div class="p-8 text-center text-slate-400">
            <i data-lucide="smartphone-nfc" class="w-10 h-10 mx-auto mb-2 opacity-40"></i>
            <p class="text-sm">No hay pagos con Yape o Plin registrados hoy</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      cont.innerHTML = digitales.map(v => {
        const esYape = v.metodo_pago === 'yape';
        return `
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white ${esYape ? 'bg-yape' : 'bg-plin'}">
                ${esYape ? 'YAPE' : 'PLIN'}
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm font-bold text-slate-900 dark:text-white">${v.nombre_cliente || 'Cliente'}</p>
                  <span class="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Op: ${v.num_operacion || 'Sin Código'}
                  </span>
                </div>
                <div class="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>📱 ${v.telefono_cliente || 'No registrado'}</span>
                  <span>⏰ ${new Date(v.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>🎫 ${v.codigo_ticket}</span>
                </div>
              </div>
            </div>

            <div class="text-right">
              <span class="text-lg font-black ${esYape ? 'text-yape' : 'text-plin'}">
                S/ ${parseFloat(v.monto_digital || v.total).toFixed(2)}
              </span>
              <span class="block text-[11px] text-emerald-600 font-semibold">✓ Validado</span>
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Error cargando pagos digitales:', err);
    }
  },

  bindEvents() {
    // Buscador POS
    const inputBuscar = document.getElementById('pos-buscar-input');
    if (inputBuscar) {
      inputBuscar.addEventListener('input', (e) => {
        this.terminoBusqueda = e.target.value.trim();
        this.renderizarProductosPOS();
      });

      // Lector de código de barras físico: Enter con código exacto agrega directo
      inputBuscar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const val = inputBuscar.value.trim();
          const matchExacto = this.productos.find(p => p.codigo_barras === val || p.nombre.toLowerCase() === val.toLowerCase());
          if (matchExacto) {
            this.agregarAlCarrito(matchExacto.id);
            inputBuscar.value = '';
            this.terminoBusqueda = '';
            this.renderizarProductosPOS();
          }
        }
      });
    }

    // Botón abrir escáner cámara
    const btnCamara = document.getElementById('btn-abrir-camara');
    if (btnCamara) {
      btnCamara.addEventListener('click', () => this.iniciarEscannerCamara());
    }

    const btnCerrarCamara = document.getElementById('btn-cerrar-camara');
    if (btnCerrarCamara) {
      btnCerrarCamara.addEventListener('click', () => this.detenerEscannerCamara());
    }

    const btnDetenerCamara = document.getElementById('btn-detener-camara');
    if (btnDetenerCamara) {
      btnDetenerCamara.addEventListener('click', () => this.detenerEscannerCamara());
    }

    // Filtros de categoría POS
    document.querySelectorAll('.btn-pos-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-pos-cat').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        btn.classList.add('bg-blue-600', 'text-white');
        this.categoriaFiltro = btn.dataset.categoria;
        this.renderizarProductosPOS();
      });
    });

    // Vaciar carrito
    const btnVaciar = document.getElementById('btn-vaciar-carrito');
    if (btnVaciar) {
      btnVaciar.addEventListener('click', () => this.vaciarCarrito());
    }

    // Botón Fiar Venta directo desde mostrador
    const btnFiar = document.getElementById('btn-fiar-venta');
    if (btnFiar) {
      btnFiar.addEventListener('click', () => this.abrirModalFiadoDirecto());
    }

    // Selector de cliente en Modal Fiado Directo
    const selectFiarDirecto = document.getElementById('fiar-directo-cliente-select');
    if (selectFiarDirecto) {
      selectFiarDirecto.addEventListener('change', () => {
        this.actualizarInfoFiado(
          'fiar-directo-cliente-select',
          'fiar-directo-info-card',
          'fiar-info-saldo-actual',
          'fiar-info-limite',
          'fiar-info-saldo-nuevo',
          'fiar-alerta-sobregiro'
        );
      });
    }

    const formFiarDirecto = document.getElementById('form-fiar-directo');
    if (formFiarDirecto) {
      formFiarDirecto.addEventListener('submit', (e) => {
        e.preventDefault();
        this.confirmarFiadoDirecto();
      });
    }

    // Alta rápida de cliente desde modal Fiar Venta
    const btnFiarNuevo = document.getElementById('btn-fiar-nuevo-cliente');
    if (btnFiarNuevo) {
      btnFiarNuevo.addEventListener('click', () => this.togglePanelNuevoCliente('fiar', true));
    }
    const btnCancelFiarNuevo = document.getElementById('btn-cancelar-fiar-nuevo-cliente');
    if (btnCancelFiarNuevo) {
      btnCancelFiarNuevo.addEventListener('click', () => this.togglePanelNuevoCliente('fiar', false));
    }
    const btnGuardarFiarNuevo = document.getElementById('btn-guardar-fiar-nuevo-cliente');
    if (btnGuardarFiarNuevo) {
      btnGuardarFiarNuevo.addEventListener('click', () => this.crearClienteRapido('fiar'));
    }

    // Selector de cliente en Modal Cobro tradicional (tab fiado)
    const selectPagoFiado = document.getElementById('pago-fiado-cliente');
    if (selectPagoFiado) {
      selectPagoFiado.addEventListener('change', () => {
        this.actualizarInfoFiado(
          'pago-fiado-cliente',
          'pago-fiado-cliente-info',
          'pago-fiado-info-deuda',
          'pago-fiado-info-limite',
          'pago-fiado-info-nuevo',
          'pago-fiado-alerta-limite'
        );
      });
    }

    // Alta rápida de cliente desde modal de cobro (método Fiado)
    const btnPagoNuevo = document.getElementById('btn-pago-nuevo-cliente-fiado');
    if (btnPagoNuevo) {
      btnPagoNuevo.addEventListener('click', () => this.togglePanelNuevoCliente('pago', true));
    }
    const btnCancelPagoNuevo = document.getElementById('btn-cancelar-pago-nuevo-cliente');
    if (btnCancelPagoNuevo) {
      btnCancelPagoNuevo.addEventListener('click', () => this.togglePanelNuevoCliente('pago', false));
    }
    const btnGuardarPagoNuevo = document.getElementById('btn-guardar-pago-nuevo-cliente');
    if (btnGuardarPagoNuevo) {
      btnGuardarPagoNuevo.addEventListener('click', () => this.crearClienteRapido('pago'));
    }

    // Abrir Modal Cobro
    const btnCobrar = document.getElementById('btn-abrir-pago');
    if (btnCobrar) {
      btnCobrar.addEventListener('click', () => this.abrirModalCobro());
    }

    // Selección de métodos de pago
    document.querySelectorAll('.btn-metodo-pago').forEach(btn => {
      btn.addEventListener('click', () => {
        this.seleccionarMetodoPago(btn.dataset.metodo);
      });
    });

    // Input monto recibido cálculo de vuelto
    const inputRecibido = document.getElementById('pago-monto-recibido');
    if (inputRecibido) {
      inputRecibido.addEventListener('input', () => this.calcularVuelto());
    }

    // Botones rápidos de billetes
    document.querySelectorAll('.btn-billete').forEach(btn => {
      btn.addEventListener('click', () => {
        this.aplicarBillete(btn.dataset.monto);
      });
    });

    // Confirmar venta
    const btnConfirmar = document.getElementById('btn-confirmar-venta');
    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', () => this.confirmarVenta());
    }

    // Imprimir Ticket
    const btnImprimir = document.getElementById('btn-imprimir-ticket');
    if (btnImprimir) {
      btnImprimir.addEventListener('click', () => window.print());
    }

    // Atajos de teclado para agilidad en mostrador (F2 para cobrar)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (this.carrito.length > 0) this.abrirModalCobro();
      }
    });
  }
};
