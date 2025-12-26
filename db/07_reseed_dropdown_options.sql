-- ============================================================
-- Migration: 07_reseed_dropdown_options.sql
-- Purpose: Reseed industries and issue_categories with curated lists
-- Features:
--   1. Create tables if they don't exist (self-contained migration)
--   2. Replace seed data with exact curated lists
--   3. Add issue_subcategory for "Other (Specify)" handling
--   4. Safe upsert with proper sort_order
-- ============================================================

-- ============================================================
-- A) CREATE REFERENCE TABLES IF NOT EXISTS
-- ============================================================

-- Industries reference table (global)
CREATE TABLE IF NOT EXISTS industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue categories reference table (org-configurable)
CREATE TABLE IF NOT EXISTS issue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- ============================================================
-- B) ADD FK COLUMNS TO ANALYSES IF NOT EXISTS
-- ============================================================

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS issue_category_id UUID REFERENCES issue_categories(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_analyses_industry_id ON analyses(industry_id);
CREATE INDEX IF NOT EXISTS idx_analyses_issue_category_id ON analyses(issue_category_id);

-- ============================================================
-- C) ADD ISSUE SUBCATEGORY COLUMN
-- ============================================================

-- For "Other (Specify)" issue category, store the custom description
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS issue_subcategory TEXT;

COMMENT ON COLUMN analyses.issue_subcategory IS 'Custom subcategory description when Issue Category is "Other (Specify)"';

-- ============================================================
-- D) RESEED INDUSTRIES
-- ============================================================

-- First, deactivate all existing industries (preserves FK references)
UPDATE industries SET is_active = false WHERE is_active = true;

-- Insert/update with exact curated list
INSERT INTO industries (name, sort_order, is_active) VALUES
    ('Aerospace & Defense', 1, true),
    ('Automotive', 2, true),
    ('Construction', 3, true),
    ('Consumer Packaged Goods (CPG)', 4, true),
    ('Distribution & Logistics (3PL)', 5, true),
    ('E-commerce & Retail', 6, true),
    ('Energy & Utilities', 7, true),
    ('Food & Beverage', 8, true),
    ('Government / Public Sector', 9, true),
    ('Healthcare', 10, true),
    ('Hospitality', 11, true),
    ('Manufacturing (General)', 12, true),
    ('Mining & Metals', 13, true),
    ('Pharmaceuticals & Life Sciences', 14, true),
    ('Technology / Software (IT / SaaS)', 15, true),
    ('Telecommunications', 16, true),
    ('Other / Multi-Industry', 17, true)
ON CONFLICT (name) DO UPDATE SET
    sort_order = EXCLUDED.sort_order,
    is_active = true;

-- ============================================================
-- E) RESEED ISSUE CATEGORIES
-- ============================================================

-- First, deactivate all existing global issue categories (preserves FK references)
UPDATE issue_categories SET is_active = false WHERE organization_id IS NULL AND is_active = true;

-- Insert/update with exact curated list (global categories have org_id = NULL)
INSERT INTO issue_categories (organization_id, name, sort_order, is_active) VALUES
    (NULL, 'Safety Incident / Near Miss', 1, true),
    (NULL, 'Property Damage', 2, true),
    (NULL, 'Environmental / Spill', 3, true),
    (NULL, 'Regulatory / Compliance Finding', 4, true),
    (NULL, 'Defect / Nonconformance', 5, true),
    (NULL, 'Spec Out of Tolerance', 6, true),
    (NULL, 'Rework / Scrap / Waste', 7, true),
    (NULL, 'Labeling / Identification Error', 8, true),
    (NULL, 'Delay / Service Failure', 9, true),
    (NULL, 'Downtime / Equipment Failure', 10, true),
    (NULL, 'Capacity / Bottleneck', 11, true),
    (NULL, 'Process Deviation (Standard Work Not Followed)', 12, true),
    (NULL, 'Inventory Accuracy / Variance', 13, true),
    (NULL, 'Scan / Transaction Error', 14, true),
    (NULL, 'Mis-ship / Wrong Item / Wrong Location', 15, true),
    (NULL, 'Documentation / Records Error', 16, true),
    (NULL, 'Cost Overrun / Excess Cost', 17, true),
    (NULL, 'Customer Complaint / Experience Issue', 18, true),
    (NULL, 'Supplier / Inbound Quality Issue', 19, true),
    (NULL, 'Training / Competency Gap', 20, true),
    (NULL, 'Other (Specify)', 21, true)
