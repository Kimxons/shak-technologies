import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Card from "@components/Card";
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

  return (
    <>
      <label className="relative block">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 opacity-70">
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
          className="block w-full rounded-2xl border border-skin-line bg-skin-card bg-opacity-70 py-4 pl-12 pr-4 text-base placeholder:italic placeholder:opacity-75 focus:border-skin-accent focus:outline-none"
          placeholder="Search for posts..."
          type="text"
          name="search"
          value={inputVal}
          onChange={handleChange}
          autoComplete="off"
          ref={inputRef}
        />
      </label>

      {debouncedInputVal.length > 1 && (
        <div className="mt-8 rounded-xl border border-skin-line bg-skin-card bg-opacity-70 px-4 py-3 text-sm">
          Found {searchResults?.length}
          {searchResults?.length === 1 ? " result" : " results"} for '
          {debouncedInputVal}'
        </div>
      )}

      <ul className="mt-4">
        {searchResults &&
          searchResults.map(({ item, refIndex }) => (
            <li key={`${refIndex}-${item.slug}`} className="my-4">
              <Card href={`/posts/${item.slug}`} frontmatter={item.data} />
            </li>
          ))}
      </ul>
    </>
  );
}
