// ==============================================================================
// CAPA DE COMUNICACIÓN API Y SERVICIOS CLIENTE
// ==============================================================================

const API = {
  baseUrl: '/api',

  async get(endpoint) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`[API GET ${endpoint}] Error:`, err);
      showToast(err.message, 'error');
      throw err;
    }
  },

  async post(endpoint, data) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Error ${res.status}: ${res.statusText}`);
      }
      return json;
    } catch (err) {
      console.error(`[API POST ${endpoint}] Error:`, err);
      showToast(err.message, 'error');
      throw err;
    }
  },

  async put(endpoint, data) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Error ${res.status}: ${res.statusText}`);
      }
      return json;
    } catch (err) {
      console.error(`[API PUT ${endpoint}] Error:`, err);
      showToast(err.message, 'error');
      throw err;
    }
  },

  async delete(endpoint) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Error ${res.status}: ${res.statusText}`);
      }
      return json;
    } catch (err) {
      console.error(`[API DELETE ${endpoint}] Error:`, err);
      showToast(err.message, 'error');
      throw err;
    }
  }
};

// ==============================================================================
// SISTEMA DE NOTIFICACIONES TOAST Y EFECTOS DE SONIDO
// ==============================================================================
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-msg flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium border ${
    type === 'error'
      ? 'bg-rose-600 border-rose-500'
      : type === 'warning'
      ? 'bg-amber-600 border-amber-500'
      : type === 'info'
      ? 'bg-blue-600 border-blue-500'
      : 'bg-emerald-600 border-emerald-500'
  }`;

  const iconName = type === 'error' ? 'alert-triangle' : type === 'warning' ? 'alert-circle' : type === 'info' ? 'info' : 'check-circle';
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Generador de sonidos amigables para mostrador (Web Audio API)
const AudioFeedback = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  beep(freq = 600, duration = 0.08, type = 'sine') {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Ignorar si el audio del navegador está bloqueado
    }
  },
  success() {
    this.beep(523.25, 0.06); // C5
    setTimeout(() => this.beep(659.25, 0.1), 70); // E5
  },
  scan() {
    this.beep(880, 0.05);
  },
  error() {
    this.beep(250, 0.15, 'sawtooth');
  }
};
