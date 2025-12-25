# Fault Tree Studio (FTA) — Updated PRD (Spreadsheet-True + Interactive Canvas)
*Last updated: 2025-12-24*

## 1) Product summary
Fault Tree Studio is a web app that modernizes the **Blank FTA.xlsm** workbook while **preserving its core flow and layout logic**:
- **Top event → 9-Why cause chain** (Failure Mode (Top) + Why 1…Why 9)
- **Action Plan** with **Week 1–Week 4** cadence
- **Risk scoring** using **Severity / Occurrence / Detection** → **RPN**
- Supporting reference tabs: **Criteria & scales** and **Person Responsible** lists

The app keeps the “spreadsheet spirit” (grid + columns + fast data entry), but adds an **interactive fault tree canvas** so users can **design and navigate the tree visually** without losing the familiar table view.

---

## 2) Goals
### Primary goals
1. **Maintain workbook fidelity**: every meaningful field and calculation in the spreadsheet has a home in the app.
2. **Make the tree actually feel like a tree**: drag/drop, collapse/expand, zoom, gates, and quick navigation.
3. **Make prioritization and execution easier**: RPN/AP dashboards, week-based tracking, clear ownership, evidence attachments.
4. **Enable scale**: multi-project portfolio visibility, standard templates, exports, and auditability.

### Non-goals (v1)
- Automated root-cause “AI answers” that replace human RCA judgment
- Full enterprise QMS replacement (CAPA, audits, document control) — we integrate/bridge instead

---

## 3) Personas
1. **Facilitator / CI Lead**
   - Runs RCA sessions, drives consistency, needs speed + structure + outputs.
2. **Operations Leader / Sponsor**
   - Wants a clear story: top risks, owners, dates, progress, control plan.
3. **Subject Matter Expert (SME)**
   - Contributes causes, evidence, likelihoods, detection realities.
4. **Action Owner**
   - Needs clear tasks, due dates, weekly status, and proof of completion.

---

## 4) Key user journeys
### Journey A — Build an FTA from scratch (workbook-equivalent)
1. Create a new **FTA Analysis**
2. Fill header info (Model, Application, Part Name, Date, Abstract, Related Document)
3. Define **Failure/Problem** and **Failure Mode (Top)**
4. Build causes via:
   - Spreadsheet-style entry (Why 1…Why 9)
   - OR interactive canvas (add nodes, connect, label)
5. For each leaf/root cause: enter Units / Specification / Metric and scoring (S/O/D)
6. Review **RPN** dashboard to prioritize
7. Create **Action Plan** items (Investigation Item, Person Resp, Schedule, Week status)
8. Record **Investigation Result**, **Judgment**, **Remarks**
9. Export summary to PDF/Excel for sharing

### Journey B — Facilitate a live session (faster than Excel)
- Live collaborative editing, sticky notes / hypotheses, “needs evidence” flags, and immediate RPN rollups.

### Journey C — Weekly execution and review
- “Week 1–4” view: who’s late, what’s blocked, what’s done, and what evidence exists.

---

## 5) Information architecture (IA)
### Navigation
- **Home / Portfolio**
  - Recent analyses, filters (site, process, product, status), RPN/AP hotspots
- **FTA Analysis**
  - **Canvas** (primary)
  - **Table View** (spreadsheet-faithful)
  - **RPN / Prioritization**
  - **Action Plan (Weeks 1–4)**
  - **Criteria & Scales**
  - **People (Person Resp)**
  - **Export / Share**

---

## 6) Feature set (updated for the new design)

### 6.1 “Spreadsheet-True” Table View (must-have)
A grid that mirrors the workbook’s logic:
- Columns:
  - Failure Mode (Top)
  - Why 1…Why 9
  - Units, Specification
  - Action Plan: Investigation Item, Person Resp, Schedule
  - Week 1–Week 4 statuses
  - Investigation Result, Judgment, Remarks
- Behaviors:
  - Fast keyboard navigation (tab/enter), paste blocks, auto-fill down
  - Data validation dropdowns (Person Resp list, rating scales)
  - Inline errors for missing required fields

### 6.2 Interactive Fault Tree Canvas (must-have)
A visual editor that stays aligned to the table:
- Node types: Top event, intermediate event, basic event (cause)
- Connectors with **AND/OR gates** (Phase 2 gates, optional in v1)
- Quick actions: add child, add sibling, convert to gate, collapse branch
- Pan/zoom/minimap, fit-to-screen, search + highlight
- Selecting a node opens the **Inspector panel** (edit all fields)

