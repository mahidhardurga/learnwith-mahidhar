import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import lessonParts from './plugins/rehype-lesson-parts.mjs';

const config: Config = {
  title: 'LearnWith Mahidhar',
  tagline: 'Java, Spring Boot and Microservices interview prep, explained plainly',
  favicon: 'img/favicon.svg',
  // Proves ownership to Google AdSense. This meta tag loads nothing and sets no cookies.
  // Google AdSense (Auto ads). The script is async and does nothing until the site is approved.
  scripts: [
    {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6020081998211551',
      async: true,
      crossorigin: 'anonymous',
    },
  ],
  headTags: [
    {tagName: 'meta', attributes: {name: 'google-adsense-account', content: 'ca-pub-6020081998211551'}},
  ],

  future: {
    v4: true,
  },

  url: 'https://learnwith.mahidhardurga.in',
  baseUrl: '/',

  organizationName: 'mahidhardurga',
  projectName: 'learnwith-mahidhar',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          rehypePlugins: [lessonParts],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'LearnWith Mahidhar',
      logo: {alt: 'LearnWith Mahidhar', src: 'img/logo.svg'},
      items: [
        {
          type: 'dropdown',
          label: 'Topics',
          position: 'left',
          items: [
            {label: 'Java and JVM', to: '/category/java'},
            {label: 'Spring', to: '/category/spring-framework'},
            {label: 'Microservices', to: '/microservices/overview'},
            {label: 'Databases', to: '/category/databases'},
            {label: 'Messaging (Kafka, RabbitMQ)', to: '/category/messaging'},
            {label: 'AI and LLMs', to: '/category/ai-and-llms'},
            {label: 'DevOps and Cloud', to: '/category/devops--cloud'},
            {label: 'System design', to: '/category/system-design'},
            {label: 'Interview toolkit', to: '/category/interview-toolkit'},
          ],
        },
        {to: '/quiz', label: 'Quiz', position: 'left'},
        {type: 'custom-visitorCount', position: 'right'},
      ],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Java', to: '/java/core-java/hashmap-internals'},
            {label: 'Spring Boot', to: '/spring/boot/overview'},
            {label: 'Microservices', to: '/microservices/overview'},
            {label: 'Databases', to: '/databases/acid-isolation-mvcc'},
            {label: 'AI and LLMs', to: '/ai/foundations/what-is-an-llm'},
          ],
        },
        {
          title: 'Prepare',
          items: [
            {label: 'System design', to: '/system-design/approach-and-estimation'},
            {label: 'Cheat sheets', to: '/toolkit/cheat-sheets'},
          ],
        },
        {
          title: 'Site',
          items: [
            {label: 'About', to: '/about'},
            {label: 'Contact', to: '/contact'},
            {label: 'Privacy Policy', to: '/privacy-policy'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} LearnWith Mahidhar. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'bash', 'yaml', 'sql', 'properties', 'docker', 'json', 'lua'],
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
