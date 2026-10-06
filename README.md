## ⚡ Overview

[**Krawly**](https://krawly.dev) crawls any website and draws what it finds as a live map, one ring per click from your start page. Every page and file becomes a node whose color and shape show its status, so broken links and redirects surface immediately, and a report view lists every page with its status code, response time, and depth.

## 🔭 Architecture

```
┌───────────────────────────────────────────────┐
│                    Browser                    │
│                                               │
│  ┌───────────┐  ┌─────────┐  ┌─────────────┐  │
│  │ React UI  │←→│ Zustand │←→│Crawl Engine │  │
│  │(Tailwind) │  │  Store  │  │ (Queue +    │  │
│  └─────┬─────┘  └─────────┘  │  Parser)    │  │
│        │                     └──────┬──────┘  │
│  ┌─────┴─────┐                      │         │
│  │  Radial   │                      │         │
│  │  layout + │                      │         │
│  │  Canvas   │                      │         │
│  └───────────┘                      │         │
└─────────────────────────────────────┼─────────┘
                                      │ fetch
                             ┌────────┴────────┐
                             │  Express Proxy  │
                             │  /fetch  /head  │
                             └────────┬────────┘
                                      │
                                 Target Site
```

## 🚀 Stack

#### Client

- React 18 (TS)
- Tailwind CSS v3
- HTML5 Canvas
- Zustand

#### Server

- Express (TS)

## 🛠️ Local Setup

#### 1. Clone the repository

```bash
git clone https://github.com/wu-wilson/krawly.git
cd krawly
```

#### 2. Launch the app

```bash
./launch.sh
```

The script installs dependencies on first run, then starts the proxy server on port `3001` and the client on `http://localhost:5173`.

> Requires Node.js 18.17+ and npm 9+.

## ☁️ Deployment

Deployed on [Railway](https://railway.app). The client ships as a static build. The proxy server runs as a separate service. DNS via [Cloudflare](https://www.cloudflare.com).

## ⚙️ Configuration

All variables ship with working defaults — `./launch.sh` runs on a fresh clone with no env files. Override only to change a default.

- **Local dev** — create `client/.env` or `server/.env` (both gitignored).
- **Production (Railway)** — variables are set in each service's **Variables** tab.

#### Client (`client/`)

| Variable         | Default                 | Description                                                                                                                                            |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_PROXY_URL` | `http://localhost:3001` | URL of the proxy server. Baked in at **build time** by Vite — changing it requires a rebuild. In production, must point at the deployed proxy service. |

#### Server (`server/`)

| Variable                | Default   | Description                                                                                                                                                            |
| ----------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | `3001`    | Port the proxy listens on. Railway auto-injects this, so it's rarely set manually in production. If you change it locally, set the client's `VITE_PROXY_URL` to match. |
| `REQUEST_TIMEOUT_MS`    | `10000`   | Timeout for one proxied request, across every redirect hop, in milliseconds. The client mirrors this in `engine/limits.ts`; keep the two in sync.                      |
| `MAX_BODY_SIZE_BYTES`   | `2097152` | Max response body size accepted from a target site, in bytes (2 MB). Larger responses are truncated.                                                                   |
| `RATE_LIMIT_PER_MINUTE` | `1000`    | Max requests per IP per minute. Excess requests receive a `429`.                                                                                                       |
| `ALLOWED_ORIGINS`       | `*`       | Comma-separated list of allowed CORS origins. Set to `https://krawly.dev` in production (`www.krawly.dev` forwards to the apex).                                       |
