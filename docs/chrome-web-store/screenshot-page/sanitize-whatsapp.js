() => {
  if (window.__watScreenshotModeActive) {
    return window.__watScreenshotModeMetrics;
  }

  const rect = (element) => element.getBoundingClientRect();
  const isVisible = (element) => {
    const bounds = rect(element);
    return bounds.width > 0 && bounds.height > 0;
  };
  const textNodes = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue?.trim()) nodes.push(node);
      node = walker.nextNode();
    }
    return nodes;
  };
  const safeAvatar = (initials, start, end) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><text x="48" y="55" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="28" font-weight="700">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  const clearPrivateAttributes = (root) => {
    for (const element of [root, ...root.querySelectorAll('*')]) {
      element.removeAttribute('title');
      element.removeAttribute('data-id');
      element.removeAttribute('data-pre-plain-text');
      if (element.hasAttribute('alt')) element.setAttribute('alt', '');
      if (element.matches('a')) {
        element.removeAttribute('href');
        element.removeAttribute('target');
      }
    }
  };
  const setImage = (image, source) => {
    if (!image) return;
    image.removeAttribute('srcset');
    image.setAttribute('src', source);
    image.setAttribute('alt', '');
  };
  const setFirstLargeImage = (root, source) => {
    const image = [...root.querySelectorAll('img')].find((candidate) => {
      const bounds = rect(candidate);
      return bounds.width >= 36 && bounds.height >= 36;
    });
    setImage(image, source);
  };
  const replaceHeader = (header) => {
    const nodes = textNodes(header).filter((node) =>
      isVisible(node.parentElement),
    );
    if (nodes[0]) nodes[0].nodeValue = 'Equipe Produto';
    if (nodes[1]) nodes[1].nodeValue = '5 participantes';
    for (const node of nodes.slice(2)) node.nodeValue = '';
    setFirstLargeImage(header, safeAvatar('EP', '#058f77', '#35c89b'));
    clearPrivateAttributes(header);
    const profileButtons = [...header.querySelectorAll('button')].filter(
      (button) => rect(button).width >= 40,
    );
    if (profileButtons[0])
      profileButtons[0].setAttribute('aria-label', 'Dados do perfil fictício');
    if (profileButtons[1])
      profileButtons[1].setAttribute('aria-label', 'Equipe Produto');
  };
  const replaceListRow = (row, item, index) => {
    clearPrivateAttributes(row);
    row.setAttribute('aria-label', `${item.name} ${item.time} ${item.preview}`);
    row.style.position = 'absolute';
    row.style.inset = `${index * 76}px 0 auto 0`;
    row.style.width = '100%';
    row.style.height = '76px';
    row.style.transform = 'none';
    row.style.visibility = 'visible';
    row.style.background = index === 0 ? '#f0f2f5' : '#fff';

    const nodes = textNodes(row);
    let nameSet = false;
    let timeSet = false;
    let previewSet = false;
    for (const node of nodes) {
      const value = node.nodeValue.trim();
      if (/mensagens? não lidas?/iu.test(value)) {
        node.nodeValue = '';
      } else if (
        /^(?:\d{1,2}:\d{2}|ontem|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo)$/iu.test(
          value,
        )
      ) {
        if (!timeSet) {
          node.nodeValue = item.time;
          timeSet = true;
        } else {
          node.nodeValue = '';
        }
      } else if (!nameSet) {
        node.nodeValue = item.name;
        nameSet = true;
      } else if (!previewSet) {
        node.nodeValue = item.preview;
        previewSet = true;
      } else {
        node.nodeValue = '';
      }
    }

    setFirstLargeImage(row, safeAvatar(item.initials, item.start, item.end));
  };
  const sanitizeMessage = (row, message, time, voice) => {
    row.removeAttribute('role');
    for (const nested of row.querySelectorAll('[role="row"]'))
      nested.removeAttribute('role');
    for (const host of row.querySelectorAll(
      '[data-wat-panel],[data-wat-bubble]',
    ))
      host.remove();
    clearPrivateAttributes(row);
    row.style.position = 'relative';
    row.style.inset = 'auto';
    row.style.width = '100%';
    row.style.transform = 'none';
    row.style.visibility = 'visible';
    row.style.marginBottom = '8px';

    const bubble = row.querySelector('[data-testid="msg-container"]');
    if (!bubble) return;
    const meta = bubble.querySelector('[data-testid="msg-meta"]');
    const nodes = textNodes(bubble);
    const bodyNodes = nodes.filter((node) => {
      if (meta?.contains(node)) return false;
      if (node.parentElement.closest('button,[role="slider"]')) return false;
      const bounds = rect(node.parentElement);
      return bounds.width > 2 && bounds.height > 2;
    });

    if (voice) {
      for (const node of bodyNodes) {
        node.nodeValue = /^\d{1,2}:\d{2}$/u.test(node.nodeValue.trim())
          ? '0:37'
          : '';
      }
      setFirstLargeImage(bubble, safeAvatar('AD', '#c55d58', '#ef9c83'));
      const playButton = bubble.querySelector('button');
      if (playButton)
        playButton.setAttribute('aria-label', 'Reproduzir mensagem de voz');
      const slider = bubble.querySelector('[role="slider"]');
      if (slider)
        slider.setAttribute(
          'aria-label',
          'Controle de progresso da mensagem de voz',
        );
    } else {
      let replaced = false;
      for (const node of bodyNodes) {
        if (!replaced && !/^\d{1,2}:\d{2}$/u.test(node.nodeValue.trim())) {
          node.nodeValue = message;
          replaced = true;
        } else {
          node.nodeValue = '';
        }
      }
    }

    if (meta) {
      const metaNodes = textNodes(meta);
      let timeSet = false;
      for (const node of metaNodes) {
        if (!timeSet && /\d{1,2}:\d{2}/u.test(node.nodeValue)) {
          node.nodeValue = time;
          timeSet = true;
        } else {
          node.nodeValue = '';
        }
      }
    }

    row.setAttribute(
      'aria-label',
      voice ? `Mensagem de voz fictícia, 0:37, ${time}` : `${message}, ${time}`,
    );
  };

  const listGrid = document.querySelector('[aria-label="Lista de conversas"]');
  const footer = [...document.querySelectorAll('footer')].find(
    (candidate) => rect(candidate).left > innerWidth * 0.4,
  );
  if (!listGrid || !footer) return { ok: false, reason: 'layout-not-found' };

  const panelCandidates = [];
  let ancestor = footer;
  while (ancestor && ancestor !== document.body) {
    const bounds = rect(ancestor);
    if (
      bounds.left > innerWidth * 0.35 &&
      bounds.right >= innerWidth - 2 &&
      bounds.height >= innerHeight - 2
    ) {
      panelCandidates.push(ancestor);
    }
    ancestor = ancestor.parentElement;
  }
  const chatPanel = panelCandidates.sort(
    (a, b) => rect(a).width - rect(b).width,
  )[0];
  if (!chatPanel) return { ok: false, reason: 'chat-panel-not-found' };

  const header = [...chatPanel.querySelectorAll('header,[role="banner"]')]
    .filter((candidate) => {
      const bounds = rect(candidate);
      return (
        bounds.top <= 1 &&
        bounds.height >= 56 &&
        bounds.height <= 72 &&
        bounds.width > 600
      );
    })
    .sort((a, b) => rect(b).width - rect(a).width)[0];
  if (header) replaceHeader(header);

  const listItems = [
    {
      name: 'Equipe Produto',
      time: '10:42',
      preview: 'Mensagem de voz',
      initials: 'EP',
      start: '#058f77',
      end: '#35c89b',
    },
    {
      name: 'Ana Demo',
      time: '10:18',
      preview: 'Arquivo revisado, obrigada!',
      initials: 'AD',
      start: '#c55d58',
      end: '#ef9c83',
    },
    {
      name: 'Time de Design',
      time: '09:54',
      preview: 'Você: envio a versão final hoje.',
      initials: 'TD',
      start: '#477a9b',
      end: '#83b8d3',
    },
    {
      name: 'Bruno Exemplo',
      time: 'Ontem',
      preview: 'Perfeito, combinado!',
      initials: 'BE',
      start: '#a77936',
      end: '#d7b66f',
    },
    {
      name: 'Projeto Demo',
      time: 'Ontem',
      preview: 'Foto',
      initials: 'PD',
      start: '#705b9f',
      end: '#a990d6',
    },
    {
      name: 'Clara Exemplo',
      time: 'sexta-feira',
      preview: 'Até amanhã!',
      initials: 'CE',
      start: '#4d8d7d',
      end: '#8ac7b2',
    },
    {
      name: 'Grupo Exemplo',
      time: 'quinta-feira',
      preview: 'Reunião confirmada.',
      initials: 'GE',
      start: '#65727c',
      end: '#9aa7af',
    },
  ];
  const listRows = [...listGrid.querySelectorAll('[role="row"]')].filter(
    (row) => rect(row).height >= 64,
  );
  const listTemplate =
    listRows.find(
      (row) =>
        !/mensagens? não lidas?/iu.test(row.getAttribute('aria-label') ?? ''),
    ) ?? listRows[0];
  if (!listTemplate) return { ok: false, reason: 'list-template-not-found' };

  const listParent = listGrid.parentElement;
  const listParentStyle = getComputedStyle(listParent);
  if (listParentStyle.position === 'static')
    listParent.style.position = 'relative';
  const listOverlay = document.createElement('div');
  listOverlay.id = 'wat-screenshot-list-overlay';
  Object.assign(listOverlay.style, {
    position: 'absolute',
    inset: '0 auto 0 0',
    width: `${rect(listGrid).width}px`,
    background: '#fff',
    overflow: 'hidden',
    zIndex: '20',
  });
  listItems.forEach((item, index) => {
    const clone = listTemplate.cloneNode(true);
    listOverlay.appendChild(clone);
    replaceListRow(clone, item, index);
  });
  listGrid.setAttribute('aria-hidden', 'true');
  listGrid.style.display = 'none';
  listParent.appendChild(listOverlay);

  const footerBounds = rect(footer);
  const bodyCandidates = [...chatPanel.querySelectorAll('div')].filter(
    (candidate) => {
      const bounds = rect(candidate);
      return (
        Math.abs(bounds.left - rect(chatPanel).left) <= 2 &&
        Math.abs(bounds.width - rect(chatPanel).width) <= 3 &&
        bounds.top >= 56 &&
        bounds.top <= 72 &&
        Math.abs(bounds.bottom - footerBounds.top) <= 3
      );
    },
  );
  const chatBody =
    bodyCandidates.sort((a, b) => rect(b).height - rect(a).height)[0] ??
    footer.previousElementSibling;
  if (!chatBody) return { ok: false, reason: 'chat-body-not-found' };
  if (getComputedStyle(chatBody).position === 'static')
    chatBody.style.position = 'relative';
  for (const child of [...chatBody.children]) {
    child.dataset.watScreenshotOriginal = '1';
    child.setAttribute('aria-hidden', 'true');
    child.style.display = 'none';
  }

  const rows = [...chatPanel.querySelectorAll('[role="row"]')].filter((row) =>
    row.querySelector('[data-testid="msg-container"]'),
  );
  const rowInfo = rows.map((row) => {
    const rowBounds = rect(row);
    const bubble = row.querySelector('[data-testid="msg-container"]');
    const bubbleBounds = rect(bubble);
    return {
      row,
      voice: Boolean(row.querySelector('[role="slider"]')),
      outgoing:
        bubbleBounds.left + bubbleBounds.width / 2 >
        rowBounds.left + rowBounds.width / 2,
      rowBounds,
      bubbleBounds,
    };
  });
  const incomingText = rowInfo.find(
    (item) => !item.voice && !item.outgoing && item.bubbleBounds.height <= 80,
  );
  const outgoingText = rowInfo.find(
    (item) => !item.voice && item.outgoing && item.bubbleBounds.height <= 80,
  );
  const incomingVoice = rowInfo.find((item) => item.voice && !item.outgoing);
  if (!incomingText || !outgoingText || !incomingVoice)
    return { ok: false, reason: 'message-templates-not-found' };

  const leftInset = Math.round(
    incomingVoice.bubbleBounds.left - incomingVoice.rowBounds.left,
  );
  const rightInset = Math.round(
    outgoingText.rowBounds.left +
      outgoingText.rowBounds.width -
      (outgoingText.bubbleBounds.left + outgoingText.bubbleBounds.width),
  );
  const laneWidth = Math.round(
    incomingVoice.rowBounds.width - leftInset - rightInset,
  );

  const style = document.createElement('style');
  style.id = 'wat-screenshot-mode-styles';
  style.textContent = `
    #wat-screenshot-chat-overlay {
      position: absolute;
      inset: 0 11px 0 0;
      overflow: hidden;
      z-index: 1000;
      pointer-events: none;
      color: var(--message-primary, #111b21);
      font-family: "Roboto Variable", Roboto, "Helvetica Neue", Helvetica, sans-serif;
    }
    #wat-screenshot-chat-overlay .wat-demo-day {
      width: max-content;
      margin: 14px auto 16px;
      padding: 6px 12px;
      border-radius: 7px;
      background: rgba(255,255,255,.94);
      box-shadow: 0 1px 1px rgba(11,20,26,.06);
      color: #667781;
      font-size: 12px;
    }
    #wat-screenshot-chat-overlay .wat-demo-transcript {
      box-sizing: border-box;
      width: ${laneWidth}px;
      min-height: 126px;
      margin: 1px ${rightInset}px 8px ${leftInset}px;
      padding: 10px 12px 8px;
      border-radius: 7.5px;
      background: var(--incoming-background, #fff);
      box-shadow: 0 1px .5px rgba(11,20,26,.13);
      font-size: 14px;
      line-height: 20px;
    }
    #wat-screenshot-chat-overlay .wat-demo-transcript-head,
    #wat-screenshot-chat-overlay .wat-demo-transcript-title,
    #wat-screenshot-chat-overlay .wat-demo-transcript-foot {
      display: flex;
      align-items: center;
    }
    #wat-screenshot-chat-overlay .wat-demo-transcript-head {
      justify-content: space-between;
    }
    #wat-screenshot-chat-overlay .wat-demo-transcript-title {
      gap: 6px;
      color: #54656f;
      font-size: 12px;
      font-weight: 500;
    }
    #wat-screenshot-chat-overlay .wat-demo-lines {
      display: grid;
      gap: 3px;
      width: 16px;
    }
    #wat-screenshot-chat-overlay .wat-demo-lines i {
      display: block;
      height: 1.5px;
      border-radius: 2px;
      background: currentColor;
    }
    #wat-screenshot-chat-overlay .wat-demo-lines i:nth-child(2) { width: 11px; }
    #wat-screenshot-chat-overlay .wat-demo-close {
      color: #54656f;
      font-size: 21px;
      line-height: 1;
    }
    #wat-screenshot-chat-overlay .wat-demo-transcript p {
      margin: 7px 0 0;
      color: #111b21;
    }
    #wat-screenshot-chat-overlay .wat-demo-transcript-foot {
      justify-content: flex-end;
      gap: 10px;
      margin-top: 12px;
      color: #54656f;
      font-size: 18px;
    }
  `;
  document.head.appendChild(style);

  const chatOverlay = document.createElement('div');
  chatOverlay.id = 'wat-screenshot-chat-overlay';
  chatOverlay.innerHTML = '<div class="wat-demo-day">Hoje</div>';
  chatBody.appendChild(chatOverlay);

  const appendMessage = (template, message, time, voice = false) => {
    const clone = template.row.cloneNode(true);
    chatOverlay.appendChild(clone);
    sanitizeMessage(clone, message, time, voice);
    return clone;
  };
  appendMessage(
    incomingText,
    'Pessoal, o material da demonstração já está pronto.',
    '10:39',
  );
  appendMessage(
    outgoingText,
    'Ótimo! Vou revisar a última versão agora.',
    '10:40',
  );
  appendMessage(incomingVoice, '', '10:41', true);

  const transcript = document.createElement('section');
  transcript.className = 'wat-demo-transcript';
  transcript.setAttribute('aria-label', 'Transcrição fictícia');
  transcript.innerHTML = `
    <div class="wat-demo-transcript-head">
      <div class="wat-demo-transcript-title"><span class="wat-demo-lines"><i></i><i></i><i></i></span><span>Transcrição</span></div>
      <span class="wat-demo-close">×</span>
    </div>
    <p>Fechamos a revisão. Vou organizar os arquivos, conferir os detalhes e enviar a versão final ainda hoje.</p>
    <div class="wat-demo-transcript-foot"><span>▢</span><span>⟳</span></div>
  `;
  chatOverlay.appendChild(transcript);
  appendMessage(outgoingText, 'Perfeito, obrigado!', '10:42');

  clearPrivateAttributes(footer);
  const composer = footer.querySelector('[contenteditable="true"]');
  if (composer) composer.setAttribute('aria-label', 'Digite uma mensagem');
  const ownPhoto = document.querySelector(
    '[data-testid="navbar-item-me-tab-photo"]',
  );
  setImage(
    ownPhoto?.matches('img') ? ownPhoto : ownPhoto?.querySelector('img'),
    safeAvatar('EU', '#596b78', '#8ea3af'),
  );

  window.__watScreenshotModeActive = true;
  window.__watScreenshotRestore = () => location.reload();
  window.__watScreenshotModeMetrics = {
    ok: true,
    listRows: listItems.length,
    chatRows: 4,
    laneWidth,
    leftInset,
    rightInset,
    viewport: { width: innerWidth, height: innerHeight },
  };
  return window.__watScreenshotModeMetrics;
};
