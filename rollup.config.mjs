import babelPlugin from '@rollup/plugin-babel';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import resolvePlugin from '@rollup/plugin-node-resolve';
import replacePlugin from '@rollup/plugin-replace';
import terserPlugin from '@rollup/plugin-terser';
import { isAbsolute, relative, resolve } from 'path';
import { env } from 'process';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'rollup';

import userscript from 'rollup-plugin-userscript';

const { packageJson } = await readPackageUp();
const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];
const noEmit = 'NO_EMIT' in env;

// We'll use process.env.NODE_ENV to determine if we're in production mode

// Create a function to generate the base configuration
function createBaseConfig(name, entry) {
  return {
    input: entry,
    plugins: [
      babelPlugin({
        // import helpers from '@babel/runtime'
        babelHelpers: 'runtime',
        plugins: [
          [
            import.meta.resolve('@babel/plugin-transform-runtime'),
            {
              useESModules: true,
              version: '^7.5.0', // see https://github.com/babel/babel/issues/10261#issuecomment-514687857
            },
          ],
        ],
        exclude: 'node_modules/**',
        extensions,
      }),
      replacePlugin({
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        },
        preventAssignment: true,
      }),
      resolvePlugin({ browser: false, extensions }),
      commonjsPlugin(),
      jsonPlugin(),
      userscript((meta) =>
        meta.replace('process.env.AUTHOR', packageJson.author.name),
      ),
    ],
    external: defineExternal([
      '@violentmonkey/ui',
      '@violentmonkey/dom',
      'solid-js',
      'solid-js/web',
    ]),
    output: {
      format: 'iife',
      globals: {
        // Note:
        // - VM.solid is just a third-party UMD bundle for solid-js since there is no official one
        // - If you don't want to use it, just remove `solid-js` related packages from `external`, `globals` and the `meta.js` file.
        'solid-js': 'VM.solid',
        'solid-js/web': 'VM.solid.web',
        '@violentmonkey/dom': 'VM',
        '@violentmonkey/ui': 'VM',
      },
      indent: false,
    },
  };
}

export default defineConfig(() => {
  // If NO_EMIT is set, return a minimal config for validation only
  if (noEmit) {
    const config = createBaseConfig('llmop', 'src/llmop/index.ts');
    delete config.output;
    return config;
  }

  // Define the entry points
  const entries = {
    'llmop': 'src/llmop/index.ts',
  };

  // Create configurations for both debug and release builds
  return Object.entries(entries).flatMap(([name, entry]) => {
    // Debug build (readable)
    const debugConfig = createBaseConfig(name, entry);
    debugConfig.output.file = `dist/${name}.debug.user.js`;

    // Release build (minified)
    const releaseConfig = createBaseConfig(name, entry);
    releaseConfig.output.file = `dist/${name}.user.js`;
    releaseConfig.plugins.push(terserPlugin());

    return [debugConfig, releaseConfig];
  });
});

function defineExternal(externals) {
  return (id) =>
    externals.some((pattern) => {
      if (typeof pattern === 'function') return pattern(id);
      if (pattern && typeof pattern.test === 'function')
        return pattern.test(id);
      if (isAbsolute(pattern))
        return !relative(pattern, resolve(id)).startsWith('..');
      return id === pattern || id.startsWith(pattern + '/');
    });
}
