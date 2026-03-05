import { formatDate, isOrderOverdue, daysOverdue, daysUntil, ENCOUNTER_TYPES } from "./utils";

// ─── Filter helpers ───

export function filterEncounters(encounters, config) {
  if (!encounters) return [];
  let filtered = [...encounters];

  if (config.dateFrom) {
    filtered = filtered.filter((e) => e.date >= config.dateFrom);
  }
  if (config.dateTo) {
    filtered = filtered.filter((e) => e.date <= config.dateTo);
  }
  if (config.encounterTypes && config.encounterTypes.length > 0) {
    filtered = filtered.filter((e) => config.encounterTypes.includes(e.type));
  }
  if (config.filterTags && config.filterTags.length > 0) {
    filtered = filtered.filter((e) =>
      e.tags?.some((t) => config.filterTags.includes(t))
    );
  }

  return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function filterOrders(orders, config) {
  if (!orders) return [];
  if (config.ordersMode === "none") return [];
  let filtered = config.ordersMode === "active"
    ? orders.filter((o) => o.status === "open" || o.status === "in-progress")
    : [...orders];

  if (config.filterTags && config.filterTags.length > 0) {
    filtered = filtered.filter((o) =>
      o.tags?.some((t) => config.filterTags.includes(t))
    );
  }

  return filtered;
}

// ─── Preset configs ───

export function getPresetConfig(preset) {
  const today = new Date().toISOString().split("T")[0];

  if (preset === "meeting-prep") {
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    return {
      dateFrom: thirtyAgo.toISOString().split("T")[0],
      dateTo: "",
      encounterTypes: [],
      filterTags: [],
      includeSections: { background: true, problems: true, orders: true, encounters: true, followUps: true },
      ordersMode: "active",
    };
  }

  if (preset === "weekly-digest") {
    const sevenAhead = new Date();
    sevenAhead.setDate(sevenAhead.getDate() + 7);
    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 7);
    return {
      dateFrom: sevenAgo.toISOString().split("T")[0],
      dateTo: sevenAhead.toISOString().split("T")[0],
      encounterTypes: [],
      filterTags: [],
      includeSections: { background: true, problems: true, orders: true, encounters: true, followUps: true },
      ordersMode: "active",
    };
  }

  if (preset === "full") {
    return {
      dateFrom: "",
      dateTo: "",
      encounterTypes: [],
      filterTags: [],
      includeSections: { background: true, problems: true, orders: true, encounters: true, followUps: true },
      ordersMode: "all",
    };
  }

  // custom — same as full but user edits
  return {
    dateFrom: "",
    dateTo: "",
    encounterTypes: [],
    filterTags: [],
    includeSections: { background: true, problems: true, orders: true, encounters: true, followUps: true },
    ordersMode: "active",
  };
}

// ─── Markdown generation ───

