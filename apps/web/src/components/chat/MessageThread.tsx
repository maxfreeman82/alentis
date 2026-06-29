'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id:        string;
  authorId:  string;
  content:   string;
  createdAt: string;
  isRead:    boolean;
}

interface Props {
  myProfileId:     string;
  contactId:       string;
  contactName:     string;
  initialMessages: Message[];
}

export default function MessageThread({ myProfileId, contactId, contactName, initialMessages }: Props) {
  const [messages, setMessages]   = useState<Message[]>(initialMessages);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');

    const res = await fetch('/api/chat/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ recipientId: contactId, content }),
    });

    if (res.ok) {
      const { message } = await res.json() as { message: Message };
      setMessages(prev => [...prev, message]);
    }
    setSending(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Grouper par date
  let lastDate = '';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1 px-1 pb-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <p className="text-slate-600 text-sm">Démarrez la conversation avec {contactName}</p>
          </div>
        )}
        {messages.map((m) => {
          const isMe    = m.authorId === myProfileId;
          const dateStr = formatDate(m.createdAt);
          const showDate = dateStr !== lastDate;
          lastDate = dateStr;

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] text-slate-600 bg-bg-card px-3 py-1 rounded-full">{dateStr}</span>
                </div>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-emerald-500/20 text-emerald-100 rounded-br-sm'
                    : 'bg-white/[0.06] text-slate-200 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-0.5 ${isMe ? 'text-emerald-400/60 text-right' : 'text-slate-600'}`}>
                    {formatTime(m.createdAt)}
                    {isMe && m.isRead && ' · Lu'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Formulaire envoi */}
      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-white/[0.04]">
        <input
          type="text"
          placeholder={`Message à ${contactName}…`}
          value={text}
          onChange={e => setText(e.target.value)}
          className="input-field flex-1"
          autoFocus
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0">
          <Send className="w-4 h-4 text-emerald-400" />
        </button>
      </form>
    </div>
  );
}
