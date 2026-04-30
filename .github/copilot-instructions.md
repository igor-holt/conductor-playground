# Copilot Instructions

## Important: Next.js 16

This project uses **Next.js 16** with React 19, which has breaking changes from earlier versions. Before writing any Next.js code, consult the documentation in `node_modules/next/dist/docs/` to verify current APIs and conventions.

## Commands

```bash
pnpm dev      # Start development server (localhost:3000)
pnpm build    # Production build
pnpm lint     # ESLint with Next.js rules
```

## Architecture

- **App Router**: Uses `src/app/` directory structure
- **Styling**: Tailwind CSS v4 with `@import "tailwindcss"` syntax
- **Path alias**: `@/*` maps to `./src/*`

## Conventions

- Geist font family via `next/font/google` (sans and mono variants exposed as CSS variables)
- Dark mode support via `prefers-color-scheme` media query
- CSS theme variables defined in `globals.css` using `@theme inline`
