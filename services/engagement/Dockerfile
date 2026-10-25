# Build from the repository root: docker build -f services/engagement/Dockerfile .
FROM node:26.12.1-alpine AS build
RUN npm i -g pnpm@12.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @edulaunch/engagement-service... \
 && pnpm turbo run build --filter @edulaunch/engagement-service... \
 && pnpm deploy --filter @edulaunch/engagement-service --prod /app

FROM node:26.12.1-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app .
USER node
EXPOSE 4104
CMD ["node", "dist/main.js"]
