import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || 'PLACEHOLDER_TOKEN';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  return res.json();
}

// Determine if a notification type is "important"
function isImportant(type: string): boolean {
  return ['escrow_funded', 'task_funded', 'payment_released', 'dispute_opened'].includes(type);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // === Generate verification code ===
    if (action === 'generate_code') {
      const { wallet_address } = body;
      if (!wallet_address) {
        return new Response(JSON.stringify({ error: 'wallet_address required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      await supabase.from('notification_preferences').upsert({
        wallet_address,
        telegram_verify_code: code,
        telegram_verified: false,
      }, { onConflict: 'wallet_address' });

      return new Response(JSON.stringify({ code }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === Verify code and link Telegram ===
    if (action === 'verify') {
      const { wallet_address, code, telegram_chat_id, telegram_username } = body;

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('telegram_verify_code')
        .eq('wallet_address', wallet_address)
        .single();

      if (!prefs || prefs.telegram_verify_code !== code) {
        return new Response(JSON.stringify({ error: 'Invalid verification code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('notification_preferences').update({
        telegram_chat_id,
        telegram_username,
        telegram_verified: true,
        telegram_verify_code: null,
      }).eq('wallet_address', wallet_address);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === Send notification via Telegram ===
    if (action === 'notify') {
      const { recipient_address, type, title, message } = body;

      // Check if user has Telegram linked and wants this notification
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('telegram_chat_id, telegram_verified, telegram_level')
        .eq('wallet_address', recipient_address)
        .single();

      if (!prefs?.telegram_chat_id || !prefs.telegram_verified) {
        return new Response(JSON.stringify({ skipped: true, reason: 'no_telegram' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check preference level
      if (prefs.telegram_level === 'none') {
        return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (prefs.telegram_level === 'important' && !isImportant(type)) {
        return new Response(JSON.stringify({ skipped: true, reason: 'not_important' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const text = `<b>${title}</b>\n\n${message}\n\n<i>AgenticAiHome</i>`;
      const result = await sendTelegramMessage(prefs.telegram_chat_id, text);

      return new Response(JSON.stringify({ success: true, telegram: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === Update preferences ===
    if (action === 'update_preferences') {
      const { wallet_address, in_app_level, telegram_level } = body;

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (in_app_level) updates.in_app_level = in_app_level;
      if (telegram_level) updates.telegram_level = telegram_level;

      await supabase.from('notification_preferences').upsert({
        wallet_address,
        ...updates,
      }, { onConflict: 'wallet_address' });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
