'use client';

import { FileText, FileCheck, FileX, File, ShieldCheck, GraduationCap, Heart, Briefcase, User, Clock, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Doc {
  id:           string;
  type:         string;
  title:        string;
  expiry_date:  string | null;
  status:       string;
  file_url?:    string | null;
}

interface DocumentGalleryProps {
  docs:        Doc[];
  emptyLabel?: string;
  onAdd?:      () => void;
}

const DOC_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>, color: string, bg: string, label: string }> = {
  contrat:      { icon: Briefcase,    color: 'text-sky-600',    bg: 'bg-sky-50',    label: 'Contrat' },
  identite:     { icon: User,         color: 'text-violet-600', bg: 'bg-violet-50', label: 'Identité' },
  diplome:      { icon: GraduationCap,color: 'text-emerald-600',bg: 'bg-emerald-50',label: 'Diplôme' },
  medical:      { icon: Heart,        color: 'text-rose-600',   bg: 'bg-rose-50',   label: 'Médical' },
  conformite:   { icon: ShieldCheck,  color: 'text-orange-600', bg: 'bg-orange-50', label: 'Conformité' },
  evaluation:   { icon: FileCheck,    color: 'text-cyan-600',   bg: 'bg-cyan-50',   label: 'Évaluation' },
  autre:        { icon: File,         color: 'text-slate-500',  bg: 'bg-slate-100', label: 'Autre' },
};

function getExpiryStatus(expiryDate: string | null): { label: string; color: string; bg: string; urgent: boolean } {
  if (!expiryDate) return { label: 'Sans expiration', color: 'text-slate-500', bg: 'bg-slate-100', urgent: false };

  const now      = new Date();
  const expiry   = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0)   return { label: 'Expiré',             color: 'text-rose-600',   bg: 'bg-rose-50',   urgent: true };
  if (diffDays <= 30) return { label: `Expire dans ${diffDays}j`, color: 'text-amber-600', bg: 'bg-amber-50', urgent: true };
  return { label: `Valide · ${new Date(expiryDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}`, color: 'text-emerald-600', bg: 'bg-emerald-50', urgent: false };
}

export function DocumentGallery({ docs, emptyLabel = 'Aucun document enregistré.', onAdd }: DocumentGalleryProps) {
  if (docs.length === 0 && !onAdd) {
    return <p className="text-slate-400 text-sm">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {docs.map(doc => {
        const typeConf = DOC_TYPE_CONFIG[doc.type] ?? DOC_TYPE_CONFIG.autre!;
        const Icon     = typeConf.icon;
        const expiry   = getExpiryStatus(doc.expiry_date);

        return (
          <div
            key={doc.id}
            className={cn(
              'relative group flex flex-col gap-3 rounded-xl border p-3.5 transition-all duration-200',
              'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md',
              expiry.urgent && 'border-amber-200 bg-amber-50/40',
            )}
          >
            {/* Icon + type */}
            <div className="flex items-start justify-between">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', typeConf.bg)}>
                <Icon size={18} className={typeConf.color} />
              </div>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100"
                  title="Ouvrir le fichier"
                >
                  <ExternalLink size={13} className="text-slate-400" />
                </a>
              )}
            </div>

            {/* Title + label */}
            <div className="space-y-0.5 flex-1 min-w-0">
              <p className="text-slate-800 text-xs font-semibold leading-snug line-clamp-2">{doc.title}</p>
              <p className="text-slate-400 text-[10px]">{typeConf.label}</p>
            </div>

            {/* Expiry badge */}
            <div className="flex items-center gap-1">
              {expiry.urgent && <AlertTriangle size={10} className="text-amber-500 flex-shrink-0" />}
              <span className={cn('text-[10px] font-medium', expiry.color)}>{expiry.label}</span>
            </div>

            {/* Status chip */}
            {doc.status && doc.status !== 'active' && (
              <div className="absolute top-2 right-2">
                {doc.status === 'expired'   && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">EXPIRÉ</span>}
                {doc.status === 'pending'   && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">EN ATTENTE</span>}
                {doc.status === 'rejected'  && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">REFUSÉ</span>}
              </div>
            )}
          </div>
        );
      })}

      {/* Add card */}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 transition-all duration-200 p-3.5 min-h-[110px] group"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
            <FileText size={18} className="text-slate-400 group-hover:text-violet-500 transition-colors" />
          </div>
          <p className="text-slate-400 group-hover:text-violet-500 text-[10px] font-medium transition-colors">Ajouter</p>
        </button>
      )}
    </div>
  );
}
