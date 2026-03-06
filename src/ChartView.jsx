import { useState } from "react";
import { generateId, formatDate, isOverdue, isOrderOverdue, daysOverdue } from "./utils";
import { EncounterModal, ResolveModal, ProblemModal, OrderModal, ContactModal, ConfirmModal } from "./Modals";
import RelatedChartsPicker from "./RelatedCharts";
import ExportModal from "./ExportModal";

export default function ChartView({
  contact, contacts,
  // Granular callbacks from App.jsx
  onEditContact, onSaveEncounter, onDeleteEncounter, onResolveFollowUp, onUnresolveFollowUp,
  onSaveOrder, onDeleteOrder, onCycleOrderStatus,
  onAddProblem, onToggleProblem, onRemoveProblem,
  onLinkChart, onUnlinkChart,
  onBack, onDelete, onNavigate,
  allTags = [],
}) {
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [editingEncounter, setEditingEncounter] = useState(null);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteEncounter, setShowDeleteEncounter] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showDeleteOrder, setShowDeleteOrder] = useState(null);
  const [orderFromPlan, setOrderFromPlan] = useState(null);
  const [showExport, setShowExport] = useState(false);

  const sortedEncounters = [...(contact.encounters || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // ─── Thin handlers (manage modal state, delegate to parent) ───

  const handleSaveEncounter = (enc) => {
    onSaveEncounter(enc);
    setShowEncounterModal(false);
    setEditingEncounter(null);
  };

  const handleDeleteEncounter = (encId) => {
    onDeleteEncounter(encId);
    setShowDeleteEncounter(null);
  };

  const handleResolveFollowUp = (encId, comment) => {
    onResolveFollowUp(encId, comment);
    setShowResolveModal(null);
  };

  const handleAddProblem = (text) => {
    onAddProblem({ id: generateId(), text, status: "active", addedAt: new Date().toISOString() });
    setShowProblemModal(false);
  };

  const handleSaveOrder = (order) => {
    onSaveOrder(order);
    setShowOrderModal(false);
    setEditingOrder(null);
    setOrderFromPlan(null);
  };

  const handleDeleteOrder = (orderId) => {
    onDeleteOrder(orderId);
    setShowDeleteOrder(null);
  };

  const handleCreateOrderFromPlan = (enc) => {
    setOrderFromPlan({ description: enc.plan, sourceEncounterId: enc.id });
    setEditingOrder(null);
    setShowOrderModal(true);
  };

  const handleEditContactSave = (updated) => {
    onEditContact(updated);
    setShowEditContact(false);
  };

  const activeOrders = (contact.orders || []).filter((o) => o.status === "open" || o.status === "in-progress");
  const completedOrders = (contact.orders || []).filter((o) => o.status === "completed" || o.status === "cancelled");

  return (
    <div className="chart">
      <div className="chart-nav">
        <button className="btn-back" onClick={onBack}>&larr; Index</button>
      </div>

      {/* Header */}
      <div className="chart-header">
        <div className="chart-header-top">
          <div>
            <div className="chart-name">{contact.name}</div>
            <div style={{ marginTop: 6 }}>
              <span className="chart-context">{contact.context}</span>
              {isOverdue(contact) && (
                <span style={{ marginLeft: 8, color: "var(--red)", fontSize: "12px", fontWeight: 500 }}>
                  &#x25CF; Overdue follow-up
                </span>
              )}
            </div>
          </div>
        </div>
        {contact.notes && <div className="chart-notes">{contact.notes}</div>}
        <div className="chart-actions">
          <button className="btn-chart-action primary" onClick={() => { setEditingEncounter(null); setShowEncounterModal(true); }}>
            + New Encounter
          </button>
          <button className="btn-chart-action" onClick={() => setShowEditContact(true)}>Edit</button>
          <button className="btn-chart-action" onClick={() => setShowExport(true)}>Export</button>
          <button className="btn-chart-action danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
        </div>
      </div>

      {/* Related Charts */}
      <RelatedChartsPicker
        contacts={contacts}
        currentId={contact.id}
        relatedIds={contact.relatedCharts || []}
        onLink={(targetId) => {
          if ((contact.relatedCharts || []).includes(targetId)) {
            onNavigate(targetId);
          } else {
            onLinkChart(targetId);
          }
        }}
        onUnlink={onUnlinkChart}
      />

      {/* Active Problems */}
      <div className="problems-section">
        <div className="section-title">
          <span>Active Problem List</span>
          <button className="btn-add-small" onClick={() => setShowProblemModal(true)}>+ Add</button>
        </div>
        {(!contact.activeProblems || contact.activeProblems.length === 0) ? (
          <div style={{ fontSize: "13px", color: "var(--text-muted)", padding: "4px 0" }}>No active problems</div>
        ) : (
          contact.activeProblems.map((p, i) => (
            <div className="problem-item" key={p.id}>
              <span className="problem-number">{i + 1}.</span>
              <span className="problem-text">{p.text}</span>
              <span
                className={`problem-status ${p.status}`}
                onClick={() => onToggleProblem(p.id)}
              >
                {p.status}
              </span>
              <button className="problem-remove" onClick={() => onRemoveProblem(p.id)}>×</button>
            </div>
          ))
        )}
      </div>

      {/* Orders */}
      <div className="orders-section">
        <div className="section-title">
          <span>Orders ({activeOrders.length} active{completedOrders.length > 0 ? `, ${completedOrders.length} closed` : ""})</span>
          <button className="btn-add-small" onClick={() => { setEditingOrder(null); setOrderFromPlan(null); setShowOrderModal(true); }}>+ Add</button>
        </div>
        {activeOrders.length === 0 && completedOrders.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--text-muted)", padding: "4px 0" }}>No orders</div>
        ) : (
          <>
            {activeOrders
              .sort((a, b) => {
                const aOv = isOrderOverdue(a);
                const bOv = isOrderOverdue(b);
                if (aOv && !bOv) return -1;
                if (!aOv && bOv) return 1;
                if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
                if (a.dueDate && !b.dueDate) return -1;
                if (!a.dueDate && b.dueDate) return 1;
                return 0;
              })
              .map((order) => {
                const overdue = isOrderOverdue(order);
                const sourceEnc = order.sourceEncounterId
                  ? (contact.encounters || []).find((e) => e.id === order.sourceEncounterId)
                  : null;
                return (
                  <div className="order-item" key={order.id}>
                    <span
                      className={`order-status-badge ${order.status}`}
                      onClick={() => onCycleOrderStatus(order.id)}
                      title="Click to advance status"
                    >
                      {order.status}
                    </span>
                    <div className="order-content">
                      <div className="order-description">{order.description}</div>
                      <div className="order-meta">
                        {order.dueDate && (
                          <span className={overdue ? "overdue" : ""}>
                            {overdue
                              ? `${daysOverdue(order.dueDate)}d overdue`
                              : `Due ${formatDate(order.dueDate)}`}
                          </span>
                        )}
                        {sourceEnc && (
                          <span className="source-link" onClick={() => {/* could scroll to encounter */}}>
                            from {formatDate(sourceEnc.date)} {sourceEnc.type.toLowerCase()}
                          </span>
                        )}
                        {order.tags?.length > 0 && order.tags.map((t) => (
                          <span key={t} className="tag-badge small">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="order-actions">
                      <button className="btn-order-action" onClick={() => { setEditingOrder(order); setOrderFromPlan(null); setShowOrderModal(true); }}>Edit</button>
                      <button className="btn-order-action danger" onClick={() => setShowDeleteOrder(order.id)}>Del</button>
                    </div>
                  </div>
                );
              })}
            {completedOrders.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: "12px", color: "var(--text-muted)", cursor: "pointer", padding: "4px 0" }}>
                  {completedOrders.length} closed order{completedOrders.length !== 1 ? "s" : ""}
                </summary>
                {completedOrders
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .map((order) => (
                    <div className="order-item" key={order.id}>
                      <span className={`order-status-badge ${order.status}`}>{order.status}</span>
                      <div className="order-content">
                        <div className="order-description done">{order.description}</div>
                        {order.completionNote && (
                          <div className="order-completion-note">{order.completionNote}</div>
                        )}
                      </div>
                      <div className="order-actions">
                        <button className="btn-order-action" onClick={() => { setEditingOrder(order); setOrderFromPlan(null); setShowOrderModal(true); }}>Edit</button>
                        <button className="btn-order-action danger" onClick={() => setShowDeleteOrder(order.id)}>Del</button>
                      </div>
                    </div>
                  ))}
              </details>
            )}
          </>
        )}
      </div>

      {/* Encounters */}
      <div className="encounters-section">
        <div className="section-title" style={{ padding: "0 4px", marginBottom: 16 }}>
          <span>Encounters ({sortedEncounters.length})</span>
        </div>
        {sortedEncounters.length === 0 ? (
          <div className="no-encounters">No encounters documented yet.</div>
        ) : (
          sortedEncounters.map((enc) => {
            const overdue = enc.followUpDate && !enc.followUpResolved && new Date(enc.followUpDate) < new Date();
            const pending = enc.followUpDate && !enc.followUpResolved && new Date(enc.followUpDate) >= new Date();
            return (
              <div className={`encounter-card ${overdue ? "has-overdue" : ""}`} key={enc.id}>
                <div className="encounter-header">
                  <span className="encounter-date">{formatDate(enc.date)}</span>
                  <div className="encounter-header-right">
                    {enc.tags?.length > 0 && enc.tags.map((t) => (
                      <span key={t} className="tag-badge">{t}</span>
                    ))}
                    <span className="encounter-type">{enc.type}</span>
                  </div>
                </div>
                {enc.narrative && (
                  <div className="encounter-field">
                    <div className="encounter-field-label">Narrative</div>
                    <div className="encounter-field-value">{enc.narrative}</div>
                  </div>
                )}
                {enc.assessment && (
                  <div className="encounter-field">
                    <div className="encounter-field-label">Assessment</div>
                    <div className="encounter-field-value">{enc.assessment}</div>
                  </div>
                )}
                {enc.plan && (
                  <div className="encounter-field">
                    <div className="encounter-field-label">Plan</div>
                    <div className="encounter-field-value">{enc.plan}</div>
                    <button
                      className="order-from-plan"
                      onClick={() => handleCreateOrderFromPlan(enc)}
                    >
                      + Order from this
                    </button>
                  </div>
                )}
                {enc.followUpDate && (
                  <div className={`encounter-followup ${overdue ? "overdue" : enc.followUpResolved ? "resolved" : "pending"}`}>
                    <div className="followup-header">
                      <span>
                        {enc.followUpResolved
                          ? `Follow-up resolved (was ${formatDate(enc.followUpDate)})`
                          : overdue
                          ? `Follow-up overdue: ${formatDate(enc.followUpDate)} (${daysOverdue(enc.followUpDate)}d ago)`
                          : `Follow-up: ${formatDate(enc.followUpDate)}`}
                      </span>
                      {!enc.followUpResolved ? (
                        <button className="btn-resolve" onClick={() => setShowResolveModal(enc.id)}>
                          Resolve
                        </button>
                      ) : (
                        <button className="btn-resolve" onClick={() => onUnresolveFollowUp(enc.id)}>
                          Unresolve
                        </button>
                      )}
                    </div>
                    {enc.followUpComment && (
                      <div className="followup-comment">{enc.followUpComment}</div>
                    )}
                  </div>
                )}
                <div className="encounter-actions">
                  <button className="btn-encounter-action" onClick={() => { setEditingEncounter(enc); setShowEncounterModal(true); }}>
                    Edit
                  </button>
                  <button className="btn-encounter-action danger" onClick={() => setShowDeleteEncounter(enc.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showEncounterModal && (
        <EncounterModal
          encounter={editingEncounter}
          onSave={handleSaveEncounter}
          onClose={() => { setShowEncounterModal(false); setEditingEncounter(null); }}
          allTags={allTags}
        />
      )}
      {showResolveModal && (
        <ResolveModal
          onResolve={(comment) => handleResolveFollowUp(showResolveModal, comment)}
          onClose={() => setShowResolveModal(null)}
        />
      )}
      {showProblemModal && <ProblemModal onSave={handleAddProblem} onClose={() => setShowProblemModal(false)} />}
      {showEditContact && (
        <ContactModal contact={contact} onSave={handleEditContactSave} onClose={() => setShowEditContact(false)} />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          message={`Delete "${contact.name}" and all their encounters? This cannot be undone.`}
          onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
      {showDeleteEncounter && (
        <ConfirmModal
          message="Delete this encounter? This cannot be undone."
          onConfirm={() => handleDeleteEncounter(showDeleteEncounter)}
          onClose={() => setShowDeleteEncounter(null)}
        />
      )}
      {showOrderModal && (
        <OrderModal
          order={editingOrder || (orderFromPlan ? { description: orderFromPlan.description, sourceEncounterId: orderFromPlan.sourceEncounterId } : null)}
          onSave={handleSaveOrder}
          onClose={() => { setShowOrderModal(false); setEditingOrder(null); setOrderFromPlan(null); }}
          allTags={allTags}
        />
      )}
      {showDeleteOrder && (
        <ConfirmModal
          message="Delete this order? This cannot be undone."
          onConfirm={() => handleDeleteOrder(showDeleteOrder)}
          onClose={() => setShowDeleteOrder(null)}
        />
      )}
      {showExport && (
        <ExportModal
          chartData={[contact]}
          onClose={() => setShowExport(false)}
          allTags={allTags}
        />
      )}
    </div>
  );
}
