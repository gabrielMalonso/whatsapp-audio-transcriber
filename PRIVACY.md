# Política de Privacidade — Transcrição de áudios do WhatsApp

Última atualização: 5 de agosto de 2026.

Esta política descreve como a extensão **Transcrição de áudios do WhatsApp** trata dados. A extensão é um projeto independente, sem vínculo com WhatsApp, Meta ou Groq.

## Finalidade

A única finalidade da extensão é permitir que a pessoa usuária transcreva mensagens de voz escolhidas por ela no WhatsApp Web e formate o texto resultante para leitura na própria conversa.

## Dados tratados

A extensão trata somente os dados necessários para essa finalidade:

- **API key da Groq:** informada pela pessoa usuária, armazenada no armazenamento local da extensão e enviada à Groq no cabeçalho de autenticação das requisições.
- **Áudio selecionado:** capturado apenas quando a pessoa usuária solicita uma transcrição e enviado diretamente do navegador à API da Groq.
- **Transcrição:** o texto bruto retornado pela Groq pode ser enviado novamente à Groq para aplicar as preferências de formatação. O texto bruto e o formatado ficam no cache local da extensão.
- **Dados técnicos locais:** hash do identificador da mensagem, idioma, duração, modelos utilizados, datas de criação e acesso, preferências de formatação e confirmação de leitura do aviso inicial.

A extensão não solicita nem extrai separadamente nome, e-mail, telefone, localização, informações financeiras, histórico de navegação ou contatos. Uma mensagem escolhida pode conter dados pessoais em seu próprio conteúdo. A extensão não contém publicidade, analytics ou rastreadores.

## Quando ocorre o envio

O áudio não é capturado nem enviado automaticamente. Antes da primeira transcrição, a extensão informa que o áudio selecionado será enviado à Groq e solicita uma ação afirmativa para continuar. Cada nova transcrição depende de uma ação da pessoa usuária.

## Destinatários e processamento por terceiros

O projeto não opera servidor intermediário e seus responsáveis não recebem a API key, o áudio ou as transcrições. As requisições são feitas por HTTPS diretamente do navegador para a Groq, que processa:

- a API key, para autenticação e consulta dos modelos disponíveis;
- o áudio selecionado, para produzir a transcrição;
- o texto bruto, para produzir a versão formatada quando aplicável.

Esse processamento também está sujeito à [Política de Privacidade da Groq](https://groq.com/privacy-policy/) e às [informações da Groq sobre dados no GroqCloud](https://console.groq.com/docs/your-data). Segundo a documentação da Groq, dados de inferência não são retidos por padrão, mas entradas e saídas podem ser registradas temporariamente por até 30 dias para confiabilidade da plataforma ou investigação de abuso. A Groq disponibiliza controles de retenção, inclusive Zero Data Retention, na conta da pessoa usuária.

## Armazenamento e retenção local

Os dados locais são armazenados por `chrome.storage.local`:

- a API key permanece salva até ser removida no popup da extensão ou até a extensão ser desinstalada;
- as preferências permanecem salvas até serem alteradas ou até a extensão ser desinstalada;
- o cache mantém no máximo 500 transcrições ou aproximadamente 8 MB e remove automaticamente os registros menos acessados quando um limite é atingido;
- o áudio original não é armazenado pela extensão após o processamento.

A pessoa usuária pode apagar todas as transcrições em **Transcrições salvas → Limpar**, remover a API key no popup ou desinstalar a extensão.

## Compartilhamento, venda e publicidade

Os dados não são vendidos, licenciados nem compartilhados para publicidade, análise de crédito ou outras finalidades não relacionadas à transcrição solicitada. Nenhuma pessoa acessa os dados, exceto quando isso for necessário para segurança, prevenção de abuso, cumprimento da lei ou quando houver consentimento explícito da pessoa usuária.

## Segurança

A extensão usa HTTPS para se comunicar com a Groq, limita permissões aos domínios e recursos necessários, valida as respostas da API e mantém os dados persistentes no armazenamento local isolado da extensão. Nenhum sistema é totalmente imune a riscos; a pessoa usuária deve proteger sua API key e revogá-la no painel da Groq se suspeitar de exposição.

## Limited Use

O uso das informações recebidas das APIs do Google e do Chrome está em conformidade com a [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data), incluindo os requisitos de Limited Use. O tratamento é limitado à funcionalidade apresentada ao usuário e não é usado para publicidade, transferência comercial, avaliação de crédito ou enriquecimento de perfis.

## Alterações e contato

Esta política pode ser atualizada quando a funcionalidade ou os requisitos legais mudarem. A data no início do documento indicará a revisão mais recente.

Dúvidas sobre privacidade podem ser abertas no [repositório público do projeto](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/issues). Vulnerabilidades devem ser comunicadas conforme a [política de segurança](SECURITY.md).
