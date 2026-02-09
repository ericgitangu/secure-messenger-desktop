# Secure Messenger Desktop — Chat List + Sync Simulator

[![CI](https://github.com/ericgitangu/secure-messenger-desktop/actions/workflows/ci.yml/badge.svg)](https://github.com/ericgitangu/secure-messenger-desktop/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-40-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![AES-256-GCM](https://img.shields.io/badge/Encryption-AES--256--GCM-critical.svg)]()

> Technical assessment: Electron + React + TypeScript secure messenger client with real-time sync, virtualized lists, and AES-256-GCM encryption.

**Time-boxed:** ~4 hours. See [What Remains](#what-id-improve-with-more-time) for documented future work.

---

## Candidate

**Eric Gitangu** | Senior Software Engineer Architect | 10+ years

|           |                                                                |
| --------- | -------------------------------------------------------------- |
| Email     | developer.ericgitangu@gmail.com                                |
| Phone     | +1 (978) 710-9475                                              |
| Portfolio | [developer.ericgitangu.com](https://developer.ericgitangu.com) |
| Resume    | [resume.ericgitangu.com](https://resume.ericgitangu.com)       |
| GitHub    | [github.com/ericgitangu](https://github.com/ericgitangu)       |

---

## Quick Start

```bash
git clone https://github.com/ericgitangu/secure-messenger-desktop.git
cd secure-messenger-desktop
pnpm install
pnpm dev          # Launch Electron app with seeded data
pnpm test         # Run 80+ tests (unit, integration, contract)
pnpm lint         # ESLint (strict: no-any, React perf rules)
pnpm make         # Build for production (macOS/Windows/Linux)
```

### Web Mode (Browser)

```bash
pnpm server:dev   # Vite dev server + Express API — open http://localhost:3000
```

### Docker (Full Stack with Observability)

**Prerequisites:**

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v4.x+) or Docker Engine (v24+) with Compose V2
- At least 4 GB RAM allocated to Docker
- macOS, Windows (WSL2), or Linux

```bash
# Launch the full web stack (app + Prometheus + Grafana)
docker compose up --build

# Tear down
docker compose down --volumes --remove-orphans

# Run tests / lint in containers
docker compose run test
docker compose run lint
```

**Access URLs:**

| Service       | URL                           | Credentials   |
| ------------- | ----------------------------- | ------------- |
| Messenger UI  | http://localhost:3000         | —             |
| WebSocket     | ws://localhost:9876           | —             |
| Prometheus    | http://localhost:9090         | —             |
| Grafana       | http://localhost:3001         | admin / admin |
| Metrics (raw) | http://localhost:3000/metrics | —             |

**Architecture:**

```
Browser → :3000 (Express: React SPA + REST API)
       → :9876 (WebSocket: real-time messages)

Prometheus :9090 → scrapes :3000/metrics every 5s
Grafana :3001 → queries Prometheus → "Secure Messenger" dashboard
```

The same React UI works in both **Electron** (native desktop via IPC) and **Browser** (Docker/web via fetch + WebSocket) modes, powered by a runtime bridge abstraction that detects the environment and returns the correct `ElectronAPI` implementation.

### Full Stack Native Mode (Electron + Observability)

Run the native Electron desktop app with Prometheus + Grafana observability:

```bash
pnpm start:full   # Starts Docker services + Electron in one command
```

This will:

1. Check if the web build is up to date (rebuilds if source changed)
2. Start Prometheus (:9090) and Grafana (:3001) in Docker
3. Wait for services to be healthy
4. Launch the native Electron app with an embedded Express server (:3000/metrics)

Prometheus scrapes metrics from the Electron main process via `host.docker.internal:3000`. Grafana dashboards show the same panels as Docker-only mode.

**Manual control:**

```bash
pnpm docker:native        # Start just the Docker services (Prometheus + Grafana)
pnpm dev                  # Start just Electron (with embedded Express on :3000)
pnpm docker:native:down   # Stop the Docker services
```

### All Available Scripts

| Script               | Description                                  |
| -------------------- | -------------------------------------------- |
| `pnpm dev`           | Launch native Electron app                   |
| `pnpm start:full`    | Electron + Prometheus + Grafana (full stack) |
| `pnpm server:dev`    | Browser mode: Vite dev + Express API         |
| `pnpm build:web`     | Build SPA + server for production            |
| `pnpm docker:up`     | Docker Compose: app + Prometheus + Grafana   |
| `pnpm docker:down`   | Tear down Docker stack                       |
| `pnpm docker:native` | Start only Prometheus + Grafana in Docker    |
| `pnpm test`          | Run test suite                               |
| `pnpm lint`          | ESLint                                       |

### Git Hooks

| Hook            | What it does                                                        |
| --------------- | ------------------------------------------------------------------- |
| **pre-commit**  | lint-staged + gitleaks + TypeScript type check                      |
| **commit-msg**  | Conventional commit validation                                      |
| **post-commit** | Fast test run                                                       |
| **pre-push**    | Detects changed files, rebuilds web artifacts if needed, runs tests |

The **pre-push** hook ensures pushed code always has up-to-date build artifacts. It diffs against the upstream branch, and if `src/`, config, or Docker files changed, it triggers the appropriate rebuilds before allowing the push.

---

## Architecture

```mermaid
graph TB
    subgraph "Electron Main Process"
        WS_SERVER[/"WS Server<br/>ws://localhost:9876"/]
        WS_CLIENT["WS Client<br/>+ Heartbeat<br/>+ Exp. Backoff"]
        DB["SQLite<br/>(better-sqlite3)<br/>WAL Mode"]
        SEC["SecurityService<br/>AES-256-GCM"]
        METRICS["Prometheus Metrics<br/>(prom-client)"]
        IPC_MAIN["IPC Handlers<br/>(ipcMain)"]
    end

    subgraph "Preload (contextBridge)"
        BRIDGE["Typed IPC API<br/>contextIsolation: true<br/>nodeIntegration: false"]
    end

    subgraph "Renderer Process (React 19)"
        REDUX["Redux Toolkit Store"]
        CHATS_SLICE["chatsSlice"]
        MSG_SLICE["messagesSlice"]
        CONN_SLICE["connectionSlice"]
        UI["React Components"]
        VIRT_LIST["react-window<br/>(Chat List)"]
        VIRT_MSG["react-virtuoso<br/>(Message List)"]
        HEALTH["System Health<br/>Dashboard"]
        THEME["MUI ThemeProvider<br/>Dark/Light"]
    end

    WS_SERVER -->|"emit 1-3s"| WS_CLIENT
    WS_CLIENT -->|"write"| DB
    DB <-->|"encrypt/decrypt"| SEC
    WS_CLIENT -->|"notify"| IPC_MAIN
    IPC_MAIN <-->|"contextBridge"| BRIDGE
    BRIDGE <-->|"typed API"| REDUX
    REDUX --> CHATS_SLICE
    REDUX --> MSG_SLICE
    REDUX --> CONN_SLICE
    REDUX --> UI
    UI --> VIRT_LIST
    UI --> VIRT_MSG
    UI --> HEALTH
    UI --> THEME
    IPC_MAIN --> METRICS

    style SEC fill:#dc2626,color:#fff
    style DB fill:#2563eb,color:#fff
    style REDUX fill:#7c3aed,color:#fff
    style WS_SERVER fill:#059669,color:#fff
```

### Data Flow

```mermaid
sequenceDiagram
    participant WS as WS Server
    participant Client as WS Client (Main)
    participant SEC as SecurityService
    participant DB as SQLite
    participant IPC as IPC Bridge
    participant Redux as Redux Store
    participant UI as React UI

    loop Every 1-3 seconds
        WS->>Client: new_message event
        Client->>SEC: encrypt(body)
        SEC-->>Client: AES-256-GCM ciphertext
        Client->>DB: INSERT (encrypted)
        Client->>IPC: notify renderer
        IPC->>Redux: dispatch(addMessage)
        Redux->>UI: re-render (virtualized)
    end

    Note over UI: User selects chat
    UI->>Redux: dispatch(selectChat)
    Redux->>IPC: getMessages(chatId)
    IPC->>DB: SELECT with pagination
    DB->>SEC: decrypt(body)
    SEC-->>IPC: plaintext
    IPC-->>Redux: Message[]
    Redux-->>UI: render via react-virtuoso
```

### Connection State Machine

```mermaid
stateDiagram-v2
    [*] --> Connected: WS handshake
    Connected --> Reconnecting: connection lost / heartbeat timeout
    Reconnecting --> Connected: reconnect success
    Reconnecting --> Reconnecting: retry with backoff (1s, 2s, 4s... 30s max)
    Reconnecting --> Offline: max retries (10) exceeded
    Offline --> Connected: manual retry / server restart
    Offline --> Reconnecting: auto-retry trigger

    note right of Connected: Heartbeat ping every 5s
    note right of Reconnecting: Exponential backoff
    note right of Offline: UI shows "Simulate Drop" for recovery
```

---

## Technical Decisions & Trade-offs

| Decision                   | Choice                         | Rationale                                                                                                                                       |
| -------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database**               | `better-sqlite3`               | Synchronous C++ binding — 5-10x faster than sql.js (WASM). WAL mode for concurrent reads. Sync I/O in main process doesn't block renderer.      |
| **Encryption**             | AES-256-GCM (Node.js `crypto`) | Authenticated encryption — 96-bit random IV per message, 128-bit auth tag for tamper detection. Production path: Signal Protocol via libsignal. |
| **State Management**       | Redux Toolkit                  | Assessment requires Redux. `createSlice` maps cleanly to connection state machine. RTK DevTools for debugging.                                  |
| **Chat Virtualization**    | `react-window` `FixedSizeList` | Fixed 72px rows, 200 items. Smallest bundle, fastest for uniform rows.                                                                          |
| **Message Virtualization** | `react-virtuoso` `Virtuoso`    | Variable-height bubbles, `startReached` for load-older, `followOutput` for auto-scroll. Purpose-built for chat UX.                              |
| **UI Framework**           | MUI v7 + lucide-react          | Chip (connection), Badge (unread), Snackbar (notifications), Dialog (health modal).                                                             |
| **Typography**             | Plus Jakarta Sans (variable)   | Modern Google Font via @fontsource for offline Electron. Roboto Mono for timestamps.                                                            |
| **WebSocket**              | `ws` (Node-native)             | Lightweight, no browser polyfill needed in main process. Heartbeat + ping built-in.                                                             |
| **Search**                 | Debounced (300ms, 3+ chars)    | In-memory decrypt-then-filter for encrypted bodies. Debounce prevents excessive queries.                                                        |
| **Voice Search**           | Web Speech API (native)        | Zero dependencies. Real-time transcript. Adapted from production system.                                                                        |
| **Metrics**                | `prom-client` + recharts       | Prometheus-compatible counters/histograms in main process. Recharts for Grafana-like dashboard.                                                 |
| **Package Manager**        | pnpm                           | Faster installs, strict node_modules, disk-efficient content-addressable store.                                                                 |

---

## SQLite Schema & Optimization

### Schema

```sql
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  lastMessageAt INTEGER NOT NULL,
  unreadCount INTEGER DEFAULT 0
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chatId TEXT NOT NULL,
  ts INTEGER NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,  -- AES-256-GCM encrypted
  FOREIGN KEY (chatId) REFERENCES chats(id)
);
```

### Indexes & Query Optimization

| Index                                         | Query Pattern               | EXPLAIN QUERY PLAN                                                     |
| --------------------------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `idx_chats_last_message (lastMessageAt DESC)` | Chat list pagination        | `SCAN chats USING INDEX idx_chats_last_message`                        |
| `idx_messages_chat_ts (chatId, ts DESC)`      | Message pagination per chat | `SEARCH messages USING INDEX idx_messages_chat_ts (chatId=? AND ts<?)` |
| `idx_messages_body (body)`                    | Full-body match (encrypted) | Used for exact-match lookups on encrypted bodies                       |

**Normalization:** Two-table design (chats + messages) in 3NF. `chatId` FK enforces referential integrity. No denormalization needed at this scale.

**Pagination:** Cursor-based using `ts < ?` (keyset pagination) instead of `OFFSET` — avoids full table scans on large datasets. Chat list uses offset pagination since the dataset is bounded (200 chats).

**WAL Mode:** Enabled for concurrent reads. Allows the renderer to query while the main process writes new messages from WebSocket.

**Lazy Loading:** Messages load on-demand when a chat is selected (last 50). "Load older" fetches the next page using cursor-based pagination. Chat list fetches in pages of 50.

---

## Security Design

### AES-256-GCM Encryption Boundary

```mermaid
graph LR
    A["Plaintext<br/>(user input)"] -->|"SecurityService.encrypt()"| B["AES-256-GCM<br/>iv:authTag:ciphertext"]
    B -->|"SQLite write"| C[("Database<br/>(encrypted at rest)")]
    C -->|"SQLite read"| D["AES-256-GCM<br/>ciphertext"]
    D -->|"SecurityService.decrypt()"| E["Plaintext<br/>(UI display)"]

    style B fill:#dc2626,color:#fff
    style D fill:#dc2626,color:#fff
    style C fill:#2563eb,color:#fff
```

**Implementation details:**

- **Algorithm:** AES-256-GCM (authenticated encryption with associated data)
- **Key:** 256-bit, generated via `crypto.randomBytes(32)` on first launch
- **IV:** 96-bit random per encryption (NIST SP 800-38D recommendation)
- **Auth Tag:** 128-bit for tamper detection
- **Key Storage:** `{userData}/.encryption-key` with `0600` permissions (owner read/write only)
- **Format:** `base64(iv:authTag:ciphertext)` — all components base64-encoded

**Production upgrade path:**

1. Hardware-backed keystore (macOS Keychain, Windows DPAPI, Linux Secret Service)
2. Signal Protocol via `libsignal-client` for E2E encryption
3. X3DH key exchange + Double Ratchet for forward secrecy

**No plaintext leaks:**

- No `console.log` of message bodies in codebase
- ESLint rule `no-console` enforces this
- All DB reads go through `SecurityService.decrypt()`
- Tampered ciphertext detected via auth tag verification

### Process Isolation

| Setting            | Value                | Purpose                                                   |
| ------------------ | -------------------- | --------------------------------------------------------- |
| `contextIsolation` | `true`               | Renderer cannot access Node.js APIs                       |
| `nodeIntegration`  | `false`              | No `require()` in renderer                                |
| `sandbox`          | `false`              | Required for preload IPC (production: `true` with worker) |
| IPC                | `contextBridge` only | Typed API contract, no raw `ipcRenderer`                  |

---

## System Health Dashboard

The header includes a **System Health Indicator** (healthy/degraded/unhealthy) that opens a full monitoring dashboard when clicked:

### Metrics Collected

- **WebSocket Latency:** Round-trip time to WS server
- **Database Latency:** SQLite query response time
- **IPC Round-trip:** Main ↔ renderer IPC latency
- **Throughput:** Messages/second, queries/second
- **Reconnect Count:** WebSocket reconnection attempts
- **Encryption:** AES-256-GCM status indicator

### Prometheus Integration

Metrics are collected via `prom-client` in the main process:

- `messenger_messages_received_total` (Counter)
- `messenger_db_query_duration_seconds` (Histogram)
- `messenger_ipc_call_duration_seconds` (Histogram)
- `messenger_ws_connection_state` (Gauge)
- `messenger_encryption_operations_total` (Counter)

### Visualization

Recharts-powered dashboard with:

- Real-time latency line chart (WS/DB/IPC)
- Throughput area chart (messages/s, queries/s)
- Service status grid with per-service health indicators
- Metric cards for key performance indicators

---

## Search Architecture

### Debounced Search

- **Trigger:** After 3+ characters typed, with 300ms debounce
- **Scope:** Current chat or global (all chats)
- **Implementation:** Decrypt-then-filter in memory (required because bodies are encrypted at rest)

### Voice Search

- **API:** Web Speech API (browser-native, zero dependencies)
- **Flow:** Voice → transcript → debounced search pipeline
- **Adapted from:** Production system ([unicorns project](https://github.com/ericgitangu))

### Future: Semantic Search

With more time, semantic search via embeddings:

1. Generate embeddings at write time (before encryption) using a local model
2. Store embeddings in a separate SQLite table (not encrypted — they're not invertible)
3. Vector similarity search using cosine distance
4. FTS5 as intermediate step before full semantic search

---

## Evaluation Criteria — How We Meet Them

### SQLite Usage Quality

- **Indexes:** 3 targeted indexes (`lastMessageAt DESC`, composite `chatId + ts DESC`, `body`)
- **Pagination:** Cursor-based for messages (`ts < ?`), offset-based for bounded chat list
- **No full table loads:** All queries use `LIMIT` + pagination. Search decrypts in-memory but streams results with early termination
- **WAL mode:** Enabled for concurrent read/write
- **Foreign keys:** Enforced with `PRAGMA foreign_keys = ON`

### Connection Reliability

- **State machine:** 3-state (Connected → Reconnecting → Offline) implemented as Redux slice
- **Exponential backoff:** 1s, 2s, 4s, 8s... max 30s, max 10 retries
- **Heartbeat:** Ping every 5s, timeout at 10s
- **Recovery:** "Simulate Drop" button for testing, auto-recovery on server restart

### React Performance

- **Chat list:** `react-window` `FixedSizeList` — renders only visible rows (~8-10 of 200)
- **Message list:** `react-virtuoso` `Virtuoso` — variable height, bi-directional scroll
- **Minimal re-renders:** `React.memo` on ChatRow/MessageBubble, `useCallback` for handlers
- **Debounced search:** 300ms debounce prevents excessive re-renders during typing

### Architecture

- **Module boundaries:** Main process (DB, WS, Security), Preload (IPC bridge), Renderer (React, Redux)
- **Clean data flow:** WS → DB → IPC → Redux → React (unidirectional)
- **Testability:** 80+ tests across unit (DB, store, security), integration (WS), and contract (Pact)
- **Type safety:** Strict TypeScript, ESLint `no-explicit-any: error`, typed IPC contracts

### Security Discipline

- **Encryption:** AES-256-GCM on all message bodies (not a placeholder — real crypto)
- **No leaks:** `no-console` ESLint rule, no plaintext in logs
- **Auth tags:** Tampered ciphertext is detected and rejected
- **Key management:** Per-device key with restrictive file permissions
- **Process isolation:** `contextIsolation: true`, `nodeIntegration: false`

---

## Functional Requirements Checklist

| Requirement                   | Status | Implementation                                        |
| ----------------------------- | ------ | ----------------------------------------------------- |
| **A) SQLite local storage**   | Done   | `better-sqlite3` with WAL mode                        |
| Schema (chats + messages)     | Done   | 2-table 3NF design with FK constraints                |
| Seed 200 chats + 20K messages | Done   | Transaction-wrapped seeding, idempotent               |
| Chat list with pagination     | Done   | `ORDER BY lastMessageAt DESC LIMIT ? OFFSET ?`        |
| Message pagination            | Done   | Cursor-based `WHERE ts < ? ORDER BY ts DESC LIMIT 50` |
| Basic search (substring)      | Done   | Debounced, 3+ chars, decrypt-then-filter              |
| **B) WebSocket sync**         | Done   | `ws` server emits every 1-3s                          |
| Event format                  | Done   | `{ chatId, messageId, ts, sender, body }`             |
| Write to DB + update UI       | Done   | WS Client → SQLite → IPC → Redux → React              |
| **C) Connection Health**      | Done   | 3-state machine with exponential backoff              |
| State indicator               | Done   | MUI Chip (Connected/Reconnecting/Offline)             |
| Heartbeat                     | Done   | Ping every 5s, timeout 10s                            |
| Exponential backoff           | Done   | 1s → 30s max, 10 retries                              |
| Simulate disconnect           | Done   | Button in header, terminates WS connections           |
| **D) UI Performance**         | Done   | Virtualized chat list + message list                  |
| Unread count + mark read      | Done   | Badge component, mark on chat selection               |
| Load older messages           | Done   | "Load older" button + `startReached` in Virtuoso      |

---

## API Documentation

The IPC API is documented in OpenAPI 3.0 format:

- **Spec:** [`src/docs/openapi.yaml`](src/docs/openapi.yaml)
- **Endpoints:** 6 IPC handlers + 2 WebSocket event types
- **Schemas:** Chat, Message, NewMessageEvent, ConnectionState

---

## Build Issues Encountered & Solutions

During the 4-hour assessment, several build/runtime issues were identified and resolved:

### 1. pnpm + Electron Forge: `node-linker` error

**Problem:** Electron Forge requires hoisted `node_modules` for native module resolution, but pnpm uses symlinked stores by default.

```
Error: node-linker must be set to "hoisted" when using Electron Forge with pnpm
```

**Fix:** Created `.npmrc` with `node-linker=hoisted` and `shamefully-hoist=true`, then reinstalled.

### 2. Vite ESM/CJS conflict: `@vitejs/plugin-react`

**Problem:** `@vitejs/plugin-react` ships as ESM-only, but electron-forge's esbuild pipeline loaded `.ts` configs as CJS via `require()`.

```
Error: "@vitejs/plugin-react" resolved to an ESM file. ESM file cannot be loaded by require()
```

**Fix:** Renamed all Vite config files from `.ts` → `.mts` (explicit ESM module extension). Updated `forge.config.ts` references. Replaced `__dirname` (CJS-only) with `path.dirname(fileURLToPath(import.meta.url))`.

### 3. ws `bufferutil` optional dependency

**Problem:** Vite tried to bundle the `ws` library (used in Electron main process), which optionally imports native C++ addons `bufferutil` and `utf-8-validate`. These aren't installed and shouldn't be bundled.

```
Error: Could not resolve "bufferutil" imported by "ws". Is it installed?
```

**Fix:** Added `ws`, `bufferutil`, `utf-8-validate`, `prom-client`, and all Node.js built-in modules to `rollupOptions.external` in `vite.main.config.mts`. The main process runs in Node.js — native modules should be resolved at runtime, not bundled.

---

## What I'd Improve With More Time

1. **FTS5 full-text search** — Replace decrypt-then-filter with SQLite FTS5 for sub-ms search
2. **Semantic search** — Local embeddings for natural language queries
3. **Signal Protocol** — `libsignal-client` for E2E encryption with Double Ratchet
4. **Hardware keystore** — macOS Keychain / Windows DPAPI for key storage
5. **Offline message queue** — SQLite outbox table, sync on reconnect with vector clocks
6. **E2E tests** — Playwright for full UI automation
7. **Message reactions & threads** — Rich message model
8. **File sharing** — Encrypted attachments with thumbnails
9. **Auto-updater** — Squirrel-based updates via electron-forge
10. **i18n** — i18next for multi-language support
11. **Swagger UI** — Embedded OpenAPI viewer component
12. **Grafana integration** — Export Prometheus metrics to external Grafana instance

---

## Bonus Implementations

### AES-256-GCM Encryption (Real, Not Placeholder)

- 256-bit key, 96-bit random IV, 128-bit auth tag
- Tamper detection via GCM authentication
- 16 security-specific tests including wrong-key and tamper detection

### System Health Dashboard

- Header indicator (Healthy/Degraded/Unhealthy) with click-to-expand modal
- Real-time latency charts (WS, DB, IPC) via recharts
- Throughput visualization, service status grid, metric cards
- Prometheus-compatible metrics via prom-client

### Comprehensive Test Suite

| Type             | Tests  | Coverage                                                            |
| ---------------- | ------ | ------------------------------------------------------------------- |
| Unit (Security)  | 16     | AES-256-GCM round-trip, tamper detection, wrong key, batch, unicode |
| Unit (DB)        | 26     | Pagination, search, seeding, FK constraints, indexes                |
| Unit (Store)     | 21     | All reducers, state machine transitions, action creators            |
| Integration (WS) | 4      | Server → client → DB round-trip, message persistence                |
| Contract (Pact)  | 14     | WS event schema validation, discriminated unions                    |
| **Total**        | **81** |                                                                     |

**Verified results committed to repo:**

- [`test-results-junit.xml`](test-results-junit.xml) — JUnit XML (81 tests, 0 failures)
- [`test-coverage.json`](test-coverage.json) — Istanbul/V8 coverage data (JSON)

Run locally: `pnpm test` (all tests) · `pnpm test:coverage` (with coverage report)

### Voice Search (Web Speech API)

- Browser-native, zero dependencies
- Debounced integration (300ms, 3+ chars)
- Animated mic icon (lucide Mic/Loader2)

### Production Git Hooks

- **pre-commit:** lint-staged + gitleaks security scan + TypeScript type checking
- **post-commit:** Fast unit test run

---

## Package Attribution

| Package                                  | License    | Usage                                                         |
| ---------------------------------------- | ---------- | ------------------------------------------------------------- |
| `better-sqlite3`                         | MIT        | SQLite database (C++ binding, WAL mode)                       |
| `@reduxjs/toolkit`                       | MIT        | State management (createSlice, createAsyncThunk)              |
| `react-window`                           | MIT        | Chat list virtualization (FixedSizeList)                      |
| `react-virtuoso`                         | MIT        | Message list virtualization (variable height, bi-directional) |
| `@mui/material`                          | MIT        | ThemeProvider, Snackbar, Chip, Badge, Dialog, AppBar          |
| `lucide-react`                           | ISC        | Icons: HeartPulse, Activity, Shield, Mic, Search, Wifi, etc.  |
| `recharts`                               | MIT        | System health charts (LineChart, AreaChart)                   |
| `prom-client`                            | Apache-2.0 | Prometheus metrics collection                                 |
| `ws`                                     | MIT        | WebSocket server + client                                     |
| `@fontsource-variable/plus-jakarta-sans` | OFL-1.1    | Primary UI font (offline)                                     |
| `@fontsource/roboto-mono`                | Apache-2.0 | Monospace timestamps                                          |
| `vitest`                                 | MIT        | Test runner                                                   |
| `@testing-library/react`                 | MIT        | Component testing                                             |
| `@pact-foundation/pact`                  | MIT        | Consumer-driven contract tests                                |
| Web Speech API                           | N/A        | Voice search (browser native)                                 |
