import 'dotenv/config';
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifySecureSession from "@fastify/secure-session";
import fastifyFormbody from "@fastify/formbody";
import { compare } from "bcryptjs";
import Database from "better-sqlite3";
import { mkdir } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "insight.db");
const LEGACY_JSON = join(DATA_DIR, "insight.json");
const PORT = process.env.PORT || 3001;
const IS_PROD = process.argv.includes("--production");

// ─── Auth config ───

const PASSWORD_HASH = process.env.INSIGHT_PASSWORD_HASH;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me-in-production!!";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

if (IS_PROD && !PASSWORD_HASH) {
  console.error("INSIGHT_PASSWORD_HASH not set. Run `npm run set-password` to generate one.");
  process.exit(1);
}

if (IS_PROD && SESSION_SECRET === "dev-secret-change-me-in-production!!") {
  console.error("SESSION_SECRET not set. Run: fly secrets set SESSION_SECRET=$(openssl rand -hex 32)");
  process.exit(1);
}

// Pad or truncate secret to exactly 32 bytes for sodium
const secretKey = Buffer.alloc(32);
Buffer.from(SESSION_SECRET).copy(secretKey);

// ─── SQLite setup ───

if (!existsSync(DATA_DIR)) {
  await mkdir(DATA_DIR, { recursive: true });
}

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    context TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS encounters (
    id TEXT PRIMARY KEY,
    contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT '',
    narrative TEXT NOT NULL DEFAULT '',
    assessment TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT '',
    followUpDate TEXT,
    followUpResolved INTEGER NOT NULL DEFAULT 0,
    followUpComment TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    dueDate TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    completionNote TEXT,
    sourceEncounterId TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS active_problems (
    id TEXT PRIMARY KEY,
    contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    text TEXT NOT NULL DEFAULT '',
    addedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS related_charts (
    contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    relatedContactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (contactId, relatedContactId)
  );

  CREATE INDEX IF NOT EXISTS idx_encounters_contact ON encounters(contactId);
  CREATE INDEX IF NOT EXISTS idx_orders_contact ON orders(contactId);
  CREATE INDEX IF NOT EXISTS idx_problems_contact ON active_problems(contactId);
  CREATE INDEX IF NOT EXISTS idx_related_contact ON related_charts(contactId);

  CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    entityType,
    entityId,
    contactId,
    contactName,
    content,
    content_rowid='rowid'
  );
`);

// ─── Schema migrations ───
try { db.exec("ALTER TABLE encounters ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'"); } catch { /* column already exists */ }
try { db.exec("ALTER TABLE orders ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'"); } catch { /* column already exists */ }
try { db.exec("ALTER TABLE active_problems ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"); } catch { /* column already exists */ }

// ─── FTS rebuild (full) ───

function rebuildSearchIndex() {
  db.prepare("DELETE FROM search_index").run();

  const insertIdx = db.prepare(
    "INSERT INTO search_index (entityType, entityId, contactId, contactName, content) VALUES (?, ?, ?, ?, ?)"
  );

  const rebuild = db.transaction(() => {
    // Index contacts (name + notes)
    for (const c of db.prepare("SELECT * FROM contacts").all()) {
      insertIdx.run("contact", c.id, c.id, c.name, [c.name, c.context, c.notes].filter(Boolean).join(" "));
    }

    // Index encounters (narrative + assessment + plan + tags)
    for (const e of db.prepare("SELECT e.*, c.name as contactName FROM encounters e JOIN contacts c ON e.contactId = c.id").all()) {
      let tags = [];
      try { tags = JSON.parse(e.tags || "[]"); } catch { /* ignore */ }
      const text = [e.narrative, e.assessment, e.plan, e.followUpComment, ...tags].filter(Boolean).join(" ");
      if (text.trim()) {
        insertIdx.run("encounter", e.id, e.contactId, e.contactName, text);
      }
    }

    // Index orders (description + completionNote + tags)
    for (const o of db.prepare("SELECT o.*, c.name as contactName FROM orders o JOIN contacts c ON o.contactId = c.id").all()) {
      let tags = [];
      try { tags = JSON.parse(o.tags || "[]"); } catch { /* ignore */ }
      const text = [o.description, o.completionNote, ...tags].filter(Boolean).join(" ");
      if (text.trim()) {
        insertIdx.run("order", o.id, o.contactId, o.contactName, text);
      }
    }

    // Index problems
    for (const p of db.prepare("SELECT p.*, c.name as contactName FROM active_problems p JOIN contacts c ON p.contactId = c.id").all()) {
      if (p.text.trim()) {
        insertIdx.run("problem", p.id, p.contactId, p.contactName, p.text);
      }
    }
  });

  rebuild();
}

// ─── FTS targeted updates (single entity) ───

const ftsDelete = db.prepare("DELETE FROM search_index WHERE entityType = ? AND entityId = ?");
const ftsInsert = db.prepare(
  "INSERT INTO search_index (entityType, entityId, contactId, contactName, content) VALUES (?, ?, ?, ?, ?)"
);

function updateContactIndex(contactId) {
  const c = db.prepare("SELECT * FROM contacts WHERE id = ?").get(contactId);
  ftsDelete.run("contact", contactId);
  if (c) {
    const text = [c.name, c.context, c.notes].filter(Boolean).join(" ");
    if (text.trim()) ftsInsert.run("contact", c.id, c.id, c.name, text);
  }
}

function updateEncounterIndex(encounterId) {
  const e = db.prepare("SELECT e.*, c.name as contactName FROM encounters e JOIN contacts c ON e.contactId = c.id WHERE e.id = ?").get(encounterId);
  ftsDelete.run("encounter", encounterId);
  if (e) {
    let tags = [];
    try { tags = JSON.parse(e.tags || "[]"); } catch { /* ignore */ }
    const text = [e.narrative, e.assessment, e.plan, e.followUpComment, ...tags].filter(Boolean).join(" ");
    if (text.trim()) ftsInsert.run("encounter", e.id, e.contactId, e.contactName, text);
  }
}

function updateOrderIndex(orderId) {
  const o = db.prepare("SELECT o.*, c.name as contactName FROM orders o JOIN contacts c ON o.contactId = c.id WHERE o.id = ?").get(orderId);
  ftsDelete.run("order", orderId);
  if (o) {
    let tags = [];
    try { tags = JSON.parse(o.tags || "[]"); } catch { /* ignore */ }
    const text = [o.description, o.completionNote, ...tags].filter(Boolean).join(" ");
    if (text.trim()) ftsInsert.run("order", o.id, o.contactId, o.contactName, text);
  }
}

function updateProblemIndex(problemId) {
  const p = db.prepare("SELECT p.*, c.name as contactName FROM active_problems p JOIN contacts c ON p.contactId = c.id WHERE p.id = ?").get(problemId);
  ftsDelete.run("problem", problemId);
  if (p && p.text.trim()) {
    ftsInsert.run("problem", p.id, p.contactId, p.contactName, p.text);
  }
}

function removeFromIndex(entityType, entityId) {
  ftsDelete.run(entityType, entityId);
}

// ─── JSON → SQLite migration ───

function migrateFromJson() {
  if (!existsSync(LEGACY_JSON)) return;

  // Don't re-migrate if we already have data
  const count = db.prepare("SELECT COUNT(*) as n FROM contacts").get();
  if (count.n > 0) return;

  let raw;
  try {
    raw = JSON.parse(readFileSync(LEGACY_JSON, "utf-8"));
  } catch {
    return; // corrupt or empty
  }

  if (!raw || typeof raw !== "object" || Object.keys(raw).length === 0) return;

  console.log(`Migrating ${Object.keys(raw).length} contacts from insight.json → insight.db`);

  const insertContact = db.prepare(
    "INSERT OR IGNORE INTO contacts (id, name, context, notes, createdAt) VALUES (?, ?, ?, ?, ?)"
  );
  const insertEncounter = db.prepare(
    `INSERT OR IGNORE INTO encounters (id, contactId, date, type, narrative, assessment, plan, followUpDate, followUpResolved, followUpComment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertOrder = db.prepare(
    `INSERT OR IGNORE INTO orders (id, contactId, description, dueDate, status, completionNote, sourceEncounterId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertProblem = db.prepare(
    "INSERT OR IGNORE INTO active_problems (id, contactId, text, addedAt) VALUES (?, ?, ?, ?)"
  );
  const insertRelated = db.prepare(
    "INSERT OR IGNORE INTO related_charts (contactId, relatedContactId) VALUES (?, ?)"
  );

  const migrate = db.transaction(() => {
    // Pass 1: insert all contacts first (so FK references resolve)
    for (const [id, c] of Object.entries(raw)) {
      insertContact.run(id, c.name || "", c.context || "", c.notes || "", c.createdAt || new Date().toISOString());
    }

    // Pass 2: insert child data now that all contacts exist
    for (const [id, c] of Object.entries(raw)) {
      for (const enc of c.encounters || []) {
        insertEncounter.run(
          enc.id, id, enc.date || "", enc.type || "", enc.narrative || "",
          enc.assessment || "", enc.plan || "", enc.followUpDate || null,
          enc.followUpResolved ? 1 : 0, enc.followUpComment || null
        );
      }

      for (const ord of c.orders || []) {
        insertOrder.run(
          ord.id, id, ord.description || "", ord.dueDate || null,
          ord.status || "open", ord.completionNote || null,
          ord.sourceEncounterId || null, ord.createdAt || new Date().toISOString()
        );
      }

      for (const prob of c.activeProblems || []) {
        if (typeof prob === "string") {
          insertProblem.run(`prob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, id, prob, new Date().toISOString());
        } else {
          insertProblem.run(prob.id, id, prob.text || "", prob.addedAt || new Date().toISOString());
        }
      }

      for (const relId of c.relatedCharts || []) {
        // Only link if the target contact exists in the data
        if (raw[relId]) insertRelated.run(id, relId);
      }
    }
  });

  migrate();
  console.log("Migration complete.");
}

