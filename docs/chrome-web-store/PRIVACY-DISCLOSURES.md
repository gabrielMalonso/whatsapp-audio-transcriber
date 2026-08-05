# Respostas da aba Privacidade

Use estas respostas no painel e confirme os rótulos exatos apresentados pela Chrome Web Store.

## Finalidade única

Permitir que a pessoa usuária transcreva mensagens de voz escolhidas no WhatsApp Web e formate o texto resultante para leitura e cópia na própria conversa.

## Justificativas de permissões

### `storage`

Armazena localmente a API key fornecida pela pessoa usuária, preferências de formatação, confirmação do aviso inicial e um cache limitado de transcrições. Esses dados permitem manter a configuração entre sessões, evitar reprocessamento e oferecer controles para remover a chave e limpar o cache.

### `https://web.whatsapp.com/*`

Necessária para identificar mensagens de voz no WhatsApp Web, inserir os controles de transcrição e capturar somente o áudio escolhido após uma ação explícita da pessoa usuária. A extensão não atua em outros sites.

### `https://api.groq.com/*`

Necessária para validar a API key da própria pessoa usuária, enviar por HTTPS o áudio selecionado para transcrição e enviar o texto bruto para formatação. A comunicação ocorre diretamente entre o navegador e a Groq, sem servidor intermediário do projeto.

## Código remoto

**Não.** Todo JavaScript executável faz parte do pacote enviado à loja. A extensão não usa `eval`, scripts externos, WebAssembly remoto nem baixa código para execução. A Groq fornece somente respostas de dados às requisições feitas pela extensão.

## Dados declarados

Marque as categorias abaixo, usando a opção equivalente exibida no painel:

| Categoria                    | Motivo                                   | Uso                                                    |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Informações de autenticação  | API key da Groq                          | autenticar requisições solicitadas pela pessoa usuária |
| Comunicações pessoais        | mensagem de voz e sua transcrição        | produzir e exibir a transcrição solicitada             |
| Conteúdo gerado pelo usuário | áudio e texto da mensagem escolhida      | transcrever e aplicar a formatação escolhida           |
| Conteúdo do site             | mensagem de voz acessada no WhatsApp Web | disponibilizar o recurso no contexto da conversa       |

Não marque localização, informações financeiras, saúde, histórico de navegação, atividade do usuário ou identificadores pessoais: a extensão não coleta esses dados para sua funcionalidade.

## Certificações

Confirme que:

- os dados são usados somente para a finalidade única descrita;
- os dados não são vendidos nem transferidos para publicidade;
- os dados não são usados para crédito, empréstimos ou seguros;
- os dados não são usados para finalidades alheias ao recurso apresentado;
- não há acesso humano, exceto por segurança, abuso, obrigação legal ou consentimento explícito;
- o tratamento cumpre a política de Limited Use;
- a política de privacidade pública é `https://github.com/gabrielMalonso/whatsapp-audio-transcriber/blob/main/PRIVACY.md`.

## Declaração curta de divulgação

Quando você solicita uma transcrição, a extensão envia diretamente à Groq sua API key e o áudio selecionado. O texto bruto também pode ser enviado para formatação. A chave e as transcrições ficam no armazenamento local da extensão e podem ser apagadas no popup. O projeto não opera servidor próprio, não exibe anúncios e não vende dados.
