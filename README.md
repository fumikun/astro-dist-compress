# astro-dist-compress

Astroの**ビルド出力(dist)**に対して画像圧縮・フォーマット変換を行うインテグレーションです。
[`astro-compress`](https://github.com/astro-community/astro-compress) と異なり、**画像のフォーマット/透過有無/ディレクトリ**などの状態に応じて変換ルールをTypeScriptで柔軟に定義でき、フォールバック用画像の生成とHTMLの`<picture>`書き換えまで自動で行います。

- 開発サーバー(`astro dev`)では**何もしません**。`astro:build:done`フックはビルド時にしか発火しないため、動作を切り分ける特別なコードは不要です。
- `astro build`完了後、distを走査して画像を変換し、必要なら生成物を参照するように`<img>`を`<picture>`に書き換えます。

## ドキュメント(日本語 / English)

より詳しいガイド・APIリファレンスはVitePressサイトにあります(日英対応)。

```bash
npm run docs:dev      # http://localhost:5173 でプレビュー
npm run docs:build    # docs/.vitepress/dist に静的ビルド
```

## インストール

```bash
npm install astro-dist-compress
```

## クイックスタート

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import distCompress from "astro-dist-compress";

export default defineConfig({
  integrations: [distCompress()],
});
```

デフォルト設定は要件どおりの挙動です:

- 透過ありPNG → **WebP**
- 透過なしPNG → **AVIF**
- JPEG → **AVIF**
- 上記すべてに **WebPフォールバックを自動生成**(すでにWebPを出力するルールには重複追加しない)
- 変換後、distのHTML内の該当`<img>`を`<picture>`に自動書き換え
- 元ファイルはデフォルトで保持(`removeOriginal: false`)

## ディレクトリ・画像状態ごとのルール設定

`rules`はTypeScriptの配列で、上から順に最初にマッチしたルールが使われます。`match`は`ImageContext`を受け取る述語関数です。

```ts
import { defineConfig } from "astro/config";
import distCompress, { and, hasAlpha, hasFormat, inDir, biggerThan } from "astro-dist-compress";

export default defineConfig({
  integrations: [
    distCompress({
      rules: [
        // /assets/hero 配下だけは画質を落として強めにAVIF化
        {
          name: "hero images -> aggressive avif",
          match: inDir("assets/hero"),
          outputs: [{ format: "avif", options: { quality: 40 } }],
        },
        // 大きいPNG(透過あり)だけ変換、小さいアイコン等はそのまま
        {
          name: "large png-with-alpha -> webp",
          match: and(hasFormat("png"), hasAlpha(true), biggerThan(20_000)),
          outputs: [{ format: "webp", options: { quality: 82 }, fallback: true }],
        },
        {
          name: "png-without-alpha -> avif",
          match: and(hasFormat("png"), hasAlpha(false)),
          outputs: [{ format: "avif", options: { quality: 55 } }],
        },
        {
          name: "jpeg -> avif",
          match: hasFormat("jpeg", "jpg"),
          outputs: [{ format: "avif", options: { quality: 55 } }],
        },
      ],
      fallback: { enabled: true, format: "webp" },
    }),
  ],
});
```

### 用意されているマッチャー(`src/matchers.ts`)

| 関数 | 説明 |
| --- | --- |
| `inDir(...globs)` | 指定ディレクトリ配下の画像にマッチ(`assets/hero` のように書けば配下すべて) |
| `pathMatches(...globs)` | 相対パス全体をglobでマッチ(例: `"**/icons/*.png"`) |
| `hasFormat(...formats)` | 元フォーマットでマッチ(`"png" | "jpeg" | ...`) |
| `hasAlpha(expected?)` | 透過(アルファチャンネル)の有無でマッチ |
| `largerThan({ width?, height?})` | 指定ピクセルサイズ以上でマッチ |
| `biggerThan(bytes)` | 指定バイト数以上のファイルサイズでマッチ |
| `and / or / not` | マッチャーの合成 |

もちろん`match: (ctx) => boolean`を直接書いても構いません。`ImageContext`には`relativePath`・`dir`・`format`・`hasAlpha`・`width`・`height`・`size`が入っています。

## フォールバックの自動設定

`fallback`オプションで、**すべてのルールに対して**指定フォーマットのフォールバック出力を自動追加できます。ルールごとに書く必要はありません。

```ts
distCompress({
  fallback: {
    enabled: true,   // デフォルト true
    format: "webp",  // デフォルト "webp"
    options: { quality: 80 },
  },
});
```

- ルールがすでにそのフォーマットを出力している場合は重複追加せず、`fallback: true`フラグだけを付与します。
- `fallback: false`で無効化できます(その場合、各ルールの出力に`fallback: true`を明示しない限り、HTML書き換え時の`<img src>`は元ファイルのままになります)。

`fallback: true`が付いた出力は、`<picture>`書き換え時の**最終`<img src>`**(かつ`<source>`一覧には含めない)として使われます。それ以外の出力は`<source>`として、AVIF→WebP→...の優先順で並びます。

## HTML書き換え(`<picture>`自動生成)

`rewriteHtml: true`(デフォルト)のとき、distの`**/*.html`を走査し、変換対象になった画像を参照する`<img>`を以下のように書き換えます。

```html
<!-- Before -->
<img src="/images/photo.png" alt="..." width="800" height="600" />

<!-- After (png with alpha, default rules) -->
<picture>
  <source srcset="/images/photo.webp" type="image/webp" />
  <img src="/images/photo.webp" alt="..." width="800" height="600" />
</picture>

<!-- After (png without alpha, default rules: avif + auto webp fallback) -->
<picture>
  <source srcset="/images/photo.avif" type="image/avif" />
  <source srcset="/images/photo.webp" type="image/webp" />
  <img src="/images/photo.webp" alt="..." width="800" height="600" />
</picture>
```

- ルート絶対パス(`/images/...`)・相対パスのどちらの`src`にも対応し、書き換え後も同じ形式(絶対/相対)を保ちます。
- 外部URL・`data:` URIの`<img>`はスキップします。
- すでに`<picture>`の中にある`<img>`はスキップします(二重書き換え防止)。
- `rewriteHtml: false`にすると、HTMLは一切変更せずファイル生成のみ行います。

## 元ファイルの削除

```ts
distCompress({ removeOriginal: true });
```

グローバルまたはルール単位(`rule.removeOriginal`)で、フォールバック出力が存在する画像に限り元ファイルを削除できます(フォールバックが無い状態で削除すると参照が壊れるため、安全のため意図的にガードしています)。

## オプション一覧

```ts
interface AstroDistCompressOptions {
  rules?: CompressRule[];              // 既定: PNG(透過)→webp / PNG(不透明)→avif / JPEG→avif
  fallback?: FallbackConfig | false;    // 既定: { enabled: true, format: "webp" }
  rewriteHtml?: boolean;                // 既定: true
  removeOriginal?: boolean;             // 既定: false
  extensions?: string[];                // 既定: ["png", "jpg", "jpeg"]
  exclude?: string[];                   // distルートからの除外glob
  concurrency?: number;                 // 既定: 4
  logger?: boolean;                     // 既定: true
}
```

## 動作サンプル

`example/`に最小構成のAstroプロジェクトがあります。

```bash
npm run build          # このパッケージ自体をビルド
cd example
npm install
npm run build           # astro build。ビルド後ログに圧縮結果が出力される
```

## 仕組み

1. `astro:build:done`フックで`dir`(出力ディレクトリ)を受け取る(このフックはビルド時のみ発火)。
2. `fast-glob`でdist内の対象拡張子の画像を列挙し、`sharp`でフォーマット・透過有無・サイズを読み取る。
3. 各画像に対して`rules`を先頭から評価し、最初にマッチしたルールの`outputs`ぶんだけ`sharp`で変換・書き出す。
4. `rewriteHtml`が有効なら、distの`*.html`を走査して該当`<img>`を`<picture>`に書き換える。