migrateFromJson();
rebuildSearchIndex();

// ─── DB read/write helpers (same blob shape as before) ───

function getAllData() {
  const contacts = db.prepare("SELECT * FROM contacts").all();
  const encounters = db.prepare("SELECT * FROM encounters").all();
  const orders = db.prepare("SELECT * FROM orders").all();
  const problems = db.prepare("SELECT * FROM active_problems").all();
  const related = db.prepare("SELECT * FROM related_charts").all();

  const result = {};

  for (const c of contacts) {
    result[c.id] = {
      id: c.id,
      name: c.name,
      context: c.context,
      notes: c.notes,
      createdAt: c.createdAt,
      encounters: [],
      orders: [],
      activeProblems: [],
      relatedCharts: [],
    };
  }

  for (const e of encounters) {
    if (result[e.contactId]) {
      let tags = [];
      try { tags = JSON.parse(e.tags || "[]"); } catch { /* ignore */ }
      result[e.contactId].encounters.push({
        id: e.id,
        date: e.date,
        type: e.type,
        narrative: e.narrative,
        assessment: e.assessment,
        plan: e.plan,
        followUpDate: e.followUpDate,
        followUpResolved: e.followUpResolved === 1,
        followUpComment: e.followUpComment,
        tags,
      });
    }
  }

  for (const o of orders) {
    if (result[o.contactId]) {
      let tags = [];
      try { tags = JSON.parse(o.tags || "[]"); } catch { /* ignore */ }
      result[o.contactId].orders.push({
        id: o.id,
        description: o.description,
        dueDate: o.dueDate,
        status: o.status,
        completionNote: o.completionNote,
        sourceEncounterId: o.sourceEncounterId,
        createdAt: o.createdAt,
        tags,
      });
    }
  }

  for (const p of problems) {
    if (result[p.contactId]) {
      result[p.contactId].activeProblems.push({
        id: p.id,
        text: p.text,
        addedAt: p.addedAt,
        status: p.status || "active",
      });
    }
  }

  for (const r of related) {
    if (result[r.contactId]) {
      result[r.contactId].relatedCharts.push(r.relatedContactId);
    }
  }

  return result;
}

