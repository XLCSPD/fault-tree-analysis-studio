# Quality AI Features

This document describes the AI-powered quality checking features in FTA Studio for metadata, why statements, and investigations.

## Overview

FTA Studio includes three AI-assisted quality checking features:

1. **Metadata AI Assist** - Generates structured problem statements and summaries
2. **Why Statement Quality Check** - Validates cause statements for clarity and testability
3. **Investigation Quality Check** - Converts investigations to structured hypothesis tests

All AI features follow a human-in-the-loop approach: AI proposes, user reviews and applies.

---

## Feature 1: Metadata AI Assist

### Purpose

Helps analysts create well-structured problem statements and executive summaries by analyzing the analysis context.

### Endpoint

```
POST /api/ai/metadata-assist
```

### Request

```json
{
  "analysisId": "uuid"
}
```

### Response

```json
{
  "problem_statement": "string (markdown)",
  "abstract_summary": "string (markdown)",
  "missing_metadata": [
    {
      "field": "industry|site|area|process|asset_system|item_output|issue_category",
      "reason": "string",
      "question": "string"
    }
  ]
}
```

### Problem Statement Template

The AI generates problem statements following this structure:

- **What is happening:** Symptom/defect observed
- **Where:** Site/area/process location
- **When/Frequency:** Time window or occurrence rate
- **Impact:** Cost, service, safety, or quality effect
- **Expected Standard:** What should happen
- **Evidence Source:** Report, audit, or observation

### Abstract/Summary Template

The AI generates summaries with these elements:

- **Observed Issue:** Brief description
- **Suspected Drivers:** Initial hypotheses
- **What We Will Prove:** Investigation goal
- **Planned Investigations:** Approach overview
- **Success Definition:** Completion criteria

### Context Gathering

The AI uses the following context to generate suggestions:

- Analysis title and existing metadata
- Industry reference data
- Root node and first-level causes
- Action items (count and status)
- Evidence count

### UI Location

Found in the **Metadata Panel** at the top of the form, with:

- Generate/Regenerate button
- Current vs. Suggested diff view
- Apply / Edit / Discard actions
- Missing metadata indicators

---

## Feature 2: Why Statement Quality Check

### Purpose

Analyzes cause (why) statements for common issues that reduce investigation effectiveness.

### Endpoint

```
POST /api/ai/why-quality
```

### Request

```json
{
  "analysisId": "uuid",
  "nodeId": "uuid (optional)",
  "checkEntireAnalysis": false
}
```

### Response

```json
{
  "issues": [
    {
      "node_id": "uuid",
      "issue_type": "WHY_CLARITY|WHY_TESTABILITY|WHY_SYMPTOM_RESTATEMENT|WHY_BLAMEY|WHY_VAGUE",
      "original_text": "string",
      "improved_text": "string",
      "evidence_required": "string",
      "verification_method": "observation|audit|data_pull|interview|test",
      "confidence": "low|medium|high"
    }
  ]
}
```

### Issue Types

| Issue Type | Description | Example |
|------------|-------------|---------|
| `WHY_BLAMEY` | Human-centric blame language | "Operator error", "Careless", "Not paying attention" |
| `WHY_VAGUE` | Non-specific language | "Training issue", "Communication problem" |
| `WHY_SYMPTOM_RESTATEMENT` | Child repeats parent | "Item not scanned" -> "Failed to scan item" |
| `WHY_TESTABILITY` | Cannot be proven true/false | Missing measurable criteria |
| `WHY_CLARITY` | Needs more specificity | Abstract statements |

### Blamey Terms Detected

```typescript
const BLAMEY_TERMS = [
  'complacency', 'careless', 'operator error', 'not paying attention',
  'human error', 'negligence', 'inattention', 'lack of care',
  'poor attitude', "didn't care", 'forgot', 'laziness'
]
```

### Vague Terms Detected

```typescript
const VAGUE_TERMS = [
  'training issue', 'communication issue', 'process issue',
  "didn't follow", 'failed to', 'inadequate', 'improper', 'insufficient'
]
```

### UI Location

Found in the **AI Assist Panel** (Node Inspector) under "Quality Checks":

- Check Selected Node button
- Check All button (entire analysis)
- Issue cards with:
  - Original text (strikethrough)
  - Improved text (highlighted)
  - Replace / Add as Alias / Dismiss actions

### Database Changes

When issues are found:

1. `quality_issues` table entry created with status `OPEN`
2. `nodes.quality_flags` updated with issue metadata
3. Canvas displays warning badge on affected nodes

---

## Feature 3: Investigation Quality Check

### Purpose

Converts vague investigation items into structured hypothesis tests with clear pass/fail criteria.

### Endpoint

```
POST /api/ai/investigation-quality
```

### Request

```json
{
  "analysisId": "uuid",
  "nodeId": "uuid (optional)",
  "actionId": "uuid (optional)"
}
```

### Response

```json
{
  "issues": [
    {
      "action_id": "uuid",
      "issue_type": "INVESTIGATION_NO_HYPOTHESIS|INVESTIGATION_NO_CRITERIA|INVESTIGATION_TOO_BROAD|INVESTIGATION_NO_EVIDENCE",
      "original_text": "string",
      "hypothesis_text": "string",
      "test_method": "string",
      "evidence_required": "string",
      "pass_fail_criteria": "string",
      "recommended_owner_role": "string",
      "due_date_offset_days": 2,
      "confidence": "low|medium|high"
    }
  ]
}
```

### Issue Types

