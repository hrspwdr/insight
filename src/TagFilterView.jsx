import { formatDate, isOrderOverdue, daysOverdue } from "./utils";

export default function TagFilterView({ tag, contacts, onSelectContact }) {
  // Gather all encounters and orders with this tag, grouped by contact
  const groups = [];

  for (const contact of Object.values(contacts)) {
    const matchingEnc = (contact.encounters || []).filter(
      (e) => e.tags?.includes(tag)
    );
    const matchingOrd = (contact.orders || []).filter(
      (o) => o.tags?.includes(tag)
    );

    if (matchingEnc.length > 0 || matchingOrd.length > 0) {
      groups.push({
        contact,
        encounters: matchingEnc.sort((a, b) => new Date(b.date) - new Date(a.date)),
        orders: matchingOrd,
      });
    }
  }

  groups.sort((a, b) => a.contact.name.localeCompare(b.contact.name));

  const totalEnc = groups.reduce((s, g) => s + g.encounters.length, 0);
  const totalOrd = groups.reduce((s, g) => s + g.orders.length, 0);

  return (
    <div className="search-view">
      <div className="search-view-header">
        <h2>
          <span className="tag-badge" style={{ fontSize: "16px", marginRight: 8 }}>{tag}</span>
          <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--text-muted)" }}>
            {totalEnc} encounter{totalEnc !== 1 ? "s" : ""}, {totalOrd} order{totalOrd !== 1 ? "s" : ""} across {groups.length} chart{groups.length !== 1 ? "s" : ""}
          </span>
        </h2>
      </div>

      {groups.length === 0 && (
        <div className="search-empty">No encounters or orders tagged "{tag}"</div>
      )}

      {groups.map(({ contact, encounters, orders }) => (
        <div key={contact.id} className="search-group">
          <div
            className="search-group-header"
            onClick={() => onSelectContact(contact.id)}
          >
            {contact.name}
            <span className="search-group-count">
              {encounters.length} enc. · {orders.length} ord.
            </span>
          </div>

          {orders.length > 0 && orders.map((order) => {
            const overdue = isOrderOverdue(order);
            return (
              <div
                key={order.id}
                className="search-result"
                onClick={() => onSelectContact(contact.id)}
              >
                <span className="search-result-type">Order</span>
                <span className="search-result-snippet">
                  <span className={`order-status-badge ${order.status}`} style={{ marginRight: 6 }}>
                    {order.status}
                  </span>
                  {order.description}
                  {order.dueDate && (
                    <span style={{ marginLeft: 6, fontSize: "11px", color: overdue ? "var(--red)" : "var(--text-muted)" }}>
                      {overdue ? `${daysOverdue(order.dueDate)}d overdue` : `due ${formatDate(order.dueDate)}`}
                    </span>
                  )}
                </span>
              </div>
            );
          })}

          {encounters.map((enc) => (
            <div
              key={enc.id}
              className="search-result"
              onClick={() => onSelectContact(contact.id)}
            >
              <span className="search-result-type">{enc.type}</span>
              <span className="search-result-snippet">
                {formatDate(enc.date)} — {enc.narrative || enc.assessment || enc.plan || "(no notes)"}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
