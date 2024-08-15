import * as path from 'path';
import { defineConfig } from 'rspress/config';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginPreview } from '@rspress/plugin-preview';
import { pluginTypeDoc } from '@rspress/plugin-typedoc';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'DataFlow.js',
  description: 'A ergonomics programming experience',
  icon: '/rspress-icon.png',
  logo: {
    light: '/rspress-light-logo.png',
    dark: '/rspress-dark-logo.png',
  },
  plugins: [
    pluginPreview(),
    pluginTypeDoc({
      entryPoints: [
        path.resolve(
          __dirname,
          'node_modules/fluentlyjs/dist/types/index.d.ts',
        ),
      ],
    }),
  ],
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
