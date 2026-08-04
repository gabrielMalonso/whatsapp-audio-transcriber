# Política de Segurança

## Versões com suporte

| Versão               | Suporte |
| -------------------- | ------- |
| `0.2.x`              | sim     |
| anteriores a `0.2.0` | não     |

## Relatando uma vulnerabilidade

Não abra uma issue pública para uma possível vulnerabilidade. Use um [relatório privado de segurança no GitHub](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/security/advisories/new) ou escreva para [gabriel_alonso_@outlook.com](mailto:gabriel_alonso_@outlook.com).

Inclua, quando possível:

- versão e sistema operacional afetados;
- descrição do impacto;
- passos mínimos para reproduzir;
- evidências sem dados pessoais ou credenciais;
- sugestão de correção, se houver.

Você receberá uma confirmação após a análise inicial. A correção e a divulgação serão coordenadas de acordo com a gravidade e a complexidade do problema.

## Escopo de segurança

São especialmente relevantes falhas que possam:

- expor a API key da Groq ao WhatsApp Web ou a terceiros;
- acessar mensagens ou áudios sem uma ação explícita do usuário;
- enviar dados a destinos diferentes da Groq;
- executar código não confiável no contexto da extensão;
- contornar os limites ou a validação do protocolo interno.

Problemas na plataforma do WhatsApp ou na API da Groq devem ser reportados aos respectivos fornecedores, salvo quando forem causados pela integração deste projeto.
