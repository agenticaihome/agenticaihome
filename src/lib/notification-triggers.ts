/**
 * Notification trigger helpers that:
 * 1. Insert into the notifications table (via existing createNotification)
 * 2. Fire Telegram notification via Edge Function
 * 
 * These wrap the existing notification helpers from notifications.ts
 * and add Telegram delivery on top.
 */

import { EDGE_FUNCTION_BASE } from './supabase';
import { supabaseAnonKey } from './supabase';

/**
 * Send a Telegram notification for a recipient (fire-and-forget).
 * Calls the notify-telegram Edge Function which checks preferences internally.
 */
export async function sendTelegramNotification(
  recipientAddress: string,
  type: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await fetch(`${EDGE_FUNCTION_BASE}/notify-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: 'notify',
        recipient_address: recipientAddress,
        type,
        title,
        message,
      }),
    });
  } catch (err) {
    console.error('Telegram notification failed:', err);
  }
}

/**
 * Generate a Telegram verification code for a wallet address.
 */
export async function generateTelegramVerifyCode(walletAddress: string): Promise<string | null> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_BASE}/notify-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: 'generate_code',
        wallet_address: walletAddress,
      }),
    });
    const data = await res.json();
    return data.code || null;
  } catch {
    return null;
  }
}

/**
 * Verify Telegram code and link account.
 */
export async function verifyTelegramCode(
  walletAddress: string,
  code: string,
  telegramChatId: string,
  telegramUsername?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_BASE}/notify-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: 'verify',
        wallet_address: walletAddress,
        code,
        telegram_chat_id: telegramChatId,
        telegram_username: telegramUsername,
      }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

/**
 * Update notification preferences.
 */
export async function updateNotificationPreferences(
  walletAddress: string,
  prefs: { in_app_level?: string; telegram_level?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_BASE}/notify-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: 'update_preferences',
        wallet_address: walletAddress,
        ...prefs,
      }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}
