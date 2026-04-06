import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (_req) => {
  try {
    // 1. Initialize Supabase Client with Admin Privileges (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // 2. Fetch Low Stock Inputs
    const { data: lowStock } = await supabase
      .from('inputs_inventory')
      .select('product_name, current_stock, stock_unit, low_stock_threshold')

    const lowStockItems = (lowStock || []).filter(
      (item: any) => item.current_stock <= item.low_stock_threshold
    )

    // 3. Fetch Overdue Tasks
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('title, category, due_date, priority')
      .lte('due_date', today)
      .eq('status', 'Pending')
      .order('due_date', { ascending: true })

    // 4. Fetch Today's Tasks
    const { data: todayTasks } = await supabase
      .from('tasks')
      .select('title, category, due_date, priority')
      .eq('due_date', today)
      .eq('status', 'Pending')

    // 5. Fetch Upcoming Harvests (batches ready in the next 2 days)
    const { data: upcomingHarvests } = await supabase
      .from('batches')
      .select('batch_code, crop_name, harvest_date')
      .lte('harvest_date', tomorrowStr)
      .gte('harvest_date', today)
      .neq('status', 'Harvested')

    // 6. Fetch Active Away Periods
    const { data: awayPeriods } = await supabase
      .from('away_periods')
      .select('start_date, end_date')
      .lte('start_date', today)
      .gte('end_date', today)

    const isAway = (awayPeriods || []).length > 0

    // 7. Build the HTML Email Body
    let emailBody = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fdf8; border-radius: 12px; overflow: hidden;">
        <div style="background: #2d6a4f; padding: 24px;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🌿 Elgreensyde Daily Digest</h1>
          <p style="color: #b7e4c7; margin: 4px 0 0 0; font-size: 14px;">${new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          ${isAway ? '<p style="background: #e63946; color: white; padding: 6px 12px; border-radius: 20px; display: inline-block; font-size: 12px; margin-top: 8px;">📵 AWAY MODE ACTIVE</p>' : ''}
        </div>
        <div style="padding: 24px;">
    `

    // Overdue Tasks Section
    if ((overdueTasks || []).length > 0) {
      emailBody += `
        <div style="background: #fff5f5; border-left: 4px solid #e63946; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="color: #e63946; margin: 0 0 12px 0;">🚨 Overdue Tasks (${overdueTasks!.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${overdueTasks!.map((t: any) => `
              <li style="margin-bottom: 6px; color: #333;">
                <strong>${t.title}</strong>
                <span style="color: #e63946; font-size: 12px;"> — Due: ${t.due_date}</span>
                ${t.priority === 'High' ? '<span style="background: #e63946; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; margin-left: 4px;">HIGH</span>' : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `
    }

    // Today's Tasks Section
    if ((todayTasks || []).length > 0) {
      emailBody += `
        <div style="background: #fff9db; border-left: 4px solid #f4a261; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="color: #e76f51; margin: 0 0 12px 0;">📅 Today's Tasks (${todayTasks!.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${todayTasks!.map((t: any) => `<li style="margin-bottom: 6px; color: #333;">${t.title}</li>`).join('')}
          </ul>
        </div>
      `
    }

    // Upcoming Harvests Section
    if ((upcomingHarvests || []).length > 0) {
      emailBody += `
        <div style="background: #f0fff4; border-left: 4px solid #2d6a4f; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="color: #2d6a4f; margin: 0 0 12px 0;">🌾 Harvest Ready (${upcomingHarvests!.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${upcomingHarvests!.map((b: any) => `
              <li style="margin-bottom: 6px; color: #333;">
                <strong>${b.batch_code}</strong> — ${b.crop_name}
                <span style="color: #2d6a4f; font-size: 12px;"> (${b.harvest_date})</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `
    }

    // Low Stock Section
    if (lowStockItems.length > 0) {
      emailBody += `
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="color: #856404; margin: 0 0 12px 0;">⚠️ Low Stock Alerts (${lowStockItems.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${lowStockItems.map((item: any) => `
              <li style="margin-bottom: 6px; color: #333;">
                <strong>${item.product_name}</strong>: ${item.current_stock} ${item.stock_unit} remaining
              </li>
            `).join('')}
          </ul>
        </div>
      `
    }

    // All Clear message
    if ((overdueTasks || []).length === 0 && (todayTasks || []).length === 0 && (upcomingHarvests || []).length === 0 && lowStockItems.length === 0) {
      emailBody += `
        <div style="text-align: center; padding: 24px; color: #2d6a4f;">
          <p style="font-size: 32px; margin: 0;">✅</p>
          <p style="font-size: 18px; font-weight: bold; margin: 8px 0;">All Clear!</p>
          <p style="color: #555;">No overdue tasks, no low stock, no urgent harvests. Have a great day.</p>
        </div>
      `
    }

    emailBody += `
        </div>
        <div style="background: #e8f5e9; padding: 16px; text-align: center;">
          <p style="color: #555; font-size: 12px; margin: 0;">Elgreensyde Solo Cockpit v3.0 · Automated Daily Digest</p>
        </div>
      </div>
    `

    // 8. Send via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const toEmail = Deno.env.get('DIGEST_TO_EMAIL')

    if (resendApiKey && toEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Elgreensyde Farm <digest@elgreensyde.com>',
          to: toEmail,
          subject: `🌿 Elgreensyde Daily Digest — ${today}`,
          html: emailBody
        })
      })
    }

    return new Response(JSON.stringify({
      message: "Digest generated and sent successfully",
      summary: {
        overdue: (overdueTasks || []).length,
        today: (todayTasks || []).length,
        harvests: (upcomingHarvests || []).length,
        lowStock: lowStockItems.length,
        isAway
      }
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
