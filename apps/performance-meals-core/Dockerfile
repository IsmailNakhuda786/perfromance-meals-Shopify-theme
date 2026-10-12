FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY . .
RUN npm ci --no-audit --no-fund
ARG PERFORMANCE_MEALS_APP_URL
ENV PERFORMANCE_MEALS_APP_URL=$PERFORMANCE_MEALS_APP_URL
RUN DATABASE_URL=postgresql://build@localhost:5432/build DIRECT_DATABASE_URL=postgresql://build@localhost:5432/build npm exec prisma generate -- --schema prisma/production/schema.prisma && npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3000
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/app/services/runtime-config.server.ts ./app/services/runtime-config.server.ts
CMD ["npm", "run", "docker-start"]
