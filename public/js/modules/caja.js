// ==============================================================================
// MÓDULO 1: APERTURA Y CIERRE DE CAJA (CONTROL DE EFECTIVO Y CUADRE MIXTO)
// ==============================================================================

const CajaModule = {
  cajaActiva: null,
  movimientos: [],
  historial: [],

  async init() {
    await this.cargarCajaActiva();
    await this.cargarHistorial();
    this.bindEvents();
  },

  async cargarCajaActiva() {
    try {
      const res = await API.get('/caja/activa');
      this.cajaActiva = res.caja;
      this.actualizarUI();
      if (this.cajaActiva) {
        await this.cargarMovimientos();
      }
    } catch (err) {
      console.error('Error al cargar caja:', err);
    }
  },

  async cargarHistorial() {
    try {
      const res = await API.get('/caja/historial');
      this.historial = res.cajas || [];
      this.renderizarHistorial();
    } catch (err) {
      console.error('Error al cargar historial de cajas:', err);
      const cont = document.getElementById('lista-historial-cajas');
      if (cont) {
        cont.innerHTML = `
          <tr>
            <td colspan="6" class="px-3 py-8 text-center text-sm text-rose-500">
              No se pudo cargar el historial de cajas.
            </td>
          </tr>
        `;
      }
    }
  },

  renderizarHistorial() {
    const cont = document.getElementById('lista-historial-cajas');
    if (!cont) return;

    if (!this.historial.length) {
      cont.innerHTML = `
        <tr>
          <td colspan="6" class="px-3 py-8 text-center text-sm text-slate-400">
            Aún no hay cajas cerradas para mostrar.
          </td>
        </tr>
      `;
      return;
    }

    cont.innerHTML = this.historial.map(caja => {
      const ventasEfe = parseFloat(caja.total_ventas_efectivo) || 0;
      const ventasDig = parseFloat(caja.total_ventas_digital) || 0;
      const gastos = parseFloat(caja.total_gastos) || 0;
      const totalVentas = ventasEfe + ventasDig;
      const difEfe = parseFloat(caja.diferencia_efectivo) || 0;

      const fechaBase = caja.fecha || caja.hora_cierre || caja.hora_apertura;
      const fechaLabel = fechaBase
        ? new Date(fechaBase.includes('T') ? fechaBase : `${fechaBase}T12:00:00`).toLocaleDateString('es-PE', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : '—';

      const horaCierre = caja.hora_cierre
        ? new Date(caja.hora_cierre).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        : null;

      let difHtml;
      if (Math.abs(difEfe) < 0.01) {
        difHtml = `<span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Cuadre</span>`;
      } else if (difEfe > 0) {
        difHtml = `<span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">+S/ ${difEfe.toFixed(2)}</span>`;
      } else {
        difHtml = `<span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">-S/ ${Math.abs(difEfe).toFixed(2)}</span>`;
      }

      return `
        <tr class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
          <td class="px-3 py-3">
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">${fechaLabel}</p>
            ${horaCierre ? `<span class="text-[11px] text-slate-400">Cierre ${horaCierre}</span>` : ''}
          </td>
          <td class="px-3 py-3 text-right text-sm font-black text-slate-900 dark:text-white">S/ ${totalVentas.toFixed(2)}</td>
          <td class="px-3 py-3 text-right text-sm font-bold text-emerald-600">S/ ${ventasEfe.toFixed(2)}</td>
          <td class="px-3 py-3 text-right text-sm font-bold text-purple-600">S/ ${ventasDig.toFixed(2)}</td>
          <td class="px-3 py-3 text-right text-sm font-semibold text-rose-500">S/ ${gastos.toFixed(2)}</td>
          <td class="px-3 py-3 text-right">${difHtml}</td>
        </tr>
      `;
    }).join('');
  },

  async cargarMovimientos() {
    if (!this.cajaActiva) return;
    try {
      const res = await API.get(`/caja/${this.cajaActiva.id}/movimientos`);
      this.movimientos = res.movimientos || [];
      this.renderizarMovimientos();
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    }
  },

  actualizarUI() {
    const bannerSinCaja = document.getElementById('banner-sin-caja');
    const panelCajaAbierta = document.getElementById('panel-caja-abierta');
    const badgeEstadoCaja = document.getElementById('header-caja-status');

    if (this.cajaActiva && this.cajaActiva.estado === 'abierta') {
      if (bannerSinCaja) bannerSinCaja.classList.add('hidden');
      if (panelCajaAbierta) panelCajaAbierta.classList.remove('hidden');

      if (badgeEstadoCaja) {
        const saldoEfectivoTeorico = (parseFloat(this.cajaActiva.monto_inicial) + parseFloat(this.cajaActiva.total_ventas_efectivo)) - parseFloat(this.cajaActiva.total_gastos);
        badgeEstadoCaja.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center gap-1.5 cursor-pointer';
        badgeEstadoCaja.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Caja Abierta: S/ ${saldoEfectivoTeorico.toFixed(2)}</span>
        `;
      }

      // Actualizar tarjetas de métricas del turno
      const fondo = parseFloat(this.cajaActiva.monto_inicial) || 0;
      const ventasEfe = parseFloat(this.cajaActiva.total_ventas_efectivo) || 0;
      const ventasDig = parseFloat(this.cajaActiva.total_ventas_digital) || 0;
      const gastos = parseFloat(this.cajaActiva.total_gastos) || 0;
      const saldoEfectivoEsperado = (fondo + ventasEfe) - gastos;
      const totalTurno = ventasEfe + ventasDig;

      const elFondo = document.getElementById('caja-fondo-inicial');
      const elVentasEfe = document.getElementById('caja-ventas-efectivo');
      const elVentasDig = document.getElementById('caja-ventas-digital');
      const elGastos = document.getElementById('caja-total-gastos');
      const elSaldoEfectivo = document.getElementById('caja-saldo-efectivo-teorico');
      const elTotalTurno = document.getElementById('caja-total-turno');
      const elFechaApertura = document.getElementById('caja-fecha-apertura');

      if (elFondo) elFondo.textContent = `S/ ${fondo.toFixed(2)}`;
      if (elVentasEfe) elVentasEfe.textContent = `S/ ${ventasEfe.toFixed(2)}`;
      if (elVentasDig) elVentasDig.textContent = `S/ ${ventasDig.toFixed(2)}`;
      if (elGastos) elGastos.textContent = `S/ ${gastos.toFixed(2)}`;
      if (elSaldoEfectivo) elSaldoEfectivo.textContent = `S/ ${saldoEfectivoEsperado.toFixed(2)}`;
      if (elTotalTurno) elTotalTurno.textContent = `S/ ${totalTurno.toFixed(2)}`;

      if (elFechaApertura && this.cajaActiva.hora_apertura) {
        const fechaHora = new Date(this.cajaActiva.hora_apertura).toLocaleString('es-PE', {
          dateStyle: 'short',
          timeStyle: 'short'
        });
        elFechaApertura.textContent = `Inició: ${fechaHora}`;
      }
    } else {
      if (bannerSinCaja) bannerSinCaja.classList.remove('hidden');
      if (panelCajaAbierta) panelCajaAbierta.classList.add('hidden');

      if (badgeEstadoCaja) {
        badgeEstadoCaja.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 flex items-center gap-1.5 cursor-pointer';
        badgeEstadoCaja.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>Caja Cerrada</span>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  renderizarMovimientos() {
    const cont = document.getElementById('lista-gastos-caja');
    if (!cont) return;

    if (!this.movimientos.length) {
      cont.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-sm">
          No hay salidas de efectivo ni compras a proveedores en este turno.
        </div>
      `;
      return;
    }

    cont.innerHTML = this.movimientos.map(m => {
      const esProveedor = m.tipo === 'compra_proveedor';
      const esGasto = m.tipo === 'gasto_chica';
      const icono = esProveedor ? 'truck' : (esGasto ? 'trending-down' : 'trending-up');
      const badgeColor = esProveedor 
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400' 
        : (esGasto ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600');
      const textColor = esProveedor
        ? 'text-amber-600 dark:text-amber-400'
        : (esGasto ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600');

      return `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg ${badgeColor}">
              <i data-lucide="${icono}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">${m.descripcion}</p>
                ${esProveedor ? '<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-200/60 text-amber-900 dark:bg-amber-900 dark:text-amber-200">PROVEEDOR</span>' : ''}
              </div>
              <span class="text-xs text-slate-400">${new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <span class="font-bold text-sm ${textColor}">
            ${(esGasto || esProveedor) ? '-' : '+'} S/ ${parseFloat(m.monto).toFixed(2)}
          </span>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  bindEvents() {
    const btnRefrescarHistorial = document.getElementById('btn-refrescar-historial-cajas');
    if (btnRefrescarHistorial) {
      btnRefrescarHistorial.addEventListener('click', async () => {
        await this.cargarHistorial();
        showToast('Historial de cajas actualizado', 'info');
      });
    }

    // Abrir Modal Apertura
    document.querySelectorAll('.btn-abrir-caja-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('modal-apertura-caja').classList.remove('hidden');
        document.getElementById('input-fondo-inicial').focus();
      });
    });

    // Formulario Apertura
    const formApertura = document.getElementById('form-apertura-caja');
    if (formApertura) {
      formApertura.addEventListener('submit', async (e) => {
        e.preventDefault();
        const monto = parseFloat(document.getElementById('input-fondo-inicial').value) || 0;
        const obs = document.getElementById('input-apertura-obs').value;

        try {
          const res = await API.post('/caja/abrir', { monto_inicial: monto, observaciones: obs });
          this.cajaActiva = res.caja;
          document.getElementById('modal-apertura-caja').classList.add('hidden');
          formApertura.reset();
          AudioFeedback.success();
          showToast(`Caja abierta con fondo de S/ ${monto.toFixed(2)}`, 'success');
          this.actualizarUI();
          ReportesModule?.cargarResumen();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }

    // Modal Registrar Gasto de Caja Chica
    const btnNuevoGasto = document.getElementById('btn-nuevo-gasto-caja');
    if (btnNuevoGasto) {
      btnNuevoGasto.addEventListener('click', () => {
        if (!this.cajaActiva) {
          showToast('Primero debes abrir una caja.', 'warning');
          return;
        }
        document.getElementById('modal-gasto-caja').classList.remove('hidden');
        document.getElementById('input-gasto-monto').focus();
      });
    }

    const formGasto = document.getElementById('form-gasto-caja');
    if (formGasto) {
      formGasto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const monto = parseFloat(document.getElementById('input-gasto-monto').value);
        const desc = document.getElementById('input-gasto-desc').value.trim();

        if (!monto || monto <= 0 || !desc) {
          showToast('Completa el monto y la descripción del gasto', 'warning');
          return;
        }

        try {
          await API.post('/caja/movimiento', {
            caja_id: this.cajaActiva.id,
            tipo: 'gasto_chica',
            monto,
            descripcion: desc
          });
          document.getElementById('modal-gasto-caja').classList.add('hidden');
          formGasto.reset();
          AudioFeedback.success();
          showToast(`Gasto de S/ ${monto.toFixed(2)} registrado en caja chica`, 'success');
          await this.cargarCajaActiva();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }

    // Modal Registrar Salida de Efectivo por Compra a Proveedor
    const btnCompraProv = document.getElementById('btn-compra-proveedor-caja');
    if (btnCompraProv) {
      btnCompraProv.addEventListener('click', () => {
        if (!this.cajaActiva) {
          showToast('Primero debes abrir una caja.', 'warning');
          return;
        }
        document.getElementById('modal-compra-proveedor').classList.remove('hidden');
        document.getElementById('prov-gasto-monto').focus();
      });
    }

    const formCompraProv = document.getElementById('form-compra-proveedor');
    if (formCompraProv) {
      formCompraProv.addEventListener('submit', async (e) => {
        e.preventDefault();
        const monto = parseFloat(document.getElementById('prov-gasto-monto').value);
        const proveedor = document.getElementById('prov-gasto-proveedor').value.trim();
        const detalle = document.getElementById('prov-gasto-detalle').value.trim();
        const comp = document.getElementById('prov-gasto-comprobante').value.trim();

        if (!monto || monto <= 0 || !proveedor || !detalle) {
          showToast('Completa el monto, proveedor y detalle de mercadería', 'warning');
          return;
        }

        const descripcion = `[Proveedor: ${proveedor}] ${detalle}${comp ? ' (' + comp + ')' : ''}`;

        try {
          await API.post('/caja/movimiento', {
            caja_id: this.cajaActiva.id,
            tipo: 'compra_proveedor',
            monto,
            descripcion
          });
          document.getElementById('modal-compra-proveedor').classList.add('hidden');
          formCompraProv.reset();
          AudioFeedback.success();
          showToast(`Salida de S/ ${monto.toFixed(2)} registrada y descontada del efectivo en caja`, 'success');
          await this.cargarCajaActiva();
          if (window.ReportesModule) ReportesModule.cargarResumen();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }

    // Modal Cierre de Caja / Corte Diario
    const btnCerrarCaja = document.getElementById('btn-cerrar-caja');
    if (btnCerrarCaja) {
      btnCerrarCaja.addEventListener('click', () => {
        if (!this.cajaActiva) return;
        this.prepararModalCierre();
        document.getElementById('modal-cierre-caja').classList.remove('hidden');
        document.getElementById('cierre-conteo-efectivo').focus();
      });
    }

    // Escuchas para cálculo dinámico del arqueo de cierre
    const inputConteoEfectivo = document.getElementById('cierre-conteo-efectivo');
    const inputConteoDigital = document.getElementById('cierre-conteo-digital');

    [inputConteoEfectivo, inputConteoDigital].forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.calcularArqueoCierre());
      }
    });

    const formCierre = document.getElementById('form-cierre-caja');
    if (formCierre) {
      formCierre.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.cajaActiva) return;

        const conteoEfe = parseFloat(inputConteoEfectivo.value) || 0;
        const conteoDig = parseFloat(inputConteoDigital.value) || 0;
        const obs = document.getElementById('cierre-observaciones').value;

        try {
          const res = await API.post('/caja/cerrar', {
            caja_id: this.cajaActiva.id,
            monto_cierre_efectivo: conteoEfe,
            monto_cierre_digital: conteoDig,
            observaciones: obs
          });

          this.cajaActiva = null;
          document.getElementById('modal-cierre-caja').classList.add('hidden');
          formCierre.reset();
          AudioFeedback.success();

          let msg = 'Corte de caja completado exitosamente.';
          if (res.difEfectivo > 0) msg += ` (Sobrante efectivo: +S/ ${res.difEfectivo.toFixed(2)})`;
          else if (res.difEfectivo < 0) msg += ` (Faltante efectivo: -S/ ${Math.abs(res.difEfectivo).toFixed(2)})`;

          showToast(msg, res.difEfectivo === 0 ? 'success' : 'warning', 4500);
          this.actualizarUI();
          await this.cargarHistorial();
          ReportesModule?.cargarResumen();
        } catch (err) {
          AudioFeedback.error();
        }
      });
    }
  },

  prepararModalCierre() {
    if (!this.cajaActiva) return;
    const fondo = parseFloat(this.cajaActiva.monto_inicial) || 0;
    const ventasEfe = parseFloat(this.cajaActiva.total_ventas_efectivo) || 0;
    const ventasDig = parseFloat(this.cajaActiva.total_ventas_digital) || 0;
    const gastos = parseFloat(this.cajaActiva.total_gastos) || 0;
    const esperadoEfe = (fondo + ventasEfe) - gastos;
    const esperadoDig = ventasDig;

    document.getElementById('cierre-teorico-efectivo').textContent = `S/ ${esperadoEfe.toFixed(2)}`;
    document.getElementById('cierre-teorico-digital').textContent = `S/ ${esperadoDig.toFixed(2)}`;
    document.getElementById('cierre-conteo-digital').value = esperadoDig.toFixed(2); // Prefill sugerido
    document.getElementById('cierre-conteo-efectivo').value = '';

    this.calcularArqueoCierre();
  },

  calcularArqueoCierre() {
    if (!this.cajaActiva) return;
    const fondo = parseFloat(this.cajaActiva.monto_inicial) || 0;
    const ventasEfe = parseFloat(this.cajaActiva.total_ventas_efectivo) || 0;
    const ventasDig = parseFloat(this.cajaActiva.total_ventas_digital) || 0;
    const gastos = parseFloat(this.cajaActiva.total_gastos) || 0;
    const esperadoEfe = (fondo + ventasEfe) - gastos;
    const esperadoDig = ventasDig;

    const conteoEfe = parseFloat(document.getElementById('cierre-conteo-efectivo').value) || 0;
    const conteoDig = parseFloat(document.getElementById('cierre-conteo-digital').value) || 0;

    const difEfe = conteoEfe - esperadoEfe;
    const difDig = conteoDig - esperadoDig;

    const elBadgeEfe = document.getElementById('cierre-resultado-efectivo');
    const elBadgeDig = document.getElementById('cierre-resultado-digital');

    if (elBadgeEfe) {
      if (Math.abs(difEfe) < 0.01) {
        elBadgeEfe.className = 'text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200';
        elBadgeEfe.textContent = 'Cuadre Exacto (S/ 0.00)';
      } else if (difEfe > 0) {
        elBadgeEfe.className = 'text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200';
        elBadgeEfe.textContent = `Sobrante: +S/ ${difEfe.toFixed(2)}`;
      } else {
        elBadgeEfe.className = 'text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200';
        elBadgeEfe.textContent = `Faltante: -S/ ${Math.abs(difEfe).toFixed(2)}`;
      }
    }

    if (elBadgeDig) {
      if (Math.abs(difDig) < 0.01) {
        elBadgeDig.className = 'text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200';
        elBadgeDig.textContent = 'Cuadre Digital Exacto';
      } else {
        elBadgeDig.className = 'text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200';
        elBadgeDig.textContent = `Diferencia: ${difDig > 0 ? '+' : ''}S/ ${difDig.toFixed(2)}`;
      }
    }
  }
};
