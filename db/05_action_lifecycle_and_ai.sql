-- Migration: Action Lifecycle Model + AI Tables
-- Removes weekly tracking, implements full action lifecycle, adds AI suggestion audit trail
-- Run after: 01_schema.sql, 02_rls_policies.sql, 03_sync_functions.sql, 04_notifications.sql

-- ============================================================
-- PART 1: NEW ENUMS
-- ============================================================

-- Action type enum
CREATE TYPE action_type AS ENUM (
    'INVESTIGATION',
    'CONTAINMENT',
    'CORRECTIVE',
    'PREVENTIVE'
);

-- Action lifecycle status enum (replaces weekly tracking)
CREATE TYPE action_lifecycle_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'BLOCKED',
    'DONE',
    'VERIFIED'
);

-- Action priority enum
CREATE TYPE action_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

-- Evidence status enum
CREATE TYPE evidence_status AS ENUM (
    'NONE',
    'REQUESTED',
    'ATTACHED',
    'VERIFIED'
);

-- AI feature type enum
CREATE TYPE ai_feature_type AS ENUM (
    'next_whys',
    'investigations',
    'rewrite_cause',
    'controls',
    'quality_check'
);

-- AI suggestion type enum
CREATE TYPE ai_suggestion_type AS ENUM (
    'node',
    'action',
    'rewrite',
    'control',
    'fix'
);

-- AI suggestion status enum
CREATE TYPE ai_suggestion_status AS ENUM (
    'proposed',
    'accepted',
    'dismissed'
);

-- AI confidence level enum
CREATE TYPE ai_confidence AS ENUM (
    'low',
    'medium',
    'high'
);

-- ============================================================
-- PART 2: ALTER ACTION_ITEMS TABLE (Action Lifecycle Model)
-- ============================================================

-- Add new columns to action_items for lifecycle tracking
ALTER TABLE action_items
    ADD COLUMN IF NOT EXISTS action_type action_type DEFAULT 'INVESTIGATION',
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS status action_lifecycle_status DEFAULT 'NOT_STARTED',
    ADD COLUMN IF NOT EXISTS priority action_priority DEFAULT 'MEDIUM',
    ADD COLUMN IF NOT EXISTS close_criteria TEXT,
    ADD COLUMN IF NOT EXISTS result TEXT,
    ADD COLUMN IF NOT EXISTS evidence_required TEXT,
    ADD COLUMN IF NOT EXISTS evidence_status evidence_status DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- Migrate existing data: copy investigation_item to title, schedule to due_date
UPDATE action_items
SET
    title = COALESCE(title, investigation_item),
    due_date = COALESCE(due_date, schedule),
    result = COALESCE(result, investigation_result);

-- Set organization_id from analysis
UPDATE action_items ai
SET organization_id = a.organization_id
FROM analyses a
WHERE ai.analysis_id = a.id AND ai.organization_id IS NULL;

-- Make organization_id NOT NULL after migration
ALTER TABLE action_items
    ALTER COLUMN organization_id SET NOT NULL;

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_action_items_organization ON action_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_action_items_action_type ON action_items(action_type);
CREATE INDEX IF NOT EXISTS idx_action_items_owner_user ON action_items(owner_user_id);

-- ============================================================
-- PART 3: UPDATE EVIDENCE_ATTACHMENTS TABLE
-- ============================================================

