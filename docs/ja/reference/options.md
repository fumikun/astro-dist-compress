# オプション

```ts
distCompress(options?: AstroDistCompressOptions)
```

## `AstroDistCompressOptions`

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `rules` | `CompressRule[]` | [`defaultRules`](/ja/guide/rules#デフォルトルールを使わない場合) | 変換ルールの並び。最初にマッチしたルールが使われる。 |
| `fallback` | `FallbackConfig \| false` | `{ enabled: true, format: "webp" }` | すべてのルールにフォールバック出力を自動追加。[フォールバック画像](/ja/guide/fallback)を参照。 |
| `rewriteHtml` | `boolean` | `true` | ビルド出力のHTML内の`<img>`を`<picture>`へ書き換える。[HTML書き換え](/ja/guide/html-rewriting)を参照。 |
| `removeOriginal` | `boolean` | `false` | フォールバック出力が存在する画像に限り、元ファイルを削除する。[元ファイルの削除](/ja/guide/removing-originals)を参照。 |
| `extensions` | `string[]` | `["png", "jpg", "jpeg"]` | ビルド出力内でスキャン対象とする拡張子(ドットなし)。 |
| `exclude` | `string[]` | `[]` | 出力ルートからの相対パスで、完全に除外するglobパターン。 |
| `concurrency` | `number` | `4` | 並列で処理する画像数。 |
| `logger` | `boolean` | `true` | Astroのインテグレーションロガー経由で進捗と削減バイト数のサマリーを出力する。 |

## `CompressRule`

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `name` | `string?` | ログにのみ使われるラベル。 |
| `match` | `(ctx: ImageContext) => boolean` | このルールを画像に適用するかどうかを判定する。 |
| `outputs` | `OutputTarget[]` | マッチした画像に対して生成するフォーマット群。 |
| `removeOriginal` | `boolean?` | このルールに限り、グローバルな`removeOriginal`を上書きする。 |

## `OutputTarget`

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `format` | `ImageFormat` | 変換先フォーマット: `"avif" \| "webp" \| "png" \| "jpeg" \| "jpg" \| "gif" \| "tiff"`。 |
| `options` | `Record<string, unknown>?` | sharpの`.toFormat(format, options)`にそのまま渡される。 |
| `fallback` | `boolean?` | 最終的な`<img src>`に使う出力としてマークする。 |
| `sameFormatSuffix` | `string?` | 変換先フォーマットが元フォーマットと同じ場合に付与するサフィックス(上書き防止用)。デフォルト: `"-compressed"`。 |

## `FallbackConfig`

| フィールド | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `enabled` | `boolean?` | `true` | すべてのルールにフォールバックフォーマットを自動追加するかどうか。 |
| `format` | `ImageFormat?` | `"webp"` | 自動追加するフォーマット。 |
| `options` | `Record<string, unknown>?` | `{ quality: 80 }` | 自動追加される出力のエンコードオプション。 |

## `ImageContext`

すべてのルールの`match`関数に渡されます。フィールドの全容は[ルール](/ja/guide/rules#imagecontext)を参照してください。
