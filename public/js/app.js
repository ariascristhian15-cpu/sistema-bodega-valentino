// ==============================================================================
// ORQUESTADOR PRINCIPAL DE LA APLICACIÓN (APP.JS)
// ==============================================================================

const App = {
  tabActivo: 'pos',

  ACENTOS: {
    esmeralda: 'Esmeralda / Verde Bodega',
    azul: 'Azul Profesional',
    naranja: 'Naranja Cálido',
    violeta: 'Violeta Moderno'
  },

  async init() {
    this.initTema();
    this.initAcento();
    this.bindNavegacion();
    this.bindModales();
    await this.verificarEstadoServidor();

    // Inicializar módulos de la Bodega
    await CajaModule.init();
    await ProductosModule.init();
    await POSModule.init();
    await FiadosModule.init();
    await PedidosModule.init();
    await ReportesModule.init();

    if (window.lucide) lucide.createIcons();
    console.log('✅ Sistema de Gestión Bodega Valentino inicializado correctamente.');
  },

  // Tema Claro / Oscuro
  initTema() {
    const temaGuardado = localStorage.getItem('bodega_theme');
    if (temaGuardado === 'dark' || (!temaGuardado && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const toggleTema = () => {
      const esOscuro = document.documentElement.classList.toggle('dark');
      localStorage.setItem('bodega_theme', esOscuro ? 'dark' : 'light');
      if (window.lucide) lucide.createIcons();
    };

    const btnTema = document.getElementById('btn-toggle-tema');
    if (btnTema) btnTema.addEventListener('click', toggleTema);

    const btnTemaPanel = document.getElementById('btn-toggle-tema-panel');
    if (btnTemaPanel) btnTemaPanel.addEventListener('click', toggleTema);
  },

  // Paleta de acento (colores de marca) persistida en localStorage
  initAcento() {
    const acentosValidos = Object.keys(this.ACENTOS);
    let acento = localStorage.getItem('bodega_accent') || 'azul';
    if (!acentosValidos.includes(acento)) acento = 'azul';

    this.aplicarAcento(acento, false);

    const panel = document.getElementById('panel-temas');
    const btnPanel = document.getElementById('btn-panel-temas');

    if (btnPanel && panel) {
      btnPanel.addEventListener('click', (e) => {
        e.stopPropagation();
        const abierto = !panel.classList.contains('hidden');
        panel.classList.toggle('hidden', abierto);
        btnPanel.setAttribute('aria-expanded', String(!abierto));
      });

      document.addEventListener('click', (e) => {
        if (!panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== btnPanel && !btnPanel.contains(e.target)) {
          panel.classList.add('hidden');
          btnPanel.setAttribute('aria-expanded', 'false');
        }
      });
    }

    document.querySelectorAll('[data-accent-option]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const valor = btn.dataset.accentOption;
        if (!acentosValidos.includes(valor)) return;
        this.aplicarAcento(valor, true);
      });
    });
  },

  aplicarAcento(acento, guardar = true) {
    document.documentElement.setAttribute('data-accent', acento);
    if (guardar) localStorage.setItem('bodega_accent', acento);

    document.querySelectorAll('[data-accent-option]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.accentOption === acento);
    });

    const label = document.getElementById('label-acento-activo');
    if (label) label.textContent = this.ACENTOS[acento] || acento;
  },

  // Navegación entre Módulos
  bindNavegacion() {
    const navItems = document.querySelectorAll('[data-tab-target]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.dataset.tabTarget;
        this.cambiarTab(target);
      });
    });
  },

  cambiarTab(tabName) {
    this.tabActivo = tabName;

    // Ocultar todas las vistas
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.add('hidden');
    });

    // Mostrar la vista activa
    const vistaActiva = document.getElementById(`view-${tabName}`);
    if (vistaActiva) {
      vistaActiva.classList.remove('hidden');
    }

    // Actualizar estilos de los botones en Sidebar y Bottom Navigation
    document.querySelectorAll('[data-tab-target]').forEach(item => {
      const esActivo = item.dataset.tabTarget === tabName;
      if (esActivo) {
        item.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
        item.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      } else {
        item.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
        item.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      }
    });

    // Eventos específicos al entrar a cada tab
    if (tabName === 'pos') {
      const input = document.getElementById('pos-buscar-input');
      if (input) input.focus();
    } else if (tabName === 'digitales') {
      POSModule.cargarPagosDigitales();
    } else if (tabName === 'reportes') {
      ReportesModule.cargarResumen();
    } else if (tabName === 'caja') {
      CajaModule.cargarCajaActiva();
      CajaModule.cargarHistorial();
    } else if (tabName === 'pedidos') {
      PedidosModule.cargarPedidos();
    } else if (tabName === 'fiados') {
      FiadosModule.cargarClientes();
    }

    if (window.lucide) lucide.createIcons();
  },

  // Manejo genérico de cierre de modales
  bindModales() {
    // Cerrar modal al hacer clic en botón de cierre o backdrop
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        const modal = el.closest('.modal-container');
        if (modal) {
          modal.classList.add('hidden');
          if (modal.id === 'modal-camara-scanner' && window.POSModule) {
            POSModule.detenerEscannerCamara();
          }
        }
      });
    });

    // Cerrar modal con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-container:not(.hidden)').forEach(modal => {
          modal.classList.add('hidden');
          if (modal.id === 'modal-camara-scanner' && window.POSModule) {
            POSModule.detenerEscannerCamara();
          }
        });
      }
    });

    // Modal de Configuración Supabase
    const btnConfig = document.getElementById('btn-modal-supabase');
    if (btnConfig) {
      btnConfig.addEventListener('click', () => {
        document.getElementById('modal-config-supabase').classList.remove('hidden');
      });
    }

    const formSupabase = document.getElementById('form-config-supabase');
    if (formSupabase) {
      formSupabase.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('config-supabase-url').value.trim();
        const key = document.getElementById('config-supabase-key').value.trim();

        try {
          await API.post('/config/supabase', { url, key });
          showToast('Credenciales de Supabase actualizadas', 'success');
          document.getElementById('modal-config-supabase').classList.add('hidden');
          await this.verificarEstadoServidor();
        } catch (err) {
          // El error se muestra en toast desde API.post
        }
      });
    }
  },

  // Verificar estado de conexión con Supabase / Servidor
  async verificarEstadoServidor() {
    try {
      const res = await API.get('/status');
      const badge = document.getElementById('header-db-status');
      if (!badge) return;

      if (res.supabaseConfigured) {
        badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center gap-1.5 cursor-pointer';
        badge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Supabase Conectado</span>
        `;
      } else {
        badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer';
        badge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Modo Local (Listo para Supabase)</span>
        `;
      }
    } catch (err) {
      console.warn('Servidor offline o inaccesible');
    }
  }
};

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
