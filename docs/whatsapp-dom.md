# Pesquisa do DOM do WhatsApp Web

Observação realizada no WhatsApp Web atual com mensagens de voz enviadas e recebidas.

## Sinais estáveis usados

- contêiner virtualizado `div[role="row"]`
- identificador da mensagem em `[data-id]`
- bolha em `[data-testid="msg-container"]`
- marcador de voz `[data-icon="ptt-status"]`
- progresso em `[role="slider"]`
- botão de transporte localizado estruturalmente antes do slider

As classes CSS geradas e o texto localizado dos `aria-label` não são usados como seletores principais. O texto do botão de velocidade é apenas um filtro auxiliar em português, inglês e espanhol.

## Descobertas

- Mensagens enviadas e recebidas têm a mesma estrutura essencial.
- `tail-in` e `tail-out` aparecem apenas em algumas mensagens agrupadas e não são confiáveis.
- Não existe um elemento `<audio>` persistente no DOM em repouso.
- Ao acionar o controle, o WhatsApp cria ou reutiliza um media element com uma URL `blob:`.
- Interceptar `HTMLMediaElement.play()` no contexto MAIN permite obter um Blob `audio/ogg` válido começando por `OggS` sem tocar som.
- A captura controlada manteve o slider em zero e o botão no estado de reprodução.

## Estratégia de resiliência

O `MutationObserver` apenas agenda uma varredura por frame. A varredura reconcilia os widgets pelo `data-id`, remove raízes ligadas a linhas virtualizadas antigas e mantém a UI isolada em Shadow DOM.

Se o WhatsApp alterar a estrutura, o popup continuará servindo como diagnóstico do host; o teste `voiceMessages.test.ts` protege a combinação de sinais estruturais usada atualmente.
