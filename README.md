## Temporal Semantic Manifold Prototype

A full-stack playground for exploring a user’s experiences as a temporal-semantic field. The system stores timestamped semantic nodes, overlapping communities, and directed relationships; the UI renders them as a living 3D manifold where **x/y** encode semantic similarity and **z** captures time.

### Stack

- **Frontend**: Next.js App Router (TypeScript), Tailwind CSS, `@react-three/fiber`, `@react-three/drei`
- **State / Data**: React Query, custom hooks for REST APIs
- **Backend**: Next.js route handlers, Prisma ORM
- **Database**: PostgreSQL via Docker Compose
- **Data generation**: `prisma/seed.ts` builds ~300 events, overlapping communities, and similarity edges

---

## Project Structure

```
├── docker-compose.yml        # Postgres service (5433)
├── env.sample                # Copy to .env before running locally
├── prisma/
│   ├── migrations/           # Generated via Prisma Migrate
│   ├── schema.prisma         # Community / Node / Edge schema
│   └── seed.ts               # Temporal-semantic synthetic data
├── src/
│   ├── app/api/...           # REST endpoints for communities, nodes, edges
│   ├── app/page.tsx          # Main manifold explorer
│   ├── components/
│   │   ├── manifold-scene.tsx
│   │   └── query-provider.tsx
│   ├── hooks/use-manifold-data.ts
│   ├── lib/prisma.ts
│   └── types/manifold.ts
```

---

## Getting Started

1. **Copy environment variables**

   ```bash
   cp env.sample .env
   ```

   The default connection string points to the Dockerized Postgres instance on port **5433**.

2. **Launch Postgres**

   ```bash
   docker compose up -d
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Run migrations**

   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/temporal_semantic?schema=public" \
   npm run prisma:migrate
   ```

5. **Seed the manifold**

   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/temporal_semantic?schema=public" \
   npm run db:seed
   ```

6. **Start the dev server**

   ```bash
   npm run dev
   ```

7. **Explore the prototype** at [http://localhost:3000](http://localhost:3000)

To stop Postgres when you’re done: `docker compose down`.

---

## API Overview

| Endpoint | Description |
| --- | --- |
| `GET /api/communities` | Returns community metadata + colors for the legend |
| `GET /api/nodes?from=&to=&communityId=` | Filters nodes by time range and/or dominant community (defaults to last 7 days) |
| `GET /api/edges?from=&to=&nodeIds=` | Returns edges within a time window, optionally scoped to specific node IDs |

Each node bundles its embedding, metadata blob, and membership strengths for every overlapping community.

---

## 3D Visualization Model

- **Semantic plane (x/y)**: First two embedding dimensions, normalized to ±12 (simple projection for clarity; swap in PCA easily).
- **Temporal axis (z)**: Oldest nodes descend toward `z = -16`, newest rise to `z = 16`.
- **Nodes**: Spheres sized by dominant community membership strength, colored via the community palette, with subtle emissive glow on selection.
- **Edges**: Directed lines between temporally close, semantically similar nodes. Selecting a node highlights its incident edges; others fade.
- **Controls**:
  - Dual range sliders to scrub any window inside the 30-day dataset.
  - Dropdown + color legend for communities (overlaps highlighted).
  - Toggles to show/hide edges and tooltip labels.
  - Hover reveals timestamp + communities; click locks focus.

---

## Customization Tips

- **Seed density**: Edit `NODE_COUNT`, `WINDOW_DAYS`, or noise parameters in `prisma/seed.ts`.
- **Edge logic**: Adjust `MAX_EDGE_DAYS` or the cosine similarity threshold to change graph sparsity.
- **Projection**: Swap the simple `[embedding[0], embedding[1]]` projection inside `projectManifold` with PCA or t-SNE for richer layouts.
- **UI tweaks**: Tailwind-enabled layout makes it easy to add new panels (e.g., timeline playback or analytics).

---

## Useful Commands

```bash
docker compose up -d         # start Postgres
docker compose down          # stop Postgres
npm run prisma:migrate       # run migrations (requires DATABASE_URL)
npm run db:seed              # generate synthetic manifold data
npm run dev                  # start Next.js dev server
npm run build && npm start   # production build
```

Enjoy exploring the Temporal Semantic Manifold! Feel free to extend the schema, seed script, or visualization to match your research workflow.*** End Patch
