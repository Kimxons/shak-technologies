# Shak Technologies

Company site and insights platform built with Astro, Tailwind, and Bun.

## Commands

- `bun dev` starts the local Astro dev server.
- `bun x astro check` validates Astro routes, content collections, and types.
- `bun run build` runs the production build.

## Blog URL Conventions

All blog routing, feeds, search results, and OG image routes resolve post URLs through [src/utils/getPostSlug.ts](src/utils/getPostSlug.ts).

- If a post defines `slug:` in frontmatter, that value is the canonical URL segment.
- If `slug:` is omitted, the canonical URL segment falls back to the markdown filename without the extension.
- Use an explicit `slug:` when the public URL must stay stable even if the file is renamed later.
- Use the filename-derived URL when the filename already matches the desired permanent URL.
- Do not derive post URLs from titles inside templates or route files.

Example with explicit slug:

```md
---
title: "My Post"
slug: my-stable-url
---
```

Example with filename-derived URL:

File: `src/content/blog/my-post.md`

```md
---
title: "My Post"
---
```

This resolves to `/posts/my-post`.
