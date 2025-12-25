# Fault Tree Studio (FTA) - Architecture & Setup Guide

## Overview

Fault Tree Studio is a web application that modernizes the Excel workbook "Blank FTA.xlsm" while preserving its core workflow and adding modern features like an interactive canvas, real-time sync, and collaborative capabilities.

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: Zustand (local state), React Query (server state)
- **Canvas**: React Flow for interactive fault tree visualization
- **Backend**: Supabase (PostgreSQL + Row Level Security + Auth + Storage)
- **Exports**: @react-pdf/renderer (PDF), exceljs (XLSX), html2canvas (PNG)

### Key Architectural Decisions

1. **Dual-View Sync**: The application maintains a tree structure in the database (nodes + edges) and projects it to a table view for Excel-like editing. Changes in either view are synced through database functions.

2. **Row Level Security**: All data access is controlled through RLS policies based on organization membership and user roles (viewer, contributor, facilitator, admin).

3. **Audit Trail**: Critical changes are automatically logged for compliance requirements.

4. **Performance**: Canvas operations use React Flow's virtualization to handle 1,000+ nodes efficiently.

## Database Schema

The database consists of 14 main tables:

- **organizations**: Multi-tenant support
- **profiles**: User profiles with roles
- **analyses**: Root cause analysis documents
- **nodes**: Tree nodes (top event, intermediate, basic events)
- **node_edges**: Parent-child relationships
- **risk_scores**: S/O/D ratings and RPN calculations
- **action_items**: Investigation tasks
- **action_week_status**: Week 1-4 tracking
- **people_directory**: Person responsible list
- **scales/scale_versions**: Configurable rating scales
- **ap_mappings**: Action Priority mappings
- **evidence_attachments**: File/photo/link evidence
- **audit_log**: Change tracking

### Key Database Functions

- `get_table_projection()`: Projects tree to spreadsheet rows
- `create_nodes_from_table_row()`: Creates tree from table data
- `update_node_from_table()`: Updates nodes from table edits

## Setup Instructions

### Prerequisites

- Node.js 18+
- Supabase account
- PostgreSQL database

### 1. Clone and Install

```bash
git clone <repository>
cd fault-tree-studio
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run the migrations in order:

1. Connect to your Supabase database
2. Run `db/01_schema.sql` - Creates tables and types
3. Run `db/02_rls_policies.sql` - Sets up Row Level Security
4. Run `db/03_sync_functions.sql` - Creates sync functions

### 4. Seed Data

```bash
npm run db:seed
```

This creates:
- Example organization
- Admin user
- Sample scales (S/O/D 1-10)
- Example analysis with fault tree
- Sample people directory

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main app pages
│   ├── analyses/          # Analysis CRUD and studio
│   └── admin/             # Admin pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── canvas/           # React Flow canvas
│   └── table/            # Table view components
├── lib/                   # Utilities
│   ├── supabase/         # Supabase clients
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Helper functions
├── db/                    # Database migrations
├── scripts/              # Build/seed scripts
└── types/                # TypeScript types
```

## Key Features

### 1. FTA Studio (Main Workspace)

- **Canvas View**: Interactive tree with drag-drop, zoom/pan
- **Table View**: Excel-like grid with keyboard navigation
- **Two-way Sync**: Edits in either view update the other
- **Inspector Panel**: Edit node details, scores, evidence

### 2. Risk Prioritization

- **RPN Dashboard**: Ranked causes by Risk Priority Number
- **AP Mapping**: Action Priority beyond just RPN
- **Heatmaps**: Visual risk distribution

### 3. Action Management

- **Week 1-4 Tracking**: Status per week cadence
- **Owner Assignment**: From people directory
- **Evidence Attachments**: Photos, files, links

### 4. Exports

- **PDF**: Executive summary with RPN and actions
- **XLSX**: Excel-compatible table format
- **PNG**: Tree visualization snapshot

## Development Guide

### Adding New Features

1. **Database Changes**: Add migration in `db/`
2. **API Endpoints**: Use Supabase client in server components
3. **UI Components**: Follow shadcn/ui patterns
4. **Canvas Nodes**: Extend React Flow node types
5. **Table Columns**: Update projection functions

### Testing Sync

The two-way sync is tested by:
1. Creating nodes in canvas → verify table updates
2. Editing table cells → verify canvas updates
3. Reparenting in canvas → verify table path changes

### Performance Considerations

- Canvas uses React Flow virtualization
- Table uses virtual scrolling for large datasets
- Database queries use proper indexes
- RLS policies are optimized for common queries

## Deployment

### Production Checklist

1. Set production environment variables
2. Run database migrations
3. Enable Supabase RLS
4. Configure storage buckets for evidence
5. Set up monitoring/logging
6. Configure backup strategy

### Scaling Considerations

- Database connection pooling
- CDN for static assets
- Horizontal scaling for Next.js
- Supabase Pro plan for larger organizations

## Security

- All data access through RLS policies
- Organization-based data isolation
- Signed URLs for file uploads
- Audit logging for compliance
- Input validation on all forms

## Support

For issues or questions:
- Check error logs in browser console
- Review Supabase logs
- Verify RLS policies
- Check network requests in DevTools