function chartToMarkdown(contact, config) {
  const lines = [];
  lines.push(`## ${contact.name}`);
  lines.push(`**Context:** ${contact.context}`);

  if (config.includeSections.background && contact.notes) {
    lines.push("");
    lines.push(`**Background:** ${contact.notes}`);
  }

  // Active problems
  if (config.includeSections.problems && contact.activeProblems?.length > 0) {
    const active = contact.activeProblems.filter((p) => p.status === "active");
    if (active.length > 0) {
      lines.push("");
      lines.push("### Active Problems");
      active.forEach((p, i) => lines.push(`${i + 1}. ${p.text}`));
    }
  }

  // Orders
  if (config.includeSections.orders) {
    const orders = filterOrders(contact.orders, config);
    if (orders.length > 0) {
      lines.push("");
      lines.push("### Orders");
      orders.forEach((o) => {
        const overdue = isOrderOverdue(o);
        const dueStr = o.dueDate
          ? overdue
            ? ` — **${daysOverdue(o.dueDate)}d overdue**`
            : ` — due ${formatDate(o.dueDate)}`
          : "";
        const tagStr = o.tags?.length > 0 ? ` [${o.tags.join(", ")}]` : "";
        lines.push(`- [${o.status}] ${o.description}${dueStr}${tagStr}`);
        if (o.completionNote) lines.push(`  - _${o.completionNote}_`);
      });
    }
  }

  // Follow-ups (pending)
  if (config.includeSections.followUps) {
    const pending = (contact.encounters || []).filter(
      (e) => e.followUpDate && !e.followUpResolved
    );
    if (pending.length > 0) {
      lines.push("");
      lines.push("### Pending Follow-ups");
      pending
        .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
        .forEach((e) => {
          const overdue = new Date(e.followUpDate) < new Date();
          const label = overdue
            ? `**OVERDUE** (${formatDate(e.followUpDate)}, ${daysOverdue(e.followUpDate)}d ago)`
            : `${formatDate(e.followUpDate)} (${daysUntil(e.followUpDate)}d)`;
          lines.push(`- ${label}: ${e.plan || e.narrative || e.type}`);
        });
    }
  }

  // Encounters
  if (config.includeSections.encounters) {
    const encounters = filterEncounters(contact.encounters, config);
    if (encounters.length > 0) {
      lines.push("");
      lines.push("### Encounters");
      encounters.forEach((e) => {
        lines.push("");
        const tagStr = e.tags?.length > 0 ? ` [${e.tags.join(", ")}]` : "";
        lines.push(`**${formatDate(e.date)}** — ${e.type}${tagStr}`);
        if (e.narrative) lines.push(`\n${e.narrative}`);
        if (e.assessment) lines.push(`\n*Assessment:* ${e.assessment}`);
        if (e.plan) lines.push(`\n*Plan:* ${e.plan}`);
        if (e.followUpDate) {
          const resolved = e.followUpResolved ? " (resolved)" : "";
          lines.push(`\n*Follow-up:* ${formatDate(e.followUpDate)}${resolved}`);
          if (e.followUpComment) lines.push(`*Resolution:* ${e.followUpComment}`);
        }
      });
    }
  }

  return lines.join("\n");
}

export function generateMarkdown(chartData, config, isDigest = false) {
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const lines = [];

  if (isDigest) {
    lines.push("# Insight — Weekly Digest for Claude");
    lines.push(`*Generated ${today}*`);
    lines.push("");
    lines.push("This is a structured export from Insight (Patrick's relationship/meeting tracker). Use it to understand current context, upcoming commitments, and outstanding work.");
  } else if (chartData.length === 1) {
    lines.push(`# ${chartData[0].name} — Insight Export`);
    lines.push(`*Generated ${today}*`);
  } else {
    lines.push("# Insight Export");
    lines.push(`*Generated ${today} — ${chartData.length} charts*`);
  }

  lines.push("");
  lines.push("---");

  chartData.forEach((contact) => {
    lines.push("");
    lines.push(chartToMarkdown(contact, config));
    lines.push("");
    lines.push("---");
  });

  return lines.join("\n");
}

// ─── Print HTML generation ───

function escHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

