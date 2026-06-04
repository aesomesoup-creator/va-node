# Graph Report - va-node-site  (2026-06-04)

## Corpus Check
- 37 files · ~8,344 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 244 nodes · 353 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `useUiStore` - 18 edges
2. `compilerOptions` - 16 edges
3. `compilerOptions` - 14 edges
4. `useGraphStore` - 13 edges
5. `compilerOptions` - 11 edges
6. `useAuthStore` - 8 edges
7. `AnimeEntry` - 8 edges
8. `Character` - 7 edges
9. `scripts` - 6 edges
10. `scripts` - 6 edges

## Surprising Connections (you probably didn't know these)
- `AdminPanel()` --calls--> `useUiStore`  [EXTRACTED]
  client/src/components/Admin/AdminPanel.tsx → client/src/stores/uiStore.ts
- `EmptyState()` --calls--> `useUiStore`  [EXTRACTED]
  client/src/components/Canvas/GraphCanvas.tsx → client/src/stores/uiStore.ts
- `Props` --references--> `AnimeEntry`  [EXTRACTED]
  client/src/components/Canvas/AnimeDetailPanel.tsx → client/src/types/index.ts
- `App()` --calls--> `useAuthStore`  [EXTRACTED]
  client/src/App.tsx → client/src/stores/authStore.ts
- `App()` --calls--> `useGraphStore`  [EXTRACTED]
  client/src/App.tsx → client/src/stores/graphStore.ts

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (31): getDb(), isDbAvailable(), AnimeCharacter, animeCharacters, NewAnimeCharacter, NewUser, NewUserAnime, User (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (12): devDependencies, drizzle-kit, tsx, @types/connect-pg-simple, @types/cors, @types/express, @types/express-session, @types/node (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (16): AnimePanel(), AnilistResult, searchAnilist(), LoginModal(), AnimeBubble(), GraphCanvas(), Navbar(), SearchBar() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): dependencies, axios, react, react-dom, zustand, devDependencies, @types/react, @types/react-dom (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (7): AdminPanel(), Tab, adminGetAnime(), adminGetCharacters(), adminGetUsers(), api, searchAnime()

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (16): getAnimeCharacters(), BUBBLE_COLORS, Props, Props, EmptyState(), charRelativePos(), GraphState, AnilistSearchResult (+8 more)

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

## Knowledge Gaps
- **135 isolated node(s):** `PreToolUse`, `PostToolUse`, `Stop`, `Notification`, `allow` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 1` to `Community 10`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `useUiStore` connect `Community 2` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `PostToolUse`, `Stop` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06956521739130435 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._