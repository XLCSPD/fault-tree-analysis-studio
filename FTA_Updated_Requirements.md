# Fault Tree Studio (FTA) — Updated Requirements (Functional + Non-Functional)
*Last updated: 2025-12-24*

## 1) Scope summary
Build a web app that preserves the **Blank FTA.xlsm** workflow while adding an **interactive canvas** for fault-tree design and modern execution tracking.

---

## 2) Functional requirements (FR)

### FR-1 Analysis creation & metadata (workbook header)
**User story:** As a facilitator, I can create an analysis and capture header details so the FTA is traceable.  
**Requirements:**
- Create / edit / clone / archive an analysis
- Fields: Title, Model, Application, Part Name, Date, Abstract, Related Document, Problem statement (optional)
- Ability to attach files (photos, PDFs) at analysis level
**Acceptance criteria:**
- Analysis can be saved as draft with incomplete fields
- Export includes header fields

---

### FR-2 Fault tree structure (nodes + relationships)
**User story:** As a facilitator/SME, I can build a fault tree that matches the 9-Why structure.  
**Requirements:**
- Node types: Top event, Intermediate event, Basic event (cause)
- Parent-child relationships; unlimited depth (table view shows up to Why 9 by default)
- Node fields:
  - Label / Cause text
  - Units, Metric (optional), Specification
  - Notes, Tags
  - Evidence status: Hypothesis / Verified
- Optional (Phase 2): AND/OR gate types on parent-child relations
**Acceptance criteria:**
- A node can be moved to a different parent (drag/drop) and all views update
- Exported table retains correct cause chain ordering

---

### FR-3 Dual views: Canvas + Table (sync required)
**User story:** As a user, I can work visually or in a grid and never lose alignment.  
**Requirements:**
- Canvas view:
  - Pan/zoom, minimap, collapse/expand branches
  - Add child/sibling, rename, delete, duplicate
  - Search + highlight path to node
- Table view (spreadsheet-true):
  - Columns: Failure Mode (Top), Why 1…Why 9, Units, Specification, Investigation Item, Person Resp, Schedule, Week 1–4, Investigation Result, Judgment, Remarks
  - Excel-like keyboard navigation and paste
- Two-way sync between views
**Acceptance criteria:**
- Editing a node in canvas immediately updates the corresponding row/chain in table
- Pasting a block into the table creates/updates the correct tree nodes

---

### FR-4 Risk scoring (S/O/D) + RPN computation
**User story:** As a facilitator, I can score causes and see prioritized risks.  
**Requirements:**
- Store Severity, Occurrence, Detection per cause (integer scale)
- Compute RPN = S × O × D
- Support rating explanations (hover/tooltips from scales)
- Validation: only allow values defined by the org scale (e.g., 1–10)
**Acceptance criteria:**
- RPN updates instantly on score change
- Causes can be sorted by RPN, Severity, etc.

---

### FR-5 Action Priority (AP) (recommended)
**User story:** As a leader, I can prioritize action beyond just RPN.  
**Requirements:**
- Admin-managed AP mapping table based on S/O/D
- Display AP category next to RPN
- Filters by AP (e.g., High / Medium / Low)
**Acceptance criteria:**
- Changing AP mapping recalculates AP labels across analyses (with audit trail)

---

### FR-6 Action plan management + Week 1–4 cadence
**User story:** As an action owner, I can see my tasks, due dates, and weekly status.  
**Requirements:**
- Action items tied to:
  - A cause/node (preferred)
  - Or the analysis (general action)
- Fields:
  - Investigation Item
  - Person Responsible (from People Directory)
  - Schedule (due date and/or date range)
  - Week 1–4 statuses: Not Started / In Progress / Done / Blocked
  - Comments + evidence attachments
- Views:
  - Week tabs (Week 1…Week 4)
  - “My Actions” personalized view
  - Overdue view
**Acceptance criteria:**
- Owner receives in-app notification when assigned (email optional)
- Overdue actions appear prominently in dashboards

---

### FR-7 Investigation Result, Judgment, Remarks
**User story:** As a facilitator, I can document what was learned and the outcome.  
**Requirements:**
- Store investigation results per cause and/or per action
- Judgment field with controlled options (configurable) + free text
- Remarks field
**Acceptance criteria:**
- Exported PDF includes investigation outcomes

---

### FR-8 Criteria & scales management
**User story:** As an admin, I can define scoring scales so teams score consistently.  
**Requirements:**
- Manage Severity, Occurrence, Detection rating tables:
  - Numeric value
  - Short label
  - Long definition / criteria
- Optional: Issue classification options table
- Versioning for changes (effective date)
**Acceptance criteria:**
- Users see the scale definitions in tooltips
- Historical analyses retain the scale version used (or show the version delta)

---

### FR-9 People directory (Person Resp)
**User story:** As an admin, I can manage the list of responsible people for dropdowns.  
**Requirements:**
- Fields: Name, Initials, Role (optional), Site (optional), Active/Inactive
- Import via CSV
**Acceptance criteria:**
- Inactive people cannot be assigned new actions, but remain on history

---

### FR-10 Portfolio dashboards
**User story:** As leadership, I can see portfolio-level risk and execution status.  
**Requirements:**
- KPIs: # open high-RPN causes, # overdue actions, completion rate by week
- Filters: site, process, date range, owner
**Acceptance criteria:**
- Dashboards load in under defined performance limits (see NFR)

---

### FR-11 Export / import
**User story:** As a facilitator, I can export/share my analysis and optionally import the Excel template.  
**Requirements:**
- Export:
  - XLSX table (workbook-like)
  - PDF summary
  - PNG/SVG tree snapshot
- Optional import:
  - Parse xlsx/xlsm (data only) into analysis (macros ignored)
**Acceptance criteria:**
- Exported XLSX contains all columns required to recreate the workbook outputs

---

## 3) Non-functional requirements (NFR)

### NFR-1 Performance
- Canvas interaction: drag/pan/zoom stays responsive for 1,000+ nodes
- Dashboard queries: < 2 seconds for typical dataset (org-defined)
- Export generation: < 30 seconds for typical analysis

### NFR-2 Reliability + data integrity
- Autosave with conflict resolution
- Version history / audit log for:
  - Node edits
  - Score changes
  - Assignments and status changes

### NFR-3 Security
- Auth: SSO optional; otherwise email/password + MFA optional
- Row-level security by organization/site
- Signed URLs for file attachments

### NFR-4 Accessibility
- WCAG 2.1 AA targets where feasible
- Keyboard navigation support (especially table view)
- Color is never the only indicator

### NFR-5 Compliance / auditability
- Immutable audit logs for scoring and action changes
- Exportable audit report per analysis

---

## 4) Data model (high level)
### Tables (suggested)
- organizations
- users
- analyses
- nodes
- node_edges (if gates/graph needed)
- risk_scores
- action_items
- action_week_status
- people_directory
- scales (severity/occurrence/detection)
- scale_versions
- evidence_attachments
- audit_log

---

## 5) API surface (example)
- `POST /analyses` create analysis
- `GET /analyses/:id` read analysis (with nodes/actions)
- `POST /analyses/:id/nodes` create node
- `PATCH /nodes/:id` update node
- `POST /action-items` create action
- `PATCH /action-items/:id` update status / owner / due date
- `GET /analyses/:id/export?type=pdf|xlsx|png` exports

---

## 6) Definition of done (DoD)
- Parity: all workbook fields have equivalents
- Two-way sync: canvas ↔ table
- RPN/AP dashboards working with filters
- Week 1–4 action plan fully functional
- Exports validated against a sample workbook-based analysis
