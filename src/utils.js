export const API_URL = "/api/data";

export const ENCOUNTER_TYPES = ["Meeting", "Call", "Email", "Informal", "Presentation", "Note"];
export const ORDER_STATUSES = ["open", "in-progress", "completed", "cancelled"];

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// Parse "YYYY-MM-DD" as local midnight (not UTC).
// new Date("2026-03-15") gives UTC midnight, which is wrong for local comparisons.
const localDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Today at local midnight — for date-only comparisons.
const localToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const formatDate = (iso) => {
  if (!iso) return "";
  const d = localDate(iso);
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

export const isOverdue = (contact) => {
  if (!contact.encounters || contact.encounters.length === 0) return false;
  const today = localToday();
  return contact.encounters.some((e) => {
    if (!e.followUpDate) return false;
    return localDate(e.followUpDate) < today && !e.followUpResolved;
  });
};

export const getNextFollowUp = (contact) => {
  if (!contact.encounters) return null;
  const pending = contact.encounters
    .filter((e) => e.followUpDate && !e.followUpResolved)
    .sort((a, b) => localDate(a.followUpDate) - localDate(b.followUpDate));
  return pending.length > 0 ? pending[0] : null;
};

export const daysOverdue = (dateStr) => {
  const diff = localToday() - localDate(dateStr);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const getUpcomingFollowUps = (allContacts, days = 7) => {
  const today = localToday();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  const results = [];
  Object.values(allContacts).forEach((contact) => {
    (contact.encounters || []).forEach((enc) => {
      if (!enc.followUpDate || enc.followUpResolved) return;
      const fuDate = localDate(enc.followUpDate);
      if (fuDate >= today && fuDate <= cutoff) {
        results.push({ contact, encounter: enc, date: fuDate });
      }
    });
  });
  return results.sort((a, b) => a.date - b.date);
};

export const daysUntil = (dateStr) => {
  const diff = localDate(dateStr) - localToday();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const isOrderOverdue = (order) => {
  if (!order.dueDate || order.status === "completed" || order.status === "cancelled") return false;
  return localDate(order.dueDate) < localToday();
};

export const getOverdueOrders = (allContacts) => {
  const results = [];
  Object.values(allContacts).forEach((contact) => {
    (contact.orders || []).forEach((order) => {
      if (isOrderOverdue(order)) {
        results.push({ contact, order });
      }
    });
  });
  return results.sort((a, b) => localDate(a.order.dueDate) - localDate(b.order.dueDate));
};

export const getUpcomingOrders = (allContacts, days = 7) => {
  const today = localToday();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  const results = [];
  Object.values(allContacts).forEach((contact) => {
    (contact.orders || []).forEach((order) => {
      if (order.status === "completed" || order.status === "cancelled") return;
      if (!order.dueDate) return;
      const d = localDate(order.dueDate);
      if (d >= today && d <= cutoff) {
        results.push({ contact, order, date: d });
      }
    });
  });
  return results.sort((a, b) => a.date - b.date);
};

export const getActiveOrderCount = (contact) => {
  return (contact.orders || []).filter((o) => o.status === "open" || o.status === "in-progress").length;
};

export const contactHasOverdueOrders = (contact) => {
  return (contact.orders || []).some(isOrderOverdue);
};
