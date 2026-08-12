# 元ファイルの削除

`astro-dist-compress`はデフォルトで、生成したファイルとは別に元の画像ファイルを**保持**します。ビルド出力のサイズは増える方向にしかなりません。

```ts
distCompress({ removeOriginal: true });
```

これをグローバル(またはルールごとに`CompressRule.removeOriginal`で上書き、こちらが優先されます)で有効にすると、出力が揃った時点で元ファイルが削除されます。ただし**ルールが`fallback: true`の出力を持っている画像に限り**削除されます。この制限は意図的なもので、HTMLが書き換えられていない(あるいはルールにフォールバックがない)画像に対して唯一の参照先を削除してしまうと、`<img src>`が壊れてしまうためです。

## 実際に元ファイルが削除される条件

| `rewriteHtml` | ルールに`fallback: true`の出力がある | 元ファイルは削除される? |
| --- | --- | --- |
| `true`(デフォルト) | あり | ✅ ― HTMLはフォールバック出力を指すよう書き換えられる |
| `true` | なし | ❌ ― `<img src>`を代わりに指せる先がない |
| `false` | あり | ✅ ― フォールバックファイルはディスク上に存在するので、参照はユーザー側の責任 |
| `false` | なし | ❌ |

実際には、[フォールバック生成](/ja/guide/fallback)が有効(デフォルト)であれば、すべてのルールが`fallback: true`の出力を持つことになるため、`removeOriginal: true`はプロジェクト全体で「変換後フォーマットだけを残す」という挙動になります。

## ルールごとの上書き

```ts
rules: [
  {
    name: "hero -> avif (元ファイルを削除)",
    match: inDir("assets/hero"),
    outputs: [{ format: "avif", fallback: true }],
    removeOriginal: true,
  },
  {
    name: "それ以外は元ファイルを保持",
    match: hasFormat("png", "jpeg", "jpg"),
    outputs: [{ format: "webp", fallback: true }],
    removeOriginal: false,
  },
],
```
