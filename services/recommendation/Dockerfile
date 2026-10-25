# Build from the repository root: docker build -f services/recommendation/Dockerfile .
FROM node:26.12.1-alpine AS build
RUN npm i -g pnpm@12.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @edulaunch/recommendation-service... \
 && pnpm turbo run build --filter @edulaunch/recommendation-service... \
 && pnpm deploy --filter @edulaunch/recommendation-service --prod /app

FROM node:26.12.1-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app .
USER node
EXPOSE 4103
CMD ["node", "dist/main.js"]
