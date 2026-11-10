// ==============================================================================
// MÓDULO 6: REPORTES BÁSICOS Y BITÁCORA DEL DÍA
// ==============================================================================

const ReportesModule = {
  resumen: null,

  async init() {
    await this.cargarResumen();
    this.bindEvents();
  },

  async cargarResumen() {
    try {
      const res = await API.get('/reportes/resumen');
      this.resumen = res;
      this.renderizarResumen();
    } catch (err) {
      console.error('Error cargando reportes:', err);
    }
  },

  renderizarResumen() {
    if (!this.resumen) return;
    const r = this.resumen;

    // Tarjetas principales
    const elVentasTot = document.getElementById('rep-ventas-hoy');
    const elVentasEfe = document.getElementById('rep-ventas-efectivo');
    const elVentasDig = document.getElementById('rep-ventas-digital');
    const elFiadosTot = document.getElementById('rep-fiados-total');

    if (elVentasTot) elVentasTot.textContent = `S/ ${(r.totalVentasHoy || 0).toFixed(2)}`;
    if (elVentasEfe) elVentasEfe.textContent = `S/ ${(r.ventasEfectivoHoy || 0).toFixed(2)}`;
    if (elVentasDig) elVentasDig.textContent = `S/ ${(r.ventasDigitalHoy || 0).toFixed(2)}`;
    if (elFiadosTot) elFiadosTot.textContent = `S/ ${(r.totalPorCobrar || 0).toFixed(2)}`;

    // Ranking de productos más vendidos
    const topCont = document.getElementById('rep-ranking-productos');
    if (topCont) {
      const ranking = r.rankingTopVentas || [];
      if (!ranking.length) {
        topCont.innerHTML = `<p class="p-6 text-center text-xs text-slate-400">Sin datos de ventas aún hoy.</p>`;
      } else {
        const maxCant = Math.max(...ranking.map(i => i.cantidad), 1);
        topCont.innerHTML = ranking.map((item, idx) => {
          const pct = Math.round((item.cantidad / maxCant) * 100);
          return `
            <div class="space-y-1">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-bold text-[10px]">
                    #${idx + 1}
                  </span>
                  ${item.nombre}
                </span>
                <span class="font-bold text-blue-600 dark:text-blue-400">
                  ${item.cantidad} unds (S/ ${item.total.toFixed(2)})
                </span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-blue-600 rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Alertas de Stock Crítico
    const alertaCont = document.getElementById('rep-alertas-criticas');
    if (alertaCont) {
      const bajos = r.productosStockBajo || [];
      if (!bajos.length) {
        alertaCont.innerHTML = `
          <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <i data-lucide="check-circle" class="w-4 h-4"></i> Todos los productos cuentan con inventario saludable.
          </div>
        `;
      } else {
        alertaCont.innerHTML = bajos.slice(0, 6).map(p => `
          <div class="flex items-center justify-between p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30">
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">${p.nombre}</p>
              <span class="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Categoría: ${p.categoria}</span>
            </div>
            <span class="text-xs font-black px-2 py-0.5 rounded-md ${p.stock_actual <= 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}">
              ${p.stock_actual} / mín ${p.stock_minimo}
            </span>
          </div>
        `).join('');
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  bindEvents() {
    const btnRefrescar = document.getElementById('btn-refrescar-reportes');
    if (btnRefrescar) {
      btnRefrescar.addEventListener('click', () => {
        this.cargarResumen();
        showToast('Reportes actualizados', 'info');
      });
    }
  }
};
