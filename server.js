import 'dotenv/config';
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifySecureSession from "@fastify/secure-session";
import fastifyFormbody from "@fastify/formbody";
import { compare } from "bcryptjs";
import Database from "better-sqlite3";
import { readFile, mkdir } from "fs/promises";
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
`);

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
    for (const [id, c] of Object.entries(raw)) {
      insertContact.run(id, c.name || "", c.context || "", c.notes || "", c.createdAt || new Date().toISOString());

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
          // Legacy format: plain string
          insertProblem.run(`prob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, id, prob, new Date().toISOString());
        } else {
          insertProblem.run(prob.id, id, prob.text || "", prob.addedAt || new Date().toISOString());
        }
      }

      for (const relId of c.relatedCharts || []) {
        insertRelated.run(id, relId);
      }
    }
  });

  migrate();
  console.log("Migration complete.");
}

migrateFromJson();

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
      });
    }
  }

  for (const o of orders) {
    if (result[o.contactId]) {
      result[o.contactId].orders.push({
        id: o.id,
        description: o.description,
        dueDate: o.dueDate,
        status: o.status,
        completionNote: o.completionNote,
        sourceEncounterId: o.sourceEncounterId,
        createdAt: o.createdAt,
      });
    }
  }

  for (const p of problems) {
    if (result[p.contactId]) {
      result[p.contactId].activeProblems.push({
        id: p.id,
        text: p.text,
        addedAt: p.addedAt,
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

function putAllData(data) {
  if (!data || typeof data !== "object") return;

  const deleteRelated = db.prepare("DELETE FROM related_charts");
  const deleteProblems = db.prepare("DELETE FROM active_problems");
  const deleteOrders = db.prepare("DELETE FROM orders");
  const deleteEncounters = db.prepare("DELETE FROM encounters");
  const deleteContacts = db.prepare("DELETE FROM contacts");

  const insertContact = db.prepare(
    "INSERT INTO contacts (id, name, context, notes, createdAt) VALUES (?, ?, ?, ?, ?)"
  );
  const insertEncounter = db.prepare(
    `INSERT INTO encounters (id, contactId, date, type, narrative, assessment, plan, followUpDate, followUpResolved, followUpComment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertOrder = db.prepare(
    `INSERT INTO orders (id, contactId, description, dueDate, status, completionNote, sourceEncounterId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertProblem = db.prepare(
    "INSERT INTO active_problems (id, contactId, text, addedAt) VALUES (?, ?, ?, ?)"
  );
  const insertRelated = db.prepare(
    "INSERT OR IGNORE INTO related_charts (contactId, relatedContactId) VALUES (?, ?)"
  );

  const writeAll = db.transaction(() => {
    deleteRelated.run();
    deleteProblems.run();
    deleteOrders.run();
    deleteEncounters.run();
    deleteContacts.run();

    for (const [id, c] of Object.entries(data)) {
      insertContact.run(id, c.name || "", c.context || "", c.notes || "", c.createdAt || new Date().toISOString());

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
          insertProblem.run(prob.id || `prob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, id, prob.text || "", prob.addedAt || new Date().toISOString());
        }
      }

      for (const relId of c.relatedCharts || []) {
        insertRelated.run(id, relId);
      }
    }
  });

  writeAll();
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
// Same blob API as before — frontend is unchanged

fastify.get("/api/data", { preHandler: authRequired }, async (request, reply) => {
  try {
    return getAllData();
  } catch (err) {
    fastify.log.error(err);
    return {};
  }
});

fastify.put("/api/data", { preHandler: authRequired }, async (request, reply) => {
  try {
    putAllData(request.body);
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

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

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
