---
layout: home

hero:
  name: astro-dist-compress
  text: Astroのビルド出力を圧縮
  tagline: ディレクトリ・画像の状態ごとの圧縮ルールをTypeScriptで定義。フォールバック画像の自動生成とHTML書き換えつき。
  actions:
    - theme: brand
      text: はじめる
      link: /ja/guide/getting-started
    - theme: alt
      text: ルール設定
      link: /ja/guide/rules

features:
  - icon: 🛠️
    title: TypeScriptでルール定義
    text: ディレクトリ・元フォーマット・透過有無・サイズなどで画像をマッチさせ、and/or/notで組み合わせられます。
  - icon: 📦
    title: ビルド時のみ動作
    text: astro:build:doneフックで実行されるため、astro dev中は何も起きません。分岐コードは不要です。
  - icon: 🖼️
    title: 賢いデフォルト
    text: 透過ありPNGはWebP、不透明PNG・JPEGはAVIFに、標準設定のまま変換されます。
  - icon: 🔁
    title: フォールバック自動設定
    text: フォールバック用フォーマットを一箇所で指定するだけで、すべてのルールに自動適用されます。
  - icon: 🧩
    title: pictureタグへの書き換え
    text: 変換後の画像を参照する<img>を、<source>付きの<picture>へ自動的に書き換えます。
  - icon: 🗑️
    title: 元ファイルの任意削除
    text: 元ファイルを安全のため保持するか、フォールバックが揃った時点で削除するか選べます。
---
