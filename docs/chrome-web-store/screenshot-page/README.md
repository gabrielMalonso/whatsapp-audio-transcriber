# Página local para screenshots

Fixture estática baseada nas proporções medidas no WhatsApp Web. Todo o conteúdo é fictício e a página não carrega scripts, fontes, imagens ou dados externos.

Abra `index.html` diretamente no navegador ou execute, na raiz do projeto:

```bash
python3 -m http.server 4173 --directory docs/chrome-web-store/screenshot-page
```

Depois acesse `http://127.0.0.1:4173/` com uma viewport de `1280 × 800`.

## Captura com os componentes reais

`sanitize-whatsapp.js` é uma função para execução supervisionada no WhatsApp Web já aberto. Ela oculta o conteúdo real, clona componentes renderizados pelo próprio WhatsApp e substitui nomes, mensagens e avatares por dados fictícios.

A alteração existe apenas no DOM da aba atual. Execute `window.__watScreenshotRestore()` ou atualize a página para restaurar o WhatsApp.
