    -- AI Tables Only Migration
    -- Run this if the main migration failed before creating AI tables

    -- Check if enums already exist, create if not
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_feature_type') THEN
            CREATE TYPE ai_feature_type AS ENUM (
                'next_whys',
                'investigations',
                'rewrite_cause',
                'controls',
                'quality_check'
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_suggestion_type') THEN
            CREATE TYPE ai_suggestion_type AS ENUM (
                'node',
                'action',
                'rewrite',
                'control',
                'fix'
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_suggestion_status') THEN
            CREATE TYPE ai_suggestion_status AS ENUM (
                'proposed',
                'accepted',
                'dismissed'
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_confidence') THEN
            CREATE TYPE ai_confidence AS ENUM (
                'low',
                'medium',
                'high'
            );
        END IF;
    END $$;

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
        payload JSONB NOT NULL,
        confidence ai_confidence DEFAULT 'medium',
        rationale TEXT,
        evidence_required TEXT,
        category TEXT,
        status ai_suggestion_status DEFAULT 'proposed',
        accepted_by UUID REFERENCES profiles(id),
        accepted_at TIMESTAMPTZ,
        dismissed_by UUID REFERENCES profiles(id),
        dismissed_at TIMESTAMPTZ,
        dismiss_reason TEXT,
        applied_entity_id UUID,
        applied_entity_type TEXT CHECK (applied_entity_type IN ('node', 'action', 'rewrite')),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_ai_runs_organization ON ai_runs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_analysis ON ai_runs(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_node ON ai_runs(node_id);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_feature ON ai_runs(feature);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_created ON ai_runs(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_run ON ai_suggestions(ai_run_id);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);

    -- Enable RLS
    ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for ai_runs
    DROP POLICY IF EXISTS "Users can view AI runs in their organization" ON ai_runs;
    CREATE POLICY "Users can view AI runs in their organization"
        ON ai_runs FOR SELECT
        USING (organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Users can create AI runs in their organization" ON ai_runs;
    CREATE POLICY "Users can create AI runs in their organization"
        ON ai_runs FOR INSERT
        WITH CHECK (organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ));

    -- RLS Policies for ai_suggestions
    DROP POLICY IF EXISTS "Users can view AI suggestions from their org runs" ON ai_suggestions;
    CREATE POLICY "Users can view AI suggestions from their org runs"
        ON ai_suggestions FOR SELECT
        USING (ai_run_id IN (
            SELECT id FROM ai_runs WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        ));

    DROP POLICY IF EXISTS "Users can insert AI suggestions" ON ai_suggestions;
    CREATE POLICY "Users can insert AI suggestions"
        ON ai_suggestions FOR INSERT
        WITH CHECK (ai_run_id IN (
            SELECT id FROM ai_runs WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        ));

    DROP POLICY IF EXISTS "Users can update AI suggestions from their org runs" ON ai_suggestions;
    CREATE POLICY "Users can update AI suggestions from their org runs"
        ON ai_suggestions FOR UPDATE
        USING (ai_run_id IN (
            SELECT id FROM ai_runs WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        ));
