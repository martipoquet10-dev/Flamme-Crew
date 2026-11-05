# Crew server — container image for any host (Render, Railway, Fly.io, a VPS…)
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit
COPY index.html sw.js ./
COPY src ./src
COPY assets ./assets
COPY tenants ./tenants
COPY server ./server
# Data lives on a persistent disk mounted here (see render.yaml)
ENV CREW_DATA_DIR=/data HOST=0.0.0.0 PORT=8090
EXPOSE 8090
CMD ["node", "server/server.mjs"]
