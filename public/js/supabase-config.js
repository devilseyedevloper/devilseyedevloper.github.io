/**
 * Supabase Configuration for Singh Web Creations
 *
 * Safe for frontend use: Only the public anon key is used.
 * Never paste the service_role key here.
 *
 * To connect your live Supabase database:
 * 1. Open your Supabase Dashboard (https://supabase.com)
 * 2. Run the SQL from supabase-schema.sql in the SQL Editor
 * 3. Go to Project Settings -> API
 * 4. Set the url and anonKey values below:
 */
window.SUPABASE_CONFIG = {
  url: window.ENV_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  anonKey: window.ENV_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
};

window.SUPABASE_CONFIG_READY = fetch('/api/config')
  .then(response => response.ok ? response.json() : null)
  .then(config => {
    if (config?.supabaseUrl && config?.supabaseAnonKey) {
      window.SUPABASE_CONFIG.url = config.supabaseUrl;
      window.SUPABASE_CONFIG.anonKey = config.supabaseAnonKey;
    }
  })
  .catch(() => undefined);
