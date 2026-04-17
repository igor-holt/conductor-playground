FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/operator-web/package.json apps/operator-web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @genesis/contracts build && pnpm --filter @genesis/operator-web build

FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable

COPY --from=build /app ./

ENV NODE_ENV=production
ENV PORT=3000

CMD ["pnpm", "--filter", "@genesis/operator-web", "start"]
