-- ============================================================
-- Migration: 06_extended_metadata.sql
-- Purpose: Broaden metadata beyond aerospace/manufacturing
-- Features:
--   1. Industry-neutral core metadata fields
--   2. Reference tables (industries, issue_categories)
--   3. Extensible custom fields framework
--   4. Safe backfill from deprecated fields
-- ============================================================

-- ============================================================
-- A) REFERENCE TABLES
-- ============================================================

-- Industries reference table (org-agnostic, seeded with common values)
CREATE TABLE IF NOT EXISTS industries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common industries
INSERT INTO industries (name, description, sort_order) VALUES
    ('Manufacturing', 'General manufacturing and production', 1),
    ('Aerospace', 'Aerospace and aviation', 2),
    ('Automotive', 'Automotive manufacturing and assembly', 3),
    ('Healthcare', 'Healthcare and medical services', 4),
    ('Pharmaceutical', 'Pharmaceutical production', 5),
    ('Food & Beverage', 'Food and beverage production', 6),
    ('Logistics & Distribution', 'Warehousing, distribution, shipping', 7),
    ('Energy & Utilities', 'Power generation and utilities', 8),
    ('Construction', 'Construction and infrastructure', 9),
    ('Technology', 'Software and technology services', 10),
    ('Financial Services', 'Banking, insurance, financial', 11),
    ('Retail', 'Retail operations', 12),
    ('Government', 'Government and public sector', 13),
    ('Other', 'Other industries', 99)
ON CONFLICT (name) DO NOTHING;

-- Issue categories reference table (org-configurable)
CREATE TABLE IF NOT EXISTS issue_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT, -- hex color for UI badges
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Org-specific categories have org_id; global defaults have NULL
    UNIQUE(organization_id, name)
);

-- Seed default issue categories (global, org_id = NULL)
INSERT INTO issue_categories (organization_id, name, description, color, sort_order) VALUES
    (NULL, 'Quality', 'Product or service quality issues', '#3B82F6', 1),
    (NULL, 'Safety', 'Safety incidents or hazards', '#EF4444', 2),
    (NULL, 'Process', 'Process inefficiency or failure', '#F59E0B', 3),
    (NULL, 'Equipment', 'Equipment malfunction or failure', '#8B5CF6', 4),
    (NULL, 'Human Error', 'Human factors and errors', '#EC4899', 5),
    (NULL, 'Material', 'Material defects or issues', '#06B6D4', 6),
    (NULL, 'Environmental', 'Environmental factors', '#22C55E', 7),
    (NULL, 'Compliance', 'Regulatory or compliance issues', '#64748B', 8),
    (NULL, 'Customer', 'Customer complaints or issues', '#F97316', 9),
    (NULL, 'Other', 'Other categories', '#94A3B8', 99)
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================
-- B) CORE METADATA COLUMNS (Industry-Neutral)
-- ============================================================

-- Add new industry-neutral columns to analyses table
-- These replace the aerospace/manufacturing-specific fields

-- Industry reference
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id);

-- Site / Location
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS site_name TEXT;

-- Area / Function (department, functional area)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS area_function TEXT;

-- Process / Workflow (replaces concept of "application")
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS process_workflow TEXT;

-- Asset / System (replaces "model" - more universal term)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS asset_system TEXT;

-- Item / Product / Output (replaces "part_name" - works for services too)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS item_output TEXT;

-- Issue category reference
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS issue_category_id UUID REFERENCES issue_categories(id);

-- Add comments to document field mappings
COMMENT ON COLUMN analyses.model IS 'DEPRECATED: Use asset_system instead. Kept for backward compatibility.';
COMMENT ON COLUMN analyses.part_name IS 'DEPRECATED: Use item_output instead. Kept for backward compatibility.';
COMMENT ON COLUMN analyses.application IS 'DEPRECATED: Use process_workflow instead. Kept for backward compatibility.';
COMMENT ON COLUMN analyses.asset_system IS 'Asset, system, or model being analyzed. Replaces legacy "model" field.';
COMMENT ON COLUMN analyses.item_output IS 'Item, product, or output being analyzed. Replaces legacy "part_name" field.';
COMMENT ON COLUMN analyses.process_workflow IS 'Process or workflow being analyzed. Replaces legacy "application" field.';

-- ============================================================
-- C) DATA BACKFILL (Migrate old data to new fields)
-- ============================================================

-- Copy model -> asset_system (only if asset_system is null and model has data)
UPDATE analyses
SET asset_system = model
WHERE asset_system IS NULL AND model IS NOT NULL AND model != '';

