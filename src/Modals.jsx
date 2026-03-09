import { useState, useRef, useEffect } from "react";
import { ENCOUNTER_TYPES, ORDER_STATUSES, generateId } from "./utils";
import TagInput from "./TagInput";

export function ContactModal({ contact, onSave, onClose, usedContexts = [] }) {
  const [name, setName] = useState(contact?.name || "");
  const [context, setContext] = useState(contact?.context || "");
  const [notes, setNotes] = useState(contact?.notes || "");
  const [showCtxSuggestions, setShowCtxSuggestions] = useState(false);
  const ctxRef = useRef(null);

  const ctxSuggestions = context.trim()
    ? usedContexts.filter((c) => c.toLowerCase().includes(context.toLowerCase()) && c !== context)
    : usedContexts.filter((c) => c !== context);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: contact?.id || generateId(),
      name: name.trim(),
      context: context.trim(),
      notes: notes.trim(),
      activeProblems: contact?.activeProblems || [],
      encounters: contact?.encounters || [],
      relatedCharts: contact?.relatedCharts || [],
      createdAt: contact?.createdAt || new Date().toISOString(),
    });
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = () => setShowCtxSuggestions(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{contact ? "Edit Chart" : "New Chart"}</h3>
        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Person or group name" autoFocus />
        </div>
        <div className="form-group" onClick={(e) => e.stopPropagation()}>
          <label>Context</label>
          <div style={{ position: "relative" }}>
            <input
              ref={ctxRef}
              value={context}
              onChange={(e) => { setContext(e.target.value); setShowCtxSuggestions(true); }}
              onFocus={() => setShowCtxSuggestions(true)}
              placeholder="e.g., MUHC/CCT, Provincial..."
            />
            {showCtxSuggestions && ctxSuggestions.length > 0 && (
              <div className="tag-suggestions">
                {ctxSuggestions.map((c) => (
                  <div
                    key={c}
                    className="tag-suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setContext(c);
                      setShowCtxSuggestions(false);
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="form-group">
          <label>Background Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Role, relationship context, key details..." rows={4} />
        </div>
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function EncounterModal({ encounter, onSave, onClose, allTags = [] }) {
  const [date, setDate] = useState(encounter?.date || new Date().toISOString().split("T")[0]);
  const [type, setType] = useState(encounter?.type || ENCOUNTER_TYPES[0]);
  const [narrative, setNarrative] = useState(encounter?.narrative || "");
  const [assessment, setAssessment] = useState(encounter?.assessment || "");
  const [plan, setPlan] = useState(encounter?.plan || "");
  const [followUpDate, setFollowUpDate] = useState(encounter?.followUpDate || "");
  const [tags, setTags] = useState(encounter?.tags || []);

  const handleSave = () => {
    onSave({
      id: encounter?.id || generateId(),
      date,
      type,
      narrative: narrative.trim(),
      assessment: assessment.trim(),
      plan: plan.trim(),
      followUpDate: followUpDate || null,
      followUpResolved: encounter?.followUpResolved || false,
      followUpComment: encounter?.followUpComment || null,
      tags,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{encounter ? "Edit Encounter" : "New Encounter"}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {ENCOUNTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Narrative</label>
          <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="What happened? What was discussed?" rows={4} />
        </div>
        <div className="form-group">
          <label>Assessment</label>
          <textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Current state of the relationship/situation..." rows={3} />
        </div>
        <div className="form-group">
          <label>Plan</label>
          <textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="What needs to happen next? Commitments made?" rows={3} />
        </div>
        <div className="form-group">
          <label>Follow-up Date (optional)</label>
          <input type="date" value={followUpDate || ""} onChange={(e) => setFollowUpDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Project Tags</label>
          <TagInput tags={tags} allTags={allTags} onChange={setTags} />
        </div>
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function ResolveModal({ onResolve, onClose }) {
  const [comment, setComment] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Resolve Follow-up</h3>
        <div className="form-group">
          <label>Resolution Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was done? How was this resolved?"
            rows={3}
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => onResolve(comment.trim() || null)}>Resolve</button>
        </div>
      </div>
    </div>
  );
}

export function ProblemModal({ onSave, onClose }) {
  const [text, setText] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Active Problem</h3>
        <div className="form-group">
          <label>Description</label>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., no Wi-Fi in CHSLDs" autoFocus />
        </div>
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => { if (text.trim()) onSave(text.trim()); }}>Add</button>
        </div>
      </div>
    </div>
  );
}

export function OrderModal({ order, onSave, onClose, allTags = [] }) {
  const [description, setDescription] = useState(order?.description || "");
  const [dueDate, setDueDate] = useState(order?.dueDate || "");
  const [status, setStatus] = useState(order?.status || "open");
  const [completionNote, setCompletionNote] = useState(order?.completionNote || "");
  const [tags, setTags] = useState(order?.tags || []);

  const handleSave = () => {
    if (!description.trim()) return;
    onSave({
      id: order?.id || generateId(),
      description: description.trim(),
      dueDate: dueDate || null,
      status,
      completionNote: (status === "completed" || status === "cancelled") ? completionNote.trim() || null : null,
      sourceEncounterId: order?.sourceEncounterId || null,
      createdAt: order?.createdAt || new Date().toISOString(),
      tags,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{order ? "Edit Order" : "New Order"}</h3>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs to be done? How?"
            rows={3}
            autoFocus
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Due Date (optional)</label>
            <input type="date" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {(status === "completed" || status === "cancelled") && (
          <div className="form-group">
            <label>{status === "completed" ? "Completion Note" : "Cancellation Reason"} (optional)</label>
            <textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder={status === "completed" ? "How was this resolved?" : "Why was this cancelled?"}
              rows={2}
            />
          </div>
        )}
        <div className="form-group">
          <label>Project Tags</label>
          <TagInput tags={tags} allTags={allTags} onChange={setTags} />
        </div>
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function QuickCaptureModal({ contacts, onSave, onClose }) {
  const [selectedContactId, setSelectedContactId] = useState("");
  const [narrative, setNarrative] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const contactList = Object.values(contacts).sort((a, b) => a.name.localeCompare(b.name));
  const filtered = contactSearch
    ? contactList.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contactList;

  const selectedContact = selectedContactId ? contacts[selectedContactId] : null;

  const handleSave = () => {
    if (!selectedContactId || !narrative.trim()) return;
    onSave(selectedContactId, {
      id: generateId(),
      date: new Date().toISOString().split("T")[0],
      type: "Note",
      narrative: narrative.trim(),
      assessment: "",
      plan: "",
      followUpDate: null,
      followUpResolved: false,
      followUpComment: null,
      tags: [],
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal quick-capture-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Quick Capture</h3>
        <div className="form-group">
          <label>Chart</label>
          {selectedContact ? (
            <div className="quick-capture-selected">
              <span>{selectedContact.name}</span>
              <span className="quick-capture-ctx">{selectedContact.context}</span>
              <button className="quick-capture-change" onClick={() => { setSelectedContactId(""); setContactSearch(""); }}>Change</button>
            </div>
          ) : (
            <div className="quick-capture-picker">
              <input
                placeholder="Search charts..."
                value={contactSearch}
                onChange={(e) => { setContactSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                autoFocus
              />
              {showDropdown && filtered.length > 0 && (
                <div className="link-picker-results">
                  {filtered.slice(0, 8).map((c) => (
                    <div
                      key={c.id}
                      className="link-picker-item"
                      onClick={() => {
                        setSelectedContactId(c.id);
                        setShowDropdown(false);
                        setContactSearch("");
                      }}
                    >
                      <span>{c.name}</span>
                      <span className="link-picker-item-ctx">{c.context}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Note</label>
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Quick note — what happened?"
            rows={3}
            autoFocus={!!selectedContactId}
          />
        </div>
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={!selectedContactId || !narrative.trim()}
            style={{ opacity: (!selectedContactId || !narrative.trim()) ? 0.5 : 1 }}
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: "14px", lineHeight: 1.6 }}>{message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
