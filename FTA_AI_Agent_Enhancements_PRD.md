# Fault Tree Studio — AI Agent Enhancements PRD
*Last updated: 2025-12-25*  
*Scope: AI assistance & guidance integrated into the Analysis (FTA Studio) experience. Weekly tracking is removed; execution is tracked via Action Lifecycle (Owner/Due Date/Status/Evidence).*  

---

## 1) Executive summary
Fault Tree Studio already provides the right “work surfaces” for modern problem solving: **Canvas (tree)**, **Inspector (detail)**, and **Table View (spreadsheet parity + speed)**.  
This PRD adds **embedded AI guidance** that feels like *tools*, not a chat widget, to help users:

1) **Expand** the tree with high-quality “next why” proposals  
2) **Convert hypotheses into investigation plans** (actions + evidence requirements)  
3) **Improve rigor** through automated quality checks and consistency prompts  
4) **Drive prevention** by recommending controls and turning them into preventive actions  
5) **Learn from prior analyses** via a lightweight Patterns Library  

Non-negotiable: AI suggestions never auto-apply—users must **accept** changes.

---

## 2) Goals
### 2.1 Primary goals
- **Reduce time-to-complete** an analysis while improving quality of causes/actions
- **Increase consistency** in how teams word causes, define evidence, and prioritize actions
- **Support facilitators** during live RCA/FTA sessions
- **Create auditability**: what AI suggested, what the user accepted, and why

### 2.2 Secondary goals
- Build a foundation for “site-smart” recommendations (Patterns Library)
- Improve adoption by making AI feel native to Canvas/Table/Inspector workflows

### 2.3 Non-goals (v1)
- Fully autonomous root-cause determination without human validation
- AI making edits without explicit user acceptance
- Replacing company QMS/CAPA systems (optional export/integration later)

---

## 3) Personas
1) **Facilitator / CI Lead**  
   Needs speed, structure, and meeting-ready outputs; cares about rigor and evidence.
2) **Ops Leader / Sponsor**  
   Wants clarity: “what’s driving it, what are we doing, when is it closed, what prevents recurrence?”
3) **SME**  
   Contributes realistic causes and verification methods.
4) **Action Owner**  
   Wants clear tasks, due dates, and definition-of-done.

---

## 4) Current context (baseline UX)
- **Canvas**: build the fault tree with nodes/edges; select nodes for editing
- **Node Inspector**: Details, Risk, Actions, Evidence
- **Table View**: spreadsheet-style projection of paths, plus scoring and action-related columns
- Weekly W1–W4 tracking has been removed

---

## 5) UX strategy for AI: “Tools, not chat”
AI must live where work happens. The default experience is **actionable suggestions** with “Insert / Create” buttons, not long conversation.

### 5.1 New Inspector tab
Add a new tab:
- **AI Assist** (next to Details/Risk/Actions/Evidence)

### 5.2 AI Assist UI pattern
Inside AI Assist, show **modules** with buttons and results:

- **Propose Next Whys**
- **Propose Investigation Actions**
- **Improve Cause Quality**
- **Suggest Controls / Prevention**
- **Branch Summary (optional)**

Each module returns **suggestion cards** with:
- Suggested text (node-ready or action-ready)
- 1-line rationale
- Evidence to confirm (what proof is required)
- Confidence (Low/Med/High)
- Buttons: **Add Child**, **Add Sibling**, **Create Action**, **Park as Hypothesis**, **Dismiss**

---

## 6) Features & requirements

## 6.1 Feature A — Next Why Proposer (Agent)
### Problem it solves
Users get stuck generating plausible next causes or produce vague causes.

### Inputs (context window)
- Selected node label + type
- Parent chain (Failure Mode → Why1…)
- Siblings and nearby branch context
- Any existing evidence, results, judgment
- Optional: site/process tags from analysis metadata

### Output (structured)
Return 5–8 candidate child causes; each includes:
- **Cause text** (short, mechanism-based)
- **Category** (Process / System / People / Material / Environment / Measurement / Management)
- **Why plausible** (1 sentence)
- **Evidence to confirm** (1 sentence)
- **Suggested verification method** (observation, audit, system data pull, time study, etc.)
- **Confidence** (Low/Med/High)

### UX
- Clicking **Add Child** creates nodes under selected node
- Clicking **Add Sibling** creates nodes at same level
- “Park as Hypothesis” adds node with Evidence Status = Hypothesis

### Acceptance criteria
- Suggestions are displayed within 3–8 seconds typical
- Adding a suggestion updates Canvas and Table View instantly
- Suggestions are logged (see audit section)

---

