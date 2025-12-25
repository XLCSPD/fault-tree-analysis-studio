-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE scale_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_week_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (id = get_user_organization_id());

CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (id = get_user_organization_id() AND get_user_role() = 'admin');

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their organization" ON profiles
    FOR ALL USING (organization_id = get_user_organization_id() AND get_user_role() = 'admin');

-- Analyses policies
CREATE POLICY "Users can view analyses in their organization" ON analyses
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Contributors and above can create analyses" ON analyses
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id() AND 
        get_user_role() IN ('contributor', 'facilitator', 'admin') AND
        created_by = auth.uid()
    );

CREATE POLICY "Facilitators can update any analysis in their organization" ON analyses
    FOR UPDATE USING (
        organization_id = get_user_organization_id() AND 
        get_user_role() IN ('facilitator', 'admin')
    );

CREATE POLICY "Contributors can update their own analyses" ON analyses
    FOR UPDATE USING (
        organization_id = get_user_organization_id() AND 
        get_user_role() = 'contributor' AND
        created_by = auth.uid()
    );

CREATE POLICY "Facilitators can delete analyses" ON analyses
    FOR DELETE USING (
        organization_id = get_user_organization_id() AND 
        get_user_role() IN ('facilitator', 'admin')
    );

-- People directory policies
CREATE POLICY "Users can view people in their organization" ON people_directory
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage people directory" ON people_directory
    FOR ALL USING (organization_id = get_user_organization_id() AND get_user_role() = 'admin');

-- Scales policies
CREATE POLICY "Users can view scales in their organization" ON scales
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage scales" ON scales
    FOR ALL USING (organization_id = get_user_organization_id() AND get_user_role() = 'admin');

-- Scale versions policies
CREATE POLICY "Users can view scale versions" ON scale_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scales 
            WHERE scales.id = scale_versions.scale_id 
            AND scales.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Admins can manage scale versions" ON scale_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scales 
            WHERE scales.id = scale_versions.scale_id 
            AND scales.organization_id = get_user_organization_id()
            AND get_user_role() = 'admin'
        )
    );

-- AP mappings policies
CREATE POLICY "Users can view AP mappings in their organization" ON ap_mappings
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage AP mappings" ON ap_mappings
    FOR ALL USING (organization_id = get_user_organization_id() AND get_user_role() = 'admin');

-- Nodes policies
CREATE POLICY "Users can view nodes in their organization's analyses" ON nodes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = nodes.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Contributors and above can manage nodes" ON nodes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = nodes.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
            AND get_user_role() IN ('contributor', 'facilitator', 'admin')
        )
    );

-- Node edges policies
CREATE POLICY "Users can view node edges in their organization's analyses" ON node_edges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = node_edges.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Contributors and above can manage node edges" ON node_edges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = node_edges.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
            AND get_user_role() IN ('contributor', 'facilitator', 'admin')
        )
    );

-- Risk scores policies
CREATE POLICY "Users can view risk scores in their organization" ON risk_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM nodes
            JOIN analyses ON analyses.id = nodes.analysis_id
            WHERE nodes.id = risk_scores.node_id 
            AND analyses.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Contributors and above can manage risk scores" ON risk_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM nodes
            JOIN analyses ON analyses.id = nodes.analysis_id
            WHERE nodes.id = risk_scores.node_id 
            AND analyses.organization_id = get_user_organization_id()
            AND get_user_role() IN ('contributor', 'facilitator', 'admin')
        )
    );

-- Action items policies
CREATE POLICY "Users can view action items in their organization" ON action_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = action_items.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Contributors can create action items" ON action_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = action_items.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
            AND get_user_role() IN ('contributor', 'facilitator', 'admin')
        )
    );

CREATE POLICY "Contributors can update assigned action items" ON action_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = action_items.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
            AND (
                get_user_role() IN ('facilitator', 'admin') OR
                (get_user_role() = 'contributor' AND person_responsible_id IN (
                    SELECT id FROM people_directory WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
                ))
            )
        )
    );

CREATE POLICY "Facilitators can delete action items" ON action_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM analyses 
            WHERE analyses.id = action_items.analysis_id 
            AND analyses.organization_id = get_user_organization_id()
            AND get_user_role() IN ('facilitator', 'admin')
        )
    );

-- Action week status policies
CREATE POLICY "Users can view action week status in their organization" ON action_week_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM action_items
            JOIN analyses ON analyses.id = action_items.analysis_id
            WHERE action_items.id = action_week_status.action_item_id 
            AND analyses.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Contributors can update week status for assigned actions" ON action_week_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM action_items
            JOIN analyses ON analyses.id = action_items.analysis_id
            WHERE action_items.id = action_week_status.action_item_id 
            AND analyses.organization_id = get_user_organization_id()
            AND (
                get_user_role() IN ('facilitator', 'admin') OR
                (get_user_role() = 'contributor' AND action_items.person_responsible_id IN (
                    SELECT id FROM people_directory WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
                ))
            )
        )
    );

-- Evidence attachments policies
CREATE POLICY "Users can view evidence in their organization" ON evidence_attachments
    FOR SELECT USING (
        (node_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM nodes
            JOIN analyses ON analyses.id = nodes.analysis_id
            WHERE nodes.id = evidence_attachments.node_id 
            AND analyses.organization_id = get_user_organization_id()
        )) OR
        (action_item_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM action_items
            JOIN analyses ON analyses.id = action_items.analysis_id
            WHERE action_items.id = evidence_attachments.action_item_id 
            AND analyses.organization_id = get_user_organization_id()
        ))
    );

CREATE POLICY "Contributors can add evidence" ON evidence_attachments
    FOR INSERT WITH CHECK (
        get_user_role() IN ('contributor', 'facilitator', 'admin') AND
        uploaded_by = auth.uid() AND
        (
            (node_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM nodes
                JOIN analyses ON analyses.id = nodes.analysis_id
                WHERE nodes.id = evidence_attachments.node_id 
                AND analyses.organization_id = get_user_organization_id()
            )) OR
            (action_item_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM action_items
                JOIN analyses ON analyses.id = action_items.analysis_id
                WHERE action_items.id = evidence_attachments.action_item_id 
                AND analyses.organization_id = get_user_organization_id()
            ))
        )
    );

CREATE POLICY "Contributors can delete their own evidence" ON evidence_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        get_user_role() IN ('facilitator', 'admin')
    );

-- Audit log policies
CREATE POLICY "Users can view audit logs for their organization" ON audit_log
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert audit logs" ON audit_log
    FOR INSERT WITH CHECK (
        organization_id = get_user_organization_id() AND 
        user_id = auth.uid()
    );