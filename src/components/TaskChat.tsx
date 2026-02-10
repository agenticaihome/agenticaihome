'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/contexts/ToastContext';
import { getTaskMessages, sendTaskMessage, uploadTaskFile, type TaskMessage } from '@/lib/supabaseStore';

interface TaskChatProps {
  taskId: string;
  taskCreatorAddress: string;
  taskAgentAddress?: string;
  className?: string;
}

export default function TaskChat({ 
  taskId, 
  taskCreatorAddress, 
  taskAgentAddress,
  className = ''
}: TaskChatProps) {
  const { userAddress, isAuthenticated } = useWallet();
  const { error: showError } = useToast();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const fetchedMessages = await getTaskMessages(taskId);
      setMessages(fetchedMessages);
      // If chat is collapsed and we got new messages, show unread count
      if (isCollapsed && fetchedMessages.length > messages.length) {
        setUnreadCount(prev => prev + (fetchedMessages.length - messages.length));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [taskId, isCollapsed, messages.length, showError]);

  // Initial load and polling
  useEffect(() => {
    loadMessages();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Auto scroll when new messages arrive and chat is not collapsed
  useEffect(() => {
    if (!isCollapsed && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isCollapsed, scrollToBottom]);

  // Clear unread count when expanding chat
  useEffect(() => {
    if (!isCollapsed) {
      setUnreadCount(0);
    }
  }, [isCollapsed]);

  // Send text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !userAddress || !newMessage.trim()) return;
    
    setSending(true);
    try {
      const message = await sendTaskMessage(
        taskId,
        userAddress,
        newMessage.trim(),
        'text'
      );
      
      if (message) {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // File upload handling
  const handleFileUpload = async (file: File) => {
    if (!isAuthenticated || !userAddress) return;

    setSending(true);
    try {
      const result = await uploadTaskFile(taskId, file);
      if (result) {
        const message = await sendTaskMessage(
          taskId,
          userAddress,
          `Shared file: ${result.fileName}`,
          'file',
          result.url,
          result.fileName,
          result.fileSize
        );
        
        if (message) {
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showError('Failed to upload file');
    } finally {
      setSending(false);
    }
  };

  // Drag and drop handling
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  // Check if user is a participant (poster or agent)
  const isParticipant = userAddress === taskCreatorAddress || userAddress === taskAgentAddress;

  // Determine message sender type
  const getSenderType = (senderAddress: string) => {
    if (senderAddress === 'system') return 'system';
    if (senderAddress === taskCreatorAddress) return 'poster';
    if (senderAddress === taskAgentAddress) return 'agent';
    return 'other';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isParticipant) {
    return null; // Only show chat to task participants
  }

  return (
    <div className={`border border-gray-800 rounded-lg bg-gray-900 ${className}`}>
      {/* Chat Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h3 className="text-lg font-semibold text-white">Task Chat</h3>
          </div>
          {unreadCount > 0 && (
            <span className="bg-cyan-500 text-black text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button className="text-gray-400 hover:text-white">
          {isCollapsed ? '↓' : '↑'}
        </button>
      </div>

      {/* Chat Content */}
      {!isCollapsed && (
        <div 
          ref={chatRef}
          className={`relative ${dragActive ? 'bg-cyan-900/20' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const senderType = getSenderType(message.senderAddress);
                
                if (senderType === 'system') {
                  return (
                    <div key={message.id} className="text-center py-2">
                      <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                        {message.message}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  );
                }

                const isCurrentUser = message.senderAddress === userAddress;
                const bgColor = isCurrentUser 
                  ? (senderType === 'poster' ? 'bg-cyan-600' : 'bg-green-600')
                  : 'bg-gray-700';
                const alignment = isCurrentUser ? 'ml-auto' : 'mr-auto';

                return (
                  <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md ${alignment}`}>
                      {/* Sender label */}
                      <div className={`text-xs text-gray-400 mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        {isCurrentUser ? 'You' : (senderType === 'poster' ? 'Poster' : 'Agent')}
                      </div>
                      
                      {/* Message bubble */}
                      <div className={`rounded-lg px-4 py-2 ${bgColor}`}>
                        {message.messageType === 'file' && message.fileUrl ? (
                          <div className="space-y-2">
                            <p className="text-white">{message.message}</p>
                            <div className="border border-gray-600 rounded p-3 bg-gray-800">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">📎</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white truncate">
                                    {message.fileName}
                                  </div>
                                  {message.fileSize && (
                                    <div className="text-xs text-gray-400">
                                      {formatFileSize(message.fileSize)}
                                    </div>
                                  )}
                                </div>
                                <a 
                                  href={message.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-cyan-500 hover:bg-cyan-600 text-black px-3 py-1 rounded text-sm font-medium"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-white whitespace-pre-wrap">{message.message}</p>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      <div className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-800 p-4">
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  disabled={sending}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  accept="image/*,.pdf,.zip,.txt,.csv,.json,.docx,.xlsx,.pptx,.doc,.xls,.ppt"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
                  disabled={sending}
                >
                  📎
                </button>
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Drag overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-cyan-900/30 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center">
              <div className="text-center text-cyan-400">
                <div className="text-4xl mb-2">📎</div>
                <div className="text-lg font-medium">Drop file to upload</div>
                <div className="text-sm">Max 50MB • Images, PDFs, Docs, Code files</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}