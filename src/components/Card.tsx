import { slugifyStr } from "@utils/slugify";
import Datetime from "./Datetime";
import type { CollectionEntry } from "astro:content";

export interface Props {
  href?: string;
  frontmatter: CollectionEntry<"blog">["data"];
  secHeading?: boolean;
}

export default function Card({ href, frontmatter, secHeading = true }: Props) {
  const { title, pubDatetime, modDatetime, description } = frontmatter;

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className: "text-xl font-semibold leading-tight tracking-tight",
  };

  return (
    <li className="group my-5 rounded-2xl border border-skin-line bg-skin-card bg-opacity-75 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-skin-accent hover:shadow-md">
      <a
        href={href}
        className="inline-flex text-skin-base decoration-dashed underline-offset-4 focus-visible:no-underline focus-visible:underline-offset-0"
      >
        {secHeading ? (
          <h2 {...headerProps}>{title}</h2>
        ) : (
          <h3 {...headerProps}>{title}</h3>
        )}
      </a>
      <Datetime
        pubDatetime={pubDatetime}
        modDatetime={modDatetime}
        className="mt-3 text-sm"
      />
      <p className="mt-3 opacity-85">{description}</p>
    </li>
  );
}
