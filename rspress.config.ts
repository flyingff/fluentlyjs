import * as path from 'path';
import { defineConfig } from 'rspress/config';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'Classic Games in JS',
  description: 'A gallery of responsive programming',
  icon: '/rspress-icon.png',
  logo: {
    light: '/rspress-light-logo.png',
    dark: '/rspress-dark-logo.png',
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/web-infra-dev/rspress',
      },
    ],
  },
  builderConfig: {
    source: {
      alias: {
        '@/': path.join(__dirname, 'src'),
      },
    },
    plugins: [pluginNodePolyfill()],
  },
});
