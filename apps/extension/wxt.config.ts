import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Transcrição de áudios do WhatsApp',
    description:
      'Transcreve e formata mensagens de voz usando Whisper e GPT-OSS na Groq.',
    version: '0.2.0',
    permissions: ['storage'],
    host_permissions: ['https://web.whatsapp.com/*', 'https://api.groq.com/*'],
    action: {
      default_title: 'Transcrição de áudios do WhatsApp',
    },
  },
});
