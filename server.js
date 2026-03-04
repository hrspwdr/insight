import 'dotenv/config';
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifySecureSession from "@fastify/secure-session";
import fastifyFormbody from "@fastify/formbody";
import { compare } from "bcryptjs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const DATA_FILE = join(DATA_DIR, "insight.json");
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

// ─── Data helpers ───

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, "{}", "utf-8");
  }
}

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
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    fastify.log.error(err);
    return {};
  }
});

fastify.put("/api/data", { preHandler: authRequired }, async (request, reply) => {
  try {
    const data = request.body;
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
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

// ─── Start ───

await ensureDataDir();

try {
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`Insight server running on http://localhost:${PORT}`);
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
