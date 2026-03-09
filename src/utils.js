export const API_URL = "/api/data";

export const ENCOUNTER_TYPES = ["Meeting", "Call", "Email", "Informal", "Presentation", "Note"];
export const ORDER_STATUSES = ["open", "in-progress", "completed", "cancelled"];

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

export const isOverdue = (contact) => {
  if (!contact.encounters || contact.encounters.length === 0) return false;
  return contact.encounters.some((e) => {
    if (!e.followUpDate) return false;
    return new Date(e.followUpDate) < new Date() && !e.followUpResolved;
  });
};

export const getNextFollowUp = (contact) => {
  if (!contact.encounters) return null;
  const pending = contact.encounters
    .filter((e) => e.followUpDate && !e.followUpResolved)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
  return pending.length > 0 ? pending[0] : null;
};

export const daysOverdue = (dateStr) => {
  const diff = new Date() - new Date(dateStr);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const getUpcomingFollowUps = (allContacts, days = 7) => {
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

export const daysUntil = (dateStr) => {
  const diff = new Date(dateStr) - new Date(new Date().toISOString().split("T")[0]);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const isOrderOverdue = (order) => {
  if (!order.dueDate || order.status === "completed" || order.status === "cancelled") return false;
  return new Date(order.dueDate) < new Date(new Date().toISOString().split("T")[0]);
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
  return results.sort((a, b) => new Date(a.order.dueDate) - new Date(b.order.dueDate));
};

export const getUpcomingOrders = (allContacts, days = 7) => {
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

export const getActiveOrderCount = (contact) => {
  return (contact.orders || []).filter((o) => o.status === "open" || o.status === "in-progress").length;
};

export const contactHasOverdueOrders = (contact) => {
  return (contact.orders || []).some(isOrderOverdue);
};
