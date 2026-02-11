# Changelog

All notable changes to this project follow [Conventional Commits](https://www.conventionalcommits.org/).

## [1.1.0] - 2026-02-09

### Added

- **Fly.io deployment** — Live demo at [secure-messenger-desktop.fly.dev](https://secure-messenger-desktop.fly.dev/) (Frankfurt region)
- **Automated native module rebuild** — `scripts/ensure-native.sh` tracks build target via marker file; `predev`/`pretest`/`premake` lifecycle scripts auto-rebuild `better-sqlite3` for Electron or Node.js as needed, eliminating manual `electron-rebuild` / `node-gyp rebuild` switching
- **Create chat** — New compose button (pen icon) in chat list header; type a name and press Enter to create a new conversation; wired end-to-end: DB → IPC → preload → Redux → Express API (`POST /api/chats`)
- **Send message** — Text input with send button at the bottom of the message view; messages are AES-256-GCM encrypted and stored in SQLite; chat list re-sorts on send; wired end-to-end: DB → IPC → preload → Redux → Express API (`POST /api/messages`)
- **Chat list scroll pagination** — Infinite scroll in `ChatList` with `onScroll` handler triggering `loadMoreChats` when near bottom
- **Dependabot** — Automated dependency updates for pnpm (`.github/dependabot.yml`)
- **HTML test reporter** — Visual test results via vitest HTML reporter

### Fixed

- **Health dashboard empty charts** — History `useEffect` depended on latency state values that changed every 2s, resetting the 3s interval before it could fire; moved to refs so the interval is stable
- **Health dashboard degraded on fly.io** — Thresholds were tuned for local Electron IPC; added mode-aware thresholds (500ms DB / 800ms IPC in web mode vs 50ms / 200ms in Electron)
- **Search and pagination infinite loop** — `useChatsActions` and `useMessagesActions` returned new function references every render, causing `useEffect` re-dispatch loops; stabilized with `useCallback` and `useMemo`
- **Theme toggle visibility** — Icon invisible in light mode (`color="inherit"`); fixed with `sx={{ color: 'text.primary' }}`
- **ESLint warnings** — Resolved all 37 warnings (unsafe `any` types, missing display names, unused variables)
- **Electron Forge production build** — Fixed `executableName` casing and path alias resolution

### Changed

- **WebSocket in web/Docker mode** — WS server now attaches to the HTTP server (`/ws` path) instead of a separate port 9876; enables single-port deployments (Fly.io, Render, Railway)
- **Docker Compose** — Removed separate WS port mapping since WS shares the HTTP port
- **Browser WS client** — Connects via `wss://host/ws` (protocol-aware) instead of hardcoded `ws://host:9876`

---

## [1.0.0] - 2026-02-09

### Initial Release: Chat List + Sync Simulator

#### feat: scaffold electron + react + typescript project

- Initialized Electron Forge with Vite plugin + TypeScript
- Configured `vite.main.config.ts`, `vite.renderer.config.ts`, `vite.preload.config.ts`
- Set up `tsconfig.json` with strict mode, path aliases
- Added `index.html` entry point, `forge.config.ts` packaging config
- Configured pnpm as package manager with native module build approvals

#### feat(db): add SQLite schema, seed data, and paginated queries

- Created `schema.ts` with WAL mode, foreign keys, composite indexes
- Indexes: `idx_chats_last_message`, `idx_messages_chat_ts` (composite), `idx_messages_body`
- Seeded 200 chats with 20K+ encrypted messages via transaction batching
- Implemented cursor-based pagination (`WHERE ts < ? ORDER BY ts DESC LIMIT ?`)
- Decrypt-then-filter search (AES-256-GCM ciphertext not searchable via SQL LIKE)

#### feat(security): implement AES-256-GCM encryption service

- AES-256-GCM authenticated encryption with 96-bit random IV, 128-bit auth tag
- Singleton pattern with key persistence (filesystem with 0600 permissions)
- Tamper detection via GCM authentication tag verification
- Key generation via `crypto.randomBytes(32)` — 256-bit keys
- Wire format: `base64(iv):base64(authTag):base64(ciphertext)`

#### feat(ws): add WebSocket server and client with reconnection

- Local WS server emitting simulated messages every 1-3 seconds
- Heartbeat ping/pong health monitoring (30s interval)
- Exponential backoff reconnection: 1s → 2s → 4s → 8s... max 30s, max 10 retries
- Connection state broadcast to renderer via IPC

#### feat(ipc): implement contextBridge IPC API and main process

- Typed `contextBridge.exposeInMainWorld()` with `ElectronAPI` interface
- `contextIsolation: true`, `nodeIntegration: false` security posture
- IPC handlers: getChats, getMessages, searchMessages, seedDatabase, simulateDisconnect
- Event listeners with cleanup: `onConnectionState`, `onNewMessage`

#### feat(store): add Redux Toolkit slices for chats, messages, connection

- `connectionSlice`: state machine (connected → reconnecting → offline)
- `chatsSlice`: paginated chat list, selectChat, updateChatLastMessage, markRead
- `messagesSlice`: message list with loadOlder, search, clearSearch, addMessage
- `configureStore` with typed hooks (`useAppSelector`, `useAppDispatch`)

#### feat(theme): add MUI dark/light theme with Plus Jakarta Sans

- `createTheme()` for dark and light modes with Plus Jakarta Sans Variable font
- `ThemeProvider` context with localStorage persistence
- `ThemeToggle` component with lucide-react Sun/Moon icons
- Smooth CSS transitions on theme switch

#### feat(ui): add core chat components

- `ChatList`: react-window `FixedSizeList` (72px rows, 10 overscan), useMemo/useCallback
- `ChatRow`: MUI Badge for unread count, timestamp formatting, hover states
- `MessageView`: react-virtuoso with `followOutput`, `startReached` for load-older
- `MessageBubble`: sender color coding, timestamp, alignment (sent vs received)

#### feat(search): add message search with debounce and voice input

- `MessageSearch`: 300ms debounce, 3+ char minimum, LinearProgress indicator
- `useDebounce` hook for value debouncing, `useDebouncedCallback` for functions
- `VoiceSearchButton`: Web Speech API with real-time transcript
- `useSpeechRecognition` hook adapted from production system

#### feat(ui): add connection status and snackbar notifications

- `ConnectionStatus`: MUI Chip with lucide-react Wifi/WifiOff/Loader2 icons
- `SnackbarProvider`: queued notifications for connection changes, new messages, errors
- `useSnackbar` hook for app-wide notification dispatch

#### feat(health): add system health monitoring dashboard

- `SystemHealthIndicator`: header chip (green/yellow/red) with click-to-expand
- `SystemHealthModal`: Grafana-style dashboard with recharts
  - Latency line chart (WS, DB, IPC) with threshold markers
  - Throughput area chart (messages/s, queries/s)
  - Service status grid with individual health indicators
  - Metric cards for key performance indicators
- `useSystemHealth` hook: polls latencies every 2s, computes health level

#### feat(metrics): add Prometheus metrics and OpenAPI spec

- `MetricsCollector` with prom-client: counters, histograms, gauges
  - `messenger_messages_received_total`, `messenger_db_query_duration_seconds`
  - `messenger_ipc_call_duration_seconds`, `messenger_ws_connection_state`
- OpenAPI 3.0 YAML spec documenting all IPC endpoints and WebSocket events
- Node.js default metrics collection (CPU, memory, event loop)

#### test: comprehensive test suite (81 tests)

- **Security:** 16 tests — AES-256-GCM round-trip, tamper detection, wrong key, unicode, batch
- **DB queries:** 19 tests — pagination, search, insert, getById, edge cases
- **DB seed:** 7 tests — seeding, encrypted bodies, idempotency, timestamps
- **Connection slice:** 10 tests — state machine transitions, reset
- **Chats slice:** 6 tests — selectChat, updateLastMessage, reset
- **Messages slice:** 5 tests — addMessage, clear, clearSearch
- **WS integration:** 4 tests — connection, messages, DB writes
- **Pact contracts:** 14 tests — WS event schema validation

#### chore: add DevOps, linting, and conventional commits

- Dockerfile (multi-stage) + docker-compose.yml
- GitHub Actions CI: lint → typecheck → test → build
- ESLint strict config: `no-explicit-any: error`, type-checked rules
- Prettier + lint-staged (pre-commit)
- Gitleaks security scanning (pre-commit)
- TypeScript type checking (pre-commit)
- Commitlint with conventional commits (commit-msg hook)
- fly.toml for deployment

#### feat(docker): add web stack with Prometheus + Grafana observability

- Bridge abstraction: same React UI works in Electron (IPC) and browser (fetch + WebSocket)
- `webBridge.ts` implements `ElectronAPI` using `fetch()` + browser WebSocket with reconnect
- Express REST API (`src/server/app.ts`) maps to existing DB query functions
- Portable DB module: dynamic `require('electron')` with fallback to `process.env.DB_PATH`
- Multi-stage Dockerfile: deps → test → build → production (no Xvfb/X11)
- Docker Compose: app (:3000), Prometheus (:9090), Grafana (:3001) with auto-provisioned dashboards
- Native mode: `docker-compose.native.yml` for Prometheus + Grafana scraping `host.docker.internal`
- `scripts/start-full-stack.sh` — one command for Electron + observability stack
- Vite web build configs: `vite.web.config.mts` (SPA) + `vite.server.config.mts` (CJS server)
- Pre-push hook: detects changed files, rebuilds web artifacts if needed, runs tests
- Embedded Express server in Electron main process for Prometheus `/metrics` endpoint

#### ci: move test artifacts to CI/CD pipeline

- JUnit XML and coverage JSON generated as GitHub Actions artifacts (not committed)
- CI workflow: `Lint → Test (+ JUnit + coverage) → Build (macOS, Windows, Linux)`
- `test-results-junit.xml` and `test-coverage.json` added to `.gitignore`
- README updated to reference CI/CD artifacts instead of committed files

#### fix(docker): fix production container build

- Use `--ignore-scripts` + `pnpm rebuild better-sqlite3` to skip husky in production
- Fix Express 5 catch-all route: `'*'` → `'/{*path}'` (path-to-regexp v8 breaking change)

#### docs: README with architecture diagrams

- Mermaid diagrams: architecture, data flow, state machine, encryption boundary
- Technical decisions table with trade-off analysis
- SQLite optimization documentation (WAL, indexes, EXPLAIN QUERY PLAN)
- Security design documentation
- Evaluation criteria answers
- Package attribution table
- CI/CD pipeline section with artifact descriptions
- Web mode, Docker full stack, and native mode documentation
