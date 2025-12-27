-- Version Control System for FTA Studio
-- Migration: 09_version_control.sql
-- Description: Adds analysis versioning, snapshots, and branching capabilities

-- ============================================================================
-- TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE branch_status AS ENUM ('active', 'merged', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Analysis versions table - stores complete snapshots of analysis state
CREATE TABLE IF NOT EXISTS analysis_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    snapshot JSONB NOT NULL, -- Complete analysis state
    is_auto BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    parent_version_id UUID REFERENCES analysis_versions(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(analysis_id, version_number)
);

-- Analysis branches table - manages experimental branches
CREATE TABLE IF NOT EXISTS analysis_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    source_version_id UUID NOT NULL REFERENCES analysis_versions(id) ON DELETE RESTRICT,
    current_version_id UUID REFERENCES analysis_versions(id) ON DELETE SET NULL,
    status branch_status DEFAULT 'active',
    merged_at TIMESTAMPTZ,
    merged_by UUID REFERENCES profiles(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(analysis_id, name)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analysis_versions_analysis_id ON analysis_versions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_versions_org_id ON analysis_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_analysis_versions_created_at ON analysis_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_versions_is_auto ON analysis_versions(is_auto);
CREATE INDEX IF NOT EXISTS idx_analysis_branches_analysis_id ON analysis_branches(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_branches_status ON analysis_branches(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE analysis_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_branches ENABLE ROW LEVEL SECURITY;

-- Analysis versions policies
DROP POLICY IF EXISTS "Users can view versions in their organization" ON analysis_versions;
CREATE POLICY "Users can view versions in their organization" ON analysis_versions
    FOR SELECT USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Contributors can create versions" ON analysis_versions;
CREATE POLICY "Contributors can create versions" ON analysis_versions
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('contributor', 'facilitator', 'admin') AND
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Facilitators can update versions" ON analysis_versions;
CREATE POLICY "Facilitators can update versions" ON analysis_versions
    FOR UPDATE USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('facilitator', 'admin')
    );

DROP POLICY IF EXISTS "Admins can delete versions" ON analysis_versions;
CREATE POLICY "Admins can delete versions" ON analysis_versions
    FOR DELETE USING (
        organization_id = get_user_organization_id() AND
        get_user_role() = 'admin' AND
        is_locked = FALSE
    );

-- Analysis branches policies
DROP POLICY IF EXISTS "Users can view branches in their organization" ON analysis_branches;
CREATE POLICY "Users can view branches in their organization" ON analysis_branches
    FOR SELECT USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Facilitators can create branches" ON analysis_branches;
CREATE POLICY "Facilitators can create branches" ON analysis_branches
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('facilitator', 'admin') AND
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Facilitators can update branches" ON analysis_branches;
CREATE POLICY "Facilitators can update branches" ON analysis_branches
    FOR UPDATE USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('facilitator', 'admin')
    );

DROP POLICY IF EXISTS "Admins can delete branches" ON analysis_branches;
CREATE POLICY "Admins can delete branches" ON analysis_branches
    FOR DELETE USING (
        organization_id = get_user_organization_id() AND
        get_user_role() = 'admin'
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get the next version number for an analysis
CREATE OR REPLACE FUNCTION get_next_version_number(p_analysis_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM analysis_versions
    WHERE analysis_id = p_analysis_id;

    RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a version snapshot of an analysis
CREATE OR REPLACE FUNCTION create_analysis_version(
    p_analysis_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_is_auto BOOLEAN DEFAULT FALSE,
    p_parent_version_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
    v_version_number INTEGER;
    v_snapshot JSONB;
    v_version_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();

    -- Get organization_id from the analysis
    SELECT organization_id INTO v_org_id
    FROM analyses
    WHERE id = p_analysis_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Analysis not found: %', p_analysis_id;
    END IF;

    -- Get next version number
    v_version_number := get_next_version_number(p_analysis_id);

    -- Build the snapshot JSONB
    SELECT jsonb_build_object(
        'schemaVersion', 1,
        'capturedAt', NOW()::TEXT,
        'analysis', (
            SELECT jsonb_build_object(
                'id', a.id,
                'title', a.title,
                'model', a.model,
                'application', a.application,
                'part_name', a.part_name,
                'analysis_date', a.analysis_date,
                'abstract', a.abstract,
                'related_document', a.related_document,
                'problem_statement', a.problem_statement,
                'status', a.status
            )
            FROM analyses a
            WHERE a.id = p_analysis_id
        ),
        'nodes', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', n.id,
                'type', n.type,
                'label', n.label,
                'units', n.units,
                'specification', n.specification,
                'metric', n.metric,
                'notes', n.notes,
                'tags', n.tags,
                'evidence_status', n.evidence_status,
                'position', n.position,
                'collapsed', n.collapsed
            ) ORDER BY n.created_at)
            FROM nodes n
            WHERE n.analysis_id = p_analysis_id
        ), '[]'::jsonb),
        'edges', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', e.id,
                'source_id', e.source_id,
                'target_id', e.target_id,
                'gate_type', e.gate_type,
                'order_index', e.order_index
            ) ORDER BY e.created_at)
            FROM node_edges e
            WHERE e.analysis_id = p_analysis_id
        ), '[]'::jsonb),
        'riskScores', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'node_id', rs.node_id,
                'severity', rs.severity,
                'occurrence', rs.occurrence,
                'detection', rs.detection,
                'rpn', rs.rpn,
                'ap_category', rs.ap_category
            ))
            FROM risk_scores rs
            JOIN nodes n ON n.id = rs.node_id
            WHERE n.analysis_id = p_analysis_id
        ), '[]'::jsonb),
        'actionItems', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', ai.id,
                'node_id', ai.node_id,
                'investigation_item', ai.investigation_item,
                'person_responsible_id', ai.person_responsible_id,
                'schedule', ai.schedule,
                'investigation_result', ai.investigation_result,
                'judgment', ai.judgment,
                'remarks', ai.remarks,
                'hypothesis_text', ai.hypothesis_text,
                'test_method', ai.test_method,
                'pass_fail_criteria', ai.pass_fail_criteria
            ) ORDER BY ai.created_at)
            FROM action_items ai
            WHERE ai.analysis_id = p_analysis_id
        ), '[]'::jsonb),
        'weekStatuses', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'action_item_id', aws.action_item_id,
                'week_number', aws.week_number,
                'status', aws.status,
                'notes', aws.notes
            ))
            FROM action_week_status aws
            JOIN action_items ai ON ai.id = aws.action_item_id
            WHERE ai.analysis_id = p_analysis_id
        ), '[]'::jsonb),
        'evidenceRefs', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', ea.id,
                'node_id', ea.node_id,
                'action_item_id', ea.action_item_id,
                'type', ea.type,
                'title', ea.title,
                'description', ea.description,
                'url', ea.url,
                'file_path', ea.file_path
            ))
            FROM evidence_attachments ea
            LEFT JOIN nodes n ON n.id = ea.node_id
            LEFT JOIN action_items ai ON ai.id = ea.action_item_id
            WHERE n.analysis_id = p_analysis_id OR ai.analysis_id = p_analysis_id
        ), '[]'::jsonb)
    ) INTO v_snapshot;

    -- Insert the version
    INSERT INTO analysis_versions (
        organization_id,
        analysis_id,
        version_number,
        name,
        description,
        snapshot,
        is_auto,
        parent_version_id,
        created_by
    ) VALUES (
        v_org_id,
        p_analysis_id,
        v_version_number,
        p_name,
        p_description,
        v_snapshot,
        p_is_auto,
        p_parent_version_id,
        v_user_id
    )
    RETURNING id INTO v_version_id;

    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore an analysis to a previous version
