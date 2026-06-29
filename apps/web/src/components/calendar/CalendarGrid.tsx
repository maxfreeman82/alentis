'use client';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface CalEvent {
  id:    string;
  title: string;
  start: string;
  end?:  string | null;
  color: string;
  type:  string;
}

interface Props {
  month:  number;
  year:   number;
  events: CalEvent[];
}

export default function CalendarGrid({ month, year, events }: Props) {
  const firstDay  = new Date(year, month - 1, 1);
  const lastDay   = new Date(year, month, 0).getDate();
  // Lundi = 0, Dimanche = 6
  const startDow  = (firstDay.getDay() + 6) % 7;
  const today     = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const eventsByDay = new Map<number, CalEvent[]>();
  for (const ev of events) {
    const d = parseInt(ev.start.split('-')[2] ?? '0');
    if (!eventsByDay.has(d)) eventsByDay.set(d, []);
    eventsByDay.get(d)!.push(ev);
  }

  const cells: (number | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  // Remplir pour avoir un multiple de 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card p-0 overflow-hidden">
      {/* En-têtes jours */}
      <div className="grid grid-cols-7 border-b border-white/[0.04]">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const isToday   = isThisMonth && day === today.getDate();
          const dayEvents = day ? (eventsByDay.get(day) ?? []) : [];

          return (
            <div key={idx}
              className={`min-h-[80px] p-1 border-b border-r border-white/[0.04] last:border-r-0 ${
                day ? '' : 'bg-white/[0.01]'
              } ${isToday ? 'bg-emerald-500/5' : ''}`}>
              {day && (
                <>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 ${
                    isToday ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div key={ev.id}
                        className="truncate text-[10px] px-1 py-0.5 rounded"
                        style={{ backgroundColor: `${ev.color}20`, color: ev.color }}
                        title={ev.title}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-slate-600 pl-1">
                        +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
