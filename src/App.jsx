import { useState, useEffect, useCallback } from "react";

const API_URL = "/api/data";

const CONTACT_CONTEXTS = ["MUHC/CCT", "Territorial", "Provincial", "Committee", "Community", "Personal"];
const ENCOUNTER_TYPES = ["Meeting", "Call", "Email", "Informal", "Presentation", "Note"];
const ORDER_STATUSES = ["open", "in-progress", "completed", "cancelled"];

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

const isOverdue = (contact) => {
  if (!contact.encounters || contact.encounters.length === 0) return false;
  return contact.encounters.some((e) => {
    if (!e.followUpDate) return false;
    return new Date(e.followUpDate) < new Date() && !e.followUpResolved;
  });
};

const getNextFollowUp = (contact) => {
  if (!contact.encounters) return null;
  const pending = contact.encounters
    .filter((e) => e.followUpDate && !e.followUpResolved)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
  return pending.length > 0 ? pending[0] : null;
};

const daysOverdue = (dateStr) => {
  const diff = new Date() - new Date(dateStr);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getUpcomingFollowUps = (allContacts, days = 7) => {
  const today = new Date(new Date().toISOString().split("T")[0]);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  const results = [];
  Object.values(allContacts).forEach((contact) => {
    (contact.encounters || []).forEach((enc) => {
      if (!enc.followUpDate || enc.followUpResolved) return;
      const fuDate = new Date(enc.followUpDate);
      if (fuDate >= today && fuDate <= cutoff) {
        results.push({ contact, encounter: enc, date: fuDate });
      }
    });
  });
  return results.sort((a, b) => a.date - b.date);
};

const daysUntil = (dateStr) => {
  const diff = new Date(dateStr) - new Date(new Date().toISOString().split("T")[0]);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const isOrderOverdue = (order) => {
  if (!order.dueDate || order.status === "completed" || order.status === "cancelled") return false;
  return new Date(order.dueDate) < new Date(new Date().toISOString().split("T")[0]);
};

const getOverdueOrders = (allContacts) => {
  const results = [];
  Object.values(allContacts).forEach((contact) => {
    (contact.orders || []).forEach((order) => {
      if (isOrderOverdue(order)) {
        results.push({ contact, order });
      }
    });
  });
  return results.sort((a, b) => new Date(a.order.dueDate) - new Date(b.order.dueDate));
};

const getUpcomingOrders = (allContacts, days = 7) => {
  const today = new Date(new Date().toISOString().split("T")[0]);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  const results = [];
  Object.values(allContacts).forEach((contact) => {
    (contact.orders || []).forEach((order) => {
      if (order.status === "completed" || order.status === "cancelled") return;
      if (!order.dueDate) return;
      const d = new Date(order.dueDate);
      if (d >= today && d <= cutoff) {
        results.push({ contact, order, date: d });
      }
    });
  });
  return results.sort((a, b) => a.date - b.date);
};

const getActiveOrderCount = (contact) => {
  return (contact.orders || []).filter((o) => o.status === "open" || o.status === "in-progress").length;
};

const contactHasOverdueOrders = (contact) => {
  return (contact.orders || []).some(isOrderOverdue);
};

// ─── Styles ───

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Charis+SIL:wght@400;700&family=Inter:wght@400;500;600&display=swap');

  :root {
    --bg-primary: #faf9f5;
    --bg-secondary: #F5F4EF;
    --bg-card: #ffffff;
    --text-primary: #141413;
    --text-secondary: #5c5c5a;
    --text-muted: #8c8c8a;
    --accent: #D97757;
    --accent-hover: #c4684a;
    --accent-light: #D9775715;
    --accent-medium: #D9775725;
    --border: #e5e4df;
    --border-light: #eeeee9;
    --green: #4a7c59;
    --green-light: #4a7c5915;
    --red: #c0392b;
    --red-light: #c0392b12;
    --yellow: #b8860b;
    --yellow-light: #b8860b12;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.5;
  }

  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ─── Sidebar ─── */
  .sidebar {
    width: 300px;
    min-width: 300px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .sidebar-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h1 {
    font-family: 'Charis SIL', serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  .sidebar-header .subtitle {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-style: italic;
  }

  .sidebar-search {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-light);
  }

  .sidebar-search input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    background: var(--bg-card);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s;
  }

  .sidebar-search input:focus { border-color: var(--accent); }

  .sidebar-filters {
    padding: 8px 16px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-light);
  }

  .filter-chip {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-chip:hover { border-color: var(--accent); color: var(--accent); }
  .filter-chip.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .contact-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .contact-item {
    padding: 10px 20px;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: all 0.1s;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .contact-item:hover { background: var(--border-light); }
  .contact-item.active {
    background: var(--accent-light);
    border-left-color: var(--accent);
  }

  .contact-item .overdue-dot {
    width: 8px; height: 8px; min-width: 8px;
    border-radius: 50%; background: var(--red); margin-top: 6px;
  }

  .contact-item .upcoming-dot {
    width: 8px; height: 8px; min-width: 8px;
    border-radius: 50%; background: var(--yellow); margin-top: 6px;
  }

  .contact-item .clear-dot {
    width: 8px; height: 8px; min-width: 8px;
    border-radius: 50%; background: var(--green); margin-top: 6px; opacity: 0.4;
  }

  .contact-item-info { flex: 1; min-width: 0; }
  .contact-item-name { font-weight: 500; font-size: 13.5px; color: var(--text-primary); }
  .contact-item-meta { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

  .sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
  }

  .btn-new-contact {
    width: 100%;
    padding: 9px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-new-contact:hover { background: var(--accent-hover); }

  /* ─── Main Content ─── */
  .main {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-primary);
  }

  .dashboard {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 32px;
  }

  .dashboard h2 {
    font-family: 'Charis SIL', serif;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .dashboard-subtitle {
    color: var(--text-muted);
    font-size: 14px;
    margin-bottom: 32px;
  }

  .dashboard-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 36px;
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px 20px;
  }

  .stat-card .stat-label {
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .stat-card .stat-value {
    font-family: 'Charis SIL', serif;
    font-size: 28px;
    font-weight: 600;
  }

  .stat-card.overdue .stat-value { color: var(--red); }

  .overdue-section { margin-top: 12px; }
  .overdue-section h3 {
    font-family: 'Charis SIL', serif;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--red);
  }

  .overdue-item {
    background: var(--red-light);
    border: 1px solid #c0392b20;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .overdue-item:hover { border-color: var(--red); }
  .overdue-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .overdue-item-name { font-weight: 600; font-size: 14px; }
  .overdue-item-days { font-size: 12px; color: var(--red); font-weight: 500; }
  .overdue-item-plan { font-size: 13px; color: var(--text-secondary); }

  .upcoming-section { margin-top: 28px; }
  .upcoming-section h3 { font-family: 'Charis SIL', serif; font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--yellow); }
  .upcoming-item { background: var(--yellow-light); border: 1px solid #b8860b20; border-radius: 8px; padding: 14px 18px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
  .upcoming-item:hover { border-color: var(--yellow); }
  .upcoming-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .upcoming-item-name { font-weight: 600; font-size: 14px; }
  .upcoming-item-days { font-size: 12px; color: var(--yellow); font-weight: 500; }
  .upcoming-item-plan { font-size: 13px; color: var(--text-secondary); }

  /* ─── Chart View ─── */
  .chart {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px;
  }

  .chart-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
  }

  .btn-back {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-back:hover { border-color: var(--accent); color: var(--accent); }

  .chart-header {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px 28px;
    margin-bottom: 20px;
  }

  .chart-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .chart-name {
    font-family: 'Charis SIL', serif;
    font-size: 22px;
    font-weight: 700;
  }

  .chart-context {
    display: inline-block;
    padding: 3px 10px;
    background: var(--accent-light);
    color: var(--accent);
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 500;
  }

  .chart-notes {
    color: var(--text-secondary);
    font-size: 13.5px;
    margin-top: 10px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .chart-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }

  .btn-chart-action {
    padding: 7px 16px;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
  }

  .btn-chart-action:hover { border-color: var(--accent); color: var(--accent); }
  .btn-chart-action.primary {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .btn-chart-action.primary:hover { background: var(--accent-hover); }
  .btn-chart-action.danger { color: var(--red); }
  .btn-chart-action.danger:hover { border-color: var(--red); }

  /* ─── Related Charts ─── */
  .related-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 24px;
    margin-bottom: 20px;
  }

  .related-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }

  .related-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 14px;
    font-size: 12.5px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .related-chip:hover { border-color: var(--accent); color: var(--accent); }

  .related-chip-remove {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    line-height: 1;
  }

  .related-chip-remove:hover { color: var(--red); }

  .related-chip-context {
    font-size: 10px;
    color: var(--text-muted);
  }

  /* ─── Link Picker ─── */
  .link-picker {
    margin-top: 8px;
    position: relative;
  }

  .link-picker input {
    width: 100%;
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    background: var(--bg-primary);
    color: var(--text-primary);
    outline: none;
  }

  .link-picker input:focus { border-color: var(--accent); }

  .link-picker-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-top: 4px;
    max-height: 160px;
    overflow-y: auto;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    z-index: 10;
  }

  .link-picker-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    transition: background 0.1s;
  }

  .link-picker-item:hover { background: var(--accent-light); }
  .link-picker-item-ctx { font-size: 11px; color: var(--text-muted); }

  /* ─── Problems List ─── */
  .problems-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px 24px;
    margin-bottom: 20px;
  }

  .section-title {
    font-family: 'Charis SIL', serif;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .btn-add-small {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.15s;
  }

  .btn-add-small:hover { border-color: var(--accent); color: var(--accent); }

  .problem-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-light);
    font-size: 13.5px;
  }

  .problem-item:last-child { border-bottom: none; }

  .problem-number {
    font-family: 'Charis SIL', serif;
    font-weight: 600;
    color: var(--text-muted);
    min-width: 20px;
    font-size: 13px;
  }

  .problem-text { flex: 1; color: var(--text-primary); }

  .problem-status {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
  }

  .problem-status.active { background: var(--accent-light); color: var(--accent); }
  .problem-status.resolved { background: var(--green-light); color: var(--green); }

  .problem-remove {
    background: none; border: none; color: var(--text-muted);
    cursor: pointer; font-size: 14px; padding: 0 4px;
    opacity: 0; transition: opacity 0.15s;
  }
  .problem-item:hover .problem-remove { opacity: 1; }
  .problem-remove:hover { color: var(--red); }

  /* ─── Encounters ─── */
  .encounters-section { margin-bottom: 20px; }

  .encounter-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px 24px;
    margin-bottom: 12px;
    position: relative;
  }

  .encounter-card::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 14px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--border);
  }

  .encounter-card.has-overdue::before { background: var(--red); }

  .encounter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .encounter-date {
    font-family: 'Charis SIL', serif;
    font-weight: 600;
    font-size: 14px;
  }

  .encounter-type {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 10px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .encounter-field { margin-bottom: 10px; }

  .encounter-field-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 3px;
  }

  .encounter-field-value {
    font-size: 13.5px;
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .encounter-followup {
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12.5px;
  }

  .encounter-followup.overdue { background: var(--red-light); color: var(--red); }
  .encounter-followup.pending { background: var(--yellow-light); color: var(--yellow); }
  .encounter-followup.resolved { background: var(--green-light); color: var(--green); }

  .followup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .followup-comment {
    margin-top: 6px;
    font-size: 12px;
    font-style: italic;
    opacity: 0.85;
  }

  .btn-resolve {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid currentColor;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }

  .btn-resolve:hover { opacity: 0.7; }

  .encounter-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    justify-content: flex-end;
  }

  .btn-encounter-action {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .encounter-card:hover .btn-encounter-action { opacity: 1; }
  .btn-encounter-action:hover { border-color: var(--accent); color: var(--accent); }
  .btn-encounter-action.danger:hover { border-color: var(--red); color: var(--red); }

  /* ─── Orders ─── */
  .orders-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px 24px;
    margin-bottom: 20px;
  }

  .order-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-light);
  }

  .order-item:last-child { border-bottom: none; }

  .order-status-badge {
    font-size: 10.5px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    min-width: 72px;
    text-align: center;
    margin-top: 2px;
  }

  .order-status-badge.open { background: var(--accent-light); color: var(--accent); }
  .order-status-badge.in-progress { background: var(--yellow-light); color: var(--yellow); }
  .order-status-badge.completed { background: var(--green-light); color: var(--green); }
  .order-status-badge.cancelled { background: var(--bg-secondary); color: var(--text-muted); text-decoration: line-through; }

  .order-content { flex: 1; min-width: 0; }
  .order-description { font-size: 13.5px; color: var(--text-primary); line-height: 1.5; }
  .order-description.done { text-decoration: line-through; color: var(--text-muted); }
  .order-meta { font-size: 11.5px; color: var(--text-muted); margin-top: 3px; display: flex; gap: 8px; align-items: center; }
  .order-meta .overdue { color: var(--red); font-weight: 500; }
  .order-meta .source-link { color: var(--accent); cursor: pointer; }
  .order-meta .source-link:hover { text-decoration: underline; }

  .order-completion-note {
    font-size: 12px;
    color: var(--text-secondary);
    font-style: italic;
    margin-top: 4px;
    padding-left: 12px;
    border-left: 2px solid var(--green-light);
  }

  .order-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .order-item:hover .order-actions { opacity: 1; }

  .btn-order-action {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: 'Inter', sans-serif;
  }

  .btn-order-action:hover { border-color: var(--accent); color: var(--accent); }
  .btn-order-action.danger:hover { border-color: var(--red); color: var(--red); }

  .order-from-plan {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    margin-top: 6px;
    transition: all 0.15s;
  }

  .order-from-plan:hover { border-color: var(--accent); color: var(--accent); }

  /* ─── Forms / Modals ─── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 28px 32px;
    width: 520px;
    max-width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }

  .modal h3 {
    font-family: 'Charis SIL', serif;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 20px;
  }

  .form-group { margin-bottom: 16px; }

  .form-group label {
    display: block;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    font-weight: 500;
    margin-bottom: 5px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    color: var(--text-primary);
    background: var(--bg-primary);
    outline: none;
    transition: border-color 0.15s;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus { border-color: var(--accent); }

  .form-group textarea {
    min-height: 80px;
    resize: vertical;
    line-height: 1.5;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
  }

  .btn-cancel {
    padding: 9px 20px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover { border-color: var(--text-muted); }

  .btn-save {
    padding: 9px 24px;
    border-radius: 6px;
    border: none;
    background: var(--accent);
    color: white;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-save:hover { background: var(--accent-hover); }

  /* ─── Empty State ─── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    padding: 48px;
    text-align: center;
  }

  .empty-state-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }

  .empty-state h3 {
    font-family: 'Charis SIL', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .empty-state p { font-size: 13.5px; max-width: 300px; line-height: 1.6; }

  .no-encounters {
    text-align: center;
    padding: 32px;
    color: var(--text-muted);
    font-size: 13.5px;
  }

  .confirm-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
  .btn-danger {
    padding: 9px 24px;
    border-radius: 6px;
    border: none;
    background: var(--red);
    color: white;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: 'Charis SIL', serif;
    color: var(--text-muted);
    font-size: 16px;
  }
`;

// ─── Modal Components ───

function ContactModal({ contact, onSave, onClose }) {
  const [name, setName] = useState(contact?.name || "");
  const [context, setContext] = useState(contact?.context || CONTACT_CONTEXTS[0]);
  const [notes, setNotes] = useState(contact?.notes || "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: contact?.id || generateId(),
      name: name.trim(),
      context,
      notes: notes.trim(),
      activeProblems: contact?.activeProblems || [],
      encounters: contact?.encounters || [],
      relatedCharts: contact?.relatedCharts || [],
      createdAt: contact?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{contact ? "Edit Chart" : "New Chart"}</h3>
        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Person or group name" autoFocus />
        </div>
        <div className="form-group">
          <label>Context</label>
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            {CONTACT_CONTEXTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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

function EncounterModal({ encounter, onSave, onClose }) {
  const [date, setDate] = useState(encounter?.date || new Date().toISOString().split("T")[0]);
  const [type, setType] = useState(encounter?.type || ENCOUNTER_TYPES[0]);
  const [narrative, setNarrative] = useState(encounter?.narrative || "");
  const [assessment, setAssessment] = useState(encounter?.assessment || "");
  const [plan, setPlan] = useState(encounter?.plan || "");
  const [followUpDate, setFollowUpDate] = useState(encounter?.followUpDate || "");

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
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ResolveModal({ onResolve, onClose }) {
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

function ProblemModal({ onSave, onClose }) {
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

function OrderModal({ order, onSave, onClose }) {
  const [description, setDescription] = useState(order?.description || "");
  const [dueDate, setDueDate] = useState(order?.dueDate || "");
  const [status, setStatus] = useState(order?.status || "open");
  const [completionNote, setCompletionNote] = useState(order?.completionNote || "");

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
        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
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

// ─── Related Charts Picker ───

function RelatedChartsPicker({ contacts, currentId, relatedIds, onLink, onUnlink }) {
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

// ─── Chart View ───

function ChartView({ contact, contacts, onUpdate, onUpdateOther, onBack, onDelete, onNavigate }) {
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

  const sortedEncounters = [...(contact.encounters || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const handleSaveEncounter = (enc) => {
    const existing = contact.encounters || [];
    const idx = existing.findIndex((e) => e.id === enc.id);
    const updated = idx >= 0
      ? existing.map((e) => (e.id === enc.id ? enc : e))
      : [...existing, enc];
    onUpdate({ ...contact, encounters: updated });
    setShowEncounterModal(false);
    setEditingEncounter(null);
  };

  const handleDeleteEncounter = (encId) => {
    const updated = contact.encounters.filter((e) => e.id !== encId);
    onUpdate({ ...contact, encounters: updated });
    setShowDeleteEncounter(null);
  };

  const handleResolveFollowUp = (encId, comment) => {
    const updated = contact.encounters.map((e) =>
      e.id === encId ? { ...e, followUpResolved: true, followUpComment: comment } : e
    );
    onUpdate({ ...contact, encounters: updated });
    setShowResolveModal(null);
  };

  const handleUnresolveFollowUp = (encId) => {
    const updated = contact.encounters.map((e) =>
      e.id === encId ? { ...e, followUpResolved: false, followUpComment: null } : e
    );
    onUpdate({ ...contact, encounters: updated });
  };

  const handleAddProblem = (text) => {
    const problems = [...(contact.activeProblems || []), { id: generateId(), text, status: "active" }];
    onUpdate({ ...contact, activeProblems: problems });
    setShowProblemModal(false);
  };

  const handleToggleProblem = (probId) => {
    const problems = contact.activeProblems.map((p) =>
      p.id === probId ? { ...p, status: p.status === "active" ? "resolved" : "active" } : p
    );
    onUpdate({ ...contact, activeProblems: problems });
  };

  const handleRemoveProblem = (probId) => {
    const problems = contact.activeProblems.filter((p) => p.id !== probId);
    onUpdate({ ...contact, activeProblems: problems });
  };

  // ─── Order handlers ───
  const handleSaveOrder = (order) => {
    const existing = contact.orders || [];
    const idx = existing.findIndex((o) => o.id === order.id);
    const updated = idx >= 0
      ? existing.map((o) => (o.id === order.id ? order : o))
      : [...existing, order];
    onUpdate({ ...contact, orders: updated });
    setShowOrderModal(false);
    setEditingOrder(null);
    setOrderFromPlan(null);
  };

  const handleDeleteOrder = (orderId) => {
    const updated = (contact.orders || []).filter((o) => o.id !== orderId);
    onUpdate({ ...contact, orders: updated });
    setShowDeleteOrder(null);
  };

  const handleCycleOrderStatus = (orderId) => {
    const cycle = { "open": "in-progress", "in-progress": "completed", "completed": "open", "cancelled": "open" };
    const updated = (contact.orders || []).map((o) =>
      o.id === orderId ? { ...o, status: cycle[o.status] || "open" } : o
    );
    onUpdate({ ...contact, orders: updated });
  };

  const handleCreateOrderFromPlan = (enc) => {
    setOrderFromPlan({ description: enc.plan, sourceEncounterId: enc.id });
    setEditingOrder(null);
    setShowOrderModal(true);
  };

  const activeOrders = (contact.orders || []).filter((o) => o.status === "open" || o.status === "in-progress");
  const completedOrders = (contact.orders || []).filter((o) => o.status === "completed" || o.status === "cancelled");

  const handleEditContact = (updated) => {
    onUpdate(updated);
    setShowEditContact(false);
  };

  // Bidirectional linking
  const handleLinkChart = (targetId) => {
    // Add to current chart
    const currentRelated = [...(contact.relatedCharts || [])];
    if (!currentRelated.includes(targetId)) {
      currentRelated.push(targetId);
      onUpdate({ ...contact, relatedCharts: currentRelated });
    }
    // Add reciprocal link
    const target = contacts[targetId];
    if (target) {
      const targetRelated = [...(target.relatedCharts || [])];
      if (!targetRelated.includes(contact.id)) {
        targetRelated.push(contact.id);
        onUpdateOther({ ...target, relatedCharts: targetRelated });
      }
    }
  };

  const handleUnlinkChart = (targetId) => {
    // Remove from current
    const currentRelated = (contact.relatedCharts || []).filter((id) => id !== targetId);
    onUpdate({ ...contact, relatedCharts: currentRelated });
    // Remove reciprocal
    const target = contacts[targetId];
    if (target) {
      const targetRelated = (target.relatedCharts || []).filter((id) => id !== contact.id);
      onUpdateOther({ ...target, relatedCharts: targetRelated });
    }
  };

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
          <button className="btn-chart-action danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
        </div>
      </div>

      {/* Related Charts */}
      <RelatedChartsPicker
        contacts={contacts}
        currentId={contact.id}
        relatedIds={contact.relatedCharts || []}
        onLink={(targetId) => {
          // If clicking an existing related chip, navigate to it
          if ((contact.relatedCharts || []).includes(targetId)) {
            onNavigate(targetId);
          } else {
            handleLinkChart(targetId);
          }
        }}
        onUnlink={handleUnlinkChart}
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
                onClick={() => handleToggleProblem(p.id)}
              >
                {p.status}
              </span>
              <button className="problem-remove" onClick={() => handleRemoveProblem(p.id)}>×</button>
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
                // Overdue first, then by due date, then no date last
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
                      onClick={() => handleCycleOrderStatus(order.id)}
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
                  <span className="encounter-type">{enc.type}</span>
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
                        <button className="btn-resolve" onClick={() => handleUnresolveFollowUp(enc.id)}>
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
        <ContactModal contact={contact} onSave={handleEditContact} onClose={() => setShowEditContact(false)} />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          message={`Delete "${contact.name}" and all their encounters? This cannot be undone.`}
          onConfirm={() => { onDelete(contact.id); setShowDeleteConfirm(false); }}
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
        />
      )}
      {showDeleteOrder && (
        <ConfirmModal
          message="Delete this order? This cannot be undone."
          onConfirm={() => handleDeleteOrder(showDeleteOrder)}
          onClose={() => setShowDeleteOrder(null)}
        />
      )}
    </div>
  );
}