CREATE OR REPLACE FUNCTION restore_analysis_version(p_version_id UUID)
RETURNS UUID AS $$
DECLARE
    v_snapshot JSONB;
    v_analysis_id UUID;
    v_org_id UUID;
    v_backup_version_id UUID;
    v_user_id UUID;
    v_node JSONB;
    v_edge JSONB;
    v_risk_score JSONB;
    v_action JSONB;
    v_week_status JSONB;
    v_evidence JSONB;
    v_node_id_map JSONB := '{}'::jsonb;
    v_action_id_map JSONB := '{}'::jsonb;
    v_new_node_id UUID;
    v_new_action_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Get the version details
    SELECT av.snapshot, av.analysis_id, av.organization_id
    INTO v_snapshot, v_analysis_id, v_org_id
    FROM analysis_versions av
    WHERE av.id = p_version_id;

    IF v_snapshot IS NULL THEN
        RAISE EXCEPTION 'Version not found: %', p_version_id;
    END IF;

    -- Create an auto-backup before restoring
    v_backup_version_id := create_analysis_version(
        v_analysis_id,
        'Auto-backup before restore',
        'Automatic backup created before restoring to version ' || p_version_id::text,
        TRUE,
        p_version_id
    );

    -- Delete existing data (cascades will handle related tables)
    DELETE FROM nodes WHERE analysis_id = v_analysis_id;
    DELETE FROM action_items WHERE analysis_id = v_analysis_id AND node_id IS NULL;

    -- Update analysis metadata
    UPDATE analyses SET
        title = (v_snapshot->'analysis'->>'title'),
        model = (v_snapshot->'analysis'->>'model'),
        application = (v_snapshot->'analysis'->>'application'),
        part_name = (v_snapshot->'analysis'->>'part_name'),
        analysis_date = (v_snapshot->'analysis'->>'analysis_date')::date,
        abstract = (v_snapshot->'analysis'->>'abstract'),
        related_document = (v_snapshot->'analysis'->>'related_document'),
        problem_statement = (v_snapshot->'analysis'->>'problem_statement'),
        status = (v_snapshot->'analysis'->>'status'),
        updated_at = NOW()
    WHERE id = v_analysis_id;

    -- Restore nodes (create new IDs, maintain mapping)
    FOR v_node IN SELECT * FROM jsonb_array_elements(v_snapshot->'nodes')
    LOOP
        INSERT INTO nodes (
            analysis_id,
            type,
            label,
            units,
            specification,
            metric,
            notes,
            tags,
            evidence_status,
            position,
            collapsed
        ) VALUES (
            v_analysis_id,
            (v_node->>'type')::node_type,
            v_node->>'label',
            v_node->>'units',
            v_node->>'specification',
            v_node->>'metric',
            v_node->>'notes',
            CASE WHEN jsonb_typeof(v_node->'tags') = 'array'
                THEN ARRAY(SELECT jsonb_array_elements_text(v_node->'tags'))
                ELSE NULL
            END,
            v_node->>'evidence_status',
            v_node->'position',
            COALESCE((v_node->>'collapsed')::boolean, false)
        )
        RETURNING id INTO v_new_node_id;

        -- Store mapping: old_id -> new_id
        v_node_id_map := v_node_id_map || jsonb_build_object(v_node->>'id', v_new_node_id);
    END LOOP;

    -- Restore edges using the ID mapping
    FOR v_edge IN SELECT * FROM jsonb_array_elements(v_snapshot->'edges')
    LOOP
        INSERT INTO node_edges (
            analysis_id,
            source_id,
            target_id,
            gate_type,
            order_index
        ) VALUES (
            v_analysis_id,
            (v_node_id_map->>(v_edge->>'source_id'))::uuid,
            (v_node_id_map->>(v_edge->>'target_id'))::uuid,
            CASE WHEN v_edge->>'gate_type' IS NOT NULL
                THEN (v_edge->>'gate_type')::gate_type
                ELSE NULL
            END,
            COALESCE((v_edge->>'order_index')::integer, 0)
        );
    END LOOP;

    -- Restore risk scores
    FOR v_risk_score IN SELECT * FROM jsonb_array_elements(v_snapshot->'riskScores')
    LOOP
        INSERT INTO risk_scores (
            node_id,
            severity,
            occurrence,
            detection,
            ap_category
        ) VALUES (
            (v_node_id_map->>(v_risk_score->>'node_id'))::uuid,
            (v_risk_score->>'severity')::integer,
            (v_risk_score->>'occurrence')::integer,
            (v_risk_score->>'detection')::integer,
            v_risk_score->>'ap_category'
        );
    END LOOP;

    -- Restore action items
    FOR v_action IN SELECT * FROM jsonb_array_elements(v_snapshot->'actionItems')
    LOOP
        INSERT INTO action_items (
            analysis_id,
            node_id,
            investigation_item,
            person_responsible_id,
            schedule,
            investigation_result,
            judgment,
            remarks,
            hypothesis_text,
            test_method,
            pass_fail_criteria
        ) VALUES (
            v_analysis_id,
            CASE WHEN v_action->>'node_id' IS NOT NULL
                THEN (v_node_id_map->>(v_action->>'node_id'))::uuid
                ELSE NULL
            END,
            v_action->>'investigation_item',
            CASE WHEN v_action->>'person_responsible_id' IS NOT NULL
                THEN (v_action->>'person_responsible_id')::uuid
                ELSE NULL
            END,
            CASE WHEN v_action->>'schedule' IS NOT NULL
                THEN (v_action->>'schedule')::date
                ELSE NULL
            END,
            v_action->>'investigation_result',
            CASE WHEN v_action->>'judgment' IS NOT NULL
                THEN (v_action->>'judgment')::integer
                ELSE NULL
            END,
            v_action->>'remarks',
            v_action->>'hypothesis_text',
            v_action->>'test_method',
            v_action->>'pass_fail_criteria'
        )
        RETURNING id INTO v_new_action_id;

        v_action_id_map := v_action_id_map || jsonb_build_object(v_action->>'id', v_new_action_id);
    END LOOP;

    -- Restore week statuses
    FOR v_week_status IN SELECT * FROM jsonb_array_elements(v_snapshot->'weekStatuses')
    LOOP
        INSERT INTO action_week_status (
            action_item_id,
            week_number,
            status,
            notes
        ) VALUES (
            (v_action_id_map->>(v_week_status->>'action_item_id'))::uuid,
            (v_week_status->>'week_number')::integer,
            (v_week_status->>'status')::action_status,
            v_week_status->>'notes'
        )
        ON CONFLICT (action_item_id, week_number) DO UPDATE SET
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            updated_at = NOW();
    END LOOP;

    -- Note: Evidence attachments are NOT restored to avoid file duplication
    -- Only the references are preserved in the snapshot for historical purposes

    RETURN v_backup_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get version diff summary (computes added/removed/modified counts)
