import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'ClauseGuard',
    description: 'Yerel yapay zekâ ile sözleşme incelemesi ve kaynağa dayalı risk uyarıları.',
    options_ui: { page: 'settings.html', open_in_tab: true },
    permissions: ['activeTab', 'storage', 'scripting'],
    host_permissions: ['http://127.0.0.1:11434/*', 'http://127.0.0.1:4173/*'],
    web_accessible_resources: [{ resources: ['demo.html', 'chunks/*', 'assets/*'], matches: ['http://127.0.0.1:4173/*'] }],
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'" },
  },
});
