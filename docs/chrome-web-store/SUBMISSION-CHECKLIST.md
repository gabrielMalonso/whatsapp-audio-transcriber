# Checklist de publicação

## Antes do painel

- [ ] Criar ou escolher uma conta Google dedicada ao publicador.
- [ ] Ativar a verificação em duas etapas nessa conta.
- [ ] Fazer o cadastro no Chrome Web Store Developer Dashboard e pagar a taxa única exibida no cadastro.
- [ ] Definir o nome público do publicador e verificar o e-mail.
- [ ] Publicar `PRIVACY.md` no branch `main` para que a URL seja pública.
- [ ] Confirmar que versão do manifesto, `package.json` raiz e pacote da extensão são iguais.
- [ ] Executar `pnpm check` e `pnpm store:package`.

## Criar o item

- [ ] Abrir o Developer Dashboard e selecionar **Add new item**.
- [ ] Enviar `release/WhatsApp-Transcritor-vX.Y.Z.zip`.
- [ ] Conferir o aviso de permissões calculado pela loja.
- [ ] Preencher a aba **Store listing** com `LISTING-PT-BR.md` e os arquivos de `assets/`.
- [ ] Preencher a aba **Privacy** com `PRIVACY-DISCLOSURES.md`.
- [ ] Preencher **Test instructions** com `REVIEW-INSTRUCTIONS.md`.
- [ ] Em **Distribution**, escolher **Public**, todas as regiões desejadas e distribuição gratuita.
- [ ] Usar publicação adiada se quiser revisar a aprovação antes de tornar o item público.
- [ ] Enviar para revisão.

## Depois da aprovação

- [ ] Publicar o item, caso a publicação tenha sido adiada.
- [ ] Salvar o ID definitivo da extensão e a URL da loja na documentação do projeto.
- [ ] Atualizar o README com o botão **Adicionar ao Chrome**.
- [ ] Manter o ZIP e o checksum da versão publicada.
- [ ] Acompanhar e-mails do publicador e o status no dashboard.

## Para cada atualização

- [ ] Alterar código e testes.
- [ ] Incrementar a versão em todos os locais com `pnpm version:extension X.Y.Z`.
- [ ] Revisar política e disclosures se permissões ou dados mudarem.
- [ ] Executar `pnpm check`.
- [ ] Gerar o ZIP com `pnpm store:package`.
- [ ] No item existente, abrir **Package → Upload new package**.
- [ ] Enviar o novo ZIP e revisar as alterações do dashboard.
- [ ] Enviar para revisão; nunca criar outro item para uma atualização normal.

## Bloqueios que ainda dependem do publicador

- conta Google e taxa de cadastro;
- nome público e e-mail do publicador;
- aceite das declarações legais no dashboard;
- eventual credencial temporária para a revisão;
- clique final em **Submit for review** e **Publish**.