| Issue Type | Description | Example |
|------------|-------------|---------|
| `INVESTIGATION_NO_HYPOTHESIS` | No falsifiable claim | "Check the process" |
| `INVESTIGATION_NO_CRITERIA` | No pass/fail definition | No measurable outcome |
| `INVESTIGATION_TOO_BROAD` | Scope too wide | "Verify process compliance" |
| `INVESTIGATION_NO_EVIDENCE` | No evidence type specified | Missing data requirements |

### Vague Investigation Verbs Detected

```typescript
const VAGUE_INVESTIGATION_VERBS = [
  'check', 'review', 'verify', 'confirm',
  'validate', 'assess', 'evaluate', 'investigate'
]
```

### Hypothesis Test Structure

When rewriting an investigation, the AI generates:

```json
{
  "hypothesis_text": "If [cause] is the root cause, then investigation will show [condition]",
  "test_method": "1. Define data to collect\n2. Identify sources\n3. Collect evidence\n4. Analyze\n5. Document",
  "evidence_required": "Specific artifacts/data needed",
  "pass_fail_criteria": "CONFIRMS if: [condition]\nRULES OUT if: [condition]"
}
```

### UI Location

Found in the **AI Assist Panel** under "Quality Checks":

- Check Node Actions / Check All button
- Expandable issue cards with:
  - Original investigation text
  - Full hypothesis test preview
  - Apply Hypothesis Test button

### Database Changes

When applied:

1. `action_items` updated with `hypothesis_text`, `test_method`, `pass_fail_criteria`
2. `quality_issues` marked as `RESOLVED`
3. Table view shows hypothesis badge on converted items

---

## Quality Score

### Overview

An aggregated quality score is calculated for each analysis based on:

- Metadata completeness (10 points max)
- Why statement quality (points per node without issues)
- Investigation quality (points per action without issues)

### API

```typescript
function useAnalysisQualityScore(analysisId: string) {
  return {
    total_score: number,
    max_score: number,
    metadata_complete: boolean,
    flagged_whys_count: number,
    flagged_investigations_count: number,
    percentage: number
  }
}
```

### UI Location

- Toolbar indicator showing percentage
- Click opens Fix List drawer with all open issues
- Each issue links to the affected node/action

---

## Database Schema

### New Tables

#### `quality_issues`

Tracks individual quality issues for audit and tracking.

```sql
CREATE TABLE quality_issues (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    node_id UUID NULL,           -- Set for why issues
    action_id UUID NULL,         -- Set for investigation issues
    issue_kind quality_issue_kind NOT NULL,
    severity quality_issue_severity NOT NULL DEFAULT 'WARN',
    message TEXT NOT NULL,
    suggestion JSONB,            -- Full suggestion payload
    status quality_issue_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ,
    created_by UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID
)
```

### New Columns

#### `analyses`

- `abstract_summary TEXT` - AI-generated structured summary

#### `action_items`

- `hypothesis_text TEXT` - Falsifiable hypothesis
- `test_method TEXT` - Investigation steps
- `pass_fail_criteria TEXT` - Pass/fail conditions
- `expected_outcome expected_outcome_type` - CONFIRM/RULE_OUT/EITHER

#### `nodes`

- `quality_flags JSONB` - Last check results
- `text_aliases JSONB` - Alternate phrasings array

### New Enums

```sql
CREATE TYPE quality_issue_kind AS ENUM (
    'WHY_CLARITY', 'WHY_TESTABILITY', 'WHY_SYMPTOM_RESTATEMENT',
    'WHY_BLAMEY', 'WHY_VAGUE', 'INVESTIGATION_NO_HYPOTHESIS',
    'INVESTIGATION_NO_CRITERIA', 'INVESTIGATION_TOO_BROAD',
    'INVESTIGATION_NO_EVIDENCE', 'METADATA_GAP'
);

CREATE TYPE quality_issue_severity AS ENUM ('INFO', 'WARN', 'HIGH');

CREATE TYPE quality_issue_status AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TYPE expected_outcome_type AS ENUM ('CONFIRM', 'RULE_OUT', 'EITHER');
```

---

## Audit Logging

All AI operations are logged to the `ai_runs` and `ai_suggestions` tables:

1. Each quality check creates an `ai_runs` record with:
   - Feature type (`metadata_assist`, `why_quality`, `investigation_quality`)
   - Input context summary
   - Output summary
   - Latency and token usage

2. Each suggestion creates an `ai_suggestions` record with:
   - Full payload
   - Confidence level
   - Status (proposed/accepted/dismissed)
   - Applied entity reference when accepted

---

## Security & Permissions

### RLS Policies

- Only organization members can view quality issues
- Contributors and above can create/update issues
- Only admins can delete issues

### Required Roles

| Action | Required Role |
|--------|---------------|
| Run quality checks | contributor+ |
| Apply suggestions | contributor+ |
| Dismiss suggestions | contributor+ |
| Delete issues | admin |

---

## Files Reference

| Purpose | Path |
|---------|------|
| Migration | `db/08_quality_ai_features.sql` |
| Types | `lib/ai/types.ts` |
| Metadata API | `app/api/ai/metadata-assist/route.ts` |
| Why Quality API | `app/api/ai/why-quality/route.ts` |
| Investigation API | `app/api/ai/investigation-quality/route.ts` |
| Hooks | `lib/hooks/use-quality-ai.ts` |
| Metadata AI UI | `components/inspector/metadata-ai-assist.tsx` |
| Why Quality UI | `components/inspector/why-quality-module.tsx` |
| Investigation UI | `components/inspector/investigation-quality-module.tsx` |
| Score Indicator | `components/quality/quality-score-indicator.tsx` |
| Flag Badge | `components/quality/quality-flag-badge.tsx` |
