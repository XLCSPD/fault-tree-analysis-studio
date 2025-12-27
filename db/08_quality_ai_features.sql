-- ============================================================
-- Migration: 08_quality_ai_features.sql
-- Purpose: Add AI Quality Check features for metadata, why statements, and investigations
-- Features:
--   1. Add abstract_summary to analyses table
--   2. Add hypothesis fields to action_items table
--   3. Add quality_flags to nodes table
--   4. Create quality_issues table for tracking flagged items
--   5. Add new enum values for AI features
-- ============================================================

-- ============================================================
-- A) EXTEND AI FEATURE TYPE ENUM
-- ============================================================

-- Add new values to ai_feature_type enum if they don't exist
DO $$
BEGIN
    -- Check if 'metadata_assist' exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'metadata_assist'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_feature_type')
    ) THEN
        ALTER TYPE ai_feature_type ADD VALUE 'metadata_assist';
    END IF;

    -- Check if 'why_quality' exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'why_quality'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_feature_type')
    ) THEN
        ALTER TYPE ai_feature_type ADD VALUE 'why_quality';
    END IF;

    -- Check if 'investigation_quality' exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'investigation_quality'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_feature_type')
    ) THEN
        ALTER TYPE ai_feature_type ADD VALUE 'investigation_quality';
    END IF;
END $$;

-- ============================================================
-- B) CREATE NEW ENUMS
-- ============================================================

-- Quality issue kind enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_issue_kind') THEN
        CREATE TYPE quality_issue_kind AS ENUM (
            'WHY_CLARITY',
            'WHY_TESTABILITY',
            'WHY_SYMPTOM_RESTATEMENT',
            'WHY_BLAMEY',
            'WHY_VAGUE',
            'INVESTIGATION_NO_HYPOTHESIS',
            'INVESTIGATION_NO_CRITERIA',
            'INVESTIGATION_TOO_BROAD',
            'INVESTIGATION_NO_EVIDENCE',
            'METADATA_GAP'
        );
    END IF;
END $$;

-- Quality issue severity enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_issue_severity') THEN
        CREATE TYPE quality_issue_severity AS ENUM (
            'INFO',
            'WARN',
            'HIGH'
        );
    END IF;
END $$;

-- Quality issue status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_issue_status') THEN
        CREATE TYPE quality_issue_status AS ENUM (
            'OPEN',
            'RESOLVED',
            'DISMISSED'
        );
    END IF;
END $$;

-- Expected outcome enum for investigations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expected_outcome_type') THEN
        CREATE TYPE expected_outcome_type AS ENUM (
            'CONFIRM',
            'RULE_OUT',
            'EITHER'
        );
    END IF;
END $$;

-- ============================================================
-- C) ALTER ANALYSES TABLE
-- ============================================================

-- Add abstract_summary column if not exists
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS abstract_summary TEXT;

-- ============================================================
-- D) ALTER ACTION_ITEMS TABLE (Hypothesis fields)
-- ============================================================

-- Add hypothesis and test fields
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS hypothesis_text TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS test_method TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS pass_fail_criteria TEXT;

-- For expected_outcome, we need to handle the enum type carefully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'action_items'
        AND column_name = 'expected_outcome'
    ) THEN
        ALTER TABLE action_items ADD COLUMN expected_outcome expected_outcome_type;
    END IF;
END $$;

-- ============================================================
-- E) ALTER NODES TABLE
-- ============================================================

-- Add quality_flags jsonb column
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS quality_flags JSONB;
-- Add text_aliases for alternate phrasings
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS text_aliases JSONB;

-- Create index for quality_flags
CREATE INDEX IF NOT EXISTS idx_nodes_quality_flags ON nodes USING gin(quality_flags);

-- ============================================================
-- F) CREATE QUALITY_ISSUES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    action_id UUID REFERENCES action_items(id) ON DELETE CASCADE,
    issue_kind quality_issue_kind NOT NULL,
    severity quality_issue_severity NOT NULL DEFAULT 'WARN',
    message TEXT NOT NULL,
    suggestion JSONB,
    status quality_issue_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    -- Constraint: exactly one of node_id or action_id may be non-null (or both null for metadata issues)
    CONSTRAINT check_single_entity CHECK (
        (node_id IS NOT NULL AND action_id IS NULL) OR
        (node_id IS NULL AND action_id IS NOT NULL) OR
        (node_id IS NULL AND action_id IS NULL)
    )
);

-- Create indexes for quality_issues
CREATE INDEX IF NOT EXISTS idx_quality_issues_org ON quality_issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_analysis ON quality_issues(analysis_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_node ON quality_issues(node_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_action ON quality_issues(action_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_kind ON quality_issues(issue_kind);

-- ============================================================
-- G) RLS POLICIES FOR QUALITY_ISSUES
-- ============================================================

ALTER TABLE quality_issues ENABLE ROW LEVEL SECURITY;

-- Users can view quality issues in their organization
CREATE POLICY "Users can view quality issues in their organization"
    ON quality_issues FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- Contributors and above can create quality issues
CREATE POLICY "Contributors can create quality issues"
    ON quality_issues FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid() AND role IN ('contributor', 'facilitator', 'admin')
    ));

