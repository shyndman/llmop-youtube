import { defineConfig, presetWind3 } from 'unocss';
import presetWebFonts from '@unocss/preset-web-fonts';

export default defineConfig({
  content: {
    filesystem: ['src/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}'],
  },
  presets: [
    presetWind3(),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Roboto',
        mono: ['Roboto Mono'],
      },
    }),
  ],
});
