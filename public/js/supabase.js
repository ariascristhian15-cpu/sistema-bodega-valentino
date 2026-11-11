// ==============================================================================
// CLIENTE SUPABASE PARA EL NAVEGADOR (OPCIONAL)
// ------------------------------------------------------------------------------
// IMPORTANTE: este POS NO lo usa. Toda la app habla con /api/* y es el servidor
// Express quien consulta Supabase (server.js). Así la key y la URL viven en un
// único lugar (variables de entorno de Render) y no se duplican aquí.
//
// Si en el futuro necesitas consultar Supabase directo desde el navegador,
// descomenta la etiqueta <script type="module" src="/js/supabase.js">
// al final de public/index.html y usa `import { supabase } from './supabase.js'`.
// ==============================================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase = null;

try {
  // La configuración se pide al backend: cero credenciales hardcodeadas.
  const res = await fetch('/api/config/public', { cache: 'no-store' });
  if (!res.ok) throw new Error(`El servidor respondió HTTP ${res.status}`);

  const { url, key, error } = await res.json();
  if (error) throw new Error(error);
  if (!url || !key) throw new Error('El servidor no devolvió URL y key de Supabase.');

  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
} catch (err) {
  console.error('[Supabase] Cliente de navegador no inicializado:', err.message);
}

export { supabase };
export default supabase;
