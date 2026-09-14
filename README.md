# Your Cinema 🎬

A premium personal movie library, watchlist manager, taste engine, library-only recommendation system, and external media launcher built on the **PERN stack** (PostgreSQL, Express.js, React, Node.js + TypeScript + Material UI).

---

## 🏛️ Core Product Philosophy

> **"This application is about MY movies, MY watchlists, MY viewing history, MY ratings, MY tags, MY taste, and recommendations from MY library."**

- **Zero Global Movie Feed**: No trending, popular, or generic catalogues. The user deliberately adds films.
- **Library-Only Recommendations**: Recommendations originate **strictly** from the user's unwatched collection based on personal rating history, tags, and preferences.
- **Zero Video File Storage**: Video files are never stored on the application server. Streaming uses authorized Google Drive byte-range proxies, official YouTube embeds, and OTT deep links.
- **Everything is Editable**: Users own their metadata. Edits are preserved and TMDB synchronization is selective.
- **Android TV & Multi-Device Native**: First-class support for D-pad spatial remote navigation, mobile bottom navigation, and widescreen desktop layouts.

---

## 🚀 Technology Stack

- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL (with resilient in-memory fallback), JWT auth + HTTP-only cookies, Zod validation, structured logging.
- **Frontend**: React 18, TypeScript, Vite, Material UI (MUI) Dark Cinematic Theme, TanStack Query v5, Framer Motion.
- **AI Engine**: Pluggable provider adapter (Google Gemini, OpenRouter, OpenAI-compatible) with strict candidate pool safety guardrails.
- **Integrations**: TMDB API client, Google Drive Range Stream Proxy, YouTube player, OTT deep links.

---

## 💻 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`*.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*.

### 3. Demo Credentials
- **Email**: `demo@yourcinema.com`
- **Password**: `password123`
*(Pre-loaded with Christopher Nolan, Denis Villeneuve, and Kamal Haasan sample library records)*.
