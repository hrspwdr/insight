import { useState, useEffect, useCallback } from "react";
import { API_URL, isOverdue, getNextFollowUp, getActiveOrderCount, contactHasOverdueOrders } from "./utils";
import styles from "./styles";
import ChartView from "./ChartView";
import Dashboard from "./Dashboard";
import { ContactModal, QuickCaptureModal } from "./Modals";
import SearchView from "./SearchView";
import TagFilterView from "./TagFilterView";

// ─── Granular API layer ───

const jsonHeaders = { "Content-Type": "application/json" };

function handleAuthRedirect(res) {
  if (res.status === 401) { window.location.href = "/login"; return true; }
  return false;
}

const api = {
  // Contacts
  createContact: async (contact) => {
    const res = await fetch("/api/contacts", { method: "POST", headers: jsonHeaders, body: JSON.stringify(contact) });
    handleAuthRedirect(res);
    return res;
  },
  updateContact: async (id, patch) => {
    const res = await fetch(`/api/contacts/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(patch) });
    handleAuthRedirect(res);
    return res;
  },
  deleteContact: async (id) => {
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    handleAuthRedirect(res);
    return res;
  },

  // Encounters
  createEncounter: async (contactId, enc) => {
    const res = await fetch(`/api/contacts/${contactId}/encounters`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(enc) });
    handleAuthRedirect(res);
    return res;
  },
  updateEncounter: async (id, enc) => {
    const res = await fetch(`/api/encounters/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(enc) });
    handleAuthRedirect(res);
    return res;
  },
  deleteEncounter: async (id) => {
    const res = await fetch(`/api/encounters/${id}`, { method: "DELETE" });
    handleAuthRedirect(res);
    return res;
  },

  // Orders
  createOrder: async (contactId, ord) => {
    const res = await fetch(`/api/contacts/${contactId}/orders`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(ord) });
    handleAuthRedirect(res);
    return res;
  },
  updateOrder: async (id, ord) => {
    const res = await fetch(`/api/orders/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(ord) });
    handleAuthRedirect(res);
    return res;
  },
  deleteOrder: async (id) => {
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    handleAuthRedirect(res);
    return res;
  },

  // Active Problems
  createProblem: async (contactId, prob) => {
    const res = await fetch(`/api/contacts/${contactId}/problems`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(prob) });
    handleAuthRedirect(res);
    return res;
  },
  updateProblem: async (id, prob) => {
    const res = await fetch(`/api/problems/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(prob) });
    handleAuthRedirect(res);
    return res;
  },
  deleteProblem: async (id) => {
    const res = await fetch(`/api/problems/${id}`, { method: "DELETE" });
    handleAuthRedirect(res);
    return res;
  },

  // Contexts
  renameContext: async (from, to) => {
    const res = await fetch("/api/contexts/rename", { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ from, to }) });
    handleAuthRedirect(res);
    return res;
  },

  // Related Charts
  linkCharts: async (contactId, targetId) => {
    const res = await fetch(`/api/contacts/${contactId}/related/${targetId}`, { method: "POST" });
    handleAuthRedirect(res);
    return res;
  },
  unlinkCharts: async (contactId, targetId) => {
    const res = await fetch(`/api/contacts/${contactId}/related/${targetId}`, { method: "DELETE" });
    handleAuthRedirect(res);
    return res;
  },
};

// ─── App ───

