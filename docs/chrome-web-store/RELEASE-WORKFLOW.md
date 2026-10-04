# Store release workflow

## First publication

The first listing must be created manually in the Chrome Web Store Developer Dashboard. The ZIP has `manifest.json` at its root and is generated with:

```bash
pnpm check
pnpm store:package
```

The second command builds the protocol and extension, generates the official ZIP, and prints its SHA-256.

## Manual updates

For an update, increment the version, validate it, generate the package, and upload the new ZIP to the same store item. Chrome automatically updates installations after the version is approved and published. New permissions may prompt users for additional confirmation, so permissions should remain minimal.

## Future automation

Once a definitive extension ID exists, uploads can be automated with the Chrome Web Store API v2. Setup requires a Google Cloud project, the API enabled, OAuth or a service account, and the publisher and item identifiers.

Do not save tokens or keys in the repository. In CI, use the provider's secrets and limit access to the release workflow. Automation should be added only after the first manual publication, when the IDs and credential strategy are defined.
