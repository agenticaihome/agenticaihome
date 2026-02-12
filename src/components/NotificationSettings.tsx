'use client';

import { useState, useEffect } from 'react';
import { Bell, MessageCircle, Check, Copy, Loader2 } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/lib/supabase';
import {
  generateTelegramVerifyCode,
  updateNotificationPreferences,
} from '@/lib/notification-triggers';

type PreferenceLevel = 'all' | 'important' | 'none';

interface Preferences {
  in_app_level: PreferenceLevel;
  telegram_level: PreferenceLevel;
  telegram_verified: boolean;
  telegram_username: string | null;
}

const LEVEL_LABELS: Record<PreferenceLevel, { label: string; desc: string }> = {
  all: { label: 'All', desc: 'Every notification' },
  important: { label: 'Important Only', desc: 'Escrow, payments, disputes' },
  none: { label: 'None', desc: 'Disabled' },
};

export default function NotificationSettings() {
  const { userAddress } = useWallet();
  const [prefs, setPrefs] = useState<Preferences>({
    in_app_level: 'all',
    telegram_level: 'important',
    telegram_verified: false,
    telegram_username: null,
  });
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userAddress) return;
    (async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('wallet_address', userAddress)
        .single();
      if (data) {
        setPrefs({
          in_app_level: data.in_app_level || 'all',
          telegram_level: data.telegram_level || 'important',
          telegram_verified: data.telegram_verified || false,
          telegram_username: data.telegram_username || null,
        });
      }
      setLoading(false);
    })();
  }, [userAddress]);

  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  const handleGenerateCode = async () => {
    if (!userAddress) return;
    setGeneratingCode(true);
    setTelegramError(null);
    try {
      const code = await generateTelegramVerifyCode(userAddress);
      if (code) {
        setVerifyCode(code);
      } else {
        setTelegramError('Failed to generate code. Try again.');
      }
    } catch (err: any) {
      setTelegramError(err?.message || 'Connection error');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (verifyCode) {
      navigator.clipboard.writeText(verifyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async (field: 'in_app_level' | 'telegram_level', value: PreferenceLevel) => {
    if (!userAddress) return;
    setSaving(true);
    const newPrefs = { ...prefs, [field]: value };
    setPrefs(newPrefs);
    await updateNotificationPreferences(userAddress, {
      [field]: value,
    });
    setSaving(false);
  };

  if (!userAddress) return null;
  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--bg-card-hover)] rounded-lg" />
          <div className="h-4 bg-[var(--bg-card-hover)] rounded w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Notification Settings</h3>
          <p className="text-sm text-[var(--text-secondary)]">Choose how you want to be notified</p>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <Bell className="w-4 h-4" /> In-App Notifications
        </h4>
        <div className="flex gap-2">
          {(Object.keys(LEVEL_LABELS) as PreferenceLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleSave('in_app_level', level)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                prefs.in_app_level === level
                  ? 'bg-[var(--accent-cyan)] text-black'
                  : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {LEVEL_LABELS[level].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{LEVEL_LABELS[prefs.in_app_level].desc}</p>
      </div>

      {/* Telegram */}
      <div className="space-y-3 border-t border-[var(--border-color)] pt-6">
        <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Telegram Notifications
        </h4>

        {prefs.telegram_verified ? (
          <>
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              Connected{prefs.telegram_username ? ` as @${prefs.telegram_username}` : ''}
            </div>
            <div className="flex gap-2">
              {(Object.keys(LEVEL_LABELS) as PreferenceLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleSave('telegram_level', level)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    prefs.telegram_level === level
                      ? 'bg-[var(--accent-cyan)] text-black'
                      : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {LEVEL_LABELS[level].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">{LEVEL_LABELS[prefs.telegram_level].desc}</p>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Get notifications directly in Telegram when important things happen. (Coming soon)
            </p>
            {verifyCode ? (
              <div className="bg-[var(--bg-card-hover)] rounded-lg p-4 space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  1. Open our Telegram bot: <a href="https://t.me/AgenticAiHomeBot" target="_blank" className="text-[var(--accent-cyan)] hover:underline">@AgenticAiHomeBot</a>
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  2. Send this verification code:
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-black/30 px-4 py-2 rounded-lg text-lg font-mono text-white tracking-wider">
                    {verifyCode}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[var(--text-secondary)]" />}
                  </button>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  The bot will automatically link your account once verified.
                </p>
              </div>
            ) : (
              <div>
                <button
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {generatingCode ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><MessageCircle className="w-4 h-4" /> Enable Telegram Notifications</>
                  )}
                </button>
                {telegramError && (
                  <p className="text-red-400 text-xs mt-2">{telegramError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
