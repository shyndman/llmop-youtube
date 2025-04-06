import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { readPackageUp } from 'read-package-up';

// Read package.json for author information
const { packageJson } = await readPackageUp();

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/llmop/index.ts',
      userscript: {
        name: 'LLMOP Youtube',
        namespace: 'Violentmonkey Scripts',
        description: 'Summarize and timestamp YouTube videos',
        match: [
          'https://www.youtube.com/*',
          'https://youtu.be/*'
        ],
        'run-at': 'document-end',
        author: packageJson.author.name,
      },
      build: {
        fileName: 'llmop.user.js',
        externalGlobals: {
          '@violentmonkey/dom': 'VM',
          '@violentmonkey/ui': 'VM',
          'solid-js': 'VM.solid',
          'solid-js/web': 'VM.solid.web',
        },
      },
      server: {
        prefix: 'server:',
      },
    }),
  ],
  // Ensure JSX works with Solid.js
  esbuild: {
    jsx: 'preserve',
    jsxImportSource: 'solid-js',
  },
});