-- Copy part_name -> item_output (only if item_output is null and part_name has data)
UPDATE analyses
SET item_output = part_name
WHERE item_output IS NULL AND part_name IS NOT NULL AND part_name != '';

-- Copy application -> process_workflow (only if process_workflow is null and application has data)
UPDATE analyses
SET process_workflow = application
WHERE process_workflow IS NULL AND application IS NOT NULL AND application != '';

-- ============================================================
-- D) CUSTOM FIELDS FRAMEWORK
-- ============================================================

-- Custom field type enum
DO $$ BEGIN
    CREATE TYPE metadata_field_type AS ENUM (
        'text',
        'number',
        'date',
        'select',
        'multi_select',
        'boolean',
        'url',
        'email'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Custom field scope enum (for future extensibility)
DO $$ BEGIN
    CREATE TYPE metadata_field_scope AS ENUM (
        'analysis',
        'node',
        'action_item'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Metadata field definitions (org-configurable)
CREATE TABLE IF NOT EXISTS metadata_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,                    -- Internal key e.g., "sku", "shift", "drawing_rev"
    label TEXT NOT NULL,                  -- Display label e.g., "SKU", "Shift", "Drawing Revision"
    field_type metadata_field_type NOT NULL DEFAULT 'text',
    placeholder TEXT,                     -- Placeholder text for input
    help_text TEXT,                       -- Help text shown below field
    options JSONB,                        -- For select/multi_select: [{label, value, color?}]
    validation JSONB,                     -- Validation rules: {min, max, pattern, required_message}
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    scope metadata_field_scope DEFAULT 'analysis',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Each org can only have one field with a given key
    UNIQUE(organization_id, key)
);

-- Custom field values for analyses
CREATE TABLE IF NOT EXISTS analysis_metadata_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES metadata_fields(id) ON DELETE CASCADE,
    -- Typed value storage (only one should be populated based on field_type)
    value_text TEXT,
    value_number NUMERIC,
    value_date DATE,
    value_boolean BOOLEAN,
    value_json JSONB,                     -- For select/multi_select stores array or object
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    -- Each analysis can only have one value per field
    UNIQUE(analysis_id, field_id)
);

-- ============================================================
-- E) INDEXES
-- ============================================================