-- Contributors and above can update quality issues
CREATE POLICY "Contributors can update quality issues"
    ON quality_issues FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid() AND role IN ('contributor', 'facilitator', 'admin')
    ));

-- Admins can delete quality issues
CREATE POLICY "Admins can delete quality issues"
    ON quality_issues FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================================
-- H) HELPER FUNCTION: Get Analysis Quality Score
-- ============================================================

CREATE OR REPLACE FUNCTION get_analysis_quality_score(p_analysis_id UUID)
RETURNS TABLE (
    total_score INTEGER,
    max_score INTEGER,
    metadata_complete BOOLEAN,
    flagged_whys_count INTEGER,
    flagged_investigations_count INTEGER,
    missing_evidence_count INTEGER
) AS $$
DECLARE
    v_metadata_score INTEGER := 0;
    v_metadata_max INTEGER := 10;
    v_why_score INTEGER := 0;
    v_why_max INTEGER := 0;
    v_inv_score INTEGER := 0;
    v_inv_max INTEGER := 0;
    v_analysis RECORD;
    v_open_why_issues INTEGER;
    v_open_inv_issues INTEGER;
    v_total_nodes INTEGER;
    v_total_actions INTEGER;
    v_missing_evidence INTEGER;
BEGIN
    -- Get analysis metadata
    SELECT * INTO v_analysis
    FROM analyses
    WHERE id = p_analysis_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, FALSE, 0, 0, 0;
        RETURN;
    END IF;

    -- Calculate metadata completeness (10 points max)
    IF v_analysis.title IS NOT NULL AND v_analysis.title != '' THEN v_metadata_score := v_metadata_score + 1; END IF;
    IF v_analysis.problem_statement IS NOT NULL AND v_analysis.problem_statement != '' THEN v_metadata_score := v_metadata_score + 2; END IF;
    IF v_analysis.abstract_summary IS NOT NULL AND v_analysis.abstract_summary != '' THEN v_metadata_score := v_metadata_score + 2; END IF;
    IF v_analysis.industry_id IS NOT NULL THEN v_metadata_score := v_metadata_score + 1; END IF;
    IF v_analysis.site_name IS NOT NULL AND v_analysis.site_name != '' THEN v_metadata_score := v_metadata_score + 1; END IF;
    IF v_analysis.area_function IS NOT NULL AND v_analysis.area_function != '' THEN v_metadata_score := v_metadata_score + 1; END IF;
    IF v_analysis.process_workflow IS NOT NULL AND v_analysis.process_workflow != '' THEN v_metadata_score := v_metadata_score + 1; END IF;
    IF v_analysis.issue_category_id IS NOT NULL THEN v_metadata_score := v_metadata_score + 1; END IF;

    -- Count open why issues
    SELECT COUNT(*) INTO v_open_why_issues
    FROM quality_issues
    WHERE analysis_id = p_analysis_id
    AND node_id IS NOT NULL
    AND status = 'OPEN';

    -- Count open investigation issues
    SELECT COUNT(*) INTO v_open_inv_issues
    FROM quality_issues
    WHERE analysis_id = p_analysis_id
    AND action_id IS NOT NULL
    AND status = 'OPEN';

    -- Count total nodes (for why scoring)
    SELECT COUNT(*) INTO v_total_nodes
    FROM nodes
    WHERE analysis_id = p_analysis_id
    AND type != 'top_event';

    -- Count total investigation actions
    SELECT COUNT(*) INTO v_total_actions
    FROM action_items
    WHERE analysis_id = p_analysis_id
    AND action_type = 'INVESTIGATION';

    -- Count missing evidence on verified causes
    SELECT COUNT(*) INTO v_missing_evidence
    FROM nodes n
    WHERE n.analysis_id = p_analysis_id
    AND n.evidence_status = 'verified'
    AND NOT EXISTS (
        SELECT 1 FROM evidence_attachments ea WHERE ea.node_id = n.id
    );

    -- Calculate why score
    IF v_total_nodes > 0 THEN
        v_why_max := v_total_nodes;
        v_why_score := v_total_nodes - v_open_why_issues;
        IF v_why_score < 0 THEN v_why_score := 0; END IF;
    END IF;

    -- Calculate investigation score
    IF v_total_actions > 0 THEN
        v_inv_max := v_total_actions;
        v_inv_score := v_total_actions - v_open_inv_issues;
        IF v_inv_score < 0 THEN v_inv_score := 0; END IF;
    END IF;

    RETURN QUERY SELECT
        v_metadata_score + v_why_score + v_inv_score,
        v_metadata_max + v_why_max + v_inv_max,
        v_metadata_score >= 8,
        v_open_why_issues,
        v_open_inv_issues,
        v_missing_evidence;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- I) TRIGGER FOR UPDATED_AT
-- ============================================================

CREATE TRIGGER update_quality_issues_updated_at
    BEFORE UPDATE ON quality_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
