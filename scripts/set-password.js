#!/usr/bin/env node

/**
 * Generate a bcryptjs password hash for Insight.
 *
 * Usage:
 *   node scripts/set-password.js
 *
 * Then set the hash as an environment variable:
 *   fly secrets set INSIGHT_PASSWORD_HASH='<the hash>'
 *
 * Or for local dev, create a .env file:
 *   INSIGHT_PASSWORD_HASH=<the hash>
 *   SESSION_SECRET=<any string 32+ chars>
 */

import { hash } from "bcryptjs";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const password = await ask("Enter password for Insight: ");

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const hashed = await hash(password, 12);

  console.log("\n─── Done ───\n");
  console.log("Password hash:\n");
  console.log(`  ${hashed}\n`);
  console.log("Set it on Fly.io:\n");
  console.log(`  fly secrets set INSIGHT_PASSWORD_HASH='${hashed}'`);
  console.log(`  fly secrets set SESSION_SECRET='$(openssl rand -hex 32)'`);
  console.log("\nOr for local dev, add to a .env file:\n");
  console.log(`  INSIGHT_PASSWORD_HASH=${hashed}`);
  console.log(`  SESSION_SECRET=any-random-string-at-least-32-characters-long\n`);

  rl.close();
}

main();
