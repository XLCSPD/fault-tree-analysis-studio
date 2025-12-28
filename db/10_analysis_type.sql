-- ============================================================================
-- Analysis Type: Simple RCA vs Advanced FTA
-- ============================================================================
-- This migration adds analysis_type to distinguish between:
-- - SIMPLE: Root Cause Analysis / 5-Why style (no gates, facilitator-friendly)
-- - ADVANCED: Full FTA with AND/OR gate logic
-- ============================================================================

-- Create the analysis_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_type') THEN
        CREATE TYPE analysis_type AS ENUM ('SIMPLE', 'ADVANCED');
    END IF;
END$$;

-- Add analysis_type column to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS analysis_type analysis_type NOT NULL DEFAULT 'SIMPLE';

-- Add index for efficient querying by type
CREATE INDEX IF NOT EXISTS idx_analyses_type ON analyses(analysis_type);

-- Add index for checking if an analysis has gate nodes (for validation)
CREATE INDEX IF NOT EXISTS idx_nodes_analysis_type ON nodes(analysis_id, type);

-- ============================================================================
-- Helper function: Check if analysis has any gate nodes
-- ============================================================================
CREATE OR REPLACE FUNCTION analysis_has_gates(p_analysis_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM nodes
        WHERE analysis_id = p_analysis_id
        AND type = 'gate'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION analysis_has_gates(UUID) TO authenticated;

-- ============================================================================
-- Trigger function: Validate analysis type changes
-- ============================================================================
-- Prevents switching to SIMPLE if gates exist (safety check)
CREATE OR REPLACE FUNCTION validate_analysis_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only check when changing from ADVANCED to SIMPLE
    IF OLD.analysis_type = 'ADVANCED' AND NEW.analysis_type = 'SIMPLE' THEN
        -- Check if any gate nodes exist
        IF analysis_has_gates(NEW.id) THEN
            RAISE EXCEPTION 'Cannot switch to SIMPLE mode: analysis contains gate nodes. Remove or convert gates first.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for type change validation
DROP TRIGGER IF EXISTS validate_analysis_type_change_trigger ON analyses;
CREATE TRIGGER validate_analysis_type_change_trigger
    BEFORE UPDATE OF analysis_type ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION validate_analysis_type_change();

-- ============================================================================
-- Trigger function: Prevent gate creation in SIMPLE mode
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_node_type_for_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_analysis_type analysis_type;
BEGIN
    -- Only check for gate nodes
    IF NEW.type = 'gate' THEN
        SELECT analysis_type INTO v_analysis_type
        FROM analyses
        WHERE id = NEW.analysis_id;

        IF v_analysis_type = 'SIMPLE' THEN
            RAISE EXCEPTION 'Cannot create gate nodes in SIMPLE analysis mode. Switch to ADVANCED mode first.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for node type validation
DROP TRIGGER IF EXISTS validate_node_type_trigger ON nodes;
CREATE TRIGGER validate_node_type_trigger
    BEFORE INSERT OR UPDATE OF type ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION validate_node_type_for_analysis();

-- ============================================================================
-- Audit logging for analysis type changes
-- ============================================================================
-- Uses existing audit_log table from db/01_schema.sql
-- The existing audit triggers should capture this, but we add explicit logging

CREATE OR REPLACE FUNCTION log_analysis_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.analysis_type IS DISTINCT FROM NEW.analysis_type THEN
        INSERT INTO audit_log (
            organization_id,
            analysis_id,
            user_id,
            action,
            entity_type,
            entity_id,
            changes
        ) VALUES (
            NEW.organization_id,
            NEW.id,
            auth.uid(),
            'UPDATE',
            'analysis_type',
            NEW.id,
            jsonb_build_object(
                'field', 'analysis_type',
                'old_value', OLD.analysis_type::text,
                'new_value', NEW.analysis_type::text
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_analysis_type_change_trigger ON analyses;
CREATE TRIGGER log_analysis_type_change_trigger
    AFTER UPDATE OF analysis_type ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION log_analysis_type_change();

-- ============================================================================
-- RPC: Update analysis type with validation
-- ============================================================================
CREATE OR REPLACE FUNCTION update_analysis_type(
    p_analysis_id UUID,
    p_new_type analysis_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_type analysis_type;
    v_has_gates BOOLEAN;
BEGIN
    -- Get current type
    SELECT analysis_type INTO v_current_type
    FROM analyses
    WHERE id = p_analysis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis not found';
    END IF;

    -- No change needed
    IF v_current_type = p_new_type THEN
        RETURN TRUE;
    END IF;

    -- Check for gates when downgrading to SIMPLE
    IF v_current_type = 'ADVANCED' AND p_new_type = 'SIMPLE' THEN
        v_has_gates := analysis_has_gates(p_analysis_id);
        IF v_has_gates THEN
            RAISE EXCEPTION 'Cannot switch to SIMPLE: analysis contains gate nodes';
        END IF;
    END IF;

    -- Update the type
    UPDATE analyses
    SET analysis_type = p_new_type,
        updated_at = NOW()
    WHERE id = p_analysis_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION update_analysis_type(UUID, analysis_type) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
