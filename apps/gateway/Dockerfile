# Build from the repository root: docker build -f apps/gateway/Dockerfile .
FROM node:26.12.1-alpine AS build
RUN npm i -g pnpm@12.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @edulaunch/gateway... \
 && pnpm turbo run build --filter @edulaunch/gateway... \
 && pnpm deploy --filter @edulaunch/gateway --prod /app

FROM node:26.12.1-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app .
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
