# Instalação e atualização

Os pacotes Chrome existentes nesta pasta continuam sendo específicos do Chrome. Firefox e Zen usam o mesmo build Firefox, gerado por `pnpm build:firefox` ou `pnpm zip:firefox`; o ZIP fica em `apps/extension/.output` e não está assinado.

- **Chrome:** descompacte o ZIP, abra `chrome://extensions`, ative o modo de desenvolvedor e use **Carregar sem compactação** na pasta com `manifest.json`.
- **Firefox/Zen temporário:** abra `about:debugging#/runtime/this-firefox`, clique em **Carregar extensão temporária…** e selecione `apps/extension/.output/firefox-mv3/manifest.json`. É removida ao fechar o navegador.
- **Firefox/Zen permanente:** obtenha o XPI assinado pela Mozilla, abra `about:addons` e use a engrenagem → **Instalar extensão de um arquivo…**. Renomear um ZIP para XPI não substitui a assinatura.

Abra o popup, configure sua API key da Groq e recarregue o WhatsApp Web. No Firefox/Zen, confirme também as permissões dos sites WhatsApp e Groq em `about:addons`.

Para atualizar, recarregue a extensão na mesma pasta (Chrome ou Firefox/Zen temporário), ou instale o novo XPI assinado com o mesmo ID e versão maior (permanente). Não desinstale antes de atualizar se quiser preservar chave, preferências e cache. Instalação temporária não garante persistência entre sessões do navegador.

As instruções completas de build, assinatura AMO/unlisted e atualização estão no [README](../README.md#instalação).
