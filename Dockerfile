# ---- Stage 1: Dependencies ----
FROM node:20-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Native build tools for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ---- Stage 2: Test ----
FROM deps AS test

COPY . .
CMD ["pnpm", "test"]

# ---- Stage 3: Build ----
FROM deps AS build

COPY . .
RUN pnpm build:web

# ---- Stage 4: Production ----
FROM node:20-slim AS production

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Native build tools for better-sqlite3 (needed at runtime for native addon)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=build /app/dist ./dist

# Create data directory
RUN mkdir -p /app/.data

ENV NODE_ENV=production
ENV DB_PATH=/app/.data/messenger.db

EXPOSE 3000 9876

CMD ["node", "dist/server/index.cjs"]
