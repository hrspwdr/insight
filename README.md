# Insight

Basic CRM, meeting tracking, and to-dos, blended through the extended metaphor of an electronic medical record.
Lovingly vibecoded with Claude Opus 4.6

## Architecture

Vite + React frontend, Fastify backend, JSON file storage, bcryptjs session auth.

## Usage

Probably best not to.

## Local Development

```bash
npm install
npm run dev
```

Auth is skipped in dev when no `INSIGHT_PASSWORD_HASH` is set.

## Setting a Password

```bash
npm run set-password
```

Follow the prompts. This generates a bcryptjs hash you'll use as an environment variable.

## Deploy

It's none of my business how you do that.

## Data

All data lives in `data/insight.json`. Put it on a persistent volume that survives deployments.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `INSIGHT_PASSWORD_HASH` | Production | bcrypt hash from `npm run set-password` |
| `SESSION_SECRET` | Production | 32+ char random string for session encryption |
| `PORT` | No | Server port (default: 3001) |
