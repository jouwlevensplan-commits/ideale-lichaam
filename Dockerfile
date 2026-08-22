# syntax=docker/dockerfile:1

# ---- Stage 1: build ----------------------------------------------------
# Compileert TypeScript naar JavaScript. devDependencies (typescript, @types/node)
# leven uitsluitend in deze stage en komen niet in het productie-image terecht.
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: production ------------------------------------------------
# Bevat alleen de gecompileerde output en de productie-dependencies.
FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# De officiële node:alpine-images bevatten al een niet-root gebruiker "node" (uid 1000).
USER node

EXPOSE 3000

# Vereist een "/health"-route in de HTTP-server (dist/server.js) die 200 teruggeeft.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
