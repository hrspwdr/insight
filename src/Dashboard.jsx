import { useState } from "react";
import {
  formatDate, isOverdue, getNextFollowUp, daysOverdue, daysUntil,
  getUpcomingFollowUps, getOverdueOrders, getUpcomingOrders, getActiveOrderCount
} from "./utils";
import ExportModal from "./ExportModal";

export default function Dashboard({ contacts, onSelectContact, allTags = [] }) {
  const [showExport, setShowExport] = useState(false);
  const overdueContacts = Object.values(contacts).filter(isOverdue);
  const upcomingFollowUps = getUpcomingFollowUps(contacts, 7);
  const totalEncounters = Object.values(contacts).reduce((sum, c) => sum + (c.encounters?.length || 0), 0);
  const overdueOrders = getOverdueOrders(contacts);
  const upcomingOrders = getUpcomingOrders(contacts, 7);
  const totalActiveOrders = Object.values(contacts).reduce((sum, c) => sum + getActiveOrderCount(c), 0);

  return (
    <div className="dashboard">
      <div className="dashboard-header-row">
        <h2>Dashboard</h2>
        {Object.keys(contacts).length > 0 && (
          <button className="btn-chart-action" onClick={() => setShowExport(true)}>
            Export Digest
          </button>
        )}
      </div>
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
              <div key={c.id} className="overdue-item" onClick={() => onSelectContact(c.id)}>
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
              <div key={enc.id} className="upcoming-item" onClick={() => onSelectContact(c.id)}>
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
            <div key={order.id} className="overdue-item" onClick={() => onSelectContact(c.id)}>
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
              <div key={order.id} className="upcoming-item" onClick={() => onSelectContact(c.id)}>
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

      {showExport && (
        <ExportModal
          chartData={Object.values(contacts)}
          onClose={() => setShowExport(false)}
          isMulti
          allTags={allTags}
        />
      )}
    </div>
  );
}
