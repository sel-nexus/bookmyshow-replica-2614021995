FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV API_PROXY_TARGET=http://backend:4000
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN NODE_ENV=production node node_modules/next/dist/bin/next build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
