import { useState, useRef, useEffect } from "react";

export default function TagInput({ tags = [], allTags = [], onChange }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const suggestions = input.trim()
    ? allTags.filter(
        (t) =>
          t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
      )
    : allTags.filter((t) => !tags.includes(t));

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = () => setShowSuggestions(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="tag-input-wrapper" onClick={(e) => e.stopPropagation()}>
      <div className="tag-input-container" onClick={() => inputRef.current?.focus()}>
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button className="tag-chip-remove" onClick={() => removeTag(tag)}>
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tag-input-field"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Add project tag..." : ""}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.slice(0, 8).map((t) => (
            <div
              key={t}
              className="tag-suggestion-item"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(t);
              }}
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
