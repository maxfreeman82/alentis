'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Hash } from 'lucide-react';

const QUICK_TAGS = ['rh', 'recrutement', 'leadership', 'formation', 'bien_etre', 'tech'];

interface Props { profileId: string; initials: string; }

export default function PostComposer({ profileId, initials }: Props) {
  const router = useRouter();
  const [content, setContent]   = useState('');
  const [tags, setTags]         = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  function toggleTag(t: string) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    await fetch('/api/community/post', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: content.trim(), tags }),
    });
    setContent('');
    setTags([]);
    setExpanded(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs font-bold">
          {initials}
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Partagez une réflexion, une ressource, une question RH…"
          rows={expanded ? 4 : 2}
          className="flex-1 bg-bg rounded-xl px-3 py-2.5 text-slate-600 text-sm resize-none border border-slate-200 focus:border-emerald-500/30 focus:outline-none placeholder-slate-400 transition-all"
        />
      </div>

      {expanded && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap pl-12">
            <Hash className="w-3 h-3 text-slate-600" />
            {QUICK_TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)}
                className={`text-[11px] px-2 py-0.5 rounded-full transition-all ${
                  tags.includes(t)
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-50 text-slate-500 hover:text-slate-600'
                }`}>
                #{t}
              </button>
            ))}
          </div>
          <div className="flex justify-end pl-12">
            <button onClick={submit} disabled={!content.trim() || loading}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-slate-900 rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-all">
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Publication…' : 'Publier'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
