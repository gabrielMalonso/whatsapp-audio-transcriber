# Security Policy

## Supported versions

| Version              | Supported |
| -------------------- | --------- |
| `0.2.x`              | Yes       |
| Earlier than `0.2.0` | No        |

## Reporting a vulnerability

Do not open a public issue for a potential vulnerability. Use a [private GitHub security report](https://github.com/gabrielMalonso/whatsapp-audio-transcriber/security/advisories/new) or email [gabriel_alonso_@outlook.com](mailto:gabriel_alonso_@outlook.com).

Include, when possible:

- Affected version and operating system;
- Description of the impact;
- Minimal reproduction steps;
- Evidence without personal data or credentials;
- A suggested fix, if available.

You will receive an acknowledgment after the initial assessment. The fix and disclosure will be coordinated according to the severity and complexity of the issue.

## Security scope

Of particular interest are vulnerabilities that could:

- Expose the Groq API key to WhatsApp Web or third parties;
- Access messages or audio without an explicit user action;
- Send data to destinations other than Groq;
- Execute untrusted code in the extension's context;
- Bypass the internal protocol's limits or validation.

Issues in the WhatsApp platform or Groq API should be reported to the respective providers, unless they are caused by this project's integration.
