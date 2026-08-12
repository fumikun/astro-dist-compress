# マッチャーAPI

すべて`astro-dist-compress`からエクスポートされています。どのマッチャーも`(ctx: ImageContext) => boolean`という形をしているため、生の関数と自由に組み合わせられます。

## `inDir(...globs: string[])`

指定したディレクトリglob配下にある画像にマッチします。`*`を含まない素のディレクトリパスは、その配下すべてに自動的にマッチします。

```ts
inDir("assets/hero");        // assets/hero/anything.png にマッチ
inDir("assets/**/thumbs");   // globパターンも使える
inDir("a", "b");             // "a"配下 または "b"配下 にマッチ
```

## `pathMatches(...globs: string[])`

画像の相対パス全体を指定globに対してマッチします。

```ts
pathMatches("**/icons/*.png");
```

## `hasFormat(...formats: ImageFormat[])`

画像の**デコード結果としての**元フォーマット(ファイル拡張子ではなく)が、指定したいずれかであればマッチします。

```ts
hasFormat("png");
hasFormat("jpeg", "jpg");
```

## `hasAlpha(expected = true)`

アルファチャンネル(透過)がある画像にマッチします。`false`を渡すと、ない画像にマッチします。

```ts
hasAlpha();       // 透過あり
hasAlpha(false);  // 不透明
```

## `largerThan({ width?, height? })`

指定したピクセルサイズ以上の画像にマッチします。どちらか一方だけの指定も可能です。

```ts
largerThan({ width: 1200 });
largerThan({ width: 1200, height: 800 });
```

## `biggerThan(bytes: number)`

指定バイト数以上のファイルサイズの画像にマッチします。

```ts
biggerThan(20_000); // 20KB以上
```

## `and(...matchers)` / `or(...matchers)` / `not(matcher)`

マッチャーを論理演算で組み合わせます。

```ts
and(hasFormat("png"), hasAlpha(true), biggerThan(20_000));
or(hasFormat("jpeg"), hasFormat("jpg"));
not(inDir("assets/icons"));
```
