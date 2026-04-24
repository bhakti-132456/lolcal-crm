# Graph Report - .  (2026-04-24)

## Corpus Check
- 45 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 433 nodes · 860 edges · 17 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `n0()` - 32 edges
2. `setOptions()` - 24 edges
3. `tm` - 19 edges
4. `cr` - 15 edges
5. `lm` - 15 edges
6. `fetch()` - 14 edges
7. `build()` - 14 edges
8. `S0()` - 13 edges
9. `defaultQueryOptions()` - 12 edges
10. `s()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `r()` --calls--> `fetch()`  [EXTRACTED]
  dist/assets/index-4i7buNxG.js → dist/assets/index-4i7buNxG.js  _Bridges community 2 → community 0_
- `Np()` --calls--> `ae()`  [EXTRACTED]
  dist/assets/index-4i7buNxG.js → dist/assets/index-4i7buNxG.js  _Bridges community 2 → community 1_
- `Np()` --calls--> `get()`  [EXTRACTED]
  dist/assets/index-4i7buNxG.js → dist/assets/index-4i7buNxG.js  _Bridges community 2 → community 5_
- `Od()` --calls--> `nr()`  [EXTRACTED]
  dist/assets/index-4i7buNxG.js → dist/assets/index-4i7buNxG.js  _Bridges community 0 → community 5_
- `scheduleGc()` --calls--> `setTimeout()`  [EXTRACTED]
  dist/assets/index-4i7buNxG.js → dist/assets/index-4i7buNxG.js  _Bridges community 2 → community 6_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (57): Ad(), add(), bindMethods(), bn(), bu(), canRun(), clearInterval(), constructor() (+49 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (18): ae(), Bd(), Dd(), em, Fl(), H0, Ic(), j0 (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (53): _0(), addObserver(), #b(), c(), cancel(), Cd(), clearGcTimeout(), Cp() (+45 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (5): DbState, ImportLead, Lead, fallbackToOllama(), ghostSyncPrompt()

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (38): Admin, AdminLoginForm, AdminPasswordResetConfirmForm, AdminPasswordResetRequestForm, AdminUpsertForm, ApiError, AppleClientSecretCreateForm, BadRequestError (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (28): B0, build(), D0, defaultMutationOptions(), defaultQueryOptions(), ensureInfiniteQueryData(), ensureQueryData(), fetchInfiniteQuery() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (5): clearTimeout(), rr(), setTimeout(), tm, Yp()

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (5): am(), lm, Mv(), O0(), Pc()

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (4): aa(), cr, Md(), Pd()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (2): C0, clear()

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (4): AppState, run(), spawn_brain_internal(), switch_brain()

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (1): ge

### Community 12 - "Community 12"
Cohesion: 1
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1
Nodes (0): 

## Knowledge Gaps
- **42 isolated node(s):** `DynamicModel`, `Collection`, `Admin`, `Schema`, `SchemaField` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (2 nodes): `build.rs`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `Launch_AXON.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `1713069000_initial_schema.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `n0()` connect `Community 1` to `Community 0`, `Community 7`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `tm` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `cr` connect `Community 8` to `Community 0`, `Community 9`, `Community 1`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `DynamicModel`, `Collection`, `Admin` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._