export default function App() {
  const [contacts, setContacts] = useState({});
  const [activeContactId, setActiveContactId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterContext, setFilterContext] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [filterTag, setFilterTag] = useState(null);
  const [editingContext, setEditingContext] = useState(null);
  const [editingContextValue, setEditingContextValue] = useState("");

  const refreshTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) setAllTags(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(API_URL);
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setContacts(data);
          }
        }
      } catch (e) {
        console.error("Failed to load:", e);
      }
      setLoading(false);
      refreshTags();
    };
    load();
  }, [refreshTags]);

  // ─── Contact-level handlers ───

  const handleSaveContact = async (contact) => {
    // New contact — create on server, update local state
    try {
      await api.createContact({
        id: contact.id,
        name: contact.name,
        context: contact.context || "",
        notes: contact.notes || "",
        createdAt: contact.createdAt || new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to create contact:", e);
    }
    setContacts((prev) => ({ ...prev, [contact.id]: { ...contact, encounters: [], orders: [], activeProblems: [], relatedCharts: [] } }));
    setShowContactModal(false);
    setActiveContactId(contact.id);
  };

  const handleEditContact = async (contact) => {
    // Update contact metadata only (name, context, notes)
    try {
      await api.updateContact(contact.id, { name: contact.name, context: contact.context, notes: contact.notes });
    } catch (e) {
      console.error("Failed to update contact:", e);
    }
    setContacts((prev) => ({ ...prev, [contact.id]: { ...prev[contact.id], name: contact.name, context: contact.context, notes: contact.notes } }));
  };

  const handleDeleteContact = async (id) => {
    // Remove bidirectional links from local state, then delete on server
    setContacts((prev) => {
      const updated = { ...prev };
      const removed = updated[id];
      if (removed?.relatedCharts) {
        removed.relatedCharts.forEach((rid) => {
          if (updated[rid]) {
            updated[rid] = {
              ...updated[rid],
              relatedCharts: (updated[rid].relatedCharts || []).filter((x) => x !== id),
            };
          }
        });
      }
      delete updated[id];
      return updated;
    });
    setActiveContactId(null);
    try {
      await api.deleteContact(id);
    } catch (e) {
      console.error("Failed to delete contact:", e);
    }
    refreshTags();
  };

  // ─── Encounter handlers (called from ChartView) ───

  const handleSaveEncounter = async (contactId, enc) => {
    const contact = contacts[contactId];
    if (!contact) return;
    const existing = (contact.encounters || []).find((e) => e.id === enc.id);
    if (existing) {
      // Update
      try { await api.updateEncounter(enc.id, enc); } catch (e) { console.error("Failed to update encounter:", e); }
    } else {
      // Create
      try { await api.createEncounter(contactId, enc); } catch (e) { console.error("Failed to create encounter:", e); }
    }
    setContacts((prev) => {
      const c = prev[contactId];
      const encounters = c.encounters || [];
      const idx = encounters.findIndex((e) => e.id === enc.id);
      const updatedEnc = idx >= 0
        ? encounters.map((e) => (e.id === enc.id ? enc : e))
        : [...encounters, enc];
      return { ...prev, [contactId]: { ...c, encounters: updatedEnc } };
    });
    refreshTags();
  };

  const handleDeleteEncounter = async (contactId, encId) => {
    try { await api.deleteEncounter(encId); } catch (e) { console.error("Failed to delete encounter:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      return { ...prev, [contactId]: { ...c, encounters: (c.encounters || []).filter((e) => e.id !== encId) } };
    });
    refreshTags();
  };

  const handleResolveFollowUp = async (contactId, encId, comment) => {
    try { await api.updateEncounter(encId, { followUpResolved: true, followUpComment: comment }); } catch (e) { console.error("Failed to resolve follow-up:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      const encounters = (c.encounters || []).map((e) =>
        e.id === encId ? { ...e, followUpResolved: true, followUpComment: comment } : e
      );
      return { ...prev, [contactId]: { ...c, encounters } };
    });
  };

  const handleUnresolveFollowUp = async (contactId, encId) => {
    try { await api.updateEncounter(encId, { followUpResolved: false, followUpComment: null }); } catch (e) { console.error("Failed to unresolve follow-up:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      const encounters = (c.encounters || []).map((e) =>
        e.id === encId ? { ...e, followUpResolved: false, followUpComment: null } : e
      );
      return { ...prev, [contactId]: { ...c, encounters } };
    });
  };

  // ─── Order handlers ───

  const handleSaveOrder = async (contactId, order) => {
    const contact = contacts[contactId];
    if (!contact) return;
    const existing = (contact.orders || []).find((o) => o.id === order.id);
    if (existing) {
      try { await api.updateOrder(order.id, order); } catch (e) { console.error("Failed to update order:", e); }
    } else {
      try { await api.createOrder(contactId, order); } catch (e) { console.error("Failed to create order:", e); }
    }
    setContacts((prev) => {
      const c = prev[contactId];
      const orders = c.orders || [];
      const idx = orders.findIndex((o) => o.id === order.id);
      const updatedOrd = idx >= 0
        ? orders.map((o) => (o.id === order.id ? order : o))
        : [...orders, order];
      return { ...prev, [contactId]: { ...c, orders: updatedOrd } };
    });
    refreshTags();
  };

  const handleDeleteOrder = async (contactId, orderId) => {
    try { await api.deleteOrder(orderId); } catch (e) { console.error("Failed to delete order:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      return { ...prev, [contactId]: { ...c, orders: (c.orders || []).filter((o) => o.id !== orderId) } };
    });
    refreshTags();
  };

  const handleCycleOrderStatus = async (contactId, orderId) => {
    const contact = contacts[contactId];
    const order = (contact?.orders || []).find((o) => o.id === orderId);
    if (!order) return;
    const cycle = { "open": "in-progress", "in-progress": "completed", "completed": "open", "cancelled": "open" };
    const newStatus = cycle[order.status] || "open";
    try { await api.updateOrder(orderId, { status: newStatus }); } catch (e) { console.error("Failed to cycle order status:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      const orders = (c.orders || []).map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );
      return { ...prev, [contactId]: { ...c, orders } };
    });
  };

  // ─── Problem handlers ───

  const handleAddProblem = async (contactId, prob) => {
    try { await api.createProblem(contactId, prob); } catch (e) { console.error("Failed to add problem:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      return { ...prev, [contactId]: { ...c, activeProblems: [...(c.activeProblems || []), prob] } };
    });
  };

  const handleToggleProblem = async (contactId, probId) => {
    const contact = contacts[contactId];
    const problem = (contact?.activeProblems || []).find((p) => p.id === probId);
    if (!problem) return;
    const newStatus = problem.status === "active" ? "resolved" : "active";
    try { await api.updateProblem(probId, { status: newStatus }); } catch (e) { console.error("Failed to toggle problem:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      const problems = (c.activeProblems || []).map((p) =>
        p.id === probId ? { ...p, status: newStatus } : p
      );
      return { ...prev, [contactId]: { ...c, activeProblems: problems } };
    });
  };

  const handleRemoveProblem = async (contactId, probId) => {
    try { await api.deleteProblem(probId); } catch (e) { console.error("Failed to remove problem:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      return { ...prev, [contactId]: { ...c, activeProblems: (c.activeProblems || []).filter((p) => p.id !== probId) } };
    });
  };

  // ─── Related chart handlers ───

  const handleLinkChart = async (contactId, targetId) => {
    try { await api.linkCharts(contactId, targetId); } catch (e) { console.error("Failed to link charts:", e); }
    setContacts((prev) => {
      const updated = { ...prev };
      const current = { ...updated[contactId] };
      const target = updated[targetId] ? { ...updated[targetId] } : null;
      if (!current.relatedCharts?.includes(targetId)) {
        current.relatedCharts = [...(current.relatedCharts || []), targetId];
      }
      if (target && !target.relatedCharts?.includes(contactId)) {
        target.relatedCharts = [...(target.relatedCharts || []), contactId];
        updated[targetId] = target;
      }
      updated[contactId] = current;
      return updated;
    });
  };

  const handleUnlinkChart = async (contactId, targetId) => {
    try { await api.unlinkCharts(contactId, targetId); } catch (e) { console.error("Failed to unlink charts:", e); }
    setContacts((prev) => {
      const updated = { ...prev };
      const current = { ...updated[contactId] };
      const target = updated[targetId] ? { ...updated[targetId] } : null;
      current.relatedCharts = (current.relatedCharts || []).filter((id) => id !== targetId);
      if (target) {
        target.relatedCharts = (target.relatedCharts || []).filter((id) => id !== contactId);
        updated[targetId] = target;
      }
      updated[contactId] = current;
      return updated;
    });
  };

  // ─── Quick capture (creates encounter) ───

  const handleQuickCapture = async (contactId, encounter) => {
    const contact = contacts[contactId];
    if (!contact) return;
    try { await api.createEncounter(contactId, encounter); } catch (e) { console.error("Failed to save quick capture:", e); }
    setContacts((prev) => {
      const c = prev[contactId];
      return { ...prev, [contactId]: { ...c, encounters: [...(c.encounters || []), encounter] } };
    });
    setShowQuickCapture(false);
    setActiveContactId(contactId);
    setSidebarOpen(false);
    refreshTags();
  };

  const handleRenameContext = async (from, to) => {
    if (!to.trim() || from === to.trim()) { setEditingContext(null); return; }
    try { await api.renameContext(from, to.trim()); } catch (e) { console.error("Failed to rename context:", e); }
    setContacts((prev) => {
      const updated = { ...prev };
      for (const [id, c] of Object.entries(updated)) {
        if (c.context === from) {
          updated[id] = { ...c, context: to.trim() };
        }
      }
      return updated;
    });
    if (filterContext === from) setFilterContext(to.trim());
    setEditingContext(null);
  };

  const handleSelectContact = (id) => {
    setActiveContactId(id);
    setSidebarOpen(false);
  };

  const contactList = Object.values(contacts)
    .filter((c) => {
      if (filterContext && c.context !== filterContext) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aOverdue = isOverdue(a) || contactHasOverdueOrders(a);
      const bOverdue = isOverdue(b) || contactHasOverdueOrders(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.name.localeCompare(b.name);
    });

  const usedContexts = [...new Set(Object.values(contacts).map((c) => c.context).filter(Boolean))];

  if (loading) return <div className="loading">Loading chart data...</div>;

  const activeContact = activeContactId ? contacts[activeContactId] : null;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="btn-mobile-menu" onClick={() => setSidebarOpen(true)}>
            Charts
          </button>
          <h1>Insight</h1>
          <div className="subtitle">Innoventually</div>
        </div>

        {/* Sidebar overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <div className={`sidebar ${sidebarOpen ? "" : "hidden"}`}>
          <div className="sidebar-header">
            <h1>Insight</h1>
            <div className="subtitle">Innoventually</div>
          </div>
          <div className="sidebar-search">
            <input
              placeholder="Search charts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {usedContexts.length > 0 && (
            <div className="sidebar-filters">
              <button
                className={`filter-chip ${!filterContext ? "active" : ""}`}
                onClick={() => setFilterContext(null)}
              >
                All
              </button>
              {usedContexts.map((ctx) => (
                editingContext === ctx ? (
                  <form
                    key={ctx}
                    className="context-rename-form"
                    onSubmit={(e) => { e.preventDefault(); handleRenameContext(ctx, editingContextValue); }}
                  >
                    <input
                      className="context-rename-input"
                      value={editingContextValue}
                      onChange={(e) => setEditingContextValue(e.target.value)}
                      onBlur={() => handleRenameContext(ctx, editingContextValue)}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditingContext(null); }}
                      autoFocus
                    />
                  </form>
                ) : (
                  <button
                    key={ctx}
                    className={`filter-chip ${filterContext === ctx ? "active" : ""}`}
                    onClick={() => setFilterContext(filterContext === ctx ? null : ctx)}
                    onDoubleClick={() => { setEditingContext(ctx); setEditingContextValue(ctx); }}
                    title="Double-click to rename"
                  >
                    {ctx}
                  </button>
                )
              ))}
            </div>
          )}
          <div className="contact-list">
            {contactList.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                {Object.keys(contacts).length === 0 ? "No charts yet" : "No matches"}
              </div>
            ) : (
              contactList.map((c) => {
                const overdue = isOverdue(c) || contactHasOverdueOrders(c);
                const nextFU = getNextFollowUp(c);
                const hasPending = (nextFU && !isOverdue(c)) && !contactHasOverdueOrders(c);
                const activeOrdCount = getActiveOrderCount(c);
                return (
                  <div
                    key={c.id}
                    className={`contact-item ${activeContactId === c.id ? "active" : ""}`}
                    onClick={() => handleSelectContact(c.id)}
                  >
                    <div className={overdue ? "overdue-dot" : hasPending ? "upcoming-dot" : "clear-dot"} />
                    <div className="contact-item-info">
                      <div className="contact-item-name">{c.name}</div>
                      <div className="contact-item-meta">
                        {c.context} · {c.encounters?.length || 0} enc.
                        {activeOrdCount > 0 && ` · ${activeOrdCount} ord.`}
                        {overdue && " · overdue"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="sidebar-footer">
            <button className="btn-new-contact" onClick={() => setShowContactModal(true)}>
              + New Chart
            </button>
          </div>
        </div>

        <div className="main">
          {/* Global search bar + tag filters */}
          {Object.keys(contacts).length > 0 && (
            <div className="global-search-bar">
              <input
                className="global-search-input"
                placeholder="Search everything..."
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setShowSearch(true); setFilterTag(null); }}
                onFocus={() => { if (globalSearch.length >= 2) setShowSearch(true); }}
              />
              {(showSearch && globalSearch) || filterTag ? (
                <button
                  className="global-search-clear"
                  onClick={() => { setGlobalSearch(""); setShowSearch(false); setFilterTag(null); }}
                >
                  ×
                </button>
              ) : null}
              {allTags.length > 0 && (
                <div className="tag-filter-chips">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      className={`tag-filter-chip ${filterTag === tag ? "active" : ""}`}
                      onClick={() => {
                        setFilterTag(filterTag === tag ? null : tag);
                        setGlobalSearch("");
                        setShowSearch(false);
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showSearch && globalSearch.length >= 2 ? (
            <SearchView
              query={globalSearch}
              contacts={contacts}
              onSelectContact={(id) => handleSelectContact(id)}
              onClose={() => { setShowSearch(false); setGlobalSearch(""); }}
            />
          ) : filterTag ? (
            <TagFilterView
              tag={filterTag}
              contacts={contacts}
              onSelectContact={(id) => { setFilterTag(null); handleSelectContact(id); }}
            />
          ) : activeContact ? (
            <ChartView
              contact={activeContact}
              contacts={contacts}
              onEditContact={handleEditContact}
              onSaveEncounter={(enc) => handleSaveEncounter(activeContactId, enc)}
              onDeleteEncounter={(encId) => handleDeleteEncounter(activeContactId, encId)}
              onResolveFollowUp={(encId, comment) => handleResolveFollowUp(activeContactId, encId, comment)}
              onUnresolveFollowUp={(encId) => handleUnresolveFollowUp(activeContactId, encId)}
              onSaveOrder={(order) => handleSaveOrder(activeContactId, order)}
              onDeleteOrder={(orderId) => handleDeleteOrder(activeContactId, orderId)}
              onCycleOrderStatus={(orderId) => handleCycleOrderStatus(activeContactId, orderId)}
              onAddProblem={(prob) => handleAddProblem(activeContactId, prob)}
              onToggleProblem={(probId) => handleToggleProblem(activeContactId, probId)}
              onRemoveProblem={(probId) => handleRemoveProblem(activeContactId, probId)}
              onLinkChart={(targetId) => handleLinkChart(activeContactId, targetId)}
              onUnlinkChart={(targetId) => handleUnlinkChart(activeContactId, targetId)}
              onBack={() => { setActiveContactId(null); setSidebarOpen(true); }}
              onDelete={() => handleDeleteContact(activeContactId)}
              onNavigate={(id) => handleSelectContact(id)}
              allTags={allTags}
              usedContexts={usedContexts}
            />
          ) : (
            <Dashboard contacts={contacts} onSelectContact={handleSelectContact} allTags={allTags} />
          )}
        </div>
      </div>

      {/* Quick Capture FAB */}
      {Object.keys(contacts).length > 0 && (
        <button className="btn-quick-capture" onClick={() => setShowQuickCapture(true)} title="Quick capture">
          +
        </button>
      )}

      {showContactModal && (
        <ContactModal onSave={handleSaveContact} onClose={() => setShowContactModal(false)} usedContexts={usedContexts} />
      )}
      {showQuickCapture && (
        <QuickCaptureModal
          contacts={contacts}
          onSave={handleQuickCapture}
          onClose={() => setShowQuickCapture(false)}
        />
      )}
    </>
  );
}
