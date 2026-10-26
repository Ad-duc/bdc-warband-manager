/*
 * File:        src/features/reader/RulesSearch.tsx
 * Role:        Search in the rules reader: the search field of the chapter
 *              column, and the list of results shown in place of the
 *              chapter text. The chapters are loaded the first time a query
 *              is typed (they are precached, so it works offline). Each
 *              result names its chapter and section, shows an extract with
 *              the matched words marked and opens the section.
 * Author:      Adrien Duclaud
 * Created:     2026-10-26
 * License:     MIT
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { hrefFor } from "../../app/router.ts";
import { MIN_WORD_LENGTH, loadSearchIndex, queryWords, search, type SearchEntry } from "./search.ts";

/** Results shown at most; the count still gives the total. */
export const MAX_RESULTS = 50;

/** Search field, with a visible label. Escape empties it. */
export function SearchField({ query, onQuery }: { query: string; onQuery: (query: string) => void }) {
  const { t } = useTranslation();
  return (
    <form
      role="search"
      className="mb-4"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <label htmlFor="reader-search" className="mb-1 block font-bold">
        {t("reader.search.label")}
      </label>
      <input
        id="reader-search"
        type="search"
        lang="fr"
        className="field"
        autoComplete="off"
        spellCheck={false}
        placeholder={t("reader.search.placeholder")}
        value={query}
        onChange={(e) => {
          onQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onQuery("");
        }}
      />
    </form>
  );
}

type IndexState = { status: "loading" } | { status: "ready"; entries: SearchEntry[] } | { status: "error" };

/** Results of a query over every chapter. `onOpen` runs when a result is followed. */
export function RulesSearch({ query, onOpen }: { query: string; onOpen: (href: string) => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState<IndexState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadSearchIndex()
      .then((entries) => {
        if (active) setIndex({ status: "ready", entries });
      })
      .catch(() => {
        if (active) setIndex({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo(
    () => (index.status === "ready" ? search(index.entries, query) : []),
    [index, query],
  );
  const tooShort = queryWords(query).length === 0;

  return (
    <section aria-labelledby="reader-search-title">
      <h2 id="reader-search-title" className="title-section mb-3">
        {t("reader.search.title")}
      </h2>
      <p aria-live="polite" className="mb-4">
        {index.status === "loading" && t("reader.search.loading")}
        {index.status === "error" && t("reader.search.error")}
        {index.status === "ready" && tooShort && t("reader.search.short", { min: MIN_WORD_LENGTH })}
        {index.status === "ready" && !tooShort && results.length === 0 && t("reader.search.none")}
        {index.status === "ready" &&
          results.length > 0 &&
          t("reader.search.count", { count: results.length })}
        {results.length > MAX_RESULTS && <> {t("reader.search.more", { shown: MAX_RESULTS })}</>}
      </p>
      {results.length > 0 && (
        <ol lang="fr" className="space-y-3">
          {results.slice(0, MAX_RESULTS).map(({ entry, extract }) => {
            const href = hrefFor({ name: "rules", chapter: entry.chapter.id, section: entry.sectionId });
            return (
              <li key={`${entry.chapter.id}/${entry.sectionId}`}>
                <a
                  href={href}
                  onClick={() => {
                    onOpen(href);
                  }}
                  className="block min-h-11 border-2 border-on-panel p-3 hover:bg-bone"
                >
                  <span className="block text-sm text-on-panel-muted">{entry.chapter.title}</span>
                  <span className="block font-bold underline underline-offset-4">{entry.section}</span>
                  {entry.text !== "" && (
                    <span className="mt-1 block text-sm">
                      {extract.map((part, i) =>
                        part.match ? (
                          <mark key={i} className="search-mark">
                            {part.text}
                          </mark>
                        ) : (
                          <span key={i}>{part.text}</span>
                        ),
                      )}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
