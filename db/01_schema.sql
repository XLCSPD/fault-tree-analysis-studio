-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('viewer', 'contributor', 'facilitator', 'admin');
CREATE TYPE node_type AS ENUM ('top_event', 'intermediate_event', 'basic_event', 'gate');
CREATE TYPE gate_type AS ENUM ('AND', 'OR');
CREATE TYPE action_status AS ENUM ('not_started', 'in_progress', 'done', 'blocked');
CREATE TYPE evidence_type AS ENUM ('photo', 'file', 'link', 'note', 'measurement');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    initials TEXT,
    role user_role DEFAULT 'viewer',
    avatar_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analyses table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    model TEXT,
    application TEXT,
    part_name TEXT,
    analysis_date DATE,
    abstract TEXT,
    related_document TEXT,
    problem_statement TEXT,
    status TEXT DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- People directory table
CREATE TABLE people_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    email TEXT,
    role TEXT,
    site TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, initials)
);

-- Scales table
CREATE TABLE scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('severity', 'occurrence', 'detection')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scale versions table
CREATE TABLE scale_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scale_id UUID NOT NULL REFERENCES scales(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    effective_date DATE NOT NULL,
    items JSONB NOT NULL, -- Array of {value: number, label: string, definition: string}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AP (Action Priority) mappings table
CREATE TABLE ap_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mapping_rules JSONB NOT NULL, -- Array of rules with S/O/D conditions and AP result
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nodes table (tree structure)
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    type node_type NOT NULL,
    label TEXT NOT NULL,
    units TEXT,
    specification TEXT,
    metric TEXT,
    notes TEXT,
    tags TEXT[],
    evidence_status TEXT CHECK (evidence_status IN ('hypothesis', 'verified')),
    position JSONB, -- {x: number, y: number} for canvas positioning
    collapsed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Node edges table (parent-child relationships)
CREATE TABLE node_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    gate_type gate_type,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id),
    CHECK (
        (SELECT analysis_id FROM nodes WHERE id = source_id) = 
        (SELECT analysis_id FROM nodes WHERE id = target_id)
    )
);

-- Risk scores table
CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID UNIQUE NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    occurrence INTEGER CHECK (occurrence >= 1 AND occurrence <= 10),
    detection INTEGER CHECK (detection >= 1 AND detection <= 10),
    rpn INTEGER GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
    ap_category TEXT DEFAULT 'Medium',
    scale_version_id UUID REFERENCES scale_versions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action items table
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE, -- nullable for analysis-level actions
    investigation_item TEXT NOT NULL,
    person_responsible_id UUID REFERENCES people_directory(id),
    schedule DATE,
    investigation_result TEXT,
    judgment INTEGER CHECK (judgment IN (1, 2, 3)),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action week status table
CREATE TABLE action_week_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_item_id UUID NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 4),
    status action_status NOT NULL DEFAULT 'not_started',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(action_item_id, week_number)
);

-- Evidence attachments table
CREATE TABLE evidence_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    action_item_id UUID REFERENCES action_items(id) ON DELETE CASCADE,
    type evidence_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    file_path TEXT,
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (node_id IS NOT NULL AND action_item_id IS NULL) OR
        (node_id IS NULL AND action_item_id IS NOT NULL)
    )
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_analyses_organization ON analyses(organization_id);
CREATE INDEX idx_nodes_analysis ON nodes(analysis_id);
CREATE INDEX idx_node_edges_analysis ON node_edges(analysis_id);
CREATE INDEX idx_node_edges_source ON node_edges(source_id);
CREATE INDEX idx_node_edges_target ON node_edges(target_id);
CREATE INDEX idx_risk_scores_rpn ON risk_scores(rpn DESC);
CREATE INDEX idx_action_items_analysis ON action_items(analysis_id);
CREATE INDEX idx_action_items_node ON action_items(node_id);
CREATE INDEX idx_action_week_status_action ON action_week_status(action_item_id);
CREATE INDEX idx_evidence_attachments_node ON evidence_attachments(node_id);
CREATE INDEX idx_evidence_attachments_action ON evidence_attachments(action_item_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_people_directory_updated_at BEFORE UPDATE ON people_directory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scales_updated_at BEFORE UPDATE ON scales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ap_mappings_updated_at BEFORE UPDATE ON ap_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_risk_scores_updated_at BEFORE UPDATE ON risk_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON action_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_action_week_status_updated_at BEFORE UPDATE ON action_week_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();