'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/contexts/ToastContext';
import { MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  disputeId: string;
  authorAddress: string;
  authorRole: 'client' | 'agent' | 'mediator';
  message: string;
  createdAt: string;
}

interface DisputeMessagesProps {
  disputeId: string;
  clientAddress: string;
  agentAddress: string;
  mediatorAddress?: string;
  userRole: 'client' | 'agent' | 'mediator';
}

const ROLE_COLORS: Record<string, string> = {
  client: 'text-cyan-400',
  agent: 'text-green-400',
  mediator: 'text-yellow-400',
};

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  agent: 'Agent',
  mediator: 'Mediator',
};

export default function DisputeMessages({
  disputeId,
  clientAddress,
  agentAddress,
  mediatorAddress,
  userRole,
}: DisputeMessagesProps) {
  const { userAddress } = useWallet();
  const { error: showError } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        disputeId: m.dispute_id,
        authorAddress: m.author_address,
        authorRole: m.author_role,
        message: m.message,
        createdAt: m.created_at,
      })));
    }
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`dispute-messages-${disputeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dispute_messages', filter: `dispute_id=eq.${disputeId}` },
        () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [disputeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from('dispute_messages').insert([{
        dispute_id: disputeId,
        author_address: userAddress,
        author_role: userRole,
        message: newMessage.trim(),
      }]);
      if (error) throw error;
      setNewMessage('');
      await loadMessages();
    } catch {
      showError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const truncateAddr = (addr: string) => addr ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : '';

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-800/30 flex flex-col" style={{ maxHeight: '400px' }}>
      <div className="px-4 py-3 border-b border-gray-700">
        <h5 className="text-white font-semibold text-sm"><MessageSquare className="w-4 h-4 text-blue-400 inline" /> Discussion</h5>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px]">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No messages yet. Start the discussion.</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`${msg.authorAddress === userAddress ? 'ml-8' : 'mr-8'}`}>
            <div className={`rounded-lg p-3 ${msg.authorAddress === userAddress ? 'bg-blue-900/30 border border-blue-800' : 'bg-gray-800 border border-gray-700'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${ROLE_COLORS[msg.authorRole] || 'text-gray-400'}`}>
                  {ROLE_LABELS[msg.authorRole] || msg.authorRole}
                </span>
                <span className="text-gray-600 text-xs">{truncateAddr(msg.authorAddress)}</span>
                <span className="text-gray-600 text-xs ml-auto">{new Date(msg.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button type="submit" disabled={sending || !newMessage.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors">
          Send
        </button>
      </form>
    </div>
  );
}
