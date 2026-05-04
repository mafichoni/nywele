# Nywele PWA — Developer Guide

## Overview
Nywele is a gamified personal care marketplace PWA for East Africa. Staff (barbers, stylists, nail techs, masseurs, etc.) subscribe via MPESA to appear in the discovery feed and leaderboards. Clients rate staff, post photos, and vote in competitions. A marketplace enables product listings linked to personal care services.

## Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS v4 + Framer Motion
- **PWA**: vite-plugin-pwa (Workbox, offline-first)
- **Backend**: Fastify + Prisma + PostgreSQL + Redis
- **Auth**: Supabase (phone OTP)
- **Payments**: Safaricom Daraja API v3 (MPESA STK Push)
- **Search**: Meilisearch
- **Maps**: Mapbox GL JS
- **Storage**: Cloudflare R2

## Getting Started

```bash
cp .env.example .env        # fill in your env vars
npm install
npm run db:push             # push schema to DB
npm run db:seed             # seed sample data
npm run server:dev          # start API on :3001
npm run dev                 # start frontend on :5173
```

## Key Architecture Decisions
- **Leaderboard reads always served from Redis** (30s max stale) — never hit PostgreSQL directly
- **1 rating per phone per staff per week** — enforced at Redis level with `rating:{userId}:{staffId}:{weekKey}` key
- **MPESA subscriptions** use Daraja v3 STK Push → webhook `/v1/payments/webhooks/mpesa` activates listing
- **Offline-first**: service worker caches discovery feed for 24h, ratings queue in IndexedDB
- **Images**: must be WebP ≤ 200KB; NSFW screened client-side via TF.js before upload

## Branch
`claude/nywele-marketplace-pwa-Iv8KG`

## Environment Variables
See `.env.example` for all required vars. Never commit `.env` files.
