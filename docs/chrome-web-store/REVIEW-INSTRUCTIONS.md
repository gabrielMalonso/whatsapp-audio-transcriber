# Instruções para o revisor

## Pré-requisitos

- Google Chrome em desktop;
- sessão ativa no WhatsApp Web;
- uma API key válida da Groq com acesso a `whisper-large-v3-turbo` e `openai/gpt-oss-20b`.

Não há conta, login ou servidor do próprio projeto. A extensão usa a sessão já aberta no WhatsApp Web e a API key fornecida pelo revisor.

## Roteiro de teste

1. Instale a extensão e abra seu popup.
2. Cole uma API key da Groq e selecione **Salvar e testar**. O status deve mudar para **Pronto**.
3. Abra ou atualize `https://web.whatsapp.com/` e entre em uma conversa que contenha uma mensagem de voz.
4. Acione o botão de transcrição exibido junto à mensagem.
5. Na primeira vez, confirme o aviso de que o áudio será enviado diretamente à Groq.
6. Aguarde as etapas de captura, fila, transcrição e formatação.
7. Confirme que o texto aparece junto à mensagem e que pode ser copiado.
8. No popup, teste as opções de tom e formatação, a limpeza das transcrições salvas e a remoção da API key.

## Observações

- Nenhum áudio é enviado antes de uma ação explícita e da confirmação do aviso inicial.
- A mensagem pode ser marcada como reproduzida pelo WhatsApp durante a captura, mas o som é bloqueado pela extensão.
- O projeto não recebe a API key, o áudio ou a transcrição; o navegador se comunica diretamente com `api.groq.com`.
- Se a equipe de revisão exigir uma credencial temporária, informe-a somente no campo privado **Test instructions** do painel. Nunca inclua uma chave no ZIP, no repositório ou na descrição pública.
