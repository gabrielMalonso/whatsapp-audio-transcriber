import { startChatQuickActions } from "../../src/adapters/whatsapp/chatQuickActions";
import { startVoiceMessageScanner } from "../../src/adapters/whatsapp/scanner";

export default defineContentScript({
  matches: ["https://web.whatsapp.com/*"],
  runAt: "document_idle",
  main(ctx) {
    const stopVoiceMessages = startVoiceMessageScanner();
    const stopChatActions = startChatQuickActions();
    ctx.onInvalidated(() => {
      stopVoiceMessages();
      stopChatActions();
    });
  },
});
