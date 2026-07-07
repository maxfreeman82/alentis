import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import EventForm from '@/components/calendar/EventForm';

const EVENT_TYPE_CFG = {
  reunion:      { label: 'Réunion',      color: '#0EA5E9' },
  formation:    { label: 'Formation',    color: '#8B5CF6' },
  conge:        { label: 'Congé',        color: '#10B981' },
  echeance:     { label: 'Échéance',     color: '#F43F5E' },
  anniversaire: { label: 'Anniversaire', color: '#F59E0B' },
  autre:        { label: 'Autre',        color: '#64748B' },
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const sp        = await searchParams;
  const now       = new Date();
  const month     = parseInt(sp.month ?? String(now.getMonth() + 1));
  const year      = parseInt(sp.year  ?? String(now.getFullYear()));

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay   = new Date(year, month, 0).getDate();
  const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const { supabase, organizationId, role } = ctx;
  const isAdmin = ['org_admin', 'org_hr', 'org_manager'].includes(role);

  const [eventsRes, leavesRes, trainingsRes] = await Promise.all([
    supabase.from('calendar_events')
      .select('id, title, event_type, start_date, end_date, all_day, color, description')
      .eq('organization_id', organizationId)
      .gte('start_date', startDate)
      .lte('start_date', endDate),
    supabase.from('leave_requests')
      .select('id, type, start_date, end_date, status')
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('start_date', endDate),
    supabase.from('trainings')
      .select('id, title, start_date, end_date')
      .eq('organization_id', organizationId)
      .neq('status', 'cancelled')
      .gte('start_date', startDate)
      .lte('start_date', endDate),
  ]);

  // Agrégation de tous les événements
  type CalEvent = { id: string; title: string; start: string; end?: string | null; color: string; type: string };

  const allEvents: CalEvent[] = [
    ...(eventsRes.data ?? []).map(e => ({
      id:    e.id,
      title: e.title,
      start: e.start_date,
      end:   e.end_date,
      color: e.color ?? EVENT_TYPE_CFG[e.event_type as keyof typeof EVENT_TYPE_CFG]?.color ?? '#64748B',
      type:  e.event_type,
    })),
    ...(leavesRes.data ?? []).map(l => ({
      id:    l.id,
      title: `Congé — ${l.type}`,
      start: l.start_date,
      end:   l.end_date,
      color: '#10B981',
      type:  'conge',
    })),
    ...(trainingsRes.data ?? []).filter(t => t.start_date != null).map(t => ({
      id:    t.id,
      title: t.title,
      start: t.start_date!,
      end:   t.end_date,
      color: '#8B5CF6',
      type:  'formation',
    })),
  ];

  // Mois précédent / suivant
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="CALENDRIER"
        title="Planning d'équipe"
        subtitle="Congés, formations, réunions et échéances"
        action={isAdmin ? <EventForm /> : null}
      />

      {/* Navigation mois */}
      <div className="card flex items-center justify-between py-3">
        <Link href={`/calendar?month=${prevMonth}&year=${prevYear}`}
          className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h2 className="font-display text-slate-900 text-base capitalize">{monthLabel}</h2>
        <Link href={`/calendar?month=${nextMonth}&year=${nextYear}`}
          className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_TYPE_CFG).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
            <span className="text-slate-500 text-xs">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Grille calendrier */}
      <CalendarGrid month={month} year={year} events={allEvents} />

      {/* Liste événements du mois */}
      <div className="card space-y-3">
        <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          Événements du mois ({allEvents.length})
        </h3>
        {allEvents.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">Aucun événement ce mois-ci.</p>
        ) : (
          <div className="space-y-2">
            {allEvents.sort((a, b) => a.start.localeCompare(b.start)).map(ev => (
              <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-slate-200 last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-sm font-medium">{ev.title}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(ev.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {ev.end && ev.end !== ev.start && ` → ${new Date(ev.end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${ev.color}15`, color: ev.color }}>
                  {EVENT_TYPE_CFG[ev.type as keyof typeof EVENT_TYPE_CFG]?.label ?? ev.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
