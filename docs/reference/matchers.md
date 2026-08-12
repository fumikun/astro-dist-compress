# Matchers API

All exported from `astro-dist-compress`. Every matcher has the shape `(ctx: ImageContext) => boolean` — you can freely mix them with plain functions.

## `inDir(...globs: string[])`

Matches images anywhere under the given directory glob(s). A bare directory path (no `*`) automatically matches everything beneath it.

```ts
inDir("assets/hero");        // matches assets/hero/anything.png
inDir("assets/**/thumbs");   // glob patterns work too
inDir("a", "b");             // matches under "a" OR under "b"
```

## `pathMatches(...globs: string[])`

Matches the image's full relative path against the given glob(s).

```ts
pathMatches("**/icons/*.png");
```

## `hasFormat(...formats: ImageFormat[])`

Matches images whose **decoded** source format (not just file extension) is one of the given values.

```ts
hasFormat("png");
hasFormat("jpeg", "jpg");
```

## `hasAlpha(expected = true)`

Matches images with (or, passing `false`, without) an alpha channel.

```ts
hasAlpha();       // has transparency
hasAlpha(false);  // opaque
```

## `largerThan({ width?, height? })`

Matches images at or above the given pixel dimensions. Either field can be omitted.

```ts
largerThan({ width: 1200 });
largerThan({ width: 1200, height: 800 });
```

## `biggerThan(bytes: number)`

Matches images at or above the given file size, in bytes.

```ts
biggerThan(20_000); // 20 KB or larger
```

## `and(...matchers)` / `or(...matchers)` / `not(matcher)`

Combine matchers with boolean logic.

```ts
and(hasFormat("png"), hasAlpha(true), biggerThan(20_000));
or(hasFormat("jpeg"), hasFormat("jpg"));
not(inDir("assets/icons"));
```
