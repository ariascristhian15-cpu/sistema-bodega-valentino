// ==============================================================================
// MÓDULO 5: GESTIÓN DE PEDIDOS Y PROVEEDORES (REABASTECIMIENTO)
// ==============================================================================

const PedidosModule = {
  pedidos: [],
  filtroEstado: 'todos',

  async init() {
    await this.cargarPedidos();
    this.bindEvents();
  },

  async cargarPedidos() {
    try {
      const res = await API.get('/pedidos');
      this.pedidos = res.pedidos || [];
      this.renderizar();
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    }
  },

  renderizar() {
    const contenedor = document.getElementById('lista-pedidos-proveedor');
    if (!contenedor) return;

    const filtrados = this.pedidos.filter(p => this.filtroEstado === 'todos' || p.estado === this.filtroEstado);

    if (!filtrados.length) {
      contenedor.innerHTML = `
        <div class="col-span-full p-12 text-center text-slate-400">
          <i data-lucide="clipboard-list" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="text-sm font-medium">No hay pedidos registrados con este filtro.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    contenedor.innerHTML = filtrados.map(p => {
      let badgeEstado = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200';
      let iconEstado = 'clock';
      if (p.estado === 'pedido') {
        badgeEstado = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200';
        iconEstado = 'send';
      } else if (p.estado === 'recibido') {
        badgeEstado = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200';
        iconEstado = 'check-check';
      }

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${badgeEstado} flex items-center gap-1">
                <i data-lucide="${iconEstado}" class="w-3 h-3"></i>
                ${p.estado}
              </span>
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Cant: <strong class="text-slate-800 dark:text-white">${p.cantidad_sugerida}</strong>
              </span>
            </div>

            <h4 class="font-bold text-slate-900 dark:text-white text-base leading-snug mb-1">
              ${p.nombre_item}
            </h4>

            <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">
              🏢 Proveedor: <strong class="text-slate-700 dark:text-slate-300">${p.proveedor || 'Sin especificar'}</strong>
            </p>

            ${p.notas ? `<p class="text-xs text-slate-400 italic mt-1">📝 ${p.notas}</p>` : ''}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-2">
            ${p.estado === 'pendiente' ? `
              <button onclick="PedidosModule.cambiarEstado('${p.id}', 'pedido')" class="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1">
                <i data-lucide="send" class="w-3.5 h-3.5"></i> Marcar como Pedido
              </button>
            ` : ''}

            ${p.estado === 'pedido' ? `
              <button onclick="PedidosModule.cambiarEstado('${p.id}', 'recibido', true)" class="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1 shadow-xs">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Recibido (+Stock)
              </button>
            ` : ''}

            ${p.estado === 'recibido' ? `
              <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Mercadería ingresada
              </span>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async cambiarEstado(id, nuevoEstado, reabastecer = false) {
    try {
      await API.put(`/pedidos/${id}/estado`, {
        estado: nuevoEstado,
        reabastecer_stock: reabastecer
      });

      AudioFeedback.success();
      showToast(`Pedido actualizado a "${nuevoEstado}"`, 'success');
      await this.cargarPedidos();

      if (reabastecer) {
        await ProductosModule.cargarProductos();
        if (window.POSModule) POSModule.cargarProductos();
        showToast('Stock de producto incrementado automáticamente', 'info');
      }
    } catch (err) {
      AudioFeedback.error();
    }
  },

  // Generar sugeridos automáticamente a partir de productos con stock bajo
  async generarSugeridosDeStockBajo() {
    const prods = ProductosModule.productos;
    const bajos = prods.filter(p => p.stock_actual <= p.stock_minimo);

    if (!bajos.length) {
      showToast('No hay productos con stock bajo en este momento.', 'info');
      return;
    }

    let agregados = 0;
    for (const p of bajos) {
      // Verificar si ya existe en pedidos pendientes
      const yaExiste = this.pedidos.some(ped => ped.producto_id === p.id && ped.estado !== 'recibido');
      if (!yaExiste) {
        const cantSugerida = Math.max(1, (p.stock_minimo * 2) - p.stock_actual);
        await API.post('/pedidos', {
          producto_id: p.id,
          nombre_item: `${p.nombre} (${p.unidad_medida || 'und'})`,
          cantidad_sugerida: cantSugerida,
          proveedor: 'Distribuidor ' + p.categoria,
          notas: `Auto-generado por alerta de stock (${p.stock_actual} restantes)`
        });
        agregados++;
      }
    }

    if (agregados > 0) {
      AudioFeedback.success();
      showToast(`Se agregaron ${agregados} pedidos sugeridos para reabastecimiento`, 'success');
      await this.cargarPedidos();
    } else {
      showToast('Los productos agotados ya se encuentran en la lista de pedidos', 'info');
    }
  },

  bindEvents() {
    // Filtros de estado
    document.querySelectorAll('.btn-pedidos-filtro').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-pedidos-filtro').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        btn.classList.add('bg-blue-600', 'text-white');
        this.filtroEstado = btn.dataset.estado;
        this.renderizar();
      });
    });

    // Botón sugerir reabastecimiento
    const btnSugerir = document.getElementById('btn-sugerir-pedidos');
    if (btnSugerir) {
      btnSugerir.addEventListener('click', () => this.generarSugeridosDeStockBajo());
    }

    // Modal nuevo pedido
    const btnNuevo = document.getElementById('btn-nuevo-pedido');
    if (btnNuevo) {
      btnNuevo.addEventListener('click', () => {
        document.getElementById('form-nuevo-pedido').reset();
        document.getElementById('modal-nuevo-pedido').classList.remove('hidden');
        document.getElementById('pedido-item-nombre').focus();
      });
    }

    const formPedido = document.getElementById('form-nuevo-pedido');
    if (formPedido) {
      formPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre_item = document.getElementById('pedido-item-nombre').value.trim();
        const cantidad_sugerida = parseFloat(document.getElementById('pedido-item-cantidad').value) || 1;
        const proveedor = document.getElementById('pedido-item-proveedor').value.trim();
        const notas = document.getElementById('pedido-item-notas').value.trim();

        try {
          await API.post('/pedidos', { nombre_item, cantidad_sugerida, proveedor, notas });
          document.getElementById('modal-nuevo-pedido').classList.add('hidden');
          formPedido.reset();
          AudioFeedback.success();
          showToast('Pedido agregado a la lista', 'success');
          await this.cargarPedidos();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }
  }
};
