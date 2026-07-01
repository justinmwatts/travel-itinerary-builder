# TravelItineraryBuilder: Claude Code working agreement

A conversational travel itinerary builder with a public sharing feed. Users chat with a real AI endpoint to build and refine a multi-destination itinerary, add personal notes per destination, customize layout, then publish to a feed others can search and react to.

This file holds the durable rules and loads on every session. The detail lives in the two design documents. Read both in full before writing any code.

## Source of truth

- `design.md`: architecture, repo layout, data model, REST and SSE API contracts, AI integration and model config, security, edge cases, and the phased build plan in section 17.
- `ux-flows.md`: screens, states, user flows, responsive behavior, and the design language and Chakra theme in section 7.

Precedence: if this file conflicts with the design docs, the design docs win. If two parts of the docs conflict or anything is ambiguous, ask before guessing.

## Stack (fixed, do not substitute)

Monorepo, yarn workspaces: `packages/shared`, `apps/api`, `apps/web`.

- Backend: TypeScript, Express, Prisma with SQLite, zod validation, Anthropic Messages API over SSE, Pexels image proxy.
- Frontend: Vite, React, TypeScript, Chakra UI v3, React Query for server state, Zustand for client UI state, React Router data router.
- Decisions: REST not GraphQL. SSE not WebSockets. Email plus password with a JWT in an httpOnly cookie, no OAuth in v1. SQLite for v1 with a Postgres swap left open for later.

Do not introduce other frameworks or libraries to solve something the stack already covers. If you believe a new dependency is warranted, propose it and wait.

## Repo layout

```
travel-itinerary-builder/
  package.json            workspaces: apps/*, packages/*
  CLAUDE.md
  design.md
  ux-flows.md
  packages/shared/        zod schemas + inferred TS types (the contract)
  apps/api/               Express + Prisma + Anthropic + Pexels
    prisma/schema.prisma
    src/routes/ src/services/ src/middleware/ src/config/
  apps/web/               Vite + React + Chakra + React Query + Zustand
    src/routes/ src/features/ src/components/ src/stores/ src/lib/ src/theme.ts
```

## Working method

- Follow the build plan in `design.md` section 17, one phase at a time, Phase 0 first.
- At the end of each phase: run lint and typecheck, verify the phase acceptance criteria, give a short summary, commit, then stop and wait for my go-ahead. Never auto-start the next phase.
- Build only what the current phase specifies. Defer every v2 item (OAuth, comment threads, following, collaborative editing, drag-reorder). Do not add scope.
- Keep diffs reviewable. Prefer small, focused commits within a phase.

## Rules to honor throughout

- The shared zod schemas in `packages/shared` are the single source of truth for types. Never define a type in two places. The frontend imports inferred types, the backend validates with the same schemas.
- Secrets stay server-side only: `ANTHROPIC_API_KEY`, `PEXELS_KEY` and `DATABASE_URL` live in `apps/api/.env`, with a committed `apps/api/.env.example` listing them as placeholders. Never put a key in the web bundle, a URL, or the client.
- Validate every request body and param with zod. Return 422 on schema failure.
- Sanitize AI output and creator notes before rendering (DOMPurify). Treat model output as untrusted.
- The auth token lives only in the httpOnly, SameSite=Lax cookie. Never in localStorage.
- Authorization: ownership checks on every write, 403 on another user's resource, drafts readable only by their owner.
- Claude model config per `design.md` section 8: `claude-sonnet-4-6`, effort `low` via `output_config`, thinking off (omit the thinking block), and `CLAUDE_MAX_TOKENS`. Define these as global constants in `apps/api/src/config/anthropic.ts`.
- Chat destination reconciliation must preserve creator notes and resolved covers across refinements (`design.md` section 8). Match incoming destinations to existing rows by normalized name.
- Images: resolve covers only for new or changed destinations, after the `itinerary` SSE event, through the Pexels proxy plus cache. Store url, alt and credit. Render a deterministic fallback on a miss and a credit line on the detail view (Pexels license requirement).
- Reactions: heart and like only, gated to published itineraries, optimistic with rollback, unique on `(itineraryId, userId, type)`.
- Apply the Chakra theme and design tokens from `ux-flows.md` section 7. Light mode only in v1.

## Commands

Wire these as yarn workspace scripts in Phase 0, then update this section with the real names:

- `yarn dev:api`, `yarn dev:web`: run each app in watch mode
- `yarn lint`, `yarn typecheck`, `yarn test`: must all pass before each commit
- `yarn db:migrate`, `yarn db:seed`: Prisma migrate and seed

## Code conventions

- TypeScript strict mode. No `any` without a comment justifying it.
- ESLint plus Prettier. Lint and typecheck must pass before each commit.
- Co-locate frontend code by feature under `apps/web/src/features`.
- Conventional, descriptive names. Small functions, clear boundaries.
- Any prose you write (docs, comments, commit messages) uses no em dashes and no Oxford comma.

## Licensing

Every new first-party source file gets the proprietary copyright header (see LICENSE). The repo is private and UNLICENSED. Never add an open-source license.
