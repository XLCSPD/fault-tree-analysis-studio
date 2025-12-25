-- Function to get the path from top event to a node
CREATE OR REPLACE FUNCTION get_node_path(node_id UUID)
RETURNS UUID[] AS $$
DECLARE
    path UUID[] := ARRAY[node_id];
    current_node UUID := node_id;
    parent_node UUID;
BEGIN
    LOOP
        -- Find parent node
        SELECT source_id INTO parent_node
        FROM node_edges
        WHERE target_id = current_node;
        
        -- Exit if no parent (reached top)
        EXIT WHEN parent_node IS NULL;
        
        -- Add parent to beginning of path
        path := parent_node || path;
        current_node := parent_node;
    END LOOP;
    
    RETURN path;
END;
$$ LANGUAGE plpgsql;

-- Function to get all leaf nodes in an analysis
CREATE OR REPLACE FUNCTION get_leaf_nodes(analysis_id_param UUID)
RETURNS TABLE(node_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT n.id
    FROM nodes n
    WHERE n.analysis_id = analysis_id_param
    AND NOT EXISTS (
        SELECT 1 FROM node_edges e 
        WHERE e.source_id = n.id
        AND e.analysis_id = analysis_id_param
    );
END;
$$ LANGUAGE plpgsql;

-- Function to project tree to table rows
CREATE OR REPLACE FUNCTION get_table_projection(analysis_id_param UUID)
RETURNS TABLE(
    row_id UUID,
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
    leaf_node_id UUID,
    units TEXT,
    specification TEXT,
    metric TEXT,
    severity INTEGER,
    occurrence INTEGER,
    detection INTEGER,
    rpn INTEGER,
    investigation_item TEXT,
    person_responsible_name TEXT,
    schedule DATE,
    week_1_status action_status,
    week_2_status action_status,
    week_3_status action_status,
    week_4_status action_status,
    investigation_result TEXT,
    judgment INTEGER,
    remarks TEXT
) AS $$
DECLARE
    leaf RECORD;
    path_array UUID[];
    path_labels TEXT[];
    i INTEGER;
    top_node UUID;
BEGIN
    -- Get the top event node
    SELECT n.id INTO top_node
    FROM nodes n
    WHERE n.analysis_id = analysis_id_param
    AND n.type = 'top_event'
    LIMIT 1;
    
    -- Process each leaf node
    FOR leaf IN SELECT node_id FROM get_leaf_nodes(analysis_id_param)
    LOOP
        -- Get path from top to this leaf
        path_array := get_node_path(leaf.node_id);
        
        -- Get labels for each node in path
        path_labels := ARRAY[]::TEXT[];
        FOR i IN 1..array_length(path_array, 1)
        LOOP
            path_labels := path_labels || (SELECT label FROM nodes WHERE id = path_array[i]);
        END LOOP;
        
        -- Build the row
        row_id := leaf.node_id;
        failure_mode_top := path_labels[1];
        why_1 := CASE WHEN array_length(path_labels, 1) >= 2 THEN path_labels[2] ELSE NULL END;
        why_2 := CASE WHEN array_length(path_labels, 1) >= 3 THEN path_labels[3] ELSE NULL END;
        why_3 := CASE WHEN array_length(path_labels, 1) >= 4 THEN path_labels[4] ELSE NULL END;
        why_4 := CASE WHEN array_length(path_labels, 1) >= 5 THEN path_labels[5] ELSE NULL END;
        why_5 := CASE WHEN array_length(path_labels, 1) >= 6 THEN path_labels[6] ELSE NULL END;
        why_6 := CASE WHEN array_length(path_labels, 1) >= 7 THEN path_labels[7] ELSE NULL END;
        why_7 := CASE WHEN array_length(path_labels, 1) >= 8 THEN path_labels[8] ELSE NULL END;
        why_8 := CASE WHEN array_length(path_labels, 1) >= 9 THEN path_labels[9] ELSE NULL END;
        why_9 := CASE WHEN array_length(path_labels, 1) >= 10 THEN path_labels[10] ELSE NULL END;
        
        -- Get leaf node details
        SELECT n.units, n.specification, n.metric
        INTO units, specification, metric
        FROM nodes n
        WHERE n.id = leaf.node_id;
        
        -- Get risk scores
        SELECT rs.severity, rs.occurrence, rs.detection, rs.rpn
        INTO severity, occurrence, detection, rpn
        FROM risk_scores rs
        WHERE rs.node_id = leaf.node_id;
        
        -- Get action item details (first action for this node)
        SELECT 
            ai.investigation_item,
            pd.name,
            ai.schedule,
            ai.investigation_result,
            ai.judgment,
            ai.remarks
        INTO 
            investigation_item,
            person_responsible_name,
            schedule,
            investigation_result,
            judgment,
            remarks
        FROM action_items ai
        LEFT JOIN people_directory pd ON pd.id = ai.person_responsible_id
        WHERE ai.node_id = leaf.node_id
        ORDER BY ai.created_at
        LIMIT 1;
        
        -- Get week statuses
        IF investigation_item IS NOT NULL THEN
            SELECT aws.status INTO week_1_status
            FROM action_week_status aws
            JOIN action_items ai ON ai.id = aws.action_item_id
            WHERE ai.node_id = leaf.node_id AND aws.week_number = 1
            ORDER BY ai.created_at LIMIT 1;
            
            SELECT aws.status INTO week_2_status
            FROM action_week_status aws
            JOIN action_items ai ON ai.id = aws.action_item_id
            WHERE ai.node_id = leaf.node_id AND aws.week_number = 2
            ORDER BY ai.created_at LIMIT 1;
            
            SELECT aws.status INTO week_3_status
            FROM action_week_status aws
            JOIN action_items ai ON ai.id = aws.action_item_id
            WHERE ai.node_id = leaf.node_id AND aws.week_number = 3
            ORDER BY ai.created_at LIMIT 1;
            
            SELECT aws.status INTO week_4_status
            FROM action_week_status aws
            JOIN action_items ai ON ai.id = aws.action_item_id
            WHERE ai.node_id = leaf.node_id AND aws.week_number = 4
            ORDER BY ai.created_at LIMIT 1;
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update node from table edit
CREATE OR REPLACE FUNCTION update_node_from_table(
    analysis_id_param UUID,
    path_position INTEGER, -- 0 for top, 1 for why_1, etc.
    old_label TEXT,
    new_label TEXT
) RETURNS VOID AS $$
DECLARE
    target_node UUID;
    path_array UUID[];
BEGIN
    -- Find all nodes at this path position with the old label
    FOR target_node IN 
        SELECT DISTINCT path_array[path_position + 1]
        FROM (
            SELECT get_node_path(node_id) as path_array
            FROM get_leaf_nodes(analysis_id_param)
        ) paths
        WHERE path_array[path_position + 1] IS NOT NULL
        AND (SELECT label FROM nodes WHERE id = path_array[path_position + 1]) = old_label
    LOOP
        -- Update the node label
        UPDATE nodes
        SET label = new_label
        WHERE id = target_node;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create nodes from table row
CREATE OR REPLACE FUNCTION create_nodes_from_table_row(
    analysis_id_param UUID,
    failure_mode_top_param TEXT,
    why_1_param TEXT DEFAULT NULL,
    why_2_param TEXT DEFAULT NULL,
    why_3_param TEXT DEFAULT NULL,
    why_4_param TEXT DEFAULT NULL,
    why_5_param TEXT DEFAULT NULL,
    why_6_param TEXT DEFAULT NULL,
    why_7_param TEXT DEFAULT NULL,
    why_8_param TEXT DEFAULT NULL,
    why_9_param TEXT DEFAULT NULL,
    units_param TEXT DEFAULT NULL,
    specification_param TEXT DEFAULT NULL,
    metric_param TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    current_parent UUID;
    current_node UUID;
    why_values TEXT[];
    i INTEGER;
    label_text TEXT;
    existing_node UUID;
    leaf_node UUID;
BEGIN
    -- Build array of why values
    why_values := ARRAY[why_1_param, why_2_param, why_3_param, why_4_param, 
                        why_5_param, why_6_param, why_7_param, why_8_param, why_9_param];
    
    -- Get or create top event
    SELECT id INTO current_parent
    FROM nodes
    WHERE analysis_id = analysis_id_param
    AND type = 'top_event'
    AND label = failure_mode_top_param
    LIMIT 1;
    
    IF current_parent IS NULL THEN
        INSERT INTO nodes (analysis_id, type, label, position)
        VALUES (analysis_id_param, 'top_event', failure_mode_top_param, '{"x": 400, "y": 50}')
        RETURNING id INTO current_parent;
    END IF;
    
    -- Process each why level
    FOR i IN 1..9
    LOOP
        label_text := why_values[i];
        
        -- Stop if we hit a null value
        EXIT WHEN label_text IS NULL;
        
        -- Check if this node already exists as a child of current parent
        SELECT n.id INTO existing_node
        FROM nodes n
        JOIN node_edges e ON e.target_id = n.id
        WHERE e.source_id = current_parent
        AND n.label = label_text
        LIMIT 1;
        
        IF existing_node IS NOT NULL THEN
            current_node := existing_node;
        ELSE
            -- Create new node
            INSERT INTO nodes (analysis_id, type, label, position)
            VALUES (
                analysis_id_param, 
                'basic_event',
                label_text,
                jsonb_build_object('x', 400 + (i * 50), 'y', 50 + (i * 100))
            )
            RETURNING id INTO current_node;
            
            -- Create edge
            INSERT INTO node_edges (analysis_id, source_id, target_id, order_index)
            VALUES (analysis_id_param, current_parent, current_node, i);
        END IF;
        
        current_parent := current_node;
        leaf_node := current_node;
    END LOOP;
    
    -- Update leaf node with additional data
    IF leaf_node IS NOT NULL THEN
        UPDATE nodes
        SET units = units_param,
            specification = specification_param,
            metric = metric_param
        WHERE id = leaf_node;
    END IF;
    
    RETURN leaf_node;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log_entry()
RETURNS TRIGGER AS $$
DECLARE
    entity_type TEXT;
    org_id UUID;
    changes JSONB;
BEGIN
    -- Determine entity type from table name
    entity_type := TG_TABLE_NAME;
    
    -- Get organization_id based on entity type
    CASE entity_type
        WHEN 'nodes' THEN
            SELECT analyses.organization_id INTO org_id
            FROM analyses
            WHERE analyses.id = NEW.analysis_id;
        WHEN 'action_items' THEN
            SELECT analyses.organization_id INTO org_id
            FROM analyses
            WHERE analyses.id = NEW.analysis_id;
        WHEN 'analyses' THEN
            org_id := NEW.organization_id;
        ELSE
            RETURN NEW;
    END CASE;
    
    -- Build changes object
    IF TG_OP = 'UPDATE' THEN
        changes := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'INSERT' THEN
        changes := jsonb_build_object('new', to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        changes := jsonb_build_object('old', to_jsonb(OLD));
    END IF;
    
    -- Insert audit log entry
    INSERT INTO audit_log (organization_id, user_id, entity_type, entity_id, action, changes)
    VALUES (org_id, auth.uid(), entity_type, NEW.id, TG_OP, changes);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for key tables
CREATE TRIGGER audit_nodes_changes
    AFTER INSERT OR UPDATE OR DELETE ON nodes
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_action_items_changes
    AFTER INSERT OR UPDATE OR DELETE ON action_items
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_risk_scores_changes
    AFTER INSERT OR UPDATE OR DELETE ON risk_scores
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();