CREATE OR REPLACE FUNCTION get_version_diff_summary(
    p_version_a_id UUID,
    p_version_b_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_snapshot_a JSONB;
    v_snapshot_b JSONB;
    v_nodes_a JSONB;
    v_nodes_b JSONB;
    v_node_ids_a TEXT[];
    v_node_ids_b TEXT[];
    v_added_count INTEGER := 0;
    v_removed_count INTEGER := 0;
    v_modified_count INTEGER := 0;
BEGIN
    -- Get snapshots
    SELECT snapshot INTO v_snapshot_a FROM analysis_versions WHERE id = p_version_a_id;
    SELECT snapshot INTO v_snapshot_b FROM analysis_versions WHERE id = p_version_b_id;

    IF v_snapshot_a IS NULL OR v_snapshot_b IS NULL THEN
        RAISE EXCEPTION 'One or both versions not found';
    END IF;

    v_nodes_a := v_snapshot_a->'nodes';
    v_nodes_b := v_snapshot_b->'nodes';

    -- Get node IDs from each version
    SELECT array_agg(n->>'id') INTO v_node_ids_a FROM jsonb_array_elements(v_nodes_a) n;
    SELECT array_agg(n->>'id') INTO v_node_ids_b FROM jsonb_array_elements(v_nodes_b) n;

    -- Handle null arrays
    v_node_ids_a := COALESCE(v_node_ids_a, ARRAY[]::TEXT[]);
    v_node_ids_b := COALESCE(v_node_ids_b, ARRAY[]::TEXT[]);

    -- Count added nodes (in B but not in A)
    SELECT COUNT(*) INTO v_added_count
    FROM unnest(v_node_ids_b) AS node_id
    WHERE node_id != ALL(v_node_ids_a);

    -- Count removed nodes (in A but not in B)
    SELECT COUNT(*) INTO v_removed_count
    FROM unnest(v_node_ids_a) AS node_id
    WHERE node_id != ALL(v_node_ids_b);

    -- Count modified nodes (in both but with different labels)
    SELECT COUNT(*) INTO v_modified_count
    FROM jsonb_array_elements(v_nodes_a) AS na
    JOIN jsonb_array_elements(v_nodes_b) AS nb ON na->>'id' = nb->>'id'
    WHERE na->>'label' != nb->>'label'
       OR na->>'type' != nb->>'type'
       OR COALESCE(na->>'evidence_status', '') != COALESCE(nb->>'evidence_status', '');

    RETURN jsonb_build_object(
        'added', v_added_count,
        'removed', v_removed_count,
        'modified', v_modified_count,
        'totalA', jsonb_array_length(v_nodes_a),
        'totalB', jsonb_array_length(v_nodes_b)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a branch from a version
CREATE OR REPLACE FUNCTION create_analysis_branch(
    p_analysis_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_source_version_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_branch_id UUID;
    v_source_version UUID;
BEGIN
    v_user_id := auth.uid();

    -- Get org from analysis
    SELECT organization_id INTO v_org_id FROM analyses WHERE id = p_analysis_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Analysis not found: %', p_analysis_id;
    END IF;

    -- If no source version provided, create one from current state
    IF p_source_version_id IS NULL THEN
        v_source_version := create_analysis_version(
            p_analysis_id,
            'Branch point: ' || p_name,
            'Snapshot created as branch point for branch: ' || p_name,
            TRUE
        );
    ELSE
        v_source_version := p_source_version_id;
    END IF;

    -- Create the branch
    INSERT INTO analysis_branches (
        organization_id,
        analysis_id,
        name,
        description,
        source_version_id,
        current_version_id,
        created_by
    ) VALUES (
        v_org_id,
        p_analysis_id,
        p_name,
        p_description,
        v_source_version,
        v_source_version,
        v_user_id
    )
    RETURNING id INTO v_branch_id;

    RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Merge a branch (creates version from branch and marks as merged)
CREATE OR REPLACE FUNCTION merge_analysis_branch(p_branch_id UUID)
RETURNS UUID AS $$
DECLARE
    v_branch analysis_branches%ROWTYPE;
    v_merged_version_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Get branch details
    SELECT * INTO v_branch FROM analysis_branches WHERE id = p_branch_id;

    IF v_branch.id IS NULL THEN
        RAISE EXCEPTION 'Branch not found: %', p_branch_id;
    END IF;

    IF v_branch.status != 'active' THEN
        RAISE EXCEPTION 'Cannot merge branch with status: %', v_branch.status;
    END IF;

    -- Create a backup of main before merge
    PERFORM create_analysis_version(
        v_branch.analysis_id,
        'Auto-backup before merge: ' || v_branch.name,
        'Automatic backup created before merging branch: ' || v_branch.name,
        TRUE
    );

    -- Restore from branch's current version
    v_merged_version_id := restore_analysis_version(v_branch.current_version_id);

    -- Create a merge commit version
    v_merged_version_id := create_analysis_version(
        v_branch.analysis_id,
        'Merged: ' || v_branch.name,
        'Merged from branch: ' || v_branch.name || ' (version: ' || v_branch.current_version_id::text || ')',
        FALSE,
        v_branch.current_version_id
    );

    -- Mark branch as merged
    UPDATE analysis_branches SET
        status = 'merged',
        merged_at = NOW(),
        merged_by = v_user_id
    WHERE id = p_branch_id;

    RETURN v_merged_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant execute permissions on version control functions to authenticated users
GRANT EXECUTE ON FUNCTION get_next_version_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_analysis_version(UUID, TEXT, TEXT, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_analysis_version(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_version_diff_summary(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_analysis_branch(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_analysis_branch(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE analysis_versions IS 'Stores complete snapshots of analysis state for version control';
COMMENT ON TABLE analysis_branches IS 'Manages experimental branches for analyses';
COMMENT ON FUNCTION create_analysis_version IS 'Creates a snapshot of the current analysis state';
COMMENT ON FUNCTION restore_analysis_version IS 'Restores an analysis to a previous version, creating a backup first';
COMMENT ON FUNCTION get_version_diff_summary IS 'Computes added/removed/modified node counts between two versions';
COMMENT ON FUNCTION create_analysis_branch IS 'Creates an experimental branch from a version';
COMMENT ON FUNCTION merge_analysis_branch IS 'Merges a branch back to main, creating appropriate versions';
