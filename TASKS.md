# Fault Tree Studio - Implementation Tasks

**Last Updated:** 2025-12-26
**Project Status:** Phase 6 SUBSTANTIAL - Performance, Realtime Collaboration, Notifications & Quality AI

---

## Status Legend

| Status | Description |
|--------|-------------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[!]` | Blocked |
| `[-]` | Deferred/Cancelled |

---

## Phase 1: Core Data Flow (P0 - Critical) ✅ COMPLETE

> **Goal:** Make the app functional with data persistence and view synchronization

### 1.1 Analysis Data Loading
| Task | Status | Notes |
|------|--------|-------|
| Fetch analysis metadata on `/analyses/[id]` load | `[x]` | useAnalysis hook |
| Display analysis header with editable fields | `[x]` | Header + MetadataPanel |
| Handle analysis not found (404) | `[x]` | Error state with back link |
| Loading states for analysis fetch | `[x]` | Loader2 spinner |

### 1.2 Canvas ↔ Database Integration
| Task | Status | Notes |
|------|--------|-------|
| Fetch nodes from `nodes` table on analysis load | `[x]` | useNodes hook |
| Fetch edges from `node_edges` table | `[x]` | useEdges hook |
| Transform DB nodes to ReactFlow format | `[x]` | dbNodeToReactFlow function |
| Transform DB edges to ReactFlow format | `[x]` | dbEdgeToReactFlow function |
| Initialize Zustand store with fetched data | `[x]` | initializeFromDb action |
| Create React Query hooks for node operations | `[x]` | Full CRUD hooks |

### 1.3 Node CRUD Operations
| Task | Status | Notes |
|------|--------|-------|
| Create node (insert to DB + update canvas) | `[x]` | useCreateNode hook |
| Update node label | `[x]` | useUpdateNode hook |
| Update node type | `[x]` | useUpdateNode hook |
| Update node position (drag end) | `[x]` | useUpdateNodePosition hook |
| Delete node (cascade edges) | `[x]` | useDeleteNode hook |
| Create edge (parent-child relationship) | `[x]` | useCreateEdge hook |
| Delete edge | `[x]` | useDeleteEdge hook |
| Duplicate node (with children option) | `[x]` | Ctrl+D or context menu |
| Move node to different parent | `[ ]` | Drag-drop reparent |

### 1.4 Table View Data Binding
| Task | Status | Notes |
|------|--------|-------|
| Call `get_table_projection()` function | `[x]` | useTableProjection hook |
| Display projection data in table grid | `[x]` | Full table with all columns |
| Implement virtual scrolling for large datasets | `[ ]` | @tanstack/react-table |
| Cell editing (inline edit mode) | `[x]` | EditableCell component |
| Row selection | `[ ]` | |

### 1.5 Two-Way Sync (Canvas ↔ Table)
| Task | Status | Notes |
|------|--------|-------|
| Table cell edit → update node in DB | `[x]` | useUpdateFromTable hook |
| Table cell edit → refresh canvas | `[x]` | Query invalidation |
| Canvas node edit → refresh table | `[x]` | Query invalidation |
| New row in table → create node chain | `[x]` | useCreateFromTableRow hook |
| Delete row → handle node deletion | `[ ]` | Only delete leaf? Or cascade? |
| Optimistic updates for responsiveness | `[ ]` | |

---

## Phase 2: Core Features (P1) ✅ COMPLETE

> **Goal:** Complete the primary feature set for usable FTA workflow

### 2.1 Risk Scoring
| Task | Status | Notes |
|------|--------|-------|
| Fetch risk_scores for selected node | `[x]` | via useRiskScore hook |
| Save Severity score | `[x]` | Validate 1-10 |
| Save Occurrence score | `[x]` | Validate 1-10 |
| Save Detection score | `[x]` | Validate 1-10 |
| Display computed RPN (auto-calculated in DB) | `[x]` | S × O × D |
| RPN color coding (low/med/high/critical) | `[x]` | Green/yellow/orange/red |
| Tooltips showing scale definitions | `[ ]` | Fetch from scales table |
| Sort nodes by RPN | `[ ]` | |
| Filter nodes by RPN threshold | `[ ]` | |

### 2.2 Action Items Management
| Task | Status | Notes |
|------|--------|-------|
| Fetch action items for selected node | `[x]` | useNodeActionItems hook |
| Create new action item | `[x]` | investigation_item required |
| Edit action item | `[x]` | All fields editable |
| Delete action item | `[x]` | With confirmation |
| Assign person responsible | `[x]` | PersonSelector dropdown |
| Set schedule/due date | `[x]` | Date picker |
| Add investigation result | `[x]` | Text area |
| Set judgment (1/2/3/4) | `[x]` | Dropdown with labels |
| Add remarks | `[x]` | Text area |

### 2.3 Week 1-4 Status Tracking
| Task | Status | Notes |
|------|--------|-------|
| Display week status indicators | `[x]` | 4 columns in table + inspector |
| Update week status (dropdown) | `[x]` | not_started/in_progress/done/blocked |
| Week status color coding | `[x]` | Visual indicators with progress bar |
| Add notes per week status | `[x]` | Optional field |
| Filter by week status | `[ ]` | |
| "This week" quick filter | `[ ]` | Based on current date |

### 2.4 Analysis Metadata
| Task | Status | Notes |
|------|--------|-------|
| Edit analysis title (inline) | `[x]` | MetadataPanel component |
| Edit model field | `[x]` | |
| Edit application field | `[x]` | |
| Edit part_name field | `[x]` | |
| Edit analysis_date | `[x]` | Date picker |
| Edit abstract (rich text?) | `[x]` | Plain text area |
| Edit related_document | `[x]` | |
| Edit problem_statement | `[x]` | |
| Change analysis status | `[x]` | draft/active/completed |

### 2.5 Autosave & Data Integrity
| Task | Status | Notes |
|------|--------|-------|
| Debounced autosave on changes | `[x]` | 1.5 second delay in MetadataPanel |
| Save indicator (saving/saved) | `[x]` | Shows saving/saved/unsaved status |
| Conflict detection | `[ ]` | Check updated_at before save |
| Handle save errors gracefully | `[x]` | Console errors, resets status |
| Offline queue (optional) | `[ ]` | IndexedDB? |

---

## Phase 3: Exports & UX (P2) ✅ COMPLETE

> **Goal:** Enable data export and improve user experience

### 3.1 Export to XLSX
| Task | Status | Notes |
|------|--------|-------|
| Generate workbook with ExcelJS | `[x]` | lib/export/xlsx-export.ts |
| Sheet 1: Main FTA table | `[x]` | All columns from projection |
| Sheet 2: Analysis metadata | `[x]` | Header info |
| Sheet 3: Risk summary | `[x]` | Sorted by RPN with priority |
| Style cells (headers, borders, colors) | `[x]` | Color-coded RPN and status |
| Download trigger | `[x]` | Export dropdown in header |

### 3.2 Export to PDF
| Task | Status | Notes |
|------|--------|-------|
| Design PDF template with @react-pdf | `[x]` | lib/export/pdf-export.tsx |
| Cover page with metadata | `[x]` | Analysis details + status |
| Executive summary section | `[x]` | RPN breakdown by priority |
| Full table section | `[x]` | Paginated with all columns |
| Tree visualization (optional) | `[x]` | Embeds canvas PNG capture |
| Download trigger | `[x]` | Export dropdown menu |

### 3.3 Export to PNG/SVG
| Task | Status | Notes |
|------|--------|-------|
| Capture canvas with html-to-image | `[x]` | lib/export/image-export.ts |
| Full tree capture (not just viewport) | `[x]` | Fit view before export |
| SVG export from ReactFlow | `[x]` | Via html-to-image |
| Download trigger | `[x]` | Export dropdown |

### 3.4 Search & Navigation
| Task | Status | Notes |
|------|--------|-------|
| Search input in toolbar | `[x]` | SearchBar component |
| Search nodes by label | `[x]` | Real-time filtering |
| Highlight matching nodes | `[x]` | Yellow ring + minimap |
| Show path from root to found node | `[x]` | NodeBreadcrumb component in inspector |
| Navigate to node (pan + zoom) | `[x]` | setCenter with animation |
| Search in table view | `[x]` | Real-time row filtering |

### 3.5 Keyboard Navigation
| Task | Status | Notes |
|------|--------|-------|
| Tab/Enter navigation in table | `[x]` | Excel-like cell navigation |
| Arrow key navigation | `[x]` | Alt+Arrow in edit mode |
| Escape to cancel edit | `[x]` | Clears selection |
| Ctrl+S to save | `[x]` | Shows toast (autosave active) |
| Ctrl+Z undo | `[x]` | Command pattern undo |
| Ctrl+Y redo | `[x]` | Also Ctrl+Shift+Z |
| Delete key to remove node | `[x]` | Works with multi-select |
| Enter to add sibling | `[x]` | |
| Tab to add child | `[x]` | |

### 3.6 Canvas UX Improvements
| Task | Status | Notes |
|------|--------|-------|
| Collapse/expand node branches | `[x]` | Toggle button on node with count |
| Persist collapsed state | `[x]` | Saved to DB via collapsed column |
| Auto-layout algorithm | `[x]` | dagre via lib/layout/auto-layout.ts |
| Fit view button | `[x]` | Already via Controls |
| Zoom controls (+/-/reset) | `[x]` | Already have Controls |
| Node context menu (right-click) | `[x]` | Add child, sibling, delete, duplicate |
| Multi-select nodes | `[x]` | Shift+click to add/remove |
| Bulk delete | `[x]` | Delete all selected nodes |

### 3.7 Evidence Attachments
| Task | Status | Notes |
|------|--------|-------|
| Upload UI in inspector panel | `[x]` | EvidencePanel component |
| Supabase Storage bucket setup | `[x]` | 'evidence' bucket |
| Upload file to storage | `[x]` | useUploadEvidenceFile hook |
| Create evidence_attachment record | `[x]` | useCreateEvidence hook |
| Display attachments list | `[x]` | Cards with type icons |
| Preview images | `[x]` | Opens in new tab |
| Download attachment | `[x]` | Signed URL download |
| Delete attachment | `[x]` | With confirmation |
| Link evidence (URL type) | `[x]` | Title + URL + description |
| Add note evidence | `[x]` | Title + content |
| Add measurement evidence | `[x]` | Value + unit + notes |

### 3.8 Undo/Redo
| Task | Status | Notes |
|------|--------|-------|
| Implement command pattern | `[x]` | lib/store/history-store.ts |
| Track node changes | `[x]` | ADD, DELETE, UPDATE, MOVE |
| Track edge changes | `[x]` | ADD_EDGE, DELETE_EDGE with callbacks |
| Undo stack (limit 50?) | `[x]` | maxHistorySize: 50 |
| Redo stack | `[x]` | Full redo support |
| UI indicators | `[x]` | Undo/Redo buttons in toolbar |

---

## Phase 4: Admin Features (P3) ✅ COMPLETE

> **Goal:** Enable organization administrators to configure the system

### 4.1 People Directory Management
| Task | Status | Notes |
|------|--------|-------|
| Admin page: `/admin/people` | `[x]` | Full CRUD with admin layout |
| List all people in org | `[x]` | With show/hide inactive toggle |
| Add new person | `[x]` | name, initials, email, role, site |
| Edit person | `[x]` | Expandable inline editing |
| Deactivate person | `[x]` | Soft delete |
| Reactivate person | `[x]` | |
| Import from CSV | `[-]` | Deferred |
| Export to CSV | `[-]` | Deferred |

### 4.2 Scales/Criteria Management
| Task | Status | Notes |
|------|--------|-------|
| Admin page: `/admin/scales` | `[x]` | Tabs for S/O/D |
| List Severity scale items | `[x]` | |
| List Occurrence scale items | `[x]` | |
| List Detection scale items | `[x]` | |
| Edit scale item (value, label, definition) | `[x]` | Inline editing |
| Add scale item | `[x]` | |
| Remove scale item | `[x]` | |
| Version scales (effective date) | `[x]` | Creates new version on save |
| Preview scale in use | `[ ]` | |

### 4.3 AP Mapping Configuration
| Task | Status | Notes |
|------|--------|-------|
| Admin page: `/admin/ap-mapping` | `[x]` | Full rule editor |
| Display current mapping rules | `[x]` | Sorted by priority |
| Edit mapping rule | `[x]` | S/O/D conditions → AP category |
| Add mapping rule | `[x]` | |
| Delete mapping rule | `[x]` | |
| Preview AP calculations | `[x]` | Live calculator with S/O/D inputs |

### 4.4 User Management
| Task | Status | Notes |
|------|--------|-------|
| Admin page: `/admin/users` | `[x]` | Full user management |
| List org users | `[x]` | With role badges |
| Invite new user | `[x]` | Email invite via API |
| Change user role | `[x]` | viewer/contributor/facilitator/admin |
| Remove user from org | `[x]` | With confirmation dialog |
| View user activity | `[ ]` | From audit log (Phase 5) |

### 4.5 Organization Settings
| Task | Status | Notes |
|------|--------|-------|
| Settings page: `/settings` | `[x]` | With auto-save |
| Edit org name | `[x]` | Auto-generates slug |
| Configure default settings | `[ ]` | |
| Manage integrations (future) | `[-]` | Deferred |

---

## Phase 5: Dashboards & Reporting (P4) ✅ COMPLETE

> **Goal:** Provide portfolio-level visibility and personal task management

### 5.1 Portfolio Dashboard
| Task | Status | Notes |
|------|--------|-------|
| Dashboard page: `/dashboard` | `[x]` | With stat cards and charts |
| KPI: Total analyses count | `[x]` | By status breakdown |
| KPI: Open high-RPN causes | `[x]` | RPN > 200 |
| KPI: Overdue actions count | `[x]` | schedule < today |
| KPI: Completion rate by week | `[-]` | Deferred (needs historical data) |
| Chart: RPN distribution | `[x]` | Pie chart with recharts |
| Chart: Actions by status | `[x]` | Bar chart with recharts |
| Chart: Trend over time | `[-]` | Deferred (needs historical data) |
| Filters: date range | `[-]` | Deferred |
| Filters: site/process | `[-]` | Deferred |
| Filters: owner | `[-]` | Deferred |

### 5.2 My Actions View
| Task | Status | Notes |
|------|--------|-------|
| Page: `/my-actions` | `[x]` | With tabs and grouping |
| List actions assigned to current user | `[x]` | Match email to people_directory |
| Group by analysis | `[x]` | Expandable cards |
| Group by due date | `[x]` | All/Overdue/This Week/Upcoming tabs |
| Quick status update | `[ ]` | Deferred (view-only for now) |
| Link to analysis/node | `[x]` | External link icon |

### 5.3 Overdue Actions View
| Task | Status | Notes |
|------|--------|-------|
| Overdue filter/view | `[x]` | Tab in My Actions |
| Sort by days overdue | `[x]` | Sorted by schedule ascending |
| Highlight severity | `[x]` | Red styling for overdue items |
| Send reminder (optional) | `[-]` | Deferred |

### 5.4 Audit Log Viewer
| Task | Status | Notes |
|------|--------|-------|
| Admin page: `/admin/audit-log` | `[x]` | Full admin page |
| List audit entries | `[x]` | Paginated with 20 per page |
| Filter by entity type | `[x]` | Dynamic dropdown |
| Filter by user | `[x]` | Dynamic dropdown |
| Filter by date range | `[x]` | From/To date inputs |
| Filter by action | `[x]` | INSERT, UPDATE, DELETE |
| View change details | `[x]` | Expandable JSON view |
| Export audit log | `[x]` | CSV export button

---

## Phase 6: Polish & Non-Functional (P5)

> **Goal:** Production readiness, accessibility, and advanced features

### 6.1 Accessibility (WCAG 2.1 AA)
| Task | Status | Notes |
|------|--------|-------|
| Audit with axe-core | `[ ]` | |
| Keyboard focus indicators | `[ ]` | |
| ARIA labels on interactive elements | `[ ]` | |
| Screen reader testing | `[ ]` | |
| Color contrast check | `[ ]` | |
| Non-color indicators for status | `[ ]` | Icons + text |

### 6.2 Error Handling & Edge Cases
| Task | Status | Notes |
|------|--------|-------|
| Global error boundary | `[x]` | ErrorBoundary component in layout |
| Toast notification system | `[x]` | @radix-ui/react-toast with useToast hook |
| Form validation errors | `[ ]` | |
| Network error handling | `[x]` | React Query global error handlers |
| Empty states for all lists | `[ ]` | |
| Loading skeletons | `[x]` | StatCard, Table, AnalysisCard skeletons |

### 6.3 Performance Optimization
| Task | Status | Notes |
|------|--------|-------|
| Canvas virtualization (1000+ nodes) | `[ ]` | Viewport-aware rendering pending |
| Table virtualization | `[x]` | VirtualizedTable with @tanstack/react-virtual |
| Query optimization | `[ ]` | |
| Bundle size analysis | `[x]` | @next/bundle-analyzer in next.config.js |
| Image optimization | `[ ]` | |
| Lazy loading routes | `[ ]` | |

### 6.4 Import from Excel
| Task | Status | Notes |
|------|--------|-------|
| Upload .xlsx/.xlsm file | `[x]` | react-dropzone in ImportDialog |
| Parse with ExcelJS | `[x]` | lib/import/xlsx-import.ts |
| Map columns to fields | `[x]` | Flexible header matching |
| Create analysis from import | `[x]` | API route at /api/import |
| Create nodes from Why 1-9 chains | `[x]` | Uses create_nodes_from_table_row RPC |
| Validation & error reporting | `[x]` | Row-level errors with preview |

### 6.5 Real-time Collaboration
| Task | Status | Notes |
|------|--------|-------|
| Supabase Realtime subscription | `[x]` | use-realtime-sync.ts for nodes/edges/risk_scores |
| Live cursor positions | `[x]` | collaborator-cursors.tsx with throttled updates |
| Live node updates | `[x]` | Query invalidation on postgres_changes |
| Presence indicators | `[x]` | use-presence.ts + presence-avatars.tsx |
| Conflict resolution | `[x]` | Last-write-wins with toast notification |

### 6.6 Notifications
| Task | Status | Notes |
|------|--------|-------|
| In-app notification system | `[x]` | db/04_notifications.sql with RLS |
| Notification center UI | `[x]` | notification-bell.tsx + notification-center.tsx |
| Mark as read | `[x]` | Single and bulk mark-as-read hooks |
| Notify on action assignment | `[ ]` | Hooks ready, trigger pending |
| Notify on mention (future) | `[ ]` | |
| Email notifications (optional) | `[-]` | Deferred to in-app only |

### 6.7 Quality AI Features
| Task | Status | Notes |
|------|--------|-------|
| Database migration for quality AI | `[x]` | db/08_quality_ai_features.sql |
| TypeScript types for quality features | `[x]` | Updated types/database.ts + lib/ai/types.ts |
| Metadata AI Assist API | `[x]` | POST /api/ai/metadata-assist |
| Why Statement Quality Check API | `[x]` | POST /api/ai/why-quality |
| Investigation Quality Check API | `[x]` | POST /api/ai/investigation-quality |
| Quality AI React hooks | `[x]` | lib/hooks/use-quality-ai.ts |
| Metadata AI Assist UI | `[x]` | components/inspector/metadata-ai-assist.tsx |
| Why Quality Module UI | `[x]` | components/inspector/why-quality-module.tsx |
| Investigation Quality Module UI | `[x]` | components/inspector/investigation-quality-module.tsx |
| Quality Score Indicator | `[x]` | components/quality/quality-score-indicator.tsx |
| Quality Flag Badge | `[x]` | components/quality/quality-flag-badge.tsx |
| Canvas node quality badges | `[x]` | Integrated in fault-tree-node.tsx |
| Quality AI documentation | `[x]` | docs/quality-ai.md |

### 6.8 Help & User Guide System
| Task | Status | Notes |
|------|--------|-------|
| Help content definitions | `[x]` | lib/help/content.ts with 10 categories, 40+ articles |
| Keyboard shortcuts definitions | `[x]` | lib/help/keyboard-shortcuts.ts |
| Keyboard shortcuts modal | `[x]` | Press ? anywhere to view shortcuts |
| Help menu dropdown | `[x]` | In header with quick links |
| Help center main page | `[x]` | /help with category grid + search |
| Help article pages | `[x]` | /help/[category]/[slug] dynamic routes |
| Help sidebar navigation | `[x]` | Collapsible category navigation |
| Help article renderer | `[x]` | Supports 8 section types |
| Client-side search | `[x]` | Real-time article search with keyboard nav |
| Video tutorial placeholders | `[x]` | Prepared for future video content |

---

## Completed Items Log

| Date | Task | Phase | Notes |
|------|------|-------|-------|
| 2024-12-24 | Project scaffolding | Setup | Next.js, Supabase, UI components |
| 2024-12-24 | Database schema | Setup | 14 tables with RLS |
| 2024-12-24 | Authentication | Setup | Login, register, session management |
| 2024-12-24 | Analysis list page | P0 | Basic CRUD for analyses |
| 2024-12-24 | Canvas scaffolding | P0 | ReactFlow setup, custom nodes |
| 2024-12-24 | Inspector panel UI | P0 | Tabs for details/risk/actions |
| 2024-12-24 | Table view modal | P0 | Sheet with mock columns |
| 2024-12-24 | Phase 1 Core Data Flow | P0 | Full canvas-table two-way sync |
| 2024-12-24 | Action Items hooks | P1 | useActionItems, useNodeActionItems |
| 2024-12-24 | People Directory hooks | P1 | usePeopleDirectory, PersonSelector |
| 2024-12-24 | Week Status tracking | P1 | useWeekStatuses, WeekStatusTracker |
| 2024-12-24 | Action Items Panel | P1 | Full CRUD in inspector |
| 2024-12-24 | Metadata Panel | P1 | All analysis fields with autosave |
| 2024-12-24 | Extended Table View | P1 | Action columns with week status |
| 2024-12-24 | XLSX Export | P2 | 3 sheets with styling |
| 2024-12-24 | PNG/SVG Export | P2 | html-to-image with fit view |
| 2024-12-24 | Search & Navigation | P2 | SearchBar with highlighting |
| 2024-12-24 | Auto-layout | P2 | dagre algorithm |
| 2024-12-24 | Context Menu | P2 | Right-click node actions |
| 2024-12-24 | Keyboard Shortcuts | P2 | Delete, Tab, Enter, Escape, Ctrl+D |
| 2024-12-25 | PDF Export | P2 | @react-pdf/renderer with 4 sections |
| 2024-12-25 | Node Collapse/Expand | P2 | Toggle + hidden children count |
| 2024-12-25 | Evidence Attachments | P2 | 5 types: photo, file, link, note, measurement |
| 2024-12-25 | Undo/Redo | P2 | Command pattern with history store |
| 2024-12-25 | Multi-select Nodes | P2 | Shift+click with bulk delete |
| 2024-12-25 | Admin Layout | P3 | Sidebar navigation + role check |
| 2024-12-25 | People Directory Admin | P3 | Full CRUD at /admin/people |
| 2024-12-25 | Scales Management | P3 | S/O/D scales with versioning |
| 2024-12-25 | AP Mapping Config | P3 | Rules editor + live preview calculator |
| 2024-12-25 | User Management | P3 | Invite, role change, remove users |
| 2024-12-25 | Organization Settings | P3 | Name/slug editing with auto-save |
| 2024-12-25 | Portfolio Dashboard | P4 | KPI cards + RPN/Actions charts with recharts |
| 2024-12-25 | My Actions Page | P4 | Personal actions view with tabs |
| 2024-12-25 | Audit Log Viewer | P4 | Paginated with filters + CSV export |
| 2024-12-25 | Dashboard Stats Hooks | P4 | useDashboardStats, useRPNDistribution, etc. |
| 2024-12-25 | Toast Notification System | P5 | @radix-ui/react-toast with useToast hook |
| 2024-12-25 | Error Boundary | P5 | Global ErrorBoundary wrapping app |
| 2024-12-25 | React Query Error Handling | P5 | Global onError handlers for queries/mutations |
| 2024-12-25 | Loading Skeletons | P5 | StatCard, Table, AnalysisCard skeletons |
| 2024-12-25 | Excel Import | P5 | ImportDialog with ExcelJS parsing |
| 2024-12-25 | Import API Route | P5 | /api/import with node chain creation |
| 2025-12-25 | FTA Studio Branding | P5 | Logo on login, sidebar, admin, analysis header |
| 2025-12-25 | Horizontal Tree Layout | P2 | Changed from vertical to left-to-right layout |
| 2025-12-25 | Smart Node Positioning | P2 | Auto-position new nodes horizontally with spacing |
| 2025-12-25 | Table Row Grouping | P2 | Rowspan merging for parent-child hierarchy |
| 2025-12-25 | Hydration Warning Fix | P5 | suppressHydrationWarning on body tag |
| 2025-12-25 | GitHub Repository | Setup | Created and pushed to XLCSPD/fault-tree-analysis-studio |
| 2025-12-25 | Ctrl+S Save Shortcut | P2 | Shows toast confirmation (autosave active) |
| 2025-12-25 | Table Search/Filter | P2 | Real-time filtering across all text fields |
| 2025-12-25 | Table Keyboard Navigation | P2 | Tab/Enter/Arrow keys for Excel-like navigation |
| 2025-12-25 | Node Path Breadcrumb | P2 | Shows path from root in inspector panel |
| 2025-12-25 | Edge Change Tracking | P2 | Undo/redo for edge add/delete operations |
| 2025-12-25 | PDF Tree Visualization | P2 | Embeds canvas PNG in PDF export |
| 2025-12-25 | Table Virtualization | P5 | @tanstack/react-virtual for 1000+ rows |
| 2025-12-25 | Bundle Analyzer | P5 | @next/bundle-analyzer in next.config.js |
| 2025-12-25 | Realtime Sync Hook | P5 | use-realtime-sync.ts for live updates |
| 2025-12-25 | Presence System | P5 | use-presence.ts with cursor tracking |
| 2025-12-25 | Collaborator Cursors | P5 | Live cursor overlay on canvas |
| 2025-12-25 | Presence Avatars | P5 | Active collaborator display in header |
| 2025-12-25 | Notifications Schema | P5 | db/04_notifications.sql with RLS |
| 2025-12-25 | Notification Hooks | P5 | Full CRUD with realtime subscription |
| 2025-12-25 | Notification Bell | P5 | Bell icon with unread badge |
| 2025-12-25 | Notification Center | P5 | Dropdown with notification list |
| 2025-12-26 | Quality AI Migration | P5 | db/08_quality_ai_features.sql with enums and tables |
| 2025-12-26 | Quality AI Types | P5 | Extended types/database.ts + lib/ai/types.ts |
| 2025-12-26 | Metadata AI Assist API | P5 | Problem statement + abstract generation |
| 2025-12-26 | Why Quality API | P5 | Blamey/vague term detection with rewrites |
| 2025-12-26 | Investigation Quality API | P5 | Hypothesis test conversion |
| 2025-12-26 | Quality AI Hooks | P5 | use-quality-ai.ts with full CRUD |
| 2025-12-26 | Metadata AI Assist UI | P5 | Generate/apply suggestions in metadata panel |
| 2025-12-26 | Why Quality Module | P5 | Issue cards with Replace/Alias/Dismiss |
| 2025-12-26 | Investigation Quality Module | P5 | Hypothesis test preview + apply |
| 2025-12-26 | Quality Score Indicator | P5 | Toolbar percentage badge + fix list |
| 2025-12-26 | Quality Flag Badge | P5 | Canvas node warning badges |
| 2025-12-26 | Quality AI Documentation | P5 | docs/quality-ai.md with full API specs |

---

## Notes & Decisions

### Architecture Decisions
- **State Management:** Zustand for canvas state, React Query for server state
- **Database Functions:** Using Postgres functions for complex operations (tree projection, node creation from table)
- **RLS:** Row-level security based on organization membership

### Open Questions
- [ ] Should deleting a table row delete only the leaf node or the entire branch?
- [ ] How to handle concurrent edits (optimistic locking vs last-write-wins)?
- [ ] Should week status be tied to calendar weeks or analysis-specific weeks?

### Technical Debt
- [x] Remove mock data from table view (using real DB projection)
- [ ] Clean up unused imports
- [x] Add proper TypeScript types for all components
- [x] Add error boundaries
- [x] Add toast notification system for errors

---

## Quick Reference

**Start Development Server:**
```bash
npm run dev
```

**Supabase Dashboard:**
https://supabase.com/dashboard/project/urmhiusqhlsjypyrqpvq

**Key Files:**
- Canvas store: `lib/store/canvas-store.ts`
- History store: `lib/store/history-store.ts`
- Database types: `types/database.ts`
- Supabase client: `lib/supabase/client.ts`
- Main studio page: `app/analyses/[id]/page.tsx`
- Node hooks: `lib/hooks/use-nodes.ts`
- Action items hooks: `lib/hooks/use-action-items.ts`
- Week status hooks: `lib/hooks/use-week-status.ts`
- People directory hooks: `lib/hooks/use-people-directory.ts`
- Table projection hooks: `lib/hooks/use-table-projection.ts`
- Evidence hooks: `lib/hooks/use-evidence.ts`
- Undo/Redo hook: `lib/hooks/use-undo-redo.ts`
- Action Items Panel: `components/inspector/action-items-panel.tsx`
- Metadata Panel: `components/inspector/metadata-panel.tsx`
- Evidence Panel: `components/inspector/evidence-panel.tsx`
- XLSX Export: `lib/export/xlsx-export.ts`
- PDF Export: `lib/export/pdf-export.tsx`
- Image Export: `lib/export/image-export.ts`
- Auto Layout: `lib/layout/auto-layout.ts`
- Search Bar: `components/canvas/search-bar.tsx`
- Context Menu: `components/canvas/context-menu.tsx`
- Canvas Context: `lib/context/canvas-context.tsx`
- Dashboard Hooks: `lib/hooks/use-dashboard-stats.ts`
- My Actions Hook: `lib/hooks/use-my-actions.ts`
- Audit Log Hook: `lib/hooks/use-audit-log.ts`
- Toast Hook: `lib/hooks/use-toast.ts`
- Toast Component: `components/ui/toast.tsx`
- Error Boundary: `components/error-boundary.tsx`
- Skeleton Components: `components/skeletons/`
- Excel Import: `lib/import/xlsx-import.ts`
- Import Dialog: `components/import/import-dialog.tsx`
- Import API: `app/api/import/route.ts`
- Logo Files: `public/fta-studio-logo.png`, `public/fta-studio-icon.png`
- Node Breadcrumb: `components/canvas/node-breadcrumb.tsx`
- Node Path Hook: `lib/hooks/use-node-path.ts`
- Editable Cell: `components/table/editable-cell.tsx`
- Virtualized Table: `components/table/virtualized-table.tsx`
- Realtime Sync Hook: `lib/hooks/use-realtime-sync.ts`
- Presence Hook: `lib/hooks/use-presence.ts`
- Collaborator Cursors: `components/canvas/collaborator-cursors.tsx`
- Presence Avatars: `components/ui/presence-avatars.tsx`
- Notification Hooks: `lib/hooks/use-notifications.ts`
- Notification Bell: `components/notifications/notification-bell.tsx`
- Notification Center: `components/notifications/notification-center.tsx`
- Notifications Schema: `db/04_notifications.sql`
- Quality AI Hooks: `lib/hooks/use-quality-ai.ts`
- Quality AI Types: `lib/ai/types.ts`
- Metadata AI Assist: `components/inspector/metadata-ai-assist.tsx`
- Why Quality Module: `components/inspector/why-quality-module.tsx`
- Investigation Quality Module: `components/inspector/investigation-quality-module.tsx`
- Quality Score Indicator: `components/quality/quality-score-indicator.tsx`
- Quality Flag Badge: `components/quality/quality-flag-badge.tsx`
- Quality AI Schema: `db/08_quality_ai_features.sql`
- Quality AI Docs: `docs/quality-ai.md`

**GitHub Repository:**
https://github.com/XLCSPD/fault-tree-analysis-studio
