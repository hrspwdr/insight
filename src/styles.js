const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Charis+SIL:wght@400;700&family=Inter:wght@400;500;600&display=swap');

  :root {
    --bg-primary: #faf9f5;
    --bg-secondary: #F5F4EF;
    --bg-card: #ffffff;
    --text-primary: #141413;
    --text-secondary: #5c5c5a;
    --text-muted: #8c8c8a;
    --accent: #f6f6f6;
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
    height: 100dvh;
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
    flex-shrink: 0;
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

  /* ─── Quick Capture ─── */
  .quick-capture-modal { width: 440px; }

  .quick-capture-selected {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 13.5px;
  }

  .quick-capture-ctx {
    font-size: 11px;
    color: var(--text-muted);
  }

  .quick-capture-change {
    margin-left: auto;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: 'Inter', sans-serif;
  }

  .quick-capture-change:hover { border-color: var(--accent); color: var(--accent); }

  .quick-capture-picker { position: relative; }

  .btn-quick-capture {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    border: none;
    font-size: 22px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(217, 119, 87, 0.35);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.15s;
    line-height: 1;
  }

  .btn-quick-capture:hover { background: var(--accent-hover); transform: scale(1.05); }

  /* ─── Mobile / Responsive ─── */
  @media (max-width: 768px) {
    .app {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      min-width: 100%;
      height: 100vh;
      height: 100dvh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 20;
      transition: transform 0.25s ease;
    }

    .sidebar-footer {
      padding: 12px 16px;
      padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    .sidebar.hidden {
      transform: translateX(-100%);
    }

    .main {
      width: 100%;
      min-height: 100vh;
    }

    .dashboard {
      padding: 24px 16px;
    }

    .dashboard-stats {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px;
    }

    .stat-card {
      padding: 14px 16px;
    }

    .stat-card .stat-value {
      font-size: 22px;
    }

    .chart {
      padding: 16px;
    }

    .chart-header {
      padding: 18px 16px;
    }

    .chart-name {
      font-size: 19px;
    }

    .chart-actions {
      flex-wrap: wrap;
    }

    .problems-section,
    .orders-section,
    .related-section {
      padding: 16px;
    }

    .encounter-card {
      padding: 16px;
    }

    .encounter-actions {
      opacity: 1;
    }

    .btn-encounter-action {
      opacity: 1;
    }

    .order-actions {
      opacity: 1;
    }

    .problem-remove {
      opacity: 1;
    }

    .modal {
      width: 95vw;
      max-width: 95vw;
      padding: 20px;
      max-height: 90vh;
    }

    .quick-capture-modal {
      width: 95vw;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .overdue-item,
    .upcoming-item {
      padding: 12px 14px;
    }

    .btn-quick-capture {
      bottom: 20px;
      right: 20px;
    }

    .mobile-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }

    .mobile-header h1 {
      font-family: 'Charis SIL', serif;
      font-size: 18px;
      font-weight: 700;
      flex: 1;
    }

    .mobile-header .subtitle {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-style: italic;
    }

    .btn-mobile-menu {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-mobile-menu:hover { border-color: var(--accent); color: var(--accent); }

    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 15;
    }
  }

  @media (min-width: 769px) {
    .mobile-header { display: none; }
    .sidebar-overlay { display: none; }
  }

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

  /* ─── Global Search ─── */
  .global-search-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 12px 20px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .global-search-input {
    flex: 1;
    padding: 9px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    color: var(--text-primary);
    background: var(--bg-card);
    outline: none;
    transition: border-color 0.15s;
  }

  .global-search-input:focus { border-color: var(--accent); }

  .global-search-input::placeholder { color: var(--text-muted); }

  .global-search-clear {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: none;
    background: var(--border);
    color: var(--text-secondary);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .global-search-clear:hover { background: var(--text-muted); color: white; }

  /* ─── Search Results ─── */
  .search-view {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 32px 48px;
  }

  .search-view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .search-view-header h2 {
    font-family: 'Charis SIL', serif;
    font-size: 20px;
    font-weight: 700;
  }

  .search-loading, .search-empty {
    text-align: center;
    padding: 32px;
    color: var(--text-muted);
    font-size: 13.5px;
  }

  .search-group {
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-card);
    overflow: hidden;
  }

  .search-group-header {
    padding: 12px 16px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-light);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.15s;
  }

  .search-group-header:hover { background: var(--accent-light); }

  .search-group-count {
    font-size: 11.5px;
    font-weight: 400;
    color: var(--text-muted);
  }

  .search-result {
    padding: 10px 16px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border-bottom: 1px solid var(--border-light);
    cursor: pointer;
    transition: background 0.1s;
  }

  .search-result:last-child { border-bottom: none; }
  .search-result:hover { background: var(--accent-light); }

  .search-result-type {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    font-weight: 500;
    min-width: 68px;
    padding-top: 2px;
    flex-shrink: 0;
  }

  .search-result-snippet {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    flex: 1;
  }

  .search-highlight {
    background: var(--accent-medium);
    color: var(--text-primary);
    font-weight: 500;
    border-radius: 2px;
    padding: 0 1px;
  }

  @media (max-width: 768px) {
    .global-search-bar {
      padding: 10px 12px;
    }

    .search-view {
      padding: 16px;
    }
  }

  /* ─── Dashboard Header ─── */
  .dashboard-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .dashboard-header-row h2 {
    margin-bottom: 0;
  }

  /* ─── Export Modal ─── */
  .export-modal {
    width: 560px;
  }

  .export-presets {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 20px;
  }

  .export-preset-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-primary);
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    font-family: 'Inter', sans-serif;
  }

  .export-preset-btn:hover {
    border-color: var(--accent);
  }

  .export-preset-btn.active {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  .export-preset-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .export-preset-desc {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .export-preset-btn.active .export-preset-label {
    color: var(--accent);
  }

  .export-format-row,
  .export-config-section {
    margin-bottom: 16px;
  }

  .export-row-label {
    display: block;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    font-weight: 500;
    margin-bottom: 6px;
  }

  .export-format-toggle {
    display: flex;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }

  .export-format-btn {
    flex: 1;
    padding: 7px 12px;
    border: none;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-family: 'Inter', sans-serif;
    font-size: 12.5px;
    cursor: pointer;
    transition: all 0.15s;
    border-right: 1px solid var(--border);
  }

  .export-format-btn:last-child {
    border-right: none;
  }

  .export-format-btn.active {
    background: var(--accent);
    color: white;
  }

  .export-format-btn:hover:not(.active) {
    background: var(--accent-light);
    color: var(--accent);
  }

  .export-date-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .export-date-row input[type="date"] {
    flex: 1;
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg-primary);
    outline: none;
    transition: border-color 0.15s;
  }

  .export-date-row input[type="date"]:focus {
    border-color: var(--accent);
  }

  .export-date-sep {
    font-size: 12px;
    color: var(--text-muted);
  }

  .export-checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
  }

  .export-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 3px 0;
  }

  .export-checkbox input[type="checkbox"] {
    width: 15px;
    height: 15px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .export-hint {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
    font-style: italic;
  }

  .export-preview {
    padding: 10px 14px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    text-align: center;
  }

  @media (max-width: 768px) {
    .export-modal {
      width: 95vw;
    }

    .export-presets {
      grid-template-columns: 1fr;
    }

    .export-date-row {
      flex-direction: column;
      align-items: stretch;
    }

    .export-date-sep {
      text-align: center;
    }

    .dashboard-header-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }

  /* ─── Tag Badges (display) ─── */
  .tag-badge {
    display: inline-block;
    padding: 2px 8px;
    background: var(--accent-light);
    color: var(--accent);
    border-radius: 10px;
    font-size: 10.5px;
    font-weight: 500;
    white-space: nowrap;
  }

  .tag-badge.small {
    font-size: 10px;
    padding: 1px 6px;
  }

  .encounter-header-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* ─── Tag Input (modals) ─── */
  .tag-input-wrapper {
    position: relative;
  }

  .tag-input-container {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary);
    min-height: 36px;
    align-items: center;
    cursor: text;
    transition: border-color 0.15s;
  }

  .tag-input-container:focus-within {
    border-color: var(--accent);
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--accent-light);
    color: var(--accent);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  .tag-chip-remove {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    line-height: 1;
    opacity: 0.6;
  }

  .tag-chip-remove:hover {
    opacity: 1;
  }

  .tag-input-field {
    border: none;
    outline: none;
    background: transparent;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: var(--text-primary);
    flex: 1;
    min-width: 80px;
    padding: 2px 0;
  }

  .tag-input-field::placeholder {
    color: var(--text-muted);
  }

  .tag-suggestions {
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
    z-index: 20;
  }

  .tag-suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.1s;
  }

  .tag-suggestion-item:hover {
    background: var(--accent-light);
    color: var(--accent);
  }

  /* ─── Tag Filter Chips (global bar) ─── */
  .tag-filter-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .tag-filter-chip {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .tag-filter-chip:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .tag-filter-chip.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  @media (max-width: 768px) {
    .global-search-bar {
      flex-wrap: wrap;
    }

    .tag-filter-chips {
      width: 100%;
    }
  }
`;
export default styles;
