# Graph Report - va-node-site  (2026-06-04)

## Corpus Check
- 38 files · ~8,307 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 253 nodes · 363 edges · 18 communities (16 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27b7e945`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `useUiStore` - 16 edges
2. `compilerOptions` - 16 edges
3. `compilerOptions` - 14 edges
4. `useGraphStore` - 11 edges
5. `compilerOptions` - 11 edges
6. `AnimeEntry` - 9 edges
7. `useAuthStore` - 8 edges
8. `Character` - 6 edges
9. `scripts` - 6 edges
10. `scripts` - 6 edges

## Surprising Connections (you probably didn't know these)
- `AdminPanel()` --calls--> `useUiStore`  [EXTRACTED]
  client/src/components/Admin/AdminPanel.tsx → client/src/stores/uiStore.ts
- `EmptyState()` --calls--> `useUiStore`  [EXTRACTED]
  client/src/components/Canvas/GraphCanvas.tsx → client/src/stores/uiStore.ts
- `Props` --references--> `AnimeEntry`  [EXTRACTED]
  client/src/components/Canvas/AnimeDetailPanel.tsx → client/src/types/index.ts
- `Props` --references--> `AnimeEntry`  [EXTRACTED]
  client/src/components/Canvas/AnimeNode.tsx → client/src/types/index.ts
- `getUserId()` --calls--> `getGuestId()`  [EXTRACTED]
  server/src/routes/anime.ts → server/src/middleware/auth.ts

## Import Cycles
- None detected.

## Communities (18 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (27): getDb(), isDbAvailable(), User, getGuestId(), requireAdmin(), requireAuth(), router, getUserId() (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (12): devDependencies, drizzle-kit, tsx, @types/connect-pg-simple, @types/cors, @types/express, @types/express-session, @types/node (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.20
Nodes (15): AnimePanel(), AnilistResult, searchAnilist(), LoginModal(), GraphCanvas(), Navbar(), SearchBar(), useDebounce() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (20): dependencies, axios, react, react-dom, serve, zustand, devDependencies, @types/react (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (7): AdminPanel(), Tab, adminGetAnime(), adminGetCharacters(), adminGetUsers(), api, searchAnime()

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (19): getAnimeCharacters(), Props, AnimeNode(), COLORS, getAnimeColor(), Props, EmptyState(), charOrbitPos() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, lib, module, moduleResolution, outDir (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (12): devDependencies, concurrently, name, private, scripts, build, db:push, db:studio (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (23): dependencies, connect-pg-simple, cors, dotenv, drizzle-orm, express, express-session, helmet (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): hooks, Notification, PostToolUse, PreToolUse, Stop

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (7): AnimeCharacter, animeCharacters, NewAnimeCharacter, NewUser, NewUserAnime, UserAnime, users

## Knowledge Gaps
- **136 isolated node(s):** `PreToolUse`, `PostToolUse`, `Stop`, `Notification`, `allow` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 1` to `Community 10`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useUiStore` connect `Community 2` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `PostToolUse`, `Stop` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08846153846153847 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._