-- Analyses indexes for new columns
CREATE INDEX IF NOT EXISTS idx_analyses_org_status ON analyses(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_analyses_org_industry ON analyses(organization_id, industry_id);
CREATE INDEX IF NOT EXISTS idx_analyses_org_site ON analyses(organization_id, site_name);
CREATE INDEX IF NOT EXISTS idx_analyses_org_issue_cat ON analyses(organization_id, issue_category_id);
CREATE INDEX IF NOT EXISTS idx_analyses_asset_system ON analyses(organization_id, asset_system);
CREATE INDEX IF NOT EXISTS idx_analyses_process_workflow ON analyses(organization_id, process_workflow);

-- Reference tables indexes
CREATE INDEX IF NOT EXISTS idx_industries_active ON industries(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_issue_categories_org ON issue_categories(organization_id, is_active, sort_order);

-- Custom fields indexes
CREATE INDEX IF NOT EXISTS idx_metadata_fields_org ON metadata_fields(organization_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_metadata_fields_scope ON metadata_fields(organization_id, scope, is_active);
CREATE INDEX IF NOT EXISTS idx_analysis_metadata_values_analysis ON analysis_metadata_values(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_metadata_values_field ON analysis_metadata_values(field_id);
CREATE INDEX IF NOT EXISTS idx_analysis_metadata_values_org ON analysis_metadata_values(organization_id);

-- Text search indexes for custom field values
CREATE INDEX IF NOT EXISTS idx_analysis_metadata_values_text ON analysis_metadata_values(value_text)
    WHERE value_text IS NOT NULL;

-- ============================================================
-- F) TRIGGERS
-- ============================================================

-- Updated at trigger for metadata_fields
CREATE TRIGGER update_metadata_fields_updated_at
    BEFORE UPDATE ON metadata_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Updated at trigger for analysis_metadata_values
CREATE TRIGGER update_analysis_metadata_values_updated_at
    BEFORE UPDATE ON analysis_metadata_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- G) HELPER FUNCTIONS
-- ============================================================

-- Function to get all custom fields with values for an analysis
CREATE OR REPLACE FUNCTION get_analysis_custom_fields(analysis_id_param UUID)
RETURNS TABLE (
    field_id UUID,
    field_key TEXT,
    field_label TEXT,
    field_type metadata_field_type,
    is_required BOOLEAN,
    options JSONB,
    value_text TEXT,
    value_number NUMERIC,
    value_date DATE,
    value_boolean BOOLEAN,
    value_json JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mf.id AS field_id,
        mf.key AS field_key,
        mf.label AS field_label,
        mf.field_type,
        mf.is_required,
        mf.options,
        amv.value_text,
        amv.value_number,
        amv.value_date,
        amv.value_boolean,
        amv.value_json
    FROM metadata_fields mf
    LEFT JOIN analysis_metadata_values amv ON mf.id = amv.field_id AND amv.analysis_id = analysis_id_param
    WHERE mf.organization_id = (SELECT organization_id FROM analyses WHERE id = analysis_id_param)
      AND mf.is_active = true
      AND mf.scope = 'analysis'
    ORDER BY mf.sort_order, mf.label;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert a custom field value
CREATE OR REPLACE FUNCTION upsert_analysis_metadata_value(
    analysis_id_param UUID,
    field_id_param UUID,
    value_text_param TEXT DEFAULT NULL,
    value_number_param NUMERIC DEFAULT NULL,
    value_date_param DATE DEFAULT NULL,
    value_boolean_param BOOLEAN DEFAULT NULL,
    value_json_param JSONB DEFAULT NULL,
    updated_by_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
    result_id UUID;
BEGIN
    -- Get organization_id from analysis
    SELECT organization_id INTO org_id FROM analyses WHERE id = analysis_id_param;

    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Analysis not found: %', analysis_id_param;
    END IF;

    -- Upsert the value
    INSERT INTO analysis_metadata_values (
        organization_id, analysis_id, field_id,
        value_text, value_number, value_date, value_boolean, value_json,
        updated_by
    )
    VALUES (
        org_id, analysis_id_param, field_id_param,
        value_text_param, value_number_param, value_date_param, value_boolean_param, value_json_param,
        updated_by_param
    )
    ON CONFLICT (analysis_id, field_id)
    DO UPDATE SET
        value_text = EXCLUDED.value_text,
        value_number = EXCLUDED.value_number,
        value_date = EXCLUDED.value_date,
        value_boolean = EXCLUDED.value_boolean,
        value_json = EXCLUDED.value_json,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    RETURNING id INTO result_id;

    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- H) ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_metadata_values ENABLE ROW LEVEL SECURITY;

-- Industries: Everyone can read (global reference data)
CREATE POLICY "Industries are viewable by all authenticated users"
    ON industries FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Issue categories: Read global (org_id IS NULL) or org-specific
CREATE POLICY "Issue categories readable by org members"
    ON issue_categories FOR SELECT
    TO authenticated
    USING (
        organization_id IS NULL -- Global defaults
        OR organization_id = get_user_organization_id()
    );

-- Issue categories: Only admins can manage org-specific categories
CREATE POLICY "Issue categories manageable by admins"
    ON issue_categories FOR ALL
    TO authenticated
    USING (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    )
    WITH CHECK (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    );

-- Metadata fields: Org members can read active fields
CREATE POLICY "Metadata fields readable by org members"
    ON metadata_fields FOR SELECT
    TO authenticated
    USING (organization_id = get_user_organization_id());

-- Metadata fields: Only admins can manage
CREATE POLICY "Metadata fields manageable by admins"
    ON metadata_fields FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    );

CREATE POLICY "Metadata fields updatable by admins"
    ON metadata_fields FOR UPDATE
    TO authenticated
    USING (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    )
    WITH CHECK (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    );

CREATE POLICY "Metadata fields deletable by admins"
    ON metadata_fields FOR DELETE
    TO authenticated
    USING (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    );

-- Analysis metadata values: Org members can read
CREATE POLICY "Analysis metadata values readable by org members"
    ON analysis_metadata_values FOR SELECT
    TO authenticated
    USING (organization_id = get_user_organization_id());

-- Analysis metadata values: Contributors and above can write
CREATE POLICY "Analysis metadata values writable by contributors"
    ON analysis_metadata_values FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('contributor', 'facilitator', 'admin')
    );

CREATE POLICY "Analysis metadata values updatable by contributors"
    ON analysis_metadata_values FOR UPDATE
    TO authenticated
    USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('contributor', 'facilitator', 'admin')
    )
    WITH CHECK (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('contributor', 'facilitator', 'admin')
    );

CREATE POLICY "Analysis metadata values deletable by contributors"
    ON analysis_metadata_values FOR DELETE
    TO authenticated
    USING (
        organization_id = get_user_organization_id()
        AND get_user_role() IN ('contributor', 'facilitator', 'admin')
    );

-- ============================================================
-- I) GRANT PERMISSIONS
-- ============================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_analysis_custom_fields(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_analysis_metadata_value(UUID, UUID, TEXT, NUMERIC, DATE, BOOLEAN, JSONB, UUID) TO authenticated;
