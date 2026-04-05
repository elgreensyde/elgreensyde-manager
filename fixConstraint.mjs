import supabase from './app/src/lib/supabase.js';

async function fixConstraint() {
    console.log('Attempting to fix checklist_responses_target_type_check...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            ALTER TABLE checklist_responses DROP CONSTRAINT IF EXISTS checklist_responses_target_type_check;
            ALTER TABLE checklist_responses ADD CONSTRAINT checklist_responses_target_type_check CHECK (target_type IN ('plot', 'tray', 'batch', 'general'));
        `
    });

    if (error) {
        console.error('Failed to fix constraint via RPC. It likely does not exist or is restricted.', error);
        console.log('Falling back to code-level workaround...');
    } else {
        console.log('Constraint fixed successfully!');
    }
}

fixConstraint();
