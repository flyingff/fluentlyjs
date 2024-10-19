import * as path from 'path';
import { defineConfig } from 'rspress/config';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginTypeDoc } from '@rspress/plugin-typedoc';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'Fluently.js',
  description: '一种面向人类思考方式的编程范式',
  icon: '/icon.png',
  logo: {
    light: '/logo-1x.png',
    dark: '/logo-1x.png',
  },
  plugins: [
    pluginTypeDoc({
      entryPoints: [
        path.resolve(
          __dirname,
          'node_modules/fluentlyjs/dist/types/index.d.ts',
        ),
      ],
      outDir: 'zh/api',
    }),
  ],
  builderConfig: {
    source: {
      alias: {
        '@/': path.join(__dirname, 'src'),
      },
    },
    plugins: [pluginNodePolyfill()],
  },
  outDir: 'dist',
  themeConfig: {
    lastUpdated: true,
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/flyingff/fluentlyjs',
      },
    ],
    locales: [
      {
        lang: 'zh',
        label: '中文',
        outlineTitle: '目录',
        prevPageText: '上一页',
        nextPageText: '下一页',
        searchPlaceholderText: '搜索文档',
        searchNoResultsText: '没有找到相关文档',
        searchSuggestedQueryText: '您是否要查找：',
      },
      {
        lang: 'en',
        label: 'English',
        outlineTitle: 'Outline',
        prevPageText: 'Previous',
        nextPageText: 'Next',
        searchPlaceholderText: 'Search Docs',
        searchNoResultsText: 'No results found',
        searchSuggestedQueryText: 'Did you mean:',
      },
    ],
  },
  locales: [
    {
      lang: 'zh',
      label: '中文',
      title: 'Fluently.js',
      description: '一种面向人类思考方式的编程模式',
    },
    // {
    //   lang: 'en',
    //   label: 'English',
    //   title: 'Fluently.js',
    //   description:
    //     'A programming pattern that is oriented towards human thinking',
    // },
  ],
  lang: 'zh',
});
