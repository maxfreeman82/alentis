'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

export type PipelineStage = 'new' | 'screening' | 'interview' | 'assessment' | 'offer' | 'hired';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  score: number;
  stage: PipelineStage;
  avatar_letter: string;
  energy: string;
  departure_risk: number;
}

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'new',        label: 'Nouveaux',    color: '#64748B' },
  { id: 'screening',  label: 'Screening',   color: '#0EA5E9' },
  { id: 'interview',  label: 'Entretien',   color: '#F97316' },
  { id: 'assessment', label: 'Assessment',  color: '#8B5CF6' },
  { id: 'offer',      label: 'Offre',       color: '#F59E0B' },
  { id: 'hired',      label: 'Embauché',    color: '#10B981' },
];

interface PipelineBoardProps {
  candidates: Candidate[];
}

export function PipelineBoard({ candidates: initial }: PipelineBoardProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStage = useCallback(
    (stage: PipelineStage) => candidates.filter((c) => c.stage === stage),
    [candidates]
  );

  const activeCandidate = candidates.find((c) => c.id === activeId) ?? null;

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeCandidate = candidates.find((c) => c.id === active.id);
    if (!activeCandidate) return;

    // Détermine si on est sur une colonne ou une carte
    const overId = over.id as string;
    const overStage = STAGES.find((s) => s.id === overId);

    if (overStage && activeCandidate.stage !== overStage.id) {
      setCandidates((prev) =>
        prev.map((c) => c.id === activeCandidate.id ? { ...c, stage: overStage.id } : c)
      );
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const activeCandidate = candidates.find((c) => c.id === active.id);
    const overCandidate  = candidates.find((c) => c.id === over.id);

    if (!activeCandidate) return;

    // Réordonner dans la même colonne
    if (overCandidate && activeCandidate.stage === overCandidate.stage && activeCandidate.id !== overCandidate.id) {
      setCandidates((prev) => {
        const stageItems = prev.filter((c) => c.stage === activeCandidate.stage);
        const others     = prev.filter((c) => c.stage !== activeCandidate.stage);
        const oldIdx = stageItems.findIndex((c) => c.id === active.id);
        const newIdx = stageItems.findIndex((c) => c.id === over.id);
        return [...others, ...arrayMove(stageItems, oldIdx, newIdx)];
      });
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => {
            const stageCandidates = byStage(stage.id);
            return (
              <SortableContext
                key={stage.id}
                id={stage.id}
                items={stageCandidates.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <KanbanColumn
                  id={stage.id}
                  label={stage.label}
                  color={stage.color}
                  count={stageCandidates.length}
                >
                  {stageCandidates.map((candidate) => (
                    <KanbanCard key={candidate.id} candidate={candidate} />
                  ))}
                </KanbanColumn>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {activeCandidate && (
            <KanbanCard candidate={activeCandidate} isOverlay />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
