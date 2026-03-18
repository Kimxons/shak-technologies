import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { CollectionEntry } from "astro:content";
import Fuse from "fuse.js";

export type SearchItem = {
  title: string;
  description: string;
  data: CollectionEntry<"blog">["data"];
  slug: string;
};

interface Props {
  searchList: SearchItem[];
}

interface SearchResult {
  item: SearchItem;
  refIndex: number;
}

export default function SearchBar({ searchList }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");
  const [debouncedInputVal, setDebouncedInputVal] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null
  );

  const fuse = useMemo(
    () =>
      new Fuse(searchList, {
        keys: ["title", "description"],
        includeMatches: true,
        minMatchCharLength: 2,
        threshold: 0.5,
      }),
    [searchList]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.currentTarget.value);
  }, []);

  useEffect(() => {
    const searchUrl = new URLSearchParams(window.location.search);
    const searchStr = searchUrl.get("q");
    if (searchStr) {
      setInputVal(searchStr);
      setDebouncedInputVal(searchStr);
      if (inputRef.current) {
        inputRef.current.value = searchStr;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(searchStr.length, searchStr.length);
      }
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInputVal(inputVal);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputVal]);

  useEffect(() => {
    let currentSearchResults: SearchResult[] = [];
    if (debouncedInputVal.length > 1) {
      currentSearchResults = fuse.search(debouncedInputVal);
    }
    setSearchResults(currentSearchResults);

    const searchParams = new URLSearchParams(window.location.search);
    if (debouncedInputVal.length > 0) {
      searchParams.set("q", debouncedInputVal);
      const newRelativePathQuery =
        window.location.pathname + "?" + searchParams.toString();
      history.replaceState(history.state, "", newRelativePathQuery);
    } else {
      history.replaceState(history.state, "", window.location.pathname);
    }
  }, [debouncedInputVal, fuse]);

  const featuredTopics = Array.from(
    new Set(searchList.flatMap(item => (item.data.tags ?? []).slice(0, 2)))
  ).slice(0, 8);

  const responsiveStyles = `
    .search-toolbar {
      display: grid;
      gap: 1rem;
    }
    .search-scope {
      padding-left: 0;
      border-left: 0;
      padding-top: 1rem;
      border-top: 1px solid rgba(var(--color-border), 0.78);
    }
    .search-results-row {
      display: grid;
      gap: 1rem;
    }
    .search-results-meta {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .search-results-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    @media (min-width: 1080px) {
      .search-toolbar {
        grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
        align-items: end;
      }
      .search-scope {
        padding-top: 0;
        border-top: 0;
        padding-left: 1.25rem;
        border-left: 1px solid rgba(var(--color-border), 0.78);
      }
    }
    @media (min-width: 1280px) {
      .search-results-row {
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: start;
        column-gap: 1.5rem;
      }
      .search-results-meta {
        flex-direction: column;
        justify-content: flex-start;
        min-width: 3rem;
        padding-top: 0.25rem;
      }
      .search-results-link {
        white-space: nowrap;
      }
    }
    @media (max-width: 639px) {
      .search-input {
        padding-top: 1.1rem;
        padding-bottom: 1.1rem;
        padding-left: 3rem;
        font-size: 0.98rem;
      }
      .search-heading {
        font-size: 1.55rem;
        line-height: 1.1;
      }
      .search-story-title {
        font-size: 1.35rem;
        line-height: 1.15;
      }
    }
  `;

  return (
    <section className="space-y-6">
      <style>{responsiveStyles}</style>
      <div className="search-toolbar">
        <div className="border-b border-skin-line pb-4">
          <label className="relative block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-5 opacity-70">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span className="sr-only">Search</span>
            </span>
            <input
              className="search-input block w-full rounded-[1.1rem] border border-skin-line bg-skin-card bg-opacity-60 py-5 pl-14 pr-4 text-base font-medium placeholder:opacity-60 focus:border-skin-accent focus:outline-none"
              placeholder="Search the News Room"
              type="text"
              name="search"
              value={inputVal}
              onChange={handleChange}
              autoComplete="off"
              ref={inputRef}
            />
          </label>
        </div>

        <div className="search-scope">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-skin-accent">
            Search scope
          </span>
          <strong className="mt-2 block text-xl font-semibold">
            {searchList.length} published stories
          </strong>
          <p className="mt-2 text-sm leading-7 opacity-80">
            Results update live across titles and descriptions as you type.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {featuredTopics.map(topic => (
          <span
            key={topic}
            className="border-b border-dashed border-skin-line pb-1 text-sm font-semibold"
          >
            {topic}
          </span>
        ))}
      </div>

      {debouncedInputVal.length > 1 ? (
        <div className="border-b border-skin-line pb-5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-skin-accent">
            Results
          </span>
          <h2 className="search-heading mt-2 text-2xl font-semibold leading-tight">
            {searchResults?.length} {searchResults?.length === 1 ? "story" : "stories"} for “{debouncedInputVal}”
          </h2>
        </div>
      ) : (
        <div className="border-b border-skin-line pb-5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-skin-accent">
            Start with a keyword
          </span>
          <h2 className="search-heading mt-2 text-2xl font-semibold leading-tight">
            Try a stack, framework, platform, or engineering problem area.
          </h2>
        </div>
      )}

      {debouncedInputVal.length > 1 && searchResults?.length === 0 ? (
        <div className="border-b border-skin-line pb-5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-skin-accent">
            No matches
          </span>
          <h3 className="mt-2 text-xl font-semibold">
            No stories matched “{debouncedInputVal}”.
          </h3>
          <p className="mt-2 text-sm leading-7 opacity-80">
            Try a broader phrase, another tool name, or a related technical topic.
          </p>
        </div>
      ) : null}

      <ul className="grid">
        {searchResults &&
          searchResults.map(({ item, refIndex }, index) => (
            <li
              key={`${refIndex}-${item.slug}`}
              className="search-results-row border-b border-skin-line py-5"
            >
              <div className="search-results-meta">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-skin-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] opacity-55">
                  Story
                </span>
              </div>

              <div className="min-w-0">
                <a
                  href={`/posts/${item.slug}`}
                  className="search-story-title text-2xl font-semibold leading-tight no-underline hover:text-skin-accent"
                >
                  {item.title}
                </a>
                <p className="mt-3 text-sm font-semibold opacity-70">
                  {new Date(item.data.pubDatetime).toLocaleDateString()}
                </p>
                <p className="mt-3 text-sm leading-7 opacity-80">{item.description}</p>
                {(item.data.tags ?? []).length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(item.data.tags ?? []).slice(0, 3).map(tag => (
                      <span
                        key={`${item.slug}-${tag}`}
                        className="border-b border-dashed border-skin-line pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-skin-accent"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <a
                href={`/posts/${item.slug}`}
                className="search-results-link text-sm font-semibold text-skin-accent no-underline"
              >
                Read story
                <span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
      </ul>
    </section>
  );
}
