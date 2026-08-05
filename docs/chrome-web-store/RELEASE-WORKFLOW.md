# Fluxo de releases da loja

## Primeira publicação

A primeira listagem deve ser criada manualmente no Chrome Web Store Developer Dashboard. O ZIP tem o `manifest.json` na raiz e é gerado com:

```bash
pnpm check
pnpm store:package
```

O segundo comando compila protocolo e extensão, gera o ZIP oficial e imprime seu SHA-256.

## Atualizações manuais

Para uma atualização, incremente a versão, valide, gere o pacote e envie o novo ZIP ao mesmo item da loja. O Chrome atualiza automaticamente as instalações depois que a versão é aprovada e publicada. Novas permissões podem gerar uma confirmação adicional para usuários, portanto permissões devem continuar mínimas.

## Automação futura

Depois que existir um ID definitivo da extensão, os uploads podem ser automatizados com a Chrome Web Store API v2. A configuração exige um projeto no Google Cloud, API habilitada, OAuth ou service account e os identificadores do publicador e do item.

Não salve tokens ou chaves no repositório. Em CI, use secrets do provedor e limite o acesso ao workflow de release. A automação deve ser adicionada somente depois da primeira publicação manual, quando os IDs e a estratégia de credenciais estiverem definidos.