## 6.2 Feature B — Investigation Proposal Generator (Agent)
### Problem it solves
Teams don’t know how to prove/disprove causes quickly; actions become vague.

### Inputs
- Selected node OR selected branch (multi-select)
- Any current actions tied to the node/branch
- Current evidence status/judgment
- Optional: user-selected “investigation speed” (fast/standard/thorough)

### Output (action cards)
Generate 5–12 proposed actions with fields:
- **Action Type**: Investigation (default), Containment, Corrective, Preventive
- **Action statement**: verb + object (clear)
- **Owner role suggestion** (Team Lead, Supervisor, QA, Systems, etc.)
- **Evidence type** required (photo, data pull, audit, observation)
- **Expected outcome** (confirm/rule out)
- **Due date suggestion** (e.g., +2 days for investigations)
- **Close criteria** (definition-of-done)

### UX
- Buttons: **Create Action** (single) and **Bulk Create** (all selected)
- Newly created actions appear in:
  - Inspector → Actions tab (for node)
  - Table View columns (Investigation Item / Person / Schedule/Due Date / Status / Result / Remarks)

### Acceptance criteria
- Bulk create adds all actions with correct node linkage
- Users can edit before saving (review step)
- “Evidence required” is prefilled into Evidence section

---

## 6.3 Feature C — Cause Quality Coach (Agent + rules)
### Problem it solves
Causes become non-testable (“complacency”), symptoms (“didn’t scan”), or blame-based.

### Functionality
When a node is selected (or on demand), AI returns:
- **Rewrite suggestion** to make cause testable and mechanism-based
- “Missing Control” prompt (what control failed/doesn’t exist)
- Suggested cause category (6M + management system)

### Triggers
- On-demand button: “Improve Cause Quality”
- Optional automatic flagging when cause contains weak patterns:
  - “operator error”, “careless”, “complacency”, “not paying attention”
  - “didn’t follow process” with no mechanism

### Output
- “Better cause statement”
- “What evidence proves it”
- “What control would prevent it”

### Acceptance criteria
- Users can apply rewrite with one click
- Original text remains in revision history

---

## 6.4 Feature D — Analysis Quality Check (Agent + deterministic checks)
### Problem it solves
Analyses remain incomplete: missing scoring, missing evidence, confirmed causes without proof, etc.

### UX
- Add a small top-bar indicator: **Quality** (e.g., 7/10)  
- Click opens a slide-over panel: **Fix List**

### Checks (v1)
- Confirmed (Judgment=1) nodes lacking evidence attachments/links
- Leaf causes missing S/O/D scoring
- High RPN causes with no actions
- Actions missing owner or due date
- Duplicate/near-duplicate causes in same branch
- Branch depth too shallow (optional heuristic)
- “Ruled out” nodes still used as main causes

### Output
Each fix item includes:
- Issue description
- Jump-to-node/action
- Suggested fix (auto-fill possible)
- Apply button when safe

### Acceptance criteria
- Fix list refreshes in <2 seconds
- Clicking an item navigates and highlights the relevant node or row
- Applying a fix updates quality score immediately

---

## 6.5 Feature E — Controls & Prevention Recommender (Agent)
### Problem it solves
Teams stop at root cause and don’t implement sustainable prevention.

### Inputs
- Confirmed root causes (Judgment=1) + branch context
- Optional: user indicates constraint preferences (system change possible? training allowed? budget?)

### Output
For each confirmed cause, propose controls:
- **Control statement**
- **Control type**: Engineering / Administrative / Standard Work / System Enforcement / Audit/Verification
- **Where it lives**: SOP, system rule, scanning step, label standard, etc.
- **Monitoring method** + frequency
- **Reaction plan** if control fails
- Button: **Create Preventive Action**

### Acceptance criteria
- Preventive actions are created with clear owner/due date placeholders
- Controls appear in an optional “Controls” section under Evidence or Actions

---

## 6.6 Feature F — Table View AI Helpers (fast adoption)
### UX additions
Add a contextual menu for table cells (right-click or “spark” icon on hover):
- **Suggest next why for this cell**
- **Generate 3 sibling causes**
- **Rewrite as testable cause**
- **Create investigation action from this row**
- **Auto-fill missing S/O/D guidance** (explain scale, not auto-score by default)

### Acceptance criteria
- Results apply to correct node path and sync to canvas
- Bulk operations require confirmation

---

## 6.7 Feature G — Patterns Library (v1: lightweight)
### Purpose
Make suggestions feel site-smart and reduce generic output.

### Data captured
From completed analyses, store:
- Normalized “cause phrases” + categories
- Associated investigation actions that worked
- Controls implemented + effectiveness notes (optional)
- Tags: site, process, failure type, date