-- Add organization_id and analysis_id for proper scoping
ALTER TABLE evidence_attachments
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN ('FILE', 'LINK', 'NOTE')),
    ADD COLUMN IF NOT EXISTS note TEXT,
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Migrate existing data: set organization_id and analysis_id from node or action_item
UPDATE evidence_attachments ea
SET
    organization_id = COALESCE(
        (SELECT a.organization_id FROM nodes n JOIN analyses a ON n.analysis_id = a.id WHERE n.id = ea.node_id),
        (SELECT a.organization_id FROM action_items ai JOIN analyses a ON ai.analysis_id = a.id WHERE ai.id = ea.action_item_id)
    ),
    analysis_id = COALESCE(
        (SELECT n.analysis_id FROM nodes n WHERE n.id = ea.node_id),
        (SELECT ai.analysis_id FROM action_items ai WHERE ai.id = ea.action_item_id)
    ),
    kind = CASE
        WHEN ea.type = 'file' OR ea.type = 'photo' OR ea.type = 'measurement' THEN 'FILE'
        WHEN ea.type = 'link' THEN 'LINK'
        WHEN ea.type = 'note' THEN 'NOTE'
        ELSE 'FILE'
    END,
    storage_path = ea.file_path,
    created_by = ea.uploaded_by
WHERE ea.organization_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_evidence_attachments_organization ON evidence_attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_attachments_analysis ON evidence_attachments(analysis_id);

-- ============================================================
-- PART 4: AI TABLES
-- ============================================================

-- AI runs table - tracks each AI request
CREATE TABLE IF NOT EXISTS ai_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    context_type TEXT NOT NULL CHECK (context_type IN ('node', 'branch', 'table_cell', 'analysis')),
    feature ai_feature_type NOT NULL,
    model_provider TEXT NOT NULL DEFAULT 'anthropic',
    model_name TEXT,
    prompt_version TEXT,
    input_summary JSONB,
    output_summary JSONB,
    tokens_used INTEGER,
    latency_ms INTEGER,
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI suggestions table - stores structured suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_run_id UUID NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
    suggestion_type ai_suggestion_type NOT NULL,
    payload JSONB NOT NULL, -- node text, action fields, etc.
    confidence ai_confidence DEFAULT 'medium',
    rationale TEXT,
    evidence_required TEXT,
    category TEXT, -- cause category for node suggestions
    status ai_suggestion_status DEFAULT 'proposed',
    accepted_by UUID REFERENCES profiles(id),
    accepted_at TIMESTAMPTZ,
    dismissed_by UUID REFERENCES profiles(id),
    dismissed_at TIMESTAMPTZ,
    dismiss_reason TEXT,
    applied_entity_id UUID, -- node_id or action_id after application
    applied_entity_type TEXT CHECK (applied_entity_type IN ('node', 'action', 'rewrite')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patterns library table (Phase 2 - lightweight)
CREATE TABLE IF NOT EXISTS patterns_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('cause', 'action', 'control')),
    normalized_text TEXT NOT NULL,
    category TEXT,
    tags JSONB DEFAULT '[]',
    usage_count INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    example_analysis_ids JSONB DEFAULT '[]',
    source_suggestion_id UUID REFERENCES ai_suggestions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for AI tables
