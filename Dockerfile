FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Install system dependencies for better-sqlite3 and Electron headless
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsqlite3-dev \
    xvfb \
    libgtk-3-0 \
    libnotify-dev \
    libnss3 \
    libxss1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Run tests
FROM base AS test
CMD ["pnpm", "test"]

# Build
FROM base AS build
RUN pnpm run package

# Default: run tests
FROM base
CMD ["pnpm", "test"]
