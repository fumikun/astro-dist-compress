# フォールバック画像

AVIFのようなモダンフォーマットはすべての環境でサポートされているわけではありません。`astro-dist-compress`は、デフォルトでWebPのフォールバック画像を**すべてのルールに対して自動生成**できるため、各ルールの`outputs`に毎回書く必要がありません。

## `fallback`オプション

```ts
distCompress({
  fallback: {
    enabled: true,   // デフォルト: true
    format: "webp",  // デフォルト: "webp"
    options: { quality: 80 },
  },
});
```

有効な場合、マッチ後の各ルールに対して以下がチェックされます。

- ルールが**まだ**フォールバックフォーマットを出力していなければ、出力が1つ追加されます(`{ format, options, fallback: true }`)。
- ルールが**すでに**そのフォーマットを出力している場合は重複追加せず、まだどの出力にも`fallback`フラグが付いていなければ、その出力に`fallback: true`を付与するだけです。

これにより、「すべての画像にWebPフォールバックを生成する」という要件が、各ルールへの記述の繰り返しではなく**1箇所のグローバル設定**で実現できます。

### 例

```ts
rules: [
  {
    match: hasFormat("png"),
    outputs: [{ format: "avif", options: { quality: 55 } }],
  },
],
fallback: { enabled: true, format: "webp" },
```

これは以下のように解決されます。

```ts
outputs: [
  { format: "avif", options: { quality: 55 } },
  { format: "webp", options: { quality: 80 }, fallback: true }, // 自動追加
]
```

## 無効化する

```ts
distCompress({ fallback: false });
```

フォールバック自動生成を無効にすると、[HTML書き換え](/ja/guide/html-rewriting)後の`<img src>`は、ルール自身の出力に`fallback: true`が明示されていない限り**元の画像ファイル**を指すようになります。

## 独自にフォールバックを指定する

ルール自体がフォールバックを把握している場合は、グローバルな`fallback`オプションを使わず、出力の1つに直接`fallback: true`を付けるだけでも構いません。

```ts
{
  match: and(hasFormat("png"), hasAlpha(true)),
  outputs: [
    { format: "webp", options: { quality: 80 }, fallback: true },
  ],
}
```

この例ではWebPが主出力かつフォールバックそのものなので、追加する出力はありません。グローバルなフォールバック設定が同じフォーマットを指していても、このルールには何も追加されません。

## フォールバックの使われ方

`fallback: true`が付いた出力は、以下のように使われます。

- 書き換え後の`<picture>`要素における`<img src>`([HTML書き換え](/ja/guide/html-rewriting)を参照)
- `<source>`のどのフォーマットにも対応していないブラウザに対して安全に表示できるファイル

`<source>`の一覧には**含まれず**、最終的な`<img>`のみに使われます。
