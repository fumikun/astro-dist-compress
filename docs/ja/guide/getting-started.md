# はじめに

`astro-dist-compress`は、**ビルド出力(`dist/`)**に対して画像の圧縮・フォーマット変換を行うAstroインテグレーションです。[`astro-compress`](https://github.com/astro-community/astro-compress)と異なり、**ディレクトリ**や**画像の状態**(フォーマット・透過有無・サイズ)ごとの変換ルールをTypeScriptで直接定義でき、フォールバック画像の生成とHTMLの書き換えまで自動で行えます。

## インストール

::: code-group

```sh [npm]
npm install astro-dist-compress
```

```sh [pnpm]
pnpm add astro-dist-compress
```

```sh [yarn]
yarn add astro-dist-compress
```

:::

## インテグレーションを追加

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import distCompress from "astro-dist-compress";

export default defineConfig({
  integrations: [distCompress()],
});
```

これだけで、以下のデフォルトルールが適用されます。

- 透過**あり**PNG → **WebP**
- 透過**なし**PNG → **AVIF**
- JPEG → **AVIF**
- 上記すべてに**WebPフォールバックを自動生成**(すでにWebPを出力するルールには追加しません)
- ビルド後のHTML内で、変換対象を参照する`<img>`を`<picture>`に自動書き換え
- 元ファイルはデフォルトで保持

## ビルド時のみ動作する設計

このインテグレーションは`astro:build:done`フックを使っており、これはAstroが`astro build`実行時にのみ呼び出すフックです(`astro dev`では呼ばれません)。開発/ビルドを切り分ける分岐コードを書く必要は一切なく、`astro dev`を実行してもこの処理経路自体に触れません。

```sh
astro build
```

```txt
[astro-dist-compress] compressing 12/14 image(s)...
[astro-dist-compress] done: 4.8 MB -> 1.6 MB (-66.7%)
[astro-dist-compress] rewrote 9 <img> tag(s) into <picture> across 5 html file(s).
```

## 次に読むページ

- [ルール: ディレクトリ・画像状態ごとの設定](/ja/guide/rules) — 独自の変換ルールを書く
- [フォールバック画像](/ja/guide/fallback) — フォールバック自動生成の仕組み
- [HTML書き換え](/ja/guide/html-rewriting) — `<picture>`書き換え後の出力例
- [オプションリファレンス](/ja/reference/options) — 全設定項目
