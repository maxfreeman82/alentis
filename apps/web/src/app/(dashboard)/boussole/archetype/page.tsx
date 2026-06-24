import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ArrowRight, Compass, Zap, Target } from 'lucide-react';
import { AIInsightCard, SectionHeader } from '@/components/shared';
import { ARCHETYPE_COLORS, ARCHETYPE_LABELS, ARCHETYPE_ENERGY } from '@teranga/scoring';
import type { Archetype } from '@teranga/types';
import { EnergyBar } from '@/components/shared';
import type { EnergyFamily } from '@teranga/scoring';

// Descriptions narratives par archétype
const ARCHETYPE_DESCRIPTIONS: Record<Archetype, { tagline: string; description: string; strengths: string[]; challenges: string[] }> = {
  CONQUERANTE: {
    tagline: 'La conquérante — Croissance agressive, terrain, victoire',
    description: 'Votre organisation est animée d\'une énergie de conquête. Vous valorisez la vitesse, la compétitivité et l\'expansion territoriale. Vos équipes sont mobilisées autour de cibles commerciales ambitieuses et d\'une culture de la performance.',
    strengths: ['Réactivité et agilité commerciale', 'Culture résultats fortement ancrée', 'Capacité à saisir les opportunités rapidement', 'Équipes galvanisées par les défis'],
    challenges: ['Risque d\'épuisement des équipes', 'Vision long terme parfois sacrifiée', 'Difficultés à consolider les acquis', 'Culture potentiellement individualiste'],
  },
  INNOVATRICE: {
    tagline: 'L\'innovatrice — Création, disruption, avant-garde',
    description: 'Votre organisation pousse perpétuellement vers le nouveau. Vous valorisez la créativité, l\'expérimentation et la différenciation. Vos équipes ont besoin d\'autonomie et d\'espace pour imaginer des solutions qui n\'existent pas encore.',
    strengths: ['Différenciation forte sur le marché', 'Attractivité des talents créatifs', 'Résilience face à la disruption externe', 'Culture de l\'apprentissage continu'],
    challenges: ['Exécution et passage à l\'échelle difficiles', 'Risque de dispersion des efforts', 'Rentabilité court terme sous tension', 'Besoin de profils d\'accomplisseurs pour équilibrer'],
  },
  CONSOLIDATRICE: {
    tagline: 'La consolidatrice — Excellence opérationnelle, fiabilité, solidité',
    description: 'Votre organisation privilégie la solidité sur la vitesse. Vous valorisez les process, la qualité et la maîtrise des risques. Vos équipes évoluent dans un cadre structuré où la rigueur est une valeur cardinale.',
    strengths: ['Fiabilité et prévisibilité opérationnelle', 'Marges et rentabilité optimisées', 'Confiance forte des clients et partenaires', 'Résistance aux crises conjoncturelles'],
    challenges: ['Lenteur d\'adaptation aux changements rapides', 'Risque d\'innovation insuffisante', 'Attraction difficile des profils très créatifs', 'Bureaucratie potentielle'],
  },
  TRANSFORMATRICE: {
    tagline: 'La transformatrice — Impact, sens, changement systémique',
    description: 'Votre organisation est animée d\'une mission qui dépasse le profit. Vous cherchez à transformer votre écosystème. Vos équipes sont fédérées par un purpose fort et une vision qui donne du sens à leur engagement quotidien.',
    strengths: ['Engagement et fidélité des équipes exceptionnels', 'Attractivité des talents à impact', 'Légitimité et confiance des parties prenantes', 'Vision long terme mobilisatrice'],
    challenges: ['Risque de prise de décision trop lente par consensus', 'Tension avec les objectifs financiers court terme', 'Difficulté à recruter des profils purement commerciaux', 'Besoin de résultats tangibles rapidement'],
  },
  PERENNE: {
    tagline: 'La pérenne — Transmission, ancrage, héritage',
    description: 'Votre organisation se construit sur le temps long. Vous pensez en générations, non en trimestres. Vos équipes évoluent dans une culture de la transmission et du respect des fondamentaux qui ont fait le succès de votre entreprise.',
    strengths: ['Stabilité et continuité dans la durée', 'Confiance profonde des clients historiques', 'Culture identitaire forte et différenciante', 'Résilience face aux modes et tendances passagères'],
    challenges: ['Risque d\'inertie face aux disruptions', 'Difficulté à attirer de jeunes talents', 'Innovation perçue comme menaçante', 'Croissance organique limitée'],
  },
};

interface PageProps {
  searchParams: Promise<{ archetype?: string }>;
}

export default async function ArchetypePage({ searchParams }: PageProps) {
  await withAuth({ ensureSignedIn: true });

  const params = await searchParams;
  const archetype = (params.archetype ?? 'INNOVATRICE') as Archetype;
  const color = ARCHETYPE_COLORS[archetype];
  const label = ARCHETYPE_LABELS[archetype];
  const desc = ARCHETYPE_DESCRIPTIONS[archetype];
  const energyMix = ARCHETYPE_ENERGY[archetype];
  const families = Object.keys(energyMix) as EnergyFamily[];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        tag="BOUSSOLE STRATÉGIQUE"
        tagColor="text-violet"
        title="Votre archétype stratégique"
        subtitle="Résultat de l'analyse de vision par l'IA Teranga Align"
      />

      {/* Carte archétype principale */}
      <div
        className="card border-l-4 p-6"
        style={{ borderLeftColor: color, backgroundColor: `${color}08` }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}
          >
            <Compass size={28} style={{ color }} />
          </div>
          <div>
            <p className="section-tag mb-1" style={{ color }}>ARCHÉTYPE IDENTIFIÉ</p>
            <h2 className="font-display text-3xl text-white mb-1">{label}</h2>
            <p className="text-slate-400 text-sm">{desc.tagline}</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mt-4 leading-relaxed">{desc.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Forces */}
        <div className="card border-l-4 border-l-emerald">
          <div className="flex items-center gap-2 mb-3">
            <span className="section-tag text-emerald">FORCES</span>
          </div>
          <ul className="space-y-2">
            {desc.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-emerald mt-0.5">→</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Défis */}
        <div className="card border-l-4 border-l-amber">
          <div className="flex items-center gap-2 mb-3">
            <span className="section-tag text-amber">POINTS DE VIGILANCE</span>
          </div>
          <ul className="space-y-2">
            {desc.challenges.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber mt-0.5">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mix énergétique requis */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-violet" />
          <span className="section-tag text-violet">MIX ÉNERGÉTIQUE IDÉAL</span>
        </div>
        <p className="text-slate-400 text-xs mb-4">
          Pour une organisation de type {label}, voici la répartition énergétique cible de vos équipes.
          L&apos;écart avec votre mix actuel constitue votre <strong className="text-violet">Energy Gap</strong>.
        </p>
        <div className="space-y-3">
          {families.map((family) => (
            <EnergyBar
              key={family}
              family={family}
              value={energyMix[family] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* Analyse IA */}
      <AIInsightCard
        content={`Votre organisation présente un profil ${label} marqué. L'alignement stratégique optimal nécessite de renforcer les profils ${families[0] ?? ''} (${families[0] != null ? energyMix[families[0]] : 0}% de votre effectif idéal) et de veiller à l'équilibre avec les Régulateurs pour éviter la sur-accélération. La prochaine étape consiste à définir vos OKR 2026 en cohérence avec cet archétype.`}
        title="Analyse IA — Teranga Align"
      />

      {/* Actions suivantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
        <Link
          href="/boussole/objectifs"
          className="card hover:border-violet/30 group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-violet" />
              <span className="section-tag text-violet">ÉTAPE SUIVANTE</span>
            </div>
            <p className="text-white font-medium text-sm">Définir vos OKR 2026</p>
            <p className="text-slate-400 text-xs mt-0.5">Cascade des objectifs alignés sur l&apos;archétype</p>
          </div>
          <ArrowRight size={16} className="text-slate-500 group-hover:text-violet transition-colors" />
        </Link>

        <Link
          href="/boussole/correlation"
          className="card hover:border-sky/30 group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-sky" />
              <span className="section-tag text-sky">ANALYSE AVANCÉE</span>
            </div>
            <p className="text-white font-medium text-sm">Voir les gaps énergétiques</p>
            <p className="text-slate-400 text-xs mt-0.5">Comparer le mix actuel vs requis</p>
          </div>
          <ArrowRight size={16} className="text-slate-500 group-hover:text-sky transition-colors" />
        </Link>
      </div>
    </div>
  );
}
