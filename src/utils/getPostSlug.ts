import type { CollectionEntry } from "astro:content";

const getPostSlug = (post: CollectionEntry<"blog">) =>
    post.data.slug ?? post.id.replace(/\.[^.]+$/, "");

export default getPostSlug;