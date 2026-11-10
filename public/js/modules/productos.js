// ==============================================================================
// MÓDULO 2: CATÁLOGO DE PRODUCTOS Y PRECIOS (CRUD, IMPORTADOR Y ALERTAS)
// ==============================================================================

const ProductosModule = {
  productos: [],
  categoriaFiltro: 'todos',
  soloStockBajo: false,
  terminoBusqueda: '',
  productoEditando: null,
  productosParaImportar: [],

  async init() {
    await this.cargarProductos();
    this.bindEvents();
  },

  async cargarProductos() {
    try {
      const res = await API.get('/productos');
      this.productos = res.productos || [];
      this.renderizar();
      this.actualizarContadoresStock();
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  },

  actualizarContadoresStock() {
    const bajoCount = this.productos.filter(p => p.stock_actual <= p.stock_minimo).length;
    const badge = document.getElementById('badge-alertas-stock');
    if (badge) {
      if (bajoCount > 0) {
        badge.textContent = bajoCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  },

  getProductosFiltrados() {
    return this.productos.filter(p => {
      // Filtro por término
      const matchBusqueda = !this.terminoBusqueda || 
        p.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(this.terminoBusqueda.toLowerCase())) ||
        p.categoria.toLowerCase().includes(this.terminoBusqueda.toLowerCase());

      // Filtro por categoría
      const matchCat = this.categoriaFiltro === 'todos' || p.categoria === this.categoriaFiltro;

      // Filtro por stock bajo
      const matchStock = !this.soloStockBajo || (p.stock_actual <= p.stock_minimo);

      return matchBusqueda && matchCat && matchStock;
    });
  },

  renderizar() {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;

    const lista = this.getProductosFiltrados();

    if (!lista.length) {
      grid.innerHTML = `
        <div class="col-span-full p-12 text-center text-slate-400">
          <i data-lucide="package-search" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="text-base font-medium">No se encontraron productos con los filtros actuales.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    grid.innerHTML = lista.map(p => {
      const stock = parseFloat(p.stock_actual);
      const min = parseFloat(p.stock_minimo);
      const esAgotado = stock <= 0;
      const esBajo = stock > 0 && stock <= min;

      let badgeStockClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200';
      let badgeTexto = `Stock: ${stock} ${p.unidad_medida || 'und'}`;

      if (esAgotado) {
        badgeStockClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 stock-badge-critico';
        badgeTexto = `¡AGOTADO! (0 ${p.unidad_medida || 'und'})`;
      } else if (esBajo) {
        badgeStockClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 stock-badge-bajo';
        badgeTexto = `Stock Bajo: ${stock} ${p.unidad_medida || 'und'} (Mín: ${min})`;
      }

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          ${esAgotado ? '<div class="absolute top-0 right-0 left-0 h-1 bg-rose-500"></div>' : esBajo ? '<div class="absolute top-0 right-0 left-0 h-1 bg-amber-500"></div>' : ''}
          <div>
            <div class="flex items-start gap-3 mb-2">
              ${p.imagen_url ? `
                <img src="${p.imagen_url}" alt="${p.nombre}" class="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50" onerror="this.onerror=null;this.classList.add('hidden');">
              ` : `
                <div class="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="package" class="w-6 h-6 opacity-40"></i>
                </div>
              `}
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium truncate">
                    ${p.categoria}
                  </span>
                  <span class="text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${badgeStockClass} whitespace-nowrap">
                    ${badgeTexto}
                  </span>
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                  ${p.nombre}
                </h3>
              </div>
            </div>

            ${p.codigo_barras ? `
              <p class="text-xs text-slate-400 font-mono flex items-center gap-1 mb-3">
                <i data-lucide="barcode" class="w-3.5 h-3.5"></i> ${p.codigo_barras}
              </p>
            ` : '<div class="mb-3"></div>'}
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div>
              <p class="text-[11px] text-slate-400 font-medium">Precio Venta</p>
              <p class="text-lg font-black text-blue-600 dark:text-blue-400">
                S/ ${parseFloat(p.precio_venta).toFixed(2)}
              </p>
            </div>

            <div class="flex items-center gap-1.5">
              <button onclick="ProductosModule.abrirModalEditar('${p.id}')" title="Editar Producto" class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="ProductosModule.eliminarProducto('${p.id}', '${p.nombre.replace(/'/g, "\\'")}')" title="Desactivar" class="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-xl transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  abrirModalNuevo() {
    this.productoEditando = null;
    document.getElementById('modal-producto-titulo').textContent = 'Nuevo Producto';
    document.getElementById('form-producto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('modal-producto').classList.remove('hidden');
    document.getElementById('prod-nombre').focus();
  },

  abrirModalEditar(id) {
    const prod = this.productos.find(p => p.id === id);
    if (!prod) return;

    this.productoEditando = prod;
    document.getElementById('modal-producto-titulo').textContent = 'Editar Producto';
    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-nombre').value = prod.nombre;
    document.getElementById('prod-codigo').value = prod.codigo_barras || '';
    document.getElementById('prod-categoria').value = prod.categoria || 'Abarrotes';
    document.getElementById('prod-precio-venta').value = prod.precio_venta;
    document.getElementById('prod-precio-costo').value = prod.precio_costo || 0;
    document.getElementById('prod-stock').value = prod.stock_actual;
    document.getElementById('prod-stock-min').value = prod.stock_minimo;
    document.getElementById('prod-unidad').value = prod.unidad_medida || 'unidad';
    document.getElementById('prod-imagen').value = prod.imagen_url || '';

    document.getElementById('modal-producto').classList.remove('hidden');
    document.getElementById('prod-nombre').focus();
  },

  async guardarProducto(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const codigo_barras = document.getElementById('prod-codigo').value.trim();
    const categoria = document.getElementById('prod-categoria').value;
    const precio_venta = parseFloat(document.getElementById('prod-precio-venta').value);
    const precio_costo = parseFloat(document.getElementById('prod-precio-costo').value) || 0;
    const stock_actual = parseFloat(document.getElementById('prod-stock').value) || 0;
    const stock_minimo = parseFloat(document.getElementById('prod-stock-min').value) || 5;
    const unidad_medida = document.getElementById('prod-unidad').value;
    const imagen_url = document.getElementById('prod-imagen').value.trim();

    const payload = {
      nombre,
      codigo_barras,
      categoria,
      precio_venta,
      precio_costo,
      stock_actual,
      stock_minimo,
      unidad_medida,
      imagen_url: imagen_url || null
    };

    try {
      if (id) {
        await API.put(`/productos/${id}`, payload);
        showToast('Producto actualizado correctamente', 'success');
      } else {
        await API.post('/productos', payload);
        showToast('Producto agregado al catálogo', 'success');
      }

      AudioFeedback.success();
      document.getElementById('modal-producto').classList.add('hidden');
      await this.cargarProductos();
      // Refrescar POS
      if (window.POSModule) POSModule.cargarProductos();
    } catch (err) {
      AudioFeedback.error();
    }
  },

  async eliminarProducto(id, nombre) {
    if (!confirm(`¿Estás seguro de desactivar "${nombre}" del catálogo?`)) return;

    try {
      await API.delete(`/productos/${id}`);
      showToast(`Producto "${nombre}" desactivado`, 'info');
      await this.cargarProductos();
      if (window.POSModule) POSModule.cargarProductos();
    } catch (err) {
      AudioFeedback.error();
    }
  },

  // ============================================================================
  // IMPORTADOR MASIVO DE PRODUCTOS (EXCEL / CSV CON SHEETJS)
  // ============================================================================
  abrirModalImportar() {
    this.productosParaImportar = [];
    document.getElementById('input-archivo-excel').value = '';
    document.getElementById('label-archivo-seleccionado').textContent = 'O arrastra el archivo directamente';
    document.getElementById('importar-preview-container').classList.add('hidden');
    document.getElementById('btn-confirmar-importar').disabled = true;
    document.getElementById('modal-importar-productos').classList.remove('hidden');
  },

  procesarArchivo(file) {
    if (!file) return;

    if (!window.XLSX) {
      showToast('Error: Librería SheetJS no cargada en el navegador', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json.length) {
          showToast('El archivo está vacío o no tiene filas válidas.', 'warning');
          return;
        }

        // Mapeo flexible de columnas (español / inglés)
        this.productosParaImportar = json.map(row => {
          const findVal = (keys) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(x => x.trim().toLowerCase() === k.toLowerCase());
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
            }
            return null;
          };

          const nombre = findVal(['nombre', 'producto', 'name', 'item', 'descripcion']) || 'Producto sin nombre';
          const categoria = findVal(['categoria', 'categoría', 'category', 'rubro']) || 'Abarrotes';
          const precio_venta = parseFloat(findVal(['precio_venta', 'precio venta', 'precio', 'price', 'pvp'])) || 1.00;
          const precio_costo = parseFloat(findVal(['precio_costo', 'precio costo', 'costo', 'cost'])) || 0;
          const stock_actual = parseFloat(findVal(['stock_actual', 'stock actual', 'stock', 'cantidad', 'cant'])) || 10;
          const stock_minimo = parseFloat(findVal(['stock_minimo', 'stock minimo', 'minimo', 'min'])) || 5;
          const codigo_barras = findVal(['codigo_barras', 'codigo de barras', 'codigo', 'código', 'barcode', 'sku']);
          const imagen_url = findVal(['imagen_url', 'imagen', 'foto', 'image', 'photo', 'url_imagen', 'url']);
          const unidad_medida = findVal(['unidad_medida', 'unidad', 'medida', 'unit']) || 'unidad';

          return {
            nombre: String(nombre).trim(),
            categoria: String(categoria).trim(),
            precio_venta: Math.max(0, precio_venta),
            precio_costo: Math.max(0, precio_costo),
            stock_actual: Math.max(0, stock_actual),
            stock_minimo: Math.max(0, stock_minimo),
            codigo_barras: codigo_barras ? String(codigo_barras).trim() : null,
            imagen_url: imagen_url ? String(imagen_url).trim() : null,
            unidad_medida: String(unidad_medida).trim()
          };
        }).filter(p => p.nombre && p.nombre !== 'Producto sin nombre');

        this.mostrarPreviewImportacion(file.name);
      } catch (err) {
        console.error('Error parseando archivo Excel:', err);
        showToast('Error al procesar archivo: ' + err.message, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  },

  mostrarPreviewImportacion(filename) {
    document.getElementById('label-archivo-seleccionado').textContent = `Archivo cargado: ${filename}`;
    const previewContainer = document.getElementById('importar-preview-container');
    const tbody = document.getElementById('importar-preview-tbody');
    const conteo = document.getElementById('importar-conteo-preview');
    const btnConfirmar = document.getElementById('btn-confirmar-importar');

    conteo.textContent = `${this.productosParaImportar.length} productos listos para importar`;

    // Renderizar primeras 15 filas como muestra
    const muestra = this.productosParaImportar.slice(0, 15);
    tbody.innerHTML = muestra.map(p => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td class="p-2">
          ${p.imagen_url ? `<img src="${p.imagen_url}" class="w-8 h-8 rounded-lg object-cover border" onerror="this.src='https://placehold.co/40x40?text=Foto';">` : '<span class="text-slate-300">-</span>'}
        </td>
        <td class="p-2 font-bold text-slate-800 dark:text-slate-100">${p.nombre}</td>
        <td class="p-2 text-slate-500">${p.categoria}</td>
        <td class="p-2 font-black text-blue-600">S/ ${p.precio_venta.toFixed(2)}</td>
        <td class="p-2 font-bold">${p.stock_actual}</td>
        <td class="p-2 font-mono text-slate-400">${p.codigo_barras || '<span class="italic text-slate-300">Auto</span>'}</td>
      </tr>
    `).join('');

    previewContainer.classList.remove('hidden');
    btnConfirmar.disabled = this.productosParaImportar.length === 0;
    btnConfirmar.textContent = `Importar ${this.productosParaImportar.length} Productos a Supabase`;
  },

  async confirmarImportacion() {
    if (!this.productosParaImportar.length) return;

    try {
      showToast(`Importando ${this.productosParaImportar.length} productos...`, 'info', 2000);
      const res = await API.post('/productos/bulk', { productos: this.productosParaImportar });

      AudioFeedback.success();
      showToast(`¡Éxito! Se importaron ${res.count || this.productosParaImportar.length} productos al catálogo`, 'success', 4000);

      document.getElementById('modal-importar-productos').classList.add('hidden');
      await this.cargarProductos();
      if (window.POSModule) POSModule.cargarProductos();
    } catch (err) {
      AudioFeedback.error();
    }
  },

  descargarPlantillaEjemplo() {
    if (!window.XLSX) {
      showToast('Librería XLSX no disponible', 'error');
      return;
    }

    const dataEjemplo = [
      {
        'Nombre': 'Inca Kola 500ml Retornable',
        'Categoria': 'Bebidas',
        'Precio Venta': 2.50,
        'Precio Costo': 1.80,
        'Stock': 24,
        'Stock Minimo': 6,
        'Codigo de Barras': '7750106001017',
        'URL de Imagen': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150',
        'Unidad': 'unidad'
      },
      {
        'Nombre': 'Arroz Costeño Extra 1kg',
        'Categoria': 'Abarrotes',
        'Precio Venta': 4.80,
        'Precio Costo': 3.90,
        'Stock': 30,
        'Stock Minimo': 10,
        'Codigo de Barras': '7750150000010',
        'URL de Imagen': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150',
        'Unidad': 'kg'
      },
      {
        'Nombre': 'Aceite Primor Clásico 900ml',
        'Categoria': 'Abarrotes',
        'Precio Venta': 8.50,
        'Precio Costo': 6.90,
        'Stock': 15,
        'Stock Minimo': 5,
        'Codigo de Barras': '7750243000030',
        'URL de Imagen': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150',
        'Unidad': 'unidad'
      },
      {
        'Nombre': 'Leche Gloria Azul 400g',
        'Categoria': 'Lácteos',
        'Precio Venta': 4.20,
        'Precio Costo': 3.40,
        'Stock': 48,
        'Stock Minimo': 12,
        'Codigo de Barras': '7750885000011',
        'URL de Imagen': '',
        'Unidad': 'unidad'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(dataEjemplo);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    XLSX.writeFile(workbook, 'plantilla_productos_bodega.xlsx');
    showToast('Plantilla Excel descargada exitosamente', 'success');
  },

  bindEvents() {
    // Buscador
    const searchInput = document.getElementById('buscar-producto-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.terminoBusqueda = e.target.value.trim();
        this.renderizar();
      });
    }

    // Filtro por botones de categorías
    document.querySelectorAll('.btn-cat-filtro').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-cat-filtro').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        btn.classList.add('bg-blue-600', 'text-white');
        this.categoriaFiltro = btn.dataset.categoria;
        this.renderizar();
      });
    });

    // Checkbox / Toggle stock bajo
    const toggleStockBajo = document.getElementById('toggle-stock-bajo');
    if (toggleStockBajo) {
      toggleStockBajo.addEventListener('change', (e) => {
        this.soloStockBajo = e.target.checked;
        this.renderizar();
      });
    }

    // Botón abrir modal nuevo
    const btnNuevo = document.getElementById('btn-nuevo-producto');
    if (btnNuevo) {
      btnNuevo.addEventListener('click', () => this.abrirModalNuevo());
    }

    // Botón abrir importador
    const btnImportar = document.getElementById('btn-abrir-importar');
    if (btnImportar) {
      btnImportar.addEventListener('click', () => this.abrirModalImportar());
    }

    // Input archivo excel
    const inputArchivo = document.getElementById('input-archivo-excel');
    if (inputArchivo) {
      inputArchivo.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.procesarArchivo(e.target.files[0]);
        }
      });
    }

    // Descargar plantilla
    const btnPlantilla = document.getElementById('btn-descargar-plantilla');
    if (btnPlantilla) {
      btnPlantilla.addEventListener('click', () => this.descargarPlantillaEjemplo());
    }

    // Confirmar importación
    const btnConfImportar = document.getElementById('btn-confirmar-importar');
    if (btnConfImportar) {
      btnConfImportar.addEventListener('click', () => this.confirmarImportacion());
    }

    // Formulario submit
    const form = document.getElementById('form-producto');
    if (form) {
      form.addEventListener('submit', (e) => this.guardarProducto(e));
    }
  }
};
