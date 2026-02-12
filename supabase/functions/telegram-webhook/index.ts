import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendMessage(chatId: number, text: string, parseMode = 'HTML') {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
}

serve(async (req) => {
  // Verify webhook secret via URL param
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update.message;
    if (!message?.text || !message?.chat?.id) {
      return new Response('OK');
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const username = message.from?.username || '';

    // /start command
    if (text === '/start') {
      await sendMessage(chatId,
        `🤖 <b>Welcome to AgenticAiHome!</b>\n\n` +
        `The decentralized AI agent marketplace on Ergo.\n\n` +
        `To link your wallet and receive notifications:\n` +
        `1. Go to <a href="https://agenticaihome.com/dashboard">agenticaihome.com/dashboard</a>\n` +
        `2. Connect your wallet\n` +
        `3. Open Notification Settings\n` +
        `4. Click "Enable Telegram"\n` +
        `5. Send the verification code here\n\n` +
        `Or just paste your verification code below.`
      );
      return new Response('OK');
    }

    // /help command
    if (text === '/help') {
      await sendMessage(chatId,
        `<b>Commands:</b>\n` +
        `/start — Welcome message\n` +
        `/help — This help\n` +
        `/status — Check your notification status\n\n` +
        `<b>Verification:</b> Just paste your 6-character code from the dashboard.`
      );
      return new Response('OK');
    }

    // /status command
    if (text === '/status') {
      const { data } = await supabase
        .from('notification_preferences')
        .select('wallet_address, telegram_verified, telegram_level')
        .eq('telegram_chat_id', String(chatId))
        .single();

      if (data?.telegram_verified) {
        await sendMessage(chatId,
          `✅ <b>Connected!</b>\n\n` +
          `Wallet: <code>${data.wallet_address.slice(0, 8)}...${data.wallet_address.slice(-6)}</code>\n` +
          `Notification level: <b>${data.telegram_level || 'all'}</b>\n\n` +
          `Manage settings at <a href="https://agenticaihome.com/dashboard">agenticaihome.com/dashboard</a>`
        );
      } else {
        await sendMessage(chatId, `❌ No wallet linked yet. Visit your dashboard to set up notifications.`);
      }
      return new Response('OK');
    }

    // Verification code — 6 alphanumeric chars
    const codeMatch = text.match(/^[A-Z0-9]{6}$/);
    if (codeMatch) {
      const code = codeMatch[0];

      // Look up the code
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('wallet_address')
        .eq('telegram_verify_code', code)
        .eq('telegram_verified', false)
        .single();

      if (!prefs) {
        await sendMessage(chatId, `❌ Invalid or expired code. Please generate a new one from your dashboard.`);
        return new Response('OK');
      }

      // Link the account
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          telegram_chat_id: String(chatId),
          telegram_username: username,
          telegram_verified: true,
          telegram_verify_code: null,
        })
        .eq('wallet_address', prefs.wallet_address);

      if (error) {
        await sendMessage(chatId, `❌ Something went wrong. Please try again.`);
      } else {
        await sendMessage(chatId,
          `✅ <b>Wallet linked!</b>\n\n` +
          `You'll now receive notifications for:\n` +
          `• Escrow funded & payments released\n` +
          `• New bids on your tasks\n` +
          `• Task status updates\n` +
          `• Dispute notifications\n\n` +
          `Manage settings at <a href="https://agenticaihome.com/dashboard">agenticaihome.com/dashboard</a>`
        );
      }
      return new Response('OK');
    }

    // Unknown message
    await sendMessage(chatId,
      `I didn't understand that. Send /help for available commands, or paste your 6-character verification code.`
    );

    return new Response('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('OK'); // Always 200 to Telegram
  }
});
