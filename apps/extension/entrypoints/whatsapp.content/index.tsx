import { startVoiceMessageScanner } from '../../src/adapters/whatsapp/scanner';

export default defineContentScript({
  matches: ['https://web.whatsapp.com/*'],
  runAt: 'document_idle',
  main() {
    startVoiceMessageScanner();
  },
});
