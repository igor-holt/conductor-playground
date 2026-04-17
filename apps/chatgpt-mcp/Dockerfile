FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/chatgpt-mcp/package.json apps/chatgpt-mcp/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @genesis/contracts build && pnpm --filter @genesis/chatgpt-mcp build

FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable

COPY --from=build /app ./

ENV NODE_ENV=production
ENV PORT=2091

CMD ["node", "apps/chatgpt-mcp/dist/index.js"]
