# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run db:seed      # Seed database with example data
```

### Database Setup

Run migrations in order against your Supabase database:
1. `db/01_schema.sql` - Tables and types
2. `db/02_rls_policies.sql` - Row Level Security
3. `db/03_sync_functions.sql` - Tree/table sync functions

## Architecture

**Tech Stack**: Next.js 15 (App Router), TypeScript, Supabase (Postgres + RLS + Auth), React Flow (@xyflow/react), Zustand, React Query, shadcn/ui, Tailwind CSS

### Dual-View System

The core feature is two synchronized views of the same fault tree data:

1. **Canvas View** (`components/canvas/`): Interactive tree using React Flow
   - Nodes represent: top_event → intermediate_event → basic_event
   - State managed in `lib/store/canvas-store.ts` (Zustand)

2. **Table View** (`components/table/`): Excel-like grid matching the original workbook
   - Columns: Failure Mode (Top), Why 1-9, Units, Spec, S/O/D scores, Week 1-4 status, etc.

### Tree ↔ Table Sync

Database functions in `db/03_sync_functions.sql` handle the projection:
- `get_table_projection(analysis_id)` - Projects tree to spreadsheet rows (one row per leaf node path)
- `create_nodes_from_table_row(...)` - Creates/reuses tree nodes from table data
- `update_node_from_table(...)` - Updates node labels from table edits
- `get_node_path(node_id)` - Returns UUID array from top event to given node

### Database Schema

Key tables in `db/01_schema.sql`:
- **nodes** + **node_edges**: Tree structure (parent-child relationships)
- **risk_scores**: S/O/D values, RPN is auto-calculated (generated column)
- **action_items** + **action_week_status**: Week 1-4 task tracking
- **people_directory**: Person Responsible dropdown options
- **scales** + **scale_versions**: Customizable S/O/D rating definitions
- **audit_log**: Immutable change tracking (auto-populated via triggers)

TypeScript types in `types/database.ts` mirror the schema.

### State Management

- **Zustand** (`lib/store/`): Canvas node/edge state, selection
- **React Query**: Server state, data fetching from Supabase
- **Supabase RLS**: All data access filtered by organization membership

### Key Patterns

- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server components)
- UI components follow shadcn/ui conventions in `components/ui/`
- Route structure: `app/(auth)/` for login, `app/analyses/[id]/` for the studio view
- Canvas context: `lib/context/canvas-context.tsx` provides React Flow instance access

### Undo/Redo System

Command pattern implementation in `lib/store/history-store.ts`:
- Tracks ADD, DELETE, UPDATE, MOVE operations on nodes
- 50-item undo stack limit
- Keyboard: Ctrl+Z (undo), Ctrl+Y or Ctrl+Shift+Z (redo)

### Export Utilities

Located in `lib/export/`:
- `xlsx-export.ts` - ExcelJS workbook with 3 sheets (table, metadata, risk summary)
- `pdf-export.tsx` - @react-pdf/renderer with cover page and executive summary
- `image-export.ts` - html-to-image for PNG/SVG canvas capture

### Key Files

| Purpose | Path |
|---------|------|
| Main studio page | `app/analyses/[id]/page.tsx` |
| Canvas store | `lib/store/canvas-store.ts` |
| History store | `lib/store/history-store.ts` |
| Node hooks | `lib/hooks/use-nodes.ts` |
| Table projection | `lib/hooks/use-table-projection.ts` |
| Action items | `lib/hooks/use-action-items.ts` |
| Evidence attachments | `lib/hooks/use-evidence.ts` |
| Auto-layout (dagre) | `lib/layout/auto-layout.ts` |

## Domain Concepts

- **9-Why Chain**: Top Event + Why 1-9 levels = up to 10 nodes deep
- **RPN**: Severity × Occurrence × Detection (1-10 each, max 1000)
- **AP (Action Priority)**: Custom mapping rules beyond just RPN value
- **Evidence Status**: Each cause can be "hypothesis" or "verified"

## Environment Variables

Copy `.env.local.example` to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Reference Documents

- `TASKS.md` - **Implementation task tracker with status** (start here for dev work)
- `FTA_Updated_PRD.md` - Product vision, user journeys, UX requirements
- `FTA_Updated_Requirements.md` - Detailed functional/non-functional specs