CREATE INDEX IF NOT EXISTS idx_ai_runs_organization ON ai_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_analysis ON ai_runs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_node ON ai_runs(node_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_feature ON ai_runs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_runs_created ON ai_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_run ON ai_suggestions(ai_run_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);

CREATE INDEX IF NOT EXISTS idx_patterns_library_org ON patterns_library(organization_id);
CREATE INDEX IF NOT EXISTS idx_patterns_library_type ON patterns_library(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_library_usage ON patterns_library(usage_count DESC);

-- ============================================================
-- PART 5: DROP WEEKLY TRACKING (after data migration)
-- ============================================================

-- Drop the action_week_status table
DROP TABLE IF EXISTS action_week_status CASCADE;

-- Drop the old action_status enum (if not used elsewhere)
-- Note: We keep it for now as it might be referenced elsewhere

-- ============================================================
-- PART 6: RLS POLICIES FOR NEW TABLES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns_library ENABLE ROW LEVEL SECURITY;

-- AI runs policies
CREATE POLICY "Users can view AI runs in their organization"
    ON ai_runs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create AI runs in their organization"
    ON ai_runs FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- AI suggestions policies (derived from ai_runs)
CREATE POLICY "Users can view AI suggestions from their org runs"
    ON ai_suggestions FOR SELECT
    USING (ai_run_id IN (
        SELECT id FROM ai_runs WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update AI suggestions from their org runs"
    ON ai_suggestions FOR UPDATE
    USING (ai_run_id IN (
        SELECT id FROM ai_runs WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- Patterns library policies
CREATE POLICY "Users can view patterns in their organization"
    ON patterns_library FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Facilitators and admins can manage patterns"
    ON patterns_library FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid() AND role IN ('facilitator', 'admin')
    ));

-- Update action_items RLS to include organization_id
DROP POLICY IF EXISTS "Users can view action items in their organization" ON action_items;
DROP POLICY IF EXISTS "Users can manage action items in their organization" ON action_items;

CREATE POLICY "Users can view action items in their organization"
    ON action_items FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Contributors can manage their own action items"
    ON action_items FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            created_by = auth.uid()
            OR owner_user_id = auth.uid()
            OR person_responsible_id IN (
                SELECT pd.id FROM people_directory pd
                JOIN profiles p ON p.email = pd.email
                WHERE p.id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role IN ('facilitator', 'admin')
            )
        )
    );

-- ============================================================
-- PART 7: HELPER FUNCTIONS
-- ============================================================

-- Function to compute evidence_status for an action item
CREATE OR REPLACE FUNCTION compute_action_evidence_status(action_id UUID)
RETURNS evidence_status AS $$
DECLARE
    attachment_count INTEGER;
    verified_count INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE metadata->>'verified' = 'true')
    INTO attachment_count, verified_count
    FROM evidence_attachments
    WHERE action_item_id = action_id;

    IF attachment_count = 0 THEN
        RETURN 'NONE';
    ELSIF verified_count = attachment_count THEN
        RETURN 'VERIFIED';
    ELSE
        RETURN 'ATTACHED';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update evidence_status when attachments change
CREATE OR REPLACE FUNCTION update_action_evidence_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE action_items
        SET evidence_status = compute_action_evidence_status(OLD.action_item_id)
        WHERE id = OLD.action_item_id;
        RETURN OLD;
    ELSE
        UPDATE action_items
        SET evidence_status = compute_action_evidence_status(NEW.action_item_id)
        WHERE id = NEW.action_item_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Separate triggers for INSERT/UPDATE vs DELETE to avoid NEW reference in DELETE
CREATE TRIGGER trigger_update_action_evidence_status_insert_update
    AFTER INSERT OR UPDATE ON evidence_attachments
    FOR EACH ROW
    WHEN (NEW.action_item_id IS NOT NULL)
    EXECUTE FUNCTION update_action_evidence_status();

CREATE TRIGGER trigger_update_action_evidence_status_delete
    AFTER DELETE ON evidence_attachments
    FOR EACH ROW
    WHEN (OLD.action_item_id IS NOT NULL)
    EXECUTE FUNCTION update_action_evidence_status();

-- ============================================================
-- PART 8: UPDATE TABLE PROJECTION FUNCTION
-- ============================================================

-- Drop and recreate the table projection function to include new action lifecycle fields
CREATE OR REPLACE FUNCTION get_table_projection(p_analysis_id UUID)
RETURNS TABLE (
    row_id UUID,
    path_depth INTEGER,
    leaf_node_id UUID,
    failure_mode_top TEXT,
    why_1 TEXT,
    why_2 TEXT,
    why_3 TEXT,
    why_4 TEXT,
    why_5 TEXT,
    why_6 TEXT,
    why_7 TEXT,
    why_8 TEXT,
    why_9 TEXT,
    units TEXT,
    specification TEXT,
    metric TEXT,
    severity INTEGER,
    occurrence INTEGER,
    detection INTEGER,
    rpn INTEGER,
    investigation_item TEXT,
    person_responsible_name TEXT,
    due_date DATE,
    status action_lifecycle_status,
    result TEXT,
    judgment INTEGER,
    remarks TEXT,
    action_count INTEGER,
    evidence_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE tree_paths AS (
        -- Start from top events (nodes with no parent)
        SELECT
            n.id,
            n.analysis_id,
            n.label,
            n.units,
            n.specification,
            n.metric,
            ARRAY[n.id] as path,
            ARRAY[n.label] as labels,
            1 as depth
        FROM nodes n
        WHERE n.analysis_id = p_analysis_id
        AND NOT EXISTS (
            SELECT 1 FROM node_edges e WHERE e.target_id = n.id
        )

        UNION ALL

        -- Traverse children
        SELECT
            child.id,
            child.analysis_id,
            child.label,
            child.units,
            child.specification,
            child.metric,
            tp.path || child.id,
            tp.labels || child.label,
            tp.depth + 1
        FROM tree_paths tp
        JOIN node_edges e ON e.source_id = tp.id
        JOIN nodes child ON child.id = e.target_id
        WHERE tp.depth < 10
    ),
    leaf_paths AS (
        -- Only include paths that end at leaf nodes
        SELECT tp.*
        FROM tree_paths tp
        WHERE NOT EXISTS (
            SELECT 1 FROM node_edges e WHERE e.source_id = tp.id
        )
    ),
    action_summary AS (
        -- Get primary action for each node (earliest due date or most recent)
        SELECT DISTINCT ON (ai.node_id)
            ai.node_id,
            ai.title as investigation_item,
            ai.due_date,
            ai.status,
            ai.result,
            ai.judgment,
            ai.remarks,
            pd.name as person_name,
            pd.initials as person_initials
        FROM action_items ai
        LEFT JOIN people_directory pd ON pd.id = ai.person_responsible_id
        WHERE ai.analysis_id = p_analysis_id
        ORDER BY ai.node_id, ai.due_date NULLS LAST, ai.created_at DESC
    ),
    action_counts AS (
        SELECT node_id, COUNT(*) as cnt
        FROM action_items
        WHERE analysis_id = p_analysis_id AND node_id IS NOT NULL
        GROUP BY node_id
    ),
    evidence_counts AS (
        SELECT node_id, COUNT(*) as cnt
        FROM evidence_attachments
        WHERE analysis_id = p_analysis_id AND node_id IS NOT NULL
        GROUP BY node_id
    )
    SELECT
        lp.id as row_id,
        lp.depth as path_depth,
        lp.id as leaf_node_id,
        lp.labels[1] as failure_mode_top,
        lp.labels[2] as why_1,
        lp.labels[3] as why_2,
        lp.labels[4] as why_3,
        lp.labels[5] as why_4,
        lp.labels[6] as why_5,
        lp.labels[7] as why_6,
        lp.labels[8] as why_7,
        lp.labels[9] as why_8,
        lp.labels[10] as why_9,
        lp.units,
        lp.specification,
        lp.metric,
        rs.severity,
        rs.occurrence,
        rs.detection,
        rs.rpn,
        COALESCE(acts.investigation_item, '') as investigation_item,
        COALESCE(acts.person_name, acts.person_initials, '') as person_responsible_name,
        acts.due_date,
        acts.status,
        acts.result,
        acts.judgment,
        acts.remarks,
        COALESCE(ac.cnt, 0)::INTEGER as action_count,
        COALESCE(ec.cnt, 0)::INTEGER as evidence_count
    FROM leaf_paths lp
    LEFT JOIN risk_scores rs ON rs.node_id = lp.id
    LEFT JOIN action_summary acts ON acts.node_id = lp.id
    LEFT JOIN action_counts ac ON ac.node_id = lp.id
    LEFT JOIN evidence_counts ec ON ec.node_id = lp.id
    ORDER BY lp.labels;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 9: TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE TRIGGER update_patterns_library_updated_at
    BEFORE UPDATE ON patterns_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
