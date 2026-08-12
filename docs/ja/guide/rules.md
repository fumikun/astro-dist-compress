# ルール: ディレクトリ・画像状態ごとの設定

`rules`は`CompressRule`の配列です。ビルド出力内の各画像に対して、**上から順に**ルールが評価され、**最初にマッチしたルール**が使われます。どのルールにもマッチしない画像はそのまま残ります。

```ts
interface CompressRule {
  name?: string;
  match: (ctx: ImageContext) => boolean;
  outputs: OutputTarget[];
  removeOriginal?: boolean;
}
```

## `ImageContext`

`match`には、スキャン時点でプラグインが把握しているすべての情報が渡されます。

```ts
interface ImageContext {
  relativePath: string; // "assets/hero/photo.png"
  absolutePath: string;
  dir: string;           // "assets/hero"
  fileName: string;      // "photo.png"
  extension: string;     // "png"
  format: ImageFormat;   // "png" | "jpeg" | "webp" | "avif" | ...
  hasAlpha: boolean;
  width: number;
  height: number;
  size: number;          // ディスク上のバイト数
}
```

`hasAlpha`・`width`/`height`・`format`は拡張子からの推測ではなく、`sharp`が画像バイト列を直接読み取って判定します。

## 用意されているマッチャー

毎回生の述語関数を書かなくても済むように、組み合わせ可能なマッチャーヘルパーを`astro-dist-compress`からエクスポートしています。

| 関数 | マッチする条件 |
| --- | --- |
| `inDir(...globs)` | 指定したディレクトリglob配下にある(`"assets/hero"`と書けば配下すべてにマッチ) |
| `pathMatches(...globs)` | 相対パス全体が指定globにマッチする(例: `"**/icons/*.png"`) |
| `hasFormat(...formats)` | 元フォーマットが指定したいずれかである |
| `hasAlpha(expected?)` | 透過(アルファチャンネル)がある(`false`を渡すとない場合にマッチ) |
| `largerThan({ width?, height? })` | 指定ピクセル数以上の幅・高さである |
| `biggerThan(bytes)` | ディスク上のファイルサイズが指定バイト数以上である |
| `and(...matchers)` / `or(...matchers)` / `not(matcher)` | マッチャーを論理演算で組み合わせる |

もちろん生の関数に切り替えても構いません — `match: (ctx) => ctx.dir.startsWith("assets/marketing")`も同様に動作します。

## 例: ディレクトリと画像状態を組み合わせたルール

```ts
import { defineConfig } from "astro/config";
import distCompress, { and, hasAlpha, hasFormat, inDir, biggerThan } from "astro-dist-compress";

export default defineConfig({
  integrations: [
    distCompress({
      rules: [
        // assets/hero配下は透過の有無に関わらず、より強めのAVIF変換を適用
        {
          name: "hero images -> aggressive avif",
          match: inDir("assets/hero"),
          outputs: [{ format: "avif", options: { quality: 40 } }],
        },

        // サイズの大きい透過PNGだけ変換し、小さいアイコン等はそのままにする
        {
          name: "large png-with-alpha -> webp",
          match: and(hasFormat("png"), hasAlpha(true), biggerThan(20_000)),
          outputs: [{ format: "webp", options: { quality: 82 }, fallback: true }],
        },

        // それ以外はデフォルトの挙動
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
    }),
  ],
});
```

ルールの並び順は重要です。上記でhero用ルールを先頭に置いているのは、`assets/hero`配下の画像に対して一般的なPNGルールより優先させるためです。

## `outputs`

各ルールは**複数**の出力ファイルを生成できます。

```ts
interface OutputTarget {
  format: ImageFormat;
  options?: Record<string, unknown>; // sharpの.toFormat()にそのまま渡される
  fallback?: boolean;
  sameFormatSuffix?: string; // デフォルト "-compressed"
}
```

- `options`はsharpのエンコーダー(`quality`・`effort`・`lossless`など)にそのまま渡されます。
- `fallback: true`を付けた出力は、[HTML書き換え](/ja/guide/html-rewriting)が有効なときに最終的な`<img src>`として使われます。1ルールにつき1つの出力に付けるのが基本です。
- 変換先フォーマットが元フォーマットと同じ場合(カスタムルールでは起こり得ます)、元ファイルを誤って上書きしないようサフィックス(デフォルト`-compressed`)付きで書き出されます。

## デフォルトルールを使わない場合

独自の`rules`を渡すと、組み込みのデフォルトは**マージされず完全に置き換わります**。デフォルトを拡張したい場合は`defaultRules`を再エクスポートして利用してください。

```ts
import distCompress, { defaultRules, inDir } from "astro-dist-compress";

distCompress({
  rules: [
    { name: "hero -> avif", match: inDir("assets/hero"), outputs: [{ format: "avif" }] },
    ...defaultRules,
  ],
});
```