### Usage
When proposing next whys/investigations/controls:
- Include label: “Seen in similar cases (N)” and allow user to open examples.

### Acceptance criteria
- Patterns can be turned off per org (privacy)
- Patterns are organization-scoped

---

## 7) Data model changes
Add tables:

### 7.1 `ai_runs`
Tracks each AI request.
- id (uuid)
- organization_id
- analysis_id
- node_id (nullable)
- context_type (node|branch|table_cell|analysis)
- feature (next_whys|investigations|quality|controls|rewrite)
- model_provider (openai|anthropic|other)
- prompt_version
- input_summary (jsonb; sanitized)
- created_by (user_id)
- created_at

### 7.2 `ai_suggestions`
Stores structured suggestions.
- id
- ai_run_id
- suggestion_type (node|action|rewrite|control|fix)
- payload (jsonb)  // node text, action fields, etc.
- confidence (low|med|high)
- rationale (text)
- evidence_required (text)
- status (proposed|accepted|dismissed)
- accepted_by, accepted_at
- applied_entity_id (node_id/action_id) nullable

### 7.3 `patterns_library`
Organization-scoped learned patterns.
- id
- organization_id
- pattern_type (cause|action|control)
- normalized_text
- category
- tags (jsonb)
- usage_count
- last_seen_at
- example_analysis_ids (jsonb)

### 7.4 `audit_log` (extend)
Log events:
- AI run created
- suggestion accepted/dismissed
- suggestion applied to node/action
- rewrite applied (store before/after)

---

## 8) Permissions & governance
- Only authenticated users can run AI features.
- AI suggestions are organization-scoped; no cross-org leakage.
- Admin settings:
  - Enable/disable AI features
  - Enable/disable Patterns Library capture
  - Choose provider/model and rate limits (optional)
  - Default safety: “AI suggestions require acceptance” (always on)

---

## 9) API requirements (server routes)
Create secure server-side routes:
- `POST /api/ai/next-whys`
- `POST /api/ai/investigations`
- `POST /api/ai/rewrite-cause`
- `POST /api/ai/controls`
- `POST /api/ai/quality-check`

Each route must:
- Validate org access (RLS + server auth)
- Fetch required context (node/branch/table path)
- Call model provider
- Store ai_run + ai_suggestions
- Return structured results

---

## 10) Prompting & output contracts
### 10.1 Strict JSON outputs
AI responses must be valid JSON matching a schema per feature, e.g.:
- next_whys: array of `{{cause_text, category, rationale, evidence_required, confidence}}`
- investigations: array of `{{action_type, title, owner_role, due_date_offset_days, evidence_type, close_criteria}}`
- quality_check: array of `{{issue_type, target, message, recommended_fix}}`

### 10.2 Grounding rules
- Always cite “what would prove it” (evidence requirement)
- Avoid blame language
- Prefer mechanism-based phrasing
- If uncertain, propose verification steps rather than asserting truth

---

## 11) UX details (how it should feel)
- AI Assist results render as **cards** with clear primary actions.
- “Apply” operations are reversible (undo) where possible.
- Keep UI quiet: no huge chat bubbles; use compact guidance.
- Provide a small “why this suggestion?” expander for transparency.
- Maintain Palette F: lime used sparingly for highlights (selected / recommended / main cause).

---

## 12) Success metrics
- Time-to-create a tree branch to depth 3–5 (median)
- % of confirmed causes with evidence attached
- % of high-RPN causes with at least one action
- Average time-to-close actions (by status)
- AI adoption rate: runs per analysis, acceptance rate, dismiss rate
- Facilitator satisfaction rating

---

## 13) Risks & mitigations
- **Hallucination risk** → force evidence requirements; no auto-apply; show confidence.
- **Over-suggestions** → limit to 5–8 high-quality suggestions, not 20.
- **UI clutter** → place AI in Inspector tab + contextual menus; hide behind click.
- **Privacy concerns** → org-scoped; toggle Patterns Library.

---

## 14) Phased rollout
### Phase 1 (MVP AI)
- AI Assist tab
- Next Why proposer
- Investigation proposal generator
- Suggestion cards + apply buttons
- ai_runs + ai_suggestions logging

### Phase 2 (Rigor + scale)
- Quality score + fix list
- Controls recommender
- Table view AI helpers
- Expanded audit trails

### Phase 3 (Site-smart)
- Patterns Library (capture + retrieval)
- “Seen in similar cases” links

---

## Appendix A — Suggested UI copy (enterprise-friendly)
- Buttons: “Propose next causes”, “Generate investigation actions”, “Improve cause quality”, “Suggest preventive controls”
- Tooltips: “AI suggestions require evidence and are not applied automatically.”
