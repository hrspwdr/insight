import { useState, useRef, useCallback } from "react";
import { ENCOUNTER_TYPES } from "./utils";
import {
  getPresetConfig,
  filterEncounters,
  filterOrders,
  generateMarkdown,
  generatePrintHtml,
  downloadMarkdown,
  openPrintHtml,
} from "./exportUtils";

const PRESETS = [
  { key: "meeting-prep", label: "Meeting Prep", desc: "Last 30 days + active orders" },
  { key: "weekly-digest", label: "Weekly Digest for Claude", desc: "Past & upcoming 7 days, all sections" },
  { key: "full", label: "Full Chart", desc: "Everything, all time" },
  { key: "custom", label: "Custom", desc: "Configure your own export" },
];

export default function ExportModal({ chartData, onClose, isMulti = false, allTags = [] }) {
  const [preset, setPreset] = useState("meeting-prep");
  const [config, setConfig] = useState(getPresetConfig("meeting-prep"));
  const [format, setFormat] = useState("markdown"); // "markdown" | "pdf"

  const handlePresetChange = (key) => {
    setPreset(key);
    setConfig(getPresetConfig(key));
  };

  const updateConfig = (patch) => {
    setPreset("custom");
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const toggleSection = (section) => {
    setPreset("custom");
    setConfig((prev) => ({
      ...prev,
      includeSections: {
        ...prev.includeSections,
        [section]: !prev.includeSections[section],
      },
    }));
  };

  const toggleFilterTag = (tag) => {
    setPreset("custom");
    setConfig((prev) => {
      const tags = prev.filterTags || [];
      return {
        ...prev,
        filterTags: tags.includes(tag)
          ? tags.filter((t) => t !== tag)
          : [...tags, tag],
      };
    });
  };

  const toggleEncounterType = (type) => {
    setPreset("custom");
    setConfig((prev) => {
      const types = prev.encounterTypes || [];
      return {
        ...prev,
        encounterTypes: types.includes(type)
          ? types.filter((t) => t !== type)
          : [...types, type],
      };
    });
  };

  // Preview counts
  const totalEncounters = chartData.reduce(
    (sum, c) => sum + filterEncounters(c.encounters, config).length,
    0
  );
  const totalOrders = chartData.reduce(
    (sum, c) => sum + filterOrders(c.orders, config).length,
    0
  );

  const handleExport = () => {
    const isDigest = preset === "weekly-digest";

    if (format === "markdown") {
      const md = generateMarkdown(chartData, config, isDigest);
      const datePart = new Date().toISOString().split("T")[0];
      const namePart = chartData.length === 1
        ? chartData[0].name.replace(/\s+/g, "-").toLowerCase()
        : "digest";
      downloadMarkdown(md, `insight-${namePart}-${datePart}.md`);
    } else {
      const html = generatePrintHtml(chartData, config);
      openPrintHtml(html);
    }

    onClose();
  };

  const sections = [
    { key: "background", label: "Background" },
    { key: "problems", label: "Active Problems" },
    { key: "orders", label: "Orders" },
    { key: "encounters", label: "Encounters" },
    { key: "followUps", label: "Pending Follow-ups" },
  ];

  const mouseDownTarget = useRef(null);
  const handleOverlayMouseDown = useCallback((e) => { mouseDownTarget.current = e.target; }, []);
  const handleOverlayMouseUp = useCallback((e) => {
    if (e.target === mouseDownTarget.current && e.target.classList.contains("modal-overlay")) onClose();
    mouseDownTarget.current = null;
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown} onMouseUp={handleOverlayMouseUp}>
      <div className="modal export-modal">
        <h3>{isMulti ? "Export Digest" : `Export — ${chartData[0]?.name}`}</h3>

        {/* Preset buttons */}
        <div className="export-presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={`export-preset-btn ${preset === p.key ? "active" : ""}`}
              onClick={() => handlePresetChange(p.key)}
            >
              <span className="export-preset-label">{p.label}</span>
              <span className="export-preset-desc">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Format toggle */}
        <div className="export-format-row">
          <span className="export-row-label">Format</span>
          <div className="export-format-toggle">
            <button
              className={`export-format-btn ${format === "markdown" ? "active" : ""}`}
              onClick={() => setFormat("markdown")}
            >
              Markdown (for Claude)
            </button>
            <button
              className={`export-format-btn ${format === "pdf" ? "active" : ""}`}
              onClick={() => setFormat("pdf")}
            >
              Print / PDF
            </button>
          </div>
        </div>

        {/* Date range */}
        <div className="export-config-section">
          <span className="export-row-label">Date Range</span>
          <div className="export-date-row">
            <input
              type="date"
              value={config.dateFrom}
              onChange={(e) => updateConfig({ dateFrom: e.target.value })}
            />
            <span className="export-date-sep">to</span>
            <input
              type="date"
              value={config.dateTo}
              onChange={(e) => updateConfig({ dateTo: e.target.value })}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="export-config-section">
          <span className="export-row-label">Include Sections</span>
          <div className="export-checkboxes">
            {sections.map((s) => (
              <label key={s.key} className="export-checkbox">
                <input
                  type="checkbox"
                  checked={config.includeSections[s.key]}
                  onChange={() => toggleSection(s.key)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="export-config-section">
            <span className="export-row-label">Filter by Project Tag</span>
            <div className="export-checkboxes">
              {allTags.map((t) => (
                <label key={t} className="export-checkbox">
                  <input
                    type="checkbox"
                    checked={config.filterTags?.includes(t) || false}
                    onChange={() => toggleFilterTag(t)}
                  />
                  {t}
                </label>
              ))}
            </div>
            <div className="export-hint">
              {(!config.filterTags || config.filterTags.length === 0) && "All tags included (no filter)"}
            </div>
          </div>
        )}

        {/* Encounter type filter */}
        {config.includeSections.encounters && (
          <div className="export-config-section">
            <span className="export-row-label">Encounter Types</span>
            <div className="export-checkboxes">
              {ENCOUNTER_TYPES.map((t) => (
                <label key={t} className="export-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      !config.encounterTypes || config.encounterTypes.length === 0
                        ? true
                        : config.encounterTypes.includes(t)
                    }
                    onChange={() => toggleEncounterType(t)}
                  />
                  {t}
                </label>
              ))}
            </div>
            <div className="export-hint">
              {(!config.encounterTypes || config.encounterTypes.length === 0) && "All types included"}
            </div>
          </div>
        )}

        {/* Orders mode */}
        {config.includeSections.orders && (
          <div className="export-config-section">
            <span className="export-row-label">Orders</span>
            <div className="export-format-toggle">
              <button
                className={`export-format-btn ${config.ordersMode === "active" ? "active" : ""}`}
                onClick={() => updateConfig({ ordersMode: "active" })}
              >
                Active only
              </button>
              <button
                className={`export-format-btn ${config.ordersMode === "all" ? "active" : ""}`}
                onClick={() => updateConfig({ ordersMode: "all" })}
              >
                All
              </button>
              <button
                className={`export-format-btn ${config.ordersMode === "none" ? "active" : ""}`}
                onClick={() => updateConfig({ ordersMode: "none" })}
              >
                None
              </button>
            </div>
          </div>
        )}

        {/* Preview summary */}
        <div className="export-preview">
          {chartData.length} chart{chartData.length !== 1 ? "s" : ""} · {totalEncounters} encounter{totalEncounters !== 1 ? "s" : ""} · {totalOrders} order{totalOrders !== 1 ? "s" : ""}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleExport}>
            {format === "markdown" ? "Download .md" : "Open Print View"}
          </button>
        </div>
      </div>
    </div>
  );
}