// ─── Search helper ───

function searchData(query) {
  if (!query || query.trim().length === 0) return [];

  // Escape FTS5 special characters and add prefix matching
  const sanitized = query.trim().replace(/['"*()]/g, "").split(/\s+/).filter(Boolean);
  if (sanitized.length === 0) return [];

  const ftsQuery = sanitized.map((t) => `"${t}"*`).join(" AND ");

  try {
    const results = db.prepare(`
      SELECT entityType, entityId, contactId, contactName,
             snippet(search_index, 4, '>>>','<<<', '...', 48) as snippet,
             rank
      FROM search_index
      WHERE search_index MATCH ?
      ORDER BY rank
      LIMIT 50
    `).all(ftsQuery);

    return results.map((r) => ({
      type: r.entityType,
      id: r.entityId,
      contactId: r.contactId,
      contactName: r.contactName,
      snippet: r.snippet,
    }));
  } catch {
    return [];
  }
}

// ─── Fastify setup ───

const fastify = Fastify({ logger: true });

// ─── Plugins ───

await fastify.register(fastifyFormbody);
await fastify.register(fastifyCookie);
await fastify.register(fastifySecureSession, {
  key: secretKey,
  cookie: {
    path: "/",
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  },
});

await fastify.register(fastifyCors, {
  origin: IS_PROD ? false : "http://localhost:5173",
  credentials: true,
});

// ─── Auth check ───

function isAuthenticated(request) {
  return request.session.get("authenticated") === true;
}

// Skip auth in dev if no password hash is set (convenience)
function authRequired(request, reply, done) {
  if (!PASSWORD_HASH) {
    // No password configured — skip auth (local dev)
    return done();
  }
  if (isAuthenticated(request)) {
    return done();
  }
  if (request.url.startsWith("/api")) {
    reply.status(401).send({ error: "Unauthorized" });
  } else {
    reply.redirect("/login");
  }
}

// ─── Login page ───

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Insight — Sign In</title>
  <link href="https://fonts.googleapis.com/css2?family=Charis+SIL:wght@400;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #faf9f5;
      color: #141413;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .login-card {
      background: #ffffff;
      border: 1px solid #e5e4df;
      border-radius: 12px;
      padding: 40px 44px;
      width: 380px;
      max-width: 90vw;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }
    .login-card h1 {
      font-family: 'Charis SIL', serif;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .login-card .subtitle {
      font-size: 12px;
      color: #8c8c8a;
      font-style: italic;
      margin-bottom: 28px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #8c8c8a;
      font-weight: 500;
      margin-bottom: 6px;
    }
    .form-group input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e5e4df;
      border-radius: 6px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #141413;
      background: #faf9f5;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-group input:focus {
      border-color: #D97757;
    }
    .btn-login {
      width: 100%;
      padding: 11px;
      background: #D97757;
      color: white;
      border: none;
      border-radius: 6px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-login:hover { background: #c4684a; }
    .error {
      color: #c0392b;
      font-size: 13px;
      margin-bottom: 16px;
      padding: 8px 12px;
      background: #c0392b12;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>Insight</h1>
    <div class="subtitle">Innoventually</div>
    {{ERROR}}
    <form method="POST" action="/login">
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" autofocus required />
      </div>
      <button type="submit" class="btn-login">Sign In</button>
    </form>
  </div>
</body>
</html>`;

fastify.get("/login", async (request, reply) => {
  if (isAuthenticated(request)) {
    return reply.redirect("/");
  }
  reply.type("text/html").send(LOGIN_PAGE.replace("{{ERROR}}", ""));
});

fastify.post("/login", async (request, reply) => {
  const { password } = request.body || {};

  if (!password || !PASSWORD_HASH) {
    reply.type("text/html").send(
      LOGIN_PAGE.replace("{{ERROR}}", '<div class="error">Invalid password.</div>')
    );
    return;
  }

  const valid = await compare(password, PASSWORD_HASH);

  if (!valid) {
    reply.type("text/html").send(
      LOGIN_PAGE.replace("{{ERROR}}", '<div class="error">Invalid password.</div>')
    );
    return;
  }

  request.session.set("authenticated", true);
  reply.redirect("/");
});

fastify.get("/logout", async (request, reply) => {
  request.session.delete();
  reply.redirect("/login");
});

// ─── Auth check on API routes ───

fastify.get("/api/auth/check", async (request, reply) => {
  if (!PASSWORD_HASH || isAuthenticated(request)) {
    return { authenticated: true };
  }
  reply.status(401);
  return { authenticated: false };
});

// ─── Protected API routes ───

fastify.get("/api/data", { preHandler: authRequired }, async (request, reply) => {
  try {
    return getAllData();
  } catch (err) {
    fastify.log.error(err);
    return {};
  }
});

fastify.get("/api/search", { preHandler: authRequired }, async (request, reply) => {
  try {
    const q = request.query.q || "";
    return searchData(q);
  } catch (err) {
    fastify.log.error(err);
    return [];
  }
});

fastify.get("/api/tags", { preHandler: authRequired }, async (request, reply) => {
  try {
    const encTags = db.prepare("SELECT DISTINCT value FROM encounters, json_each(encounters.tags)").all();
    const ordTags = db.prepare("SELECT DISTINCT value FROM orders, json_each(orders.tags)").all();
    const all = [...new Set([...encTags, ...ordTags].map((r) => r.value))].sort();
    return all;
  } catch (err) {
    fastify.log.error(err);
    return [];
  }
});

// ─── Context rename ───

fastify.patch("/api/contexts/rename", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { from, to } = request.body;
    if (!from || !to || !to.trim()) { reply.status(400); return { ok: false, error: "Both 'from' and 'to' are required" }; }
    const affected = db.prepare("SELECT id FROM contacts WHERE context = ?").all(from);
    db.prepare("UPDATE contacts SET context = ? WHERE context = ?").run(to.trim(), from);
    // Re-index affected contacts
    for (const { id } of affected) updateContactIndex(id);
    return { ok: true, count: affected.length };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

// ─── Granular mutation endpoints ───

// -- Contacts --

fastify.post("/api/contacts", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id, name, context, notes, createdAt } = request.body;
    db.prepare(
      "INSERT INTO contacts (id, name, context, notes, createdAt) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name || "", context || "", notes || "", createdAt || new Date().toISOString());
    updateContactIndex(id);
    return { ok: true, id };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.patch("/api/contacts/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, context, notes } = request.body;
    const existing = db.prepare("SELECT * FROM contacts WHERE id = ?").get(id);
    if (!existing) { reply.status(404); return { ok: false, error: "Contact not found" }; }
    db.prepare(
      "UPDATE contacts SET name = ?, context = ?, notes = ? WHERE id = ?"
    ).run(
      name !== undefined ? name : existing.name,
      context !== undefined ? context : existing.context,
      notes !== undefined ? notes : existing.notes,
      id
    );
    updateContactIndex(id);
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.delete("/api/contacts/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    // Collect child IDs for FTS cleanup before CASCADE deletes them
    const encIds = db.prepare("SELECT id FROM encounters WHERE contactId = ?").all(id).map(r => r.id);
    const ordIds = db.prepare("SELECT id FROM orders WHERE contactId = ?").all(id).map(r => r.id);
    const probIds = db.prepare("SELECT id FROM active_problems WHERE contactId = ?").all(id).map(r => r.id);

    db.prepare("DELETE FROM contacts WHERE id = ?").run(id);

    // Clean up FTS entries
    removeFromIndex("contact", id);
    for (const eid of encIds) removeFromIndex("encounter", eid);
    for (const oid of ordIds) removeFromIndex("order", oid);
    for (const pid of probIds) removeFromIndex("problem", pid);

    // Clean up bidirectional related chart links pointing TO this contact
    db.prepare("DELETE FROM related_charts WHERE relatedContactId = ?").run(id);

    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

// -- Encounters --

fastify.post("/api/contacts/:contactId/encounters", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { contactId } = request.params;
    const enc = request.body;
    db.prepare(
      `INSERT INTO encounters (id, contactId, date, type, narrative, assessment, plan, followUpDate, followUpResolved, followUpComment, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      enc.id, contactId, enc.date || "", enc.type || "", enc.narrative || "",
      enc.assessment || "", enc.plan || "", enc.followUpDate || null,
      enc.followUpResolved ? 1 : 0, enc.followUpComment || null,
      JSON.stringify(enc.tags || [])
    );
    updateEncounterIndex(enc.id);
    return { ok: true, id: enc.id };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.patch("/api/encounters/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    const enc = request.body;
    const existing = db.prepare("SELECT * FROM encounters WHERE id = ?").get(id);
    if (!existing) { reply.status(404); return { ok: false, error: "Encounter not found" }; }
    db.prepare(
      `UPDATE encounters SET date = ?, type = ?, narrative = ?, assessment = ?, plan = ?,
       followUpDate = ?, followUpResolved = ?, followUpComment = ?, tags = ?
       WHERE id = ?`
    ).run(
      enc.date !== undefined ? enc.date : existing.date,
      enc.type !== undefined ? enc.type : existing.type,
      enc.narrative !== undefined ? enc.narrative : existing.narrative,
      enc.assessment !== undefined ? enc.assessment : existing.assessment,
      enc.plan !== undefined ? enc.plan : existing.plan,
      enc.followUpDate !== undefined ? enc.followUpDate : existing.followUpDate,
      enc.followUpResolved !== undefined ? (enc.followUpResolved ? 1 : 0) : existing.followUpResolved,
      enc.followUpComment !== undefined ? enc.followUpComment : existing.followUpComment,
      enc.tags !== undefined ? JSON.stringify(enc.tags) : existing.tags,
      id
    );
    updateEncounterIndex(id);
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.delete("/api/encounters/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    db.prepare("DELETE FROM encounters WHERE id = ?").run(id);
    removeFromIndex("encounter", id);
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

// -- Orders --

fastify.post("/api/contacts/:contactId/orders", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { contactId } = request.params;
    const ord = request.body;
    db.prepare(
      `INSERT INTO orders (id, contactId, description, dueDate, status, completionNote, sourceEncounterId, createdAt, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      ord.id, contactId, ord.description || "", ord.dueDate || null,
      ord.status || "open", ord.completionNote || null,
      ord.sourceEncounterId || null, ord.createdAt || new Date().toISOString(),
      JSON.stringify(ord.tags || [])
    );
    updateOrderIndex(ord.id);
    return { ok: true, id: ord.id };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.patch("/api/orders/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    const ord = request.body;
    const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    if (!existing) { reply.status(404); return { ok: false, error: "Order not found" }; }
    db.prepare(
      `UPDATE orders SET description = ?, dueDate = ?, status = ?, completionNote = ?,
       sourceEncounterId = ?, tags = ?
       WHERE id = ?`
    ).run(
      ord.description !== undefined ? ord.description : existing.description,
      ord.dueDate !== undefined ? ord.dueDate : existing.dueDate,
      ord.status !== undefined ? ord.status : existing.status,
      ord.completionNote !== undefined ? ord.completionNote : existing.completionNote,
      ord.sourceEncounterId !== undefined ? ord.sourceEncounterId : existing.sourceEncounterId,
      ord.tags !== undefined ? JSON.stringify(ord.tags) : existing.tags,
      id
    );
    updateOrderIndex(id);
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.delete("/api/orders/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    db.prepare("DELETE FROM orders WHERE id = ?").run(id);
    removeFromIndex("order", id);
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

// -- Active Problems --

fastify.post("/api/contacts/:contactId/problems", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { contactId } = request.params;
    const prob = request.body;
    db.prepare(
      "INSERT INTO active_problems (id, contactId, text, addedAt, status) VALUES (?, ?, ?, ?, ?)"
    ).run(prob.id, contactId, prob.text || "", prob.addedAt || new Date().toISOString(), prob.status || "active");
    updateProblemIndex(prob.id);
    return { ok: true, id: prob.id };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.patch("/api/problems/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    const prob = request.body;
    const existing = db.prepare("SELECT * FROM active_problems WHERE id = ?").get(id);
    if (!existing) { reply.status(404); return { ok: false, error: "Problem not found" }; }
    db.prepare(
      "UPDATE active_problems SET text = ?, status = ? WHERE id = ?"
    ).run(
      prob.text !== undefined ? prob.text : existing.text,
      prob.status !== undefined ? prob.status : existing.status,
      id
    );
    updateProblemIndex(id);
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.delete("/api/problems/:id", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { id } = request.params;
    db.prepare("DELETE FROM active_problems WHERE id = ?").run(id);
    removeFromIndex("problem", id);
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

// -- Related Charts (bidirectional) --

fastify.post("/api/contacts/:contactId/related/:targetId", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { contactId, targetId } = request.params;
    const link = db.transaction(() => {
      db.prepare("INSERT OR IGNORE INTO related_charts (contactId, relatedContactId) VALUES (?, ?)").run(contactId, targetId);
      db.prepare("INSERT OR IGNORE INTO related_charts (contactId, relatedContactId) VALUES (?, ?)").run(targetId, contactId);
    });
    link();
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

fastify.delete("/api/contacts/:contactId/related/:targetId", { preHandler: authRequired }, async (request, reply) => {
  try {
    const { contactId, targetId } = request.params;
    const unlink = db.transaction(() => {
      db.prepare("DELETE FROM related_charts WHERE contactId = ? AND relatedContactId = ?").run(contactId, targetId);
      db.prepare("DELETE FROM related_charts WHERE contactId = ? AND relatedContactId = ?").run(targetId, contactId);
    });
    unlink();
    return { ok: true };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500);
    return { ok: false, error: err.message };
  }
});

// ─── Serve built frontend in production ───

if (IS_PROD) {
  const distPath = join(__dirname, "dist");
  if (existsSync(distPath)) {
    await fastify.register(fastifyStatic, {
      root: distPath,
      prefix: "/",
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api")) {
        reply.status(404);
        return { error: "Not found" };
      }
      // Auth check for SPA routes
      if (PASSWORD_HASH && !isAuthenticated(request)) {
        return reply.redirect("/login");
      }
      return reply.sendFile("index.html");
    });
  } else {
    fastify.log.warn("No dist/ folder found. Run `npm run build` first.");
  }
}

// ─── Graceful shutdown ───

function shutdown() {
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ─── Start ───

try {
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`Insight server running on http://localhost:${PORT}`);
  fastify.log.info(`SQLite database: ${DB_FILE}`);
  if (IS_PROD) {
    fastify.log.info("Serving production build from dist/");
  } else {
    fastify.log.info("Dev mode — frontend at http://localhost:5173");
  }
  if (!PASSWORD_HASH) {
    fastify.log.warn("No INSIGHT_PASSWORD_HASH set — auth disabled (dev mode).");
  }
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