// ─── Main App ───

export default function App() {
  const [contacts, setContacts] = useState({});
  const [activeContactId, setActiveContactId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterContext, setFilterContext] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // For bidirectional linking — updates another contact without switching view
  const handleUpdateOtherContact = (contact) => {
    setContacts((prev) => {
      const updated = { ...prev, [contact.id]: contact };
      save(updated);
      return updated;
    });
  };

  const handleDeleteContact = (id) => {
    const updated = { ...contacts };
    // Clean up reciprocal links
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

  const overdueContacts = Object.values(contacts).filter(isOverdue);
  const upcomingFollowUps = getUpcomingFollowUps(contacts, 7);
  const totalEncounters = Object.values(contacts).reduce((sum, c) => sum + (c.encounters?.length || 0), 0);
  const usedContexts = [...new Set(Object.values(contacts).map((c) => c.context))];
  const overdueOrders = getOverdueOrders(contacts);
  const upcomingOrders = getUpcomingOrders(contacts, 7);
  const totalActiveOrders = Object.values(contacts).reduce((sum, c) => sum + getActiveOrderCount(c), 0);

  if (loading) return <div className="loading">Loading chart data...</div>;

  const activeContact = activeContactId ? contacts[activeContactId] : null;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="sidebar">
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
                    onClick={() => setActiveContactId(c.id)}
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
          {activeContact ? (
            <ChartView
              contact={activeContact}
              contacts={contacts}
              onUpdate={handleUpdateContact}
              onUpdateOther={handleUpdateOtherContact}
              onBack={() => setActiveContactId(null)}
              onDelete={handleDeleteContact}
              onNavigate={(id) => setActiveContactId(id)}
            />
          ) : (
            <div className="dashboard">
              <h2>Dashboard</h2>
              <div className="dashboard-subtitle">
                {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
              <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card">
                  <div className="stat-label">Charts</div>
                  <div className="stat-value">{Object.keys(contacts).length}</div>
                </div>
                <div className={`stat-card ${overdueContacts.length + overdueOrders.length > 0 ? "overdue" : ""}`}>
                  <div className="stat-label">Overdue</div>
                  <div className="stat-value">{overdueContacts.length + overdueOrders.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active Orders</div>
                  <div className="stat-value">{totalActiveOrders}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Encounters</div>
                  <div className="stat-value">{totalEncounters}</div>
                </div>
              </div>

              {overdueContacts.length > 0 && (
                <div className="overdue-section">
                  <h3>Overdue Follow-ups</h3>
                  {overdueContacts.map((c) => {
                    const fu = getNextFollowUp(c);
                    return (
                      <div key={c.id} className="overdue-item" onClick={() => setActiveContactId(c.id)}>
                        <div className="overdue-item-header">
                          <span className="overdue-item-name">{c.name}</span>
                          <span className="overdue-item-days">{daysOverdue(fu.followUpDate)}d overdue</span>
                        </div>
                        {fu.plan && <div className="overdue-item-plan">{fu.plan}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {upcomingFollowUps.length > 0 && (
                <div className="upcoming-section">
                  <h3>Attention Required</h3>
                  {upcomingFollowUps.map(({ contact: c, encounter: enc }) => {
                    const days = daysUntil(enc.followUpDate);
                    const label = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`;
                    return (
                      <div key={enc.id} className="upcoming-item" onClick={() => setActiveContactId(c.id)}>
                        <div className="upcoming-item-header">
                          <span className="upcoming-item-name">{c.name}</span>
                          <span className="upcoming-item-days">{formatDate(enc.followUpDate)} ({label})</span>
                        </div>
                        {enc.plan && <div className="upcoming-item-plan">{enc.plan}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {overdueOrders.length > 0 && (
                <div className="overdue-section">
                  <h3>Overdue Orders</h3>
                  {overdueOrders.map(({ contact: c, order }) => (
                    <div key={order.id} className="overdue-item" onClick={() => setActiveContactId(c.id)}>
                      <div className="overdue-item-header">
                        <span className="overdue-item-name">{c.name}</span>
                        <span className="overdue-item-days">{daysOverdue(order.dueDate)}d overdue</span>
                      </div>
                      <div className="overdue-item-plan">{order.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {upcomingOrders.length > 0 && (
                <div className="upcoming-section">
                  <h3>Orders Due Soon</h3>
                  {upcomingOrders.map(({ contact: c, order }) => {
                    const days = daysUntil(order.dueDate);
                    const label = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`;
                    return (
                      <div key={order.id} className="upcoming-item" onClick={() => setActiveContactId(c.id)}>
                        <div className="upcoming-item-header">
                          <span className="upcoming-item-name">{c.name}</span>
                          <span className="upcoming-item-days">{formatDate(order.dueDate)} ({label})</span>
                        </div>
                        <div className="upcoming-item-plan">{order.description}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {Object.keys(contacts).length === 0 && (
                <div className="empty-state" style={{ marginTop: 40 }}>
                  <div className="empty-state-icon">&#x1F4CB;</div>
                  <h3>No charts yet</h3>
                  <p>Create your first chart to start documenting your relationships and encounters.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showContactModal && (
        <ContactModal onSave={handleSaveContact} onClose={() => setShowContactModal(false)} />
      )}
    </>
  );
}
