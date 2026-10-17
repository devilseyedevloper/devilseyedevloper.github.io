/**
 * Supabase + backend configuration for Singh Web Creations
 *
 * The Supabase URL and publishable key below are *browser-public* values:
 * they are meant to ship to every visitor's browser and are protected by Row
 * Level Security. NEVER put the service_role / secret key here — that one
 * stays on the Node backend in .env only.
 *
 * They are baked in as defaults so signup and login also work when the site
 * is served statically (GitHub Pages), where nothing answers /api/config.
 * When the Node backend IS running it still overrides them at startup.
 *
 * To point the pages at a deployed backend (Render / Railway / Heroku /
 * localhost), set window.ENV_API_BASE before loading this file:
 *   <script>window.ENV_API_BASE = 'https://my-backend.onrender.com';</script>
 */
window.SUPABASE_CONFIG = {
  url: window.ENV_SUPABASE_URL || 'https://idwdqubqkbqozkkrduxw.supabase.co',
  anonKey: window.ENV_SUPABASE_ANON_KEY || 'sb_publishable_hsSdlcrsfC8RkTbIjFHplA_ig8AAc6I'
};

// Origin of the optional Node backend ('' = same origin). Static hosts cannot
// serve /api/*; every call below degrades gracefully when it 404s.
window.API_BASE = String(window.ENV_API_BASE || '').replace(/\/+$/, '');
window.apiUrl = (path) => `${window.API_BASE}${path}`;

window.SUPABASE_CONFIG_READY = fetch(window.apiUrl('/api/config'))
  .then(response => (response.ok ? response.json() : null))
  .then(config => {
    if (config?.supabaseUrl && config?.supabaseAnonKey) {
      window.SUPABASE_CONFIG.url = config.supabaseUrl;
      window.SUPABASE_CONFIG.anonKey = config.supabaseAnonKey;
    }
  })
  .catch(() => undefined);
