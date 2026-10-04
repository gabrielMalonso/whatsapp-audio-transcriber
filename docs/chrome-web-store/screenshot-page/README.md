# Local screenshot page

Static fixture based on proportions measured in WhatsApp Web. All content is fictional, and the page loads no external scripts, fonts, images, or data.

Open `index.html` directly in the browser or run this from the project root:

```bash
python3 -m http.server 4173 --directory docs/chrome-web-store/screenshot-page
```

Then visit `http://127.0.0.1:4173/` with a `1280 × 800` viewport.

## Capturing real components

`sanitize-whatsapp.js` is a function for supervised execution in an already-open WhatsApp Web tab. It hides real content, clones components rendered by WhatsApp itself, and replaces names, messages, and avatars with fictional data.

The change exists only in the current tab's DOM. Run `window.__watScreenshotRestore()` or refresh the page to restore WhatsApp.
