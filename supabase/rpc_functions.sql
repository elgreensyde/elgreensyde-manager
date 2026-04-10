-- ELGREENSYDE ARCHITECTURAL REFACTOR: BACKEND TRANSACTIONS
-- Supporting FEAT-003 and FEAT-004

-- 1. Unified Maintenance & Inventory Deduction RPC
-- Deducts stock and logs maintenance in ONE atomic operation
CREATE OR REPLACE FUNCTION log_maintenance_with_deduction(
    p_action_category TEXT,
    p_target_ids UUID[],
    p_input_id UUID,
    p_dosage_rate TEXT,
    p_notes TEXT,
    p_amount_to_deduct DECIMAL
)
RETURNS VOID AS $$
DECLARE
    v_product_name TEXT;
BEGIN
    -- Get product name for logging consistency
    SELECT product_name INTO v_product_name FROM inputs_inventory WHERE input_id = p_input_id;

    -- 1. Deduct Stock
    UPDATE inputs_inventory 
    SET current_stock = current_stock - p_amount_to_deduct
    WHERE input_id = p_input_id;

    -- 2. Insert maintenance log
    INSERT INTO maintenance_logs (
        event_date,
        action_category,
        target_ids,
        method_product,
        dosage_rate,
        notes,
        input_id -- Link to the consumable directly
    ) VALUES (
        CURRENT_DATE,
        p_action_category,
        p_target_ids,
        v_product_name,
        p_dosage_rate,
        p_notes,
        p_input_id
    );
END;
$$ LANGUAGE plpgsql;


-- 2. Unified Issue Reporting & Task Generation RPC
-- Creates a flagged issue and an associated high-priority task atomically
CREATE OR REPLACE FUNCTION report_issue_with_task(
    p_target_type TEXT,
    p_target_id UUID,
    p_issue_category TEXT,
    p_description TEXT,
    p_severity TEXT
)
RETURNS VOID AS $$
DECLARE
    v_flag_id UUID;
    v_task_title TEXT;
BEGIN
    -- 1. Insert flagged issue
    INSERT INTO flagged_issues (
        target_type,
        target_id,
        issue_type,
        threat_category,
        description,
        severity,
        status,
        is_active_threat
    ) VALUES (
        p_target_type,
        p_target_id,
        p_issue_category,
        p_issue_category,
        p_description,
        p_severity,
        'Open',
        TRUE
    ) RETURNING flag_id INTO v_flag_id;

    -- 2. Generate task title
    v_task_title := 'RESOLVE: ' || p_issue_category || ' - ' || substring(p_description from 1 for 50);

    -- 3. Create high-priority task
    INSERT INTO tasks (
        title,
        due_date,
        priority,
        status,
        is_auto_generated,
        plot_id,
        batch_id
    ) VALUES (
        v_task_title,
        CURRENT_DATE,
        p_severity, -- Use the same severity for priority
        'Pending',
        TRUE,
        CASE WHEN p_target_type = 'plot' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'batch' THEN p_target_id ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql;