**Critical requirement:** changes in canvas update the Table View instantly (and vice versa).

### 6.3 RPN + Action Priority (AP) dashboard (must-have)
- Computation:
  - **RPN = Severity × Occurrence × Detection**
- Displays:
  - Ranked list of causes
  - Heatmap (S vs O, bubble size = RPN, color = D or AP)
  - Filters: open actions only, overdue, high severity, site/process
- Adds **Action Priority (AP)** to reduce over-reliance on RPN:
  - AP category driven by S/O/D mapping (configurable table)

### 6.4 Criteria & scales manager (must-have)
A reference module that mirrors workbook “Criteria and scales”:
- Severity scale definitions
- Occurrence scale definitions
- Detection scale definitions
- Issue classification options (if applicable)
- Admin can customize scales per organization/site

### 6.5 People directory (“Person Resp”) (must-have)
- List of persons + initials (and optional role/site/email)
- Used for dropdown assignment and accountability
- Optional: import from HR roster/CSV

### 6.6 Action Plan + Week cadence (must-have)
- Action list tied to nodes/causes
- Week 1–4 status fields (Not started / In progress / Done / Blocked)
- Schedule with due date and reminders
- Evidence attachments per action (photos, PDFs, links)

### 6.7 Evidence & “proof standard” (world-class behavior)
- Attach evidence to:
  - Causes (why believed true)
  - Actions (proof completed)
- Evidence types: photo, file, link, note, measurement result
- Flags:
  - “Hypothesis” vs “Verified”
  - “Missing detection control” prompt
  - “Weak cause” prompts (e.g., vague verbs, no mechanism)

### 6.8 Exports (must-have)
- Export to:
  - XLSX (workbook-like table)
  - PDF (executive summary + RPN + action plan)
  - PNG/SVG snapshot of tree
- Optional: import from the existing xlsm template

---

## 7) UX requirements (design changes reflected)
### Design principles
- **Feels like Excel, behaves like a modern design tool**
- Always keep user oriented: breadcrumbs, minimap, clear selection state
- Reduce cognitive load: collapse branches, focus mode, highlight paths

### Key screens
1. **Portfolio Home**
   - Cards: “High RPN Open”, “Overdue Actions”, “New Analyses”, “Recently Updated”
2. **FTA Studio**
   - Left: canvas
   - Right: inspector panel (node details)
   - Bottom (toggle): table view drawer (spreadsheet grid)
3. **RPN / AP**
   - Ranked table + charts + filters
4. **Action Plan**
   - Week tabs + Gantt-like timeline
   - Owner view (“My Actions”)

---

## 8) Data + calculations (workbook parity)
### Core objects
- Analysis (header metadata)
- Node (tree structure + text fields)
- RiskScore (S/O/D, computed RPN, computed AP)
- ActionItem (owner, due date, week status, evidence)
- Scale (rating tables)
- Person (directory)

### Calculation rules
- RPN: multiply S/O/D integers (typically 1–10)
- AP: category mapping table (admin-configurable)
- Requiredness:
  - Leaf causes require risk scoring before they appear in “Top Causes” list

---

## 9) Permissions
- Viewer: read-only
- Contributor: edit nodes/actions assigned to them
- Facilitator: edit everything within an analysis
- Admin: manage scales, people directory, templates, org settings

---

## 10) Success metrics
- Time to create a complete fault tree (vs Excel baseline)
- % of actions completed on time
- % of causes with evidence attached
- Reduction in “reopened” RCAs (actions not effective)
- User adoption: weekly active facilitators

---

## 11) Rollout plan (practical)
- v1: workbook-faithful table + canvas + RPN + week plan + exports
- v1.5: AP, evidence workflows, portfolio dashboards
- v2: AND/OR gates, reusable templates, integrations (QMS, CMMS)

---

## 12) Risks / mitigations
- **Over-complex UX** → keep table view always available + strong keyboard support
- **Data drift vs workbook** → maintain a strict field mapping document + export parity tests
- **RPN misuse** → include AP + guidance + evidence prompts

---

## 13) Spreadsheet-to-App mapping (for alignment)
| Workbook Sheet | App Module | Notes |
|---|---|---|
| FTA weeks 1-4 | FTA Studio (Canvas + Table) + Action Plan | Main workspace + week cadence |
| Criteria and scales | Criteria & Scales | Admin-editable rating tables |
| RPN | RPN / AP Dashboard | Auto-ranked causes |
| Person Resp | People Directory | Used for dropdown assignments |
