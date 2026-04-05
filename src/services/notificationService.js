import supabase from '../lib/supabase';
import toast from 'react-hot-toast';

const notificationService = {
  
  /**
   * Registers a Service Worker for Browser Push Notifications.
   */
  async registerPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push Notifications not supported by this browser.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
      
      // In a real VAPID setup, we would subscribe here. 
      // For now, we'll use a simpler local notification simulation 
      // tied to the Web Push API capabilities.
    } catch (err) {
      console.error('Failed to register push:', err);
    }
  },

  /**
   * Fires an urgent browser notification. 
   * Bypasses 'Away Mode' by ensuring it is critical.
   */
  async fireUrgent(title, body) {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'urgent-alert',
        vibrate: [200, 100, 200]
      });
    } else {
      toast.error(`URGENT: ${title} - ${body}`, { duration: 6000 });
    }
    
    // Also persist to DB
    await supabase.from('notifications').insert({
      type: 'Urgent',
      title,
      message: body,
      fired_during_away: true
    });
  },

  /**
   * Blueprint for Supabase Edge Function (Deno)
   * This is what the user would deploy to the dashboard.
   */
  getEdgeFunctionBlueprint() {
    return `
      import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
      import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

      serve(async (req) => {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Aggregate Low Stock
        const { data: lowStock } = await supabase.from('inventory').select('*').lt('current_stock', 'restock_alert_level')

        // 2. Aggregate Rescheduled Tasks
        const { data: notifications } = await supabase.from('notifications').select('*').eq('type', 'Digest').eq('is_read', false)

        // 3. Send Email via Supabase/Resend
        // (Pseudocode for the mail trigger)
        console.log("Daily Digest Sent for", lowStock.length, "stock items")

        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
      })
    `;
  }
};

export default notificationService;
