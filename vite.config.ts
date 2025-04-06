import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  // Configure Solid.js
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
        author: 'Scott Hyndman',
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
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  optimizeDeps: {
    extensions: ['jsx', 'tsx'],
    esbuildOptions: {
      jsx: 'preserve',
      jsxImportSource: 'solid-js',
    }
  },
  build: {
    target: 'esnext',
  },
});