ON CONFLICT (organization_id, name) DO UPDATE SET
    sort_order = EXCLUDED.sort_order,
    is_active = true;

-- ============================================================
-- F) BACKFILL LEGACY TEXT VALUES (Best-effort mapping)
-- ============================================================

-- Map legacy industry text to new industry_id (case-insensitive partial match)
-- This handles cases where old analyses have industry as text in a legacy column
-- Skip if no legacy column exists (will just do nothing)

-- Try to map common legacy industry names to new IDs
DO $$
DECLARE
    has_legacy_industry_col BOOLEAN;
BEGIN
    -- Check if there's a legacy 'industry' text column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'analyses'
        AND column_name = 'industry'
        AND data_type = 'text'
    ) INTO has_legacy_industry_col;

    IF has_legacy_industry_col THEN
        -- Map aerospace/defense
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Aerospace & Defense' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(aerospace|aviation|defense)%';

        -- Map automotive
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Automotive' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(auto|vehicle|car)%';

        -- Map manufacturing
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Manufacturing (General)' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(manufactur|production|factory)%';

        -- Map healthcare
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Healthcare' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(health|hospital|medical|clinic)%';

        -- Map pharma
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Pharmaceuticals & Life Sciences' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(pharma|drug|biotech|life science)%';

        -- Map food & beverage
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Food & Beverage' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(food|beverage|restaurant|f&b)%';

        -- Map logistics
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Distribution & Logistics (3PL)' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(logistic|distribution|warehouse|3pl|shipping)%';

        -- Map retail
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'E-commerce & Retail' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(retail|ecommerce|e-commerce|store)%';

        -- Map technology
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Technology / Software (IT / SaaS)' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(tech|software|it|saas|computer)%';

        -- Map energy
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Energy & Utilities' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(energy|utility|power|electric|oil|gas)%';

        -- Map government
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Government / Public Sector' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(government|public|federal|state|municipal)%';

        -- Map construction
        UPDATE analyses a SET industry_id = (
            SELECT id FROM industries WHERE name = 'Construction' LIMIT 1
        ) WHERE a.industry_id IS NULL
          AND LOWER(TRIM(a.industry)) SIMILAR TO '%(construction|building|infrastructure)%';
    END IF;
END $$;

-- ============================================================
-- G) INDEX FOR ISSUE SUBCATEGORY
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_analyses_issue_subcategory
    ON analyses(issue_subcategory)
    WHERE issue_subcategory IS NOT NULL;

-- ============================================================
-- H) VALIDATION TRIGGER FOR ISSUE SUBCATEGORY
-- ============================================================

-- Create function to validate issue_subcategory is provided when "Other (Specify)" is selected
CREATE OR REPLACE FUNCTION validate_issue_subcategory()
RETURNS TRIGGER AS $$
DECLARE
    other_category_id UUID;
BEGIN
    -- Get the ID of "Other (Specify)" category
    SELECT id INTO other_category_id
    FROM issue_categories
    WHERE name = 'Other (Specify)' AND organization_id IS NULL
    LIMIT 1;

    -- If issue_category_id is "Other (Specify)", require issue_subcategory
    IF NEW.issue_category_id = other_category_id THEN
        IF NEW.issue_subcategory IS NULL OR TRIM(NEW.issue_subcategory) = '' THEN
            RAISE WARNING 'Issue subcategory should be provided when Issue Category is "Other (Specify)"';
            -- Note: Using WARNING instead of EXCEPTION to allow save but flag the issue
        END IF;
    ELSE
        -- Clear subcategory if not "Other (Specify)"
        NEW.issue_subcategory := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_issue_subcategory_trigger ON analyses;

CREATE TRIGGER validate_issue_subcategory_trigger
    BEFORE INSERT OR UPDATE ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION validate_issue_subcategory();

-- ============================================================
-- I) ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on reference tables
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

-- Industries: Everyone can read active industries (global reference data)
DROP POLICY IF EXISTS "Industries are viewable by all authenticated users" ON industries;
CREATE POLICY "Industries are viewable by all authenticated users"
    ON industries FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Issue categories: Read global (org_id IS NULL) or org-specific
DROP POLICY IF EXISTS "Issue categories readable by org members" ON issue_categories;
CREATE POLICY "Issue categories readable by org members"
    ON issue_categories FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND (
            organization_id IS NULL -- Global defaults
            OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );
