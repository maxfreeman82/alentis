import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Building2, MapPin, ArrowLeft, TrendingUp, FileText } from 'lucide-react';
import { ApplyForm } from './ApplyForm';

interface Props {
  params: Promise<{ jobId: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { jobId } = await params;
  const admin = createAdminClient();

  const { data: job } = await admin
    .from('jobs')
    .select('id, title, description, organization_id, ias_impact, status, created_at')
    .eq('id', jobId)
    .maybeSingle();

  if (!job || job.status === 'archived') notFound();

  const { data: org } = await admin
    .from('organizations')
    .select('name, sector, country, city, archetype, cert_level')
    .eq('id', job.organization_id)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/candidats"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
      >
        <ArrowLeft size={14} /> Toutes les offres
      </Link>

      {/* En-tête poste */}
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center text-lg font-bold text-emerald flex-shrink-0">
            {org?.name?.[0] ?? '?'}
          </div>
          <div>
            <h1 className="font-display text-2xl text-white font-bold">{job.title}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {org && (
                <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Building2 size={13} /> {org.name}
                </span>
              )}
              {org?.city && (
                <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                  <MapPin size={13} /> {org.city}, {org.country}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {org?.sector && (
            <span className="text-xs px-3 py-1 rounded-full bg-emerald/10 text-emerald border border-emerald/20">
              {org.sector}
            </span>
          )}
          {job.ias_impact && (
            <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-orange/10 text-orange border border-orange/20">
              <TrendingUp size={11} /> Impact stratégique {job.ias_impact}/10
            </span>
          )}
          {job.status === 'open' && (
            <span className="text-xs px-3 py-1 rounded-full bg-sky/10 text-sky border border-sky/20">
              Poste ouvert
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <FileText size={14} />
            Description du poste
          </div>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {/* Formulaire candidature */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <h2 className="font-display text-white font-semibold text-base">Postuler maintenant</h2>
        <p className="text-slate-500 text-xs">
          Votre candidature sera transmise directement à l&apos;équipe RH de {org?.name ?? 'l&apos;entreprise'}.
        </p>
        <ApplyForm
          jobId={job.id}
          jobTitle={job.title}
          orgName={org?.name ?? ''}
        />
      </div>
    </div>
  );
}
