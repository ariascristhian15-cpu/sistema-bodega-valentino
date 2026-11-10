// ==============================================================================
// MÓDULO 4: LIBRETA DE FIADOS (CUENTAS POR COBRAR Y ABONOS)
// ==============================================================================

const FiadosModule = {
  clientes: [],
  clienteSeleccionado: null,

  async init() {
    await this.cargarClientes();
    this.bindEvents();
  },

  async cargarClientes() {
    try {
      const res = await API.get('/fiados/clientes');
      this.clientes = res.clientes || [];
      this.renderizarClientes();
      this.actualizarMetricas();
      return this.clientes;
    } catch (err) {
      console.error('Error cargando fiados:', err);
      return this.clientes || [];
    }
  },

  async crearCliente({ nombre, telefono = '', direccion = '', limite_credito = 200 }) {
    const res = await API.post('/fiados/clientes', {
      nombre,
      telefono,
      direccion,
      limite_credito
    });
    const cliente = res.cliente;
    // Mantener caché local al día para selectores del POS
    if (cliente) {
      this.clientes = [cliente, ...(this.clientes || []).filter(c => c.id !== cliente.id)];
      this.renderizarClientes();
      this.actualizarMetricas();
    }
    return cliente;
  },

  actualizarMetricas() {
    const totalDeudas = this.clientes.reduce((s, c) => s + (parseFloat(c.saldo_total) || 0), 0);
    const conDeudaCount = this.clientes.filter(c => parseFloat(c.saldo_total) > 0).length;

    const elTotal = document.getElementById('fiados-total-por-cobrar');
    const elCount = document.getElementById('fiados-clientes-deuda-count');

    if (elTotal) elTotal.textContent = `S/ ${totalDeudas.toFixed(2)}`;
    if (elCount) elCount.textContent = `${conDeudaCount} clientes`;
  },

  renderizarClientes() {
    const contenedor = document.getElementById('lista-clientes-fiados');
    if (!contenedor) return;

    if (!this.clientes.length) {
      contenedor.innerHTML = `
        <div class="col-span-full p-12 text-center text-slate-400">
          <i data-lucide="book-open" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="text-sm font-medium">No hay clientes registrados en la libreta de fiados.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    contenedor.innerHTML = this.clientes.map(c => {
      const saldo = parseFloat(c.saldo_total) || 0;
      const limite = parseFloat(c.limite_credito) || 200;
      const porcentaje = Math.min(100, Math.round((saldo / limite) * 100));
      const tieneDeuda = saldo > 0;

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/60 shadow-sm flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-all">
          <div>
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <h4 class="font-bold text-base text-slate-900 dark:text-white leading-snug">${c.nombre}</h4>
                ${c.telefono ? `<p class="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><i data-lucide="phone" class="w-3 h-3"></i> ${c.telefono}</p>` : ''}
                ${c.direccion ? `<p class="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><i data-lucide="map-pin" class="w-3 h-3"></i> ${c.direccion}</p>` : ''}
              </div>
              <span class="px-2.5 py-1 text-xs font-black rounded-xl ${tieneDeuda ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}">
                ${tieneDeuda ? `Debe S/ ${saldo.toFixed(2)}` : 'Sin Deuda'}
              </span>
            </div>

            <!-- Barra de límite de crédito -->
            <div class="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/40">
              <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span>Límite Crédito: S/ ${limite.toFixed(2)}</span>
                <span class="${porcentaje > 80 ? 'text-rose-500 font-bold' : ''}">${porcentaje}% usado</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full rounded-full ${porcentaje > 80 ? 'bg-rose-500' : porcentaje > 50 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width: ${porcentaje}%"></div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 flex items-center gap-2">
            <button onclick="FiadosModule.abrirModalNuevoFiado('${c.id}')" class="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Fiar
            </button>
            <button onclick="FiadosModule.abrirModalAbono('${c.id}')" ${!tieneDeuda ? 'disabled' : ''} class="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 ${!tieneDeuda ? 'opacity-40 cursor-not-allowed' : ''}">
              <i data-lucide="coins" class="w-3.5 h-3.5"></i> Abonar
            </button>
            <button onclick="FiadosModule.verDetalleCliente('${c.id}')" class="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition" title="Ver Historial">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  abrirModalNuevoCliente() {
    document.getElementById('form-nuevo-cliente-fiado').reset();
    document.getElementById('modal-nuevo-cliente-fiado').classList.remove('hidden');
    document.getElementById('fiado-cliente-nombre').focus();
  },

  abrirModalNuevoFiado(clienteId) {
    const c = this.clientes.find(item => item.id === clienteId);
    if (!c) return;

    this.clienteSeleccionado = c;
    document.getElementById('nuevo-fiado-cliente-nombre').textContent = c.nombre;
    document.getElementById('nuevo-fiado-cliente-id').value = c.id;
    document.getElementById('nuevo-fiado-monto').value = '';
    document.getElementById('nuevo-fiado-concepto').value = '';

    document.getElementById('modal-nuevo-fiado').classList.remove('hidden');
    document.getElementById('nuevo-fiado-monto').focus();
  },

  abrirModalAbono(clienteId) {
    const c = this.clientes.find(item => item.id === clienteId);
    if (!c || c.saldo_total <= 0) {
      showToast('Este cliente no tiene saldo pendiente por abonar', 'info');
      return;
    }

    this.clienteSeleccionado = c;
    document.getElementById('abono-cliente-nombre').textContent = c.nombre;
    document.getElementById('abono-cliente-id').value = c.id;
    document.getElementById('abono-saldo-pendiente').textContent = `S/ ${parseFloat(c.saldo_total).toFixed(2)}`;
    document.getElementById('abono-monto').value = parseFloat(c.saldo_total).toFixed(2); // sugerir total

    document.getElementById('modal-abono-fiado').classList.remove('hidden');
    document.getElementById('abono-monto').focus();
    document.getElementById('abono-monto').select();
  },

  verDetalleCliente(clienteId) {
    const c = this.clientes.find(item => item.id === clienteId);
    if (!c) return;

    document.getElementById('detalle-cliente-nombre').textContent = c.nombre;
    document.getElementById('detalle-cliente-saldo').textContent = `S/ ${parseFloat(c.saldo_total).toFixed(2)}`;

    const deudasCont = document.getElementById('detalle-cliente-deudas-lista');
    const deudas = c.deudas_fiados || [];

    if (!deudas.length) {
      deudasCont.innerHTML = `<p class="p-6 text-center text-sm text-slate-400">Sin historial de deudas pendientes</p>`;
    } else {
      deudasCont.innerHTML = deudas.map(d => `
        <div class="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
          <div>
            <p class="text-sm font-bold text-slate-800 dark:text-white">${d.concepto}</p>
            <span class="text-xs text-slate-400">Fecha: ${new Date(d.created_at).toLocaleDateString('es-PE')}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-black ${d.saldo_pendiente > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}">
              S/ ${parseFloat(d.saldo_pendiente).toFixed(2)}
            </span>
            <span class="block text-[10px] uppercase font-bold text-slate-400">Original: S/ ${parseFloat(d.monto_original).toFixed(2)}</span>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('modal-detalle-cliente-fiado').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  bindEvents() {
    // Formulario Crear Cliente Fiador
    const formCli = document.getElementById('form-nuevo-cliente-fiado');
    if (formCli) {
      formCli.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('fiado-cliente-nombre').value.trim();
        const telefono = document.getElementById('fiado-cliente-telefono').value.trim();
        const direccion = document.getElementById('fiado-cliente-direccion').value.trim();
        const limite = parseFloat(document.getElementById('fiado-cliente-limite').value) || 200;

        try {
          await this.crearCliente({ nombre, telefono, direccion, limite_credito: limite });
          document.getElementById('modal-nuevo-cliente-fiado').classList.add('hidden');
          formCli.reset();
          AudioFeedback.success();
          showToast(`Cliente "${nombre}" registrado en libreta`, 'success');
          await this.cargarClientes();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }

    // Formulario Registrar Nuevo Fiado
    const formFiado = document.getElementById('form-nuevo-fiado');
    if (formFiado) {
      formFiado.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cliente_id = document.getElementById('nuevo-fiado-cliente-id').value;
        const monto = parseFloat(document.getElementById('nuevo-fiado-monto').value);
        const concepto = document.getElementById('nuevo-fiado-concepto').value.trim();

        try {
          await API.post('/fiados/deudas', { cliente_id, monto, concepto });
          document.getElementById('modal-nuevo-fiado').classList.add('hidden');
          formFiado.reset();
          AudioFeedback.success();
          showToast(`Fiado de S/ ${monto.toFixed(2)} registrado`, 'success');
          await this.cargarClientes();
          ReportesModule?.cargarResumen();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }

    // Formulario Registrar Abono
    const formAbono = document.getElementById('form-abono-fiado');
    if (formAbono) {
      formAbono.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cliente_id = document.getElementById('abono-cliente-id').value;
        const monto = parseFloat(document.getElementById('abono-monto').value);
        const metodo = document.getElementById('abono-metodo-pago').value;
        const notas = document.getElementById('abono-notas').value.trim();
        const cajaActiva = CajaModule.cajaActiva;

        try {
          await API.post('/fiados/abonos', {
            cliente_id,
            monto,
            metodo_pago: metodo,
            notas,
            caja_id: cajaActiva ? cajaActiva.id : null
          });

          document.getElementById('modal-abono-fiado').classList.add('hidden');
          formAbono.reset();
          AudioFeedback.success();
          showToast(`Abono de S/ ${monto.toFixed(2)} registrado exitosamente`, 'success');
          await this.cargarClientes();
          await CajaModule.cargarCajaActiva();
          ReportesModule?.cargarResumen();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }

    // Botón abrir modal nuevo cliente
    const btnNuevoCli = document.getElementById('btn-nuevo-cliente-fiado');
    if (btnNuevoCli) {
      btnNuevoCli.addEventListener('click', () => this.abrirModalNuevoCliente());
    }
  }
};
