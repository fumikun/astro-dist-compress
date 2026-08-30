import { defineConfig } from "vitepress";

const enGuideSidebar = [
  {
    text: "Guide",
    items: [
      { text: "Getting Started", link: "/guide/getting-started" },
      { text: "Rules: directory & image state", link: "/guide/rules" },
      { text: "Responsive images (srcset)", link: "/guide/responsive-images" },
      { text: "Fallback images", link: "/guide/fallback" },
      { text: "HTML rewriting", link: "/guide/html-rewriting" },
      { text: "Removing originals", link: "/guide/removing-originals" },
      { text: "Dry run, errors & reporting", link: "/guide/operations" },
    ],
  },
];

const enReferenceSidebar = [
  {
    text: "Reference",
    items: [
      { text: "Options", link: "/reference/options" },
      { text: "Matchers API", link: "/reference/matchers" },
    ],
  },
];

const jaGuideSidebar = [
  {
    text: "ガイド",
    items: [
      { text: "はじめに", link: "/ja/guide/getting-started" },
      { text: "ルール: ディレクトリ・画像状態ごとの設定", link: "/ja/guide/rules" },
      { text: "フォールバック画像", link: "/ja/guide/fallback" },
      { text: "HTML書き換え", link: "/ja/guide/html-rewriting" },
      { text: "元ファイルの削除", link: "/ja/guide/removing-originals" },
    ],
  },
];

const jaReferenceSidebar = [
  {
    text: "リファレンス",
    items: [
      { text: "オプション", link: "/ja/reference/options" },
      { text: "マッチャーAPI", link: "/ja/reference/matchers" },
    ],
  },
];

export default defineConfig({
  title: "astro-dist-compress",
  description: "Compress and convert images in your Astro build output, with per-directory / per-image-state rules and automatic fallback generation.",

  // Deployed as a GitHub Pages project site at https://fumikun.github.io/astro-dist-compress/.
  base: "/astro-dist-compress/",

  themeConfig: {
    search: {
      provider: "local",
    },
  },

  locales: {
    root: {
      label: "English",
      lang: "en",
      link: "/",
      title: "astro-dist-compress",
      description:
        "Compress and convert images in your Astro build output, with per-directory / per-image-state rules and automatic fallback generation.",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide/getting-started" },
          { text: "Reference", link: "/reference/options" },
        ],
        sidebar: {
          "/guide/": enGuideSidebar,
          "/reference/": enReferenceSidebar,
        },
        outline: { label: "On this page" },
        docFooter: { prev: "Previous", next: "Next" },
        returnToTopLabel: "Return to top",
        darkModeSwitchLabel: "Appearance",
        sidebarMenuLabel: "Menu",
      },
    },
    ja: {
      label: "日本語",
      lang: "ja",
      link: "/ja/",
      title: "astro-dist-compress",
      description: "Astroのビルド出力(dist)を圧縮・変換するインテグレーション。ディレクトリや画像の状態ごとにルールをTypeScriptで設定でき、フォールバック画像の生成とHTML書き換えも自動で行います。",
      themeConfig: {
        nav: [
          { text: "ガイド", link: "/ja/guide/getting-started" },
          { text: "リファレンス", link: "/ja/reference/options" },
        ],
        sidebar: {
          "/ja/guide/": jaGuideSidebar,
          "/ja/reference/": jaReferenceSidebar,
        },
        outline: { label: "目次" },
        docFooter: { prev: "前のページ", next: "次のページ" },
        returnToTopLabel: "トップへ戻る",
        darkModeSwitchLabel: "外観",
        sidebarMenuLabel: "メニュー",
      },
    },
  },
});
