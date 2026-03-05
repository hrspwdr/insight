import { useState, useEffect, useCallback } from "react";
import { API_URL, isOverdue, getNextFollowUp, getActiveOrderCount, contactHasOverdueOrders } from "./utils";
import styles from "./styles";
import ChartView from "./ChartView";
import Dashboard from "./Dashboard";
import { ContactModal, QuickCaptureModal } from "./Modals";
import SearchView from "./SearchView";

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
    };
    load();
  }, []);

  const save = useCallback(async (data) => {
    try {
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 401) {
        window.location.href = "/login";
      }
    } catch (e) {
      console.error("Failed to save:", e);
    }
  }, []);

  const updateContacts = useCallback((newContacts) => {
    setContacts(newContacts);
    save(newContacts);
  }, [save]);

  const handleSaveContact = (contact) => {
    const updated = { ...contacts, [contact.id]: contact };
    updateContacts(updated);
    setShowContactModal(false);
    setActiveContactId(contact.id);
  };

  const handleUpdateContact = (contact) => {
    const updated = { ...contacts, [contact.id]: contact };
    updateContacts(updated);
  };

  const handleUpdateOtherContact = (contact) => {
    setContacts((prev) => {
      const updated = { ...prev, [contact.id]: contact };
      save(updated);
      return updated;
    });
  };

  const handleDeleteContact = (id) => {
    const updated = { ...contacts };
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
    updateContacts(updated);
    setActiveContactId(null);
  };

  const handleQuickCapture = (contactId, encounter) => {
    const contact = contacts[contactId];
    if (!contact) return;
    const updatedContact = {
      ...contact,
      encounters: [...(contact.encounters || []), encounter],
    };
    const updated = { ...contacts, [contactId]: updatedContact };
    updateContacts(updated);
    setShowQuickCapture(false);
    setActiveContactId(contactId);
    setSidebarOpen(false);
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

  const usedContexts = [...new Set(Object.values(contacts).map((c) => c.context))];

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
                <button
                  key={ctx}
                  className={`filter-chip ${filterContext === ctx ? "active" : ""}`}
                  onClick={() => setFilterContext(filterContext === ctx ? null : ctx)}
                >
                  {ctx}
                </button>
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
          {/* Global search bar */}
          {Object.keys(contacts).length > 0 && (
            <div className="global-search-bar">
              <input
                className="global-search-input"
                placeholder="Search everything..."
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setShowSearch(true); }}
                onFocus={() => { if (globalSearch.length >= 2) setShowSearch(true); }}
              />
              {showSearch && globalSearch && (
                <button
                  className="global-search-clear"
                  onClick={() => { setGlobalSearch(""); setShowSearch(false); }}
                >
                  ×
                </button>
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
          ) : activeContact ? (
            <ChartView
              contact={activeContact}
              contacts={contacts}
              onUpdate={handleUpdateContact}
              onUpdateOther={handleUpdateOtherContact}
              onBack={() => { setActiveContactId(null); setSidebarOpen(true); }}
              onDelete={handleDeleteContact}
              onNavigate={(id) => handleSelectContact(id)}
            />
          ) : (
            <Dashboard contacts={contacts} onSelectContact={handleSelectContact} />
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
        <ContactModal onSave={handleSaveContact} onClose={() => setShowContactModal(false)} />
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
