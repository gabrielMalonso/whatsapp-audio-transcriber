import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'pt_BR',
    version: '0.2.3',
    permissions: ['storage'],
    host_permissions: ['https://web.whatsapp.com/*', 'https://api.groq.com/*'],
    action: {
      default_title: '__MSG_extensionActionTitle__',
    },
  },
});