function chartToHtml(contact, config) {
  let html = `<div class="chart-export">`;
  html += `<h2>${escHtml(contact.name)}</h2>`;
  html += `<div class="meta">${escHtml(contact.context)}</div>`;

  if (config.includeSections.background && contact.notes) {
    html += `<div class="background"><strong>Background:</strong> ${escHtml(contact.notes)}</div>`;
  }

  if (config.includeSections.problems && contact.activeProblems?.length > 0) {
    const active = contact.activeProblems.filter((p) => p.status === "active");
    if (active.length > 0) {
      html += `<h3>Active Problems</h3><ol>`;
      active.forEach((p) => { html += `<li>${escHtml(p.text)}</li>`; });
      html += `</ol>`;
    }
  }

  if (config.includeSections.orders) {
    const orders = filterOrders(contact.orders, config);
    if (orders.length > 0) {
      html += `<h3>Orders</h3><ul>`;
      orders.forEach((o) => {
        const overdue = isOrderOverdue(o);
        const dueStr = o.dueDate
          ? overdue
            ? ` — <span class="overdue">${daysOverdue(o.dueDate)}d overdue</span>`
            : ` — due ${formatDate(o.dueDate)}`
          : "";
        html += `<li><span class="status-badge ${o.status}">${o.status}</span> ${escHtml(o.description)}${dueStr}</li>`;
      });
      html += `</ul>`;
    }
  }

  if (config.includeSections.followUps) {
    const pending = (contact.encounters || []).filter(
      (e) => e.followUpDate && !e.followUpResolved
    );
    if (pending.length > 0) {
      html += `<h3>Pending Follow-ups</h3><ul>`;
      pending
        .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
        .forEach((e) => {
          const overdue = new Date(e.followUpDate) < new Date();
          const label = overdue
            ? `<span class="overdue">OVERDUE (${formatDate(e.followUpDate)})</span>`
            : `${formatDate(e.followUpDate)}`;
          html += `<li>${label}: ${escHtml(e.plan || e.narrative || e.type)}</li>`;
        });
      html += `</ul>`;
    }
  }

  if (config.includeSections.encounters) {
    const encounters = filterEncounters(contact.encounters, config);
    if (encounters.length > 0) {
      html += `<h3>Encounters</h3>`;
      encounters.forEach((e) => {
        html += `<div class="encounter">`;
        html += `<div class="enc-header"><strong>${formatDate(e.date)}</strong> — ${escHtml(e.type)}</div>`;
        if (e.narrative) html += `<div class="enc-field"><span class="enc-label">Narrative:</span> ${escHtml(e.narrative)}</div>`;
        if (e.assessment) html += `<div class="enc-field"><span class="enc-label">Assessment:</span> ${escHtml(e.assessment)}</div>`;
        if (e.plan) html += `<div class="enc-field"><span class="enc-label">Plan:</span> ${escHtml(e.plan)}</div>`;
        if (e.followUpDate) {
          const resolved = e.followUpResolved ? " (resolved)" : "";
          html += `<div class="enc-field"><span class="enc-label">Follow-up:</span> ${formatDate(e.followUpDate)}${resolved}</div>`;
        }
        html += `</div>`;
      });
    }
  }

  html += `</div>`;
  return html;
}

export function generatePrintHtml(chartData, config) {
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const title = chartData.length === 1
    ? `${chartData[0].name} — Insight Export`
    : `Insight Export — ${chartData.length} Charts`;

  let body = chartData.map((c) => chartToHtml(c, config)).join('<hr class="page-break">');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Charis+SIL:wght@400;700&family=Inter:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #141413; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-family: 'Charis SIL', serif; font-size: 22px; margin-bottom: 4px; }
  h2 { font-family: 'Charis SIL', serif; font-size: 18px; margin-bottom: 4px; color: #D97757; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #8c8c8a; margin: 16px 0 8px; font-weight: 600; }
  .subtitle { font-size: 12px; color: #8c8c8a; margin-bottom: 24px; }
  .meta { font-size: 13px; color: #5c5c5a; margin-bottom: 8px; }
  .background { font-size: 13px; color: #5c5c5a; margin-bottom: 12px; padding: 10px 12px; background: #faf9f5; border-radius: 6px; }
  ol, ul { margin-left: 20px; font-size: 13px; }
  li { margin-bottom: 4px; }
  .status-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
  .status-badge.open { background: #D9775720; color: #D97757; }
  .status-badge.in-progress { background: #b8860b20; color: #b8860b; }
  .status-badge.completed { background: #4a7c5920; color: #4a7c59; }
  .status-badge.cancelled { background: #8c8c8a20; color: #8c8c8a; }
  .overdue { color: #c0392b; font-weight: 600; }
  .encounter { margin-bottom: 14px; padding: 12px; border: 1px solid #e5e4df; border-radius: 8px; }
  .enc-header { font-size: 13px; margin-bottom: 6px; }
  .enc-field { font-size: 12.5px; color: #5c5c5a; margin-top: 4px; }
  .enc-label { font-weight: 600; color: #8c8c8a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  hr { border: none; border-top: 1px solid #e5e4df; margin: 28px 0; }
  .chart-export { margin-bottom: 8px; }
  @media print {
    body { padding: 20px; }
    .page-break { page-break-before: always; border: none; margin: 0; }
    .encounter { break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="subtitle">${today}</div>
<hr>
${body}
<script>window.onload = () => window.print();</script>
</body>
</html>`;
}

// ─── Download helpers ───

export function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openPrintHtml(html) {
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}
