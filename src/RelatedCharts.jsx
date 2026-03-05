import { useState } from "react";

export default function RelatedChartsPicker({ contacts, currentId, relatedIds, onLink, onUnlink }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const available = Object.values(contacts).filter(
    (c) => c.id !== currentId && !relatedIds.includes(c.id)
  );

  const filtered = available.filter(
    (c) => c.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="related-section">
      <div className="section-title">
        <span>Related Charts</span>
        <button className="btn-add-small" onClick={() => setShowPicker(!showPicker)}>
          {showPicker ? "Done" : "+ Link"}
        </button>
      </div>
      {relatedIds.length > 0 && (
        <div className="related-chips">
          {relatedIds.map((rid) => {
            const rc = contacts[rid];
            if (!rc) return null;
            return (
              <span key={rid} className="related-chip">
                <span onClick={() => onLink(rid)} style={{ cursor: "pointer" }}>
                  {rc.name}
                  <span className="related-chip-context"> · {rc.context}</span>
                </span>
                <button className="related-chip-remove" onClick={() => onUnlink(rid)}>×</button>
              </span>
            );
          })}
        </div>
      )}
      {relatedIds.length === 0 && !showPicker && (
        <div style={{ fontSize: "13px", color: "var(--text-muted)", padding: "4px 0" }}>No linked charts</div>
      )}
      {showPicker && (
        <div className="link-picker">
          <input
            placeholder="Search charts to link..."
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            autoFocus
          />
          {filtered.length > 0 && (
            <div className="link-picker-results">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="link-picker-item"
                  onClick={() => {
                    onLink(c.id);
                    setPickerSearch("");
                  }}
                >
                  <span>{c.name}</span>
                  <span className="link-picker-item-ctx">{c.context}</span>
                </div>
              ))}
            </div>
          )}
          {filtered.length === 0 && available.length === 0 && (
            <div style={{ padding: "8px 0", fontSize: "12px", color: "var(--text-muted)" }}>
              No other charts to link
            </div>
          )}
        </div>
      )}
    </div>
  );
}
