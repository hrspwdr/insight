import { useState, useEffect, useCallback } from "react";
import { formatDate } from "./utils";

const TYPE_LABELS = {
  contact: "Chart",
  encounter: "Encounter",
  order: "Order",
  problem: "Problem",
};

const TYPE_ICONS = {
  contact: "\u{1F4CB}",
  encounter: "\u{1F4DD}",
  order: "\u{2611}\uFE0F",
  problem: "\u26A0\uFE0F",
};

export default function SearchView({ query, contacts, onSelectContact, onClose }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error("Search failed:", e);
    }
    setLoading(false);
    setSearched(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // Group results by contact
  const grouped = {};
  for (const r of results) {
    if (!grouped[r.contactId]) {
      grouped[r.contactId] = { contactName: r.contactName, items: [] };
    }
    grouped[r.contactId].items.push(r);
  }

  const highlightSnippet = (snippet) => {
    // The server uses >>> and <<< as highlight markers
    const parts = snippet.split(/(>>>|<<<)/);
    let inHighlight = false;
    return parts.map((part, i) => {
      if (part === ">>>") { inHighlight = true; return null; }
      if (part === "<<<") { inHighlight = false; return null; }
      if (inHighlight) return <mark key={i} className="search-highlight">{part}</mark>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="search-view">
      <div className="search-view-header">
        <h2>Search Results</h2>
        <button className="btn-chart-action" onClick={onClose}>Close</button>
      </div>

      {loading && <div className="search-loading">Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="search-empty">No results found for "{query}"</div>
      )}

      {!loading && !searched && (
        <div className="search-empty">Type at least 2 characters to search across all charts, encounters, orders, and problems.</div>
      )}

      {Object.entries(grouped).map(([contactId, group]) => (
        <div key={contactId} className="search-group">
          <div
            className="search-group-header"
            onClick={() => { onSelectContact(contactId); onClose(); }}
          >
            {group.contactName}
            <span className="search-group-count">{group.items.length} match{group.items.length !== 1 ? "es" : ""}</span>
          </div>
          {group.items.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="search-result"
              onClick={() => { onSelectContact(contactId); onClose(); }}
            >
              <span className="search-result-type">{TYPE_LABELS[item.type]}</span>
              <span className="search-result-snippet">{highlightSnippet(item.snippet)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
