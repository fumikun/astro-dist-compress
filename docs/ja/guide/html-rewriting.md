# HTML書き換え

`rewriteHtml`が有効な場合(デフォルト)、`astro-dist-compress`はビルド出力内のすべての`**/*.html`を走査し、変換対象の画像を参照する`<img>`タグを`<picture>`要素に書き換えます。

## 例

```html
<!-- 変換前 -->
<img src="/images/photo.png" alt="…" width="800" height="600" />
```

デフォルトルール(不透明PNG → AVIF、およびWebPフォールバック自動生成)の場合:

```html
<!-- 変換後 -->
<picture>
  <source srcset="/images/photo.avif" type="image/avif" />
  <source srcset="/images/photo.webp" type="image/webp" />
  <img src="/images/photo.webp" alt="…" width="800" height="600" />
</picture>
```

ブラウザは文書順で最初に対応している`<source>`を選択するため、`<source>`要素は常に**優先度の高いフォーマット順**(AVIF → WebP → その他)で出力され、`fallback: true`が付いたフォーマットが最後の`<img src>`になります。

ルールの出力が「`fallback: true`が付いた1つだけ」の場合(例: デフォルトの「透過ありPNG → WebP」ルール)、`<source>`として並べるものがないため、`<picture>`の中身は(`<source>`なしで)`<img src>`だけが更新された状態になります。

## パスの扱い

- ルート絶対パス(`/images/photo.png`)・ページ相対パス(`../images/photo.png`)の両方に対応しています。
- 書き換え後も元の`src`と**同じ形式**を維持します(絶対パスなら絶対パスのまま、相対パスなら相対パスのまま)。
- 外部URL(`https://…`・`//…`)や`data:` URIの`<img>`は変更されません。
- すでに`<picture>`の中にある`<img>`(自分自身が生成したものも含む)はスキップされるため、ビルドを再実行しても安全です。

## HTML書き換えを無効にする

```ts
distCompress({ rewriteHtml: false });
```

無効にしても、変換後の画像ファイル自体はディスクに書き出されます。参照方法(たとえば自前で`<picture>`を書いている場合や、別の方法でHTMLを生成している場合)はユーザー側の責任になります。

## 制約事項

- 書き換え対象は`<img src="…">`のみです。`<img>`の`srcset`属性やCSSの`background-image`、インラインの`style`属性は現時点では書き換えません。
- `astro.config`で標準以外の[`base`](https://docs.astro.build/en/reference/configuration-reference/#base)を設定している場合、HTML内のルート絶対パス(`/my-app/images/photo.png`)にはそのbaseプレフィックスが含まれますが、`dir`配下のディスク上のファイルにはbaseは含まれません。現状のパス解決はbaseの除去に対応していないため、そのようなプロジェクトではマッチが静かにスキップされます(画像自体の変換・書き出しは行われ、HTML書き換えだけが影響を受けます)。base設定があるプロジェクトでは、base対応が入るまで相対パスの`src`を使ってください。
