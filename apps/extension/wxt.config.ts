import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  zip: {
    // Mozilla reviewers need the workspace protocol and lockfile to rebuild.
    sourcesRoot: '../..',
    includeSources: [
      'apps/extension/**',
      'packages/protocol/**',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'README.md',
      'LICENSE',
    ],
    excludeSources: ['**/dist/**'],
  },
  manifest: ({ browser }) => ({
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'pt_BR',
    version: '0.2.3',
    permissions: ['storage'],
    host_permissions: ['https://web.whatsapp.com/*', 'https://api.groq.com/*'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'whatsapp-audio-transcriber@gabrielalonso.dev',
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: [
                  'authenticationInfo',
                  'personalCommunications',
                  'personallyIdentifyingInfo',
                ],
              },
            },
          },
        }
      : {}),
    action: {
      default_title: '__MSG_extensionActionTitle__',
    },
  }),
});
