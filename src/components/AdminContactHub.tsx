import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot,
  Minimize2
} from 'lucide-react';
import {
  supportChatStore,
  type SupportChatThread,
} from '../utils/supportChatStore';

const ADMIN_PROFILE = {
  name: 'Admin',
  avatar: '/img/AdminChat.png',
};

const CONTEXT_LABELS: Record<string, string> = {
  survey: 'Судалгаа',
  weblink: 'Вэб холбоос',
  advertisement: 'Зар сурталчилгаа',
};

interface AdminContactHubProps {
  className?: string;
}

export default function AdminContactHub({ className = '' }: AdminContactHubProps) {
  const [threads, setThreads] = useState<SupportChatThread[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [replyValue, setReplyValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [threadTab, setThreadTab] = useState<'open' | 'closed'>('open');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Load threads from storage
  useEffect(() => {
    const syncThreads = () => {
      const data = supportChatStore.loadAll();
      setThreads(data);
      
      // Auto-select first thread if none selected
      if (!selectedChatUserId && data.length > 0) {
        setSelectedChatUserId(data[0].userId);
      }
    };

    syncThreads();
    window.addEventListener('support-chat:sync', syncThreads);
    return () => {
      window.removeEventListener('support-chat:sync', syncThreads);
    };
  }, [selectedChatUserId]);

  // Mark as read when thread is selected
  useEffect(() => {
    if (selectedChatUserId) {
      supportChatStore.markAdminRead(selectedChatUserId);
    }
  }, [selectedChatUserId]);

  // Filter threads
  const openThreads = threads.filter((t) => t.status === 'open');
  const closedThreads = threads.filter((t) => t.status === 'closed');
  const displayThreads = threadTab === 'open' ? openThreads : closedThreads;
  const selectedThread = threads.find((t) => t.userId === selectedChatUserId);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread?.messages]);

  const handleSelectChat = (userId: string) => {
    setSelectedChatUserId(userId);
    setIsExpanded(true);
  };

  const handleSendReply = () => {
    const trimmed = replyValue.trim();
    if (!selectedChatUserId || !trimmed || !selectedThread) return;

    supportChatStore.addAdminMessage({
      userId: selectedChatUserId,
      body: trimmed,
      context: selectedThread.contexts[0] || 'survey',
    });

    setReplyValue('');
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }
  };

  const handleCloseThread = (userId: string) => {
    supportChatStore.closeThread(userId);
    if (selectedChatUserId === userId) {
      setSelectedChatUserId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className={`rounded-2xl border border-[var(--color-border-soft)] bg-white/85 shadow-lg dark:border-white/12 dark:bg-white/5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] p-5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">
              Хэрэглэгчийн чат
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-main)]/50 dark:text-white/50">
              Live support
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
            <MessageCircle className="h-3.5 w-3.5" />
            {threads.length}
          </span>
          
          {isExpanded && selectedThread && (
            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-lg p-2 text-[var(--color-text-main)]/50 transition hover:bg-[var(--color-border-soft)]/30 hover:text-[var(--color-text-main)] dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
              title="Minimize"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)]/60 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/5">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
              <Bot className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-main)] dark:text-white">
              Хэрэглэгчийн чат одоогоор байхгүй
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-main)]/60 dark:text-white/50">
              Marketplace хэрэглэгч чат илгээх үед энд автоматаар гарч ирнэ.
            </p>
          </div>
        ) : (
          <>
            {/* Thread tabs */}
            <div className="mb-4 flex gap-2 rounded-2xl bg-blue-500/5 p-1 text-xs font-semibold transition dark:bg-white/5">
              <button
                type="button"
                onClick={() => setThreadTab('open')}
                className={`flex-1 rounded-2xl px-3 py-2 uppercase tracking-[0.2em] transition ${
                  threadTab === 'open'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-blue-600 hover:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-white/10'
                }`}
              >
                Нээлттэй ({openThreads.length})
              </button>
              <button
                type="button"
                onClick={() => setThreadTab('closed')}
                className={`flex-1 rounded-2xl px-3 py-2 uppercase tracking-[0.2em] transition ${
                  threadTab === 'closed'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-blue-600 hover:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-white/10'
                }`}
              >
                Хаасан ({closedThreads.length})
              </button>
            </div>

            {/* Thread list */}
            {!isExpanded || !selectedThread ? (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {displayThreads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)]/60 bg-white/70 p-6 text-center dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-medium text-[var(--color-text-main)]/70 dark:text-white/60">
                      {threadTab === 'open' ? 'Нээлттэй чат одоогоор байхгүй байна.' : 'Хаасан чат одоогоор байхгүй байна.'}
                    </p>
                  </div>
                ) : (
                  displayThreads.map((thread) => {
                    const isSelected = selectedChatUserId === thread.userId;
                    const isUnread = thread.unreadByAdmin;
                    const lastMessage = thread.messages[thread.messages.length - 1];
                    const updatedLabel = new Date(thread.updatedAt).toLocaleString('mn-MN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <button
                        key={thread.userId}
                        type="button"
                        onClick={() => handleSelectChat(thread.userId)}
                        className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 ${
                          isSelected
                            ? 'border-[var(--color-border-main)] bg-blue-500/10 shadow-lg dark:bg-white/10'
                            : 'border-[var(--color-border-soft)] bg-white/80 hover:border-[var(--color-border-main)] dark:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <img
                              src={thread.userAvatar || '/img/human.png'}
                              alt={thread.userName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            {isUnread && (
                              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                !
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-semibold ${isUnread ? 'text-[var(--color-border-main)]' : 'text-[var(--color-text-main)] dark:text-white'}`}>
                                {thread.userName}
                              </p>
                              <span className="text-xs text-[var(--color-text-main)]/50 dark:text-white/40">
                                {updatedLabel}
                              </span>
                            </div>
                            
                            {thread.contexts && thread.contexts.length > 0 && (
                              <span className="mt-1 inline-block rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                                {CONTEXT_LABELS[thread.contexts[0]] || thread.contexts[0]}
                              </span>
                            )}
                            
                            <p className="mt-1 truncate text-xs text-[var(--color-text-main)]/60 dark:text-white/50">
                              {lastMessage?.author === 'admin' ? 'Та: ' : ''}
                              {lastMessage?.body || 'Мессеж байхгүй'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* Expanded chat view */
              <div className="space-y-4">
                {/* Chat header */}
                <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border-soft)] bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-white/10 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedThread.userAvatar || '/img/human.png'}
                      alt={selectedThread.userName}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/30"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">
                        {selectedThread.userName}
                      </p>
                      {selectedThread.contexts && selectedThread.contexts.length > 0 && (
                        <span className="inline-block rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                          {CONTEXT_LABELS[selectedThread.contexts[0]] || selectedThread.contexts[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedThread.status === 'open' && (
                      <button
                        onClick={() => handleCloseThread(selectedThread.userId)}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
                      >
                        Хаах
                      </button>
                    )}
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="rounded-lg p-2 text-[var(--color-text-main)]/50 transition hover:bg-white/50 dark:text-white/50 dark:hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-[var(--color-border-soft)] bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                  {selectedThread.messages.map((message) => {
                    const isAdmin = message.author === 'admin';
                    const timestamp = new Date(message.createdAt).toLocaleTimeString('mn-MN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}
                      >
                        <img
                          src={isAdmin ? ADMIN_PROFILE.avatar : (selectedThread.userAvatar || '/img/human.png')}
                          alt={isAdmin ? ADMIN_PROFILE.name : selectedThread.userName}
                          className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                        />
                        
                        <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                              isAdmin
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'border border-[var(--color-border-soft)] bg-white text-[var(--color-text-main)] dark:border-white/10 dark:bg-white/5 dark:text-white'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.body}
                            </p>
                          </div>
                          <span className="mt-1 text-xs text-[var(--color-text-main)]/40 dark:text-white/30">
                            {timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                {selectedThread.status === 'open' && (
                  <div className="flex gap-2">
                    <textarea
                      ref={chatInputRef}
                      value={replyValue}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Хариулт бичих..."
                      rows={1}
                      className="flex-1 resize-none rounded-2xl border border-[var(--color-border-soft)] bg-white px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={!replyValue.trim()}
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
