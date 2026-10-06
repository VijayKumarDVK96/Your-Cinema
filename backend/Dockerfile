##################################################
# Stage 1: Builder – compile TypeScript
##################################################
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

##################################################
# Stage 2: Production dependencies only
##################################################
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

##################################################
# Stage 3: Lean Production image
##################################################
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy prod dependencies and compiled dist from previous stages
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Run with non-root user
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]
