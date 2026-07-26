import { AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { ApplicationCard } from './ApplicationCard';
import { statusColor, STATUS_LABEL, type Status } from '../../lib/status';
import type { Application } from '../../trpc';

// Invitations to act — never "No data".
const EMPTY_COPY: Record<Status, string> = {
  DRAFTING: 'Nothing in drafts. Start a new application.',
  APPLIED: 'No live applications. Move one here when you apply.',
  PHONE_SCREEN: 'No phone screens booked yet.',
  TECHNICAL: 'No technicals scheduled yet.',
  PANEL: 'No panels lined up.',
  OFFER: 'No offers yet — keep pushing.',
  REJECTED: 'Nothing here. Onward.',
  ACCEPTED: 'No acceptance yet. This is the goal.',
};

export function Column({
  status,
  apps,
  onOpen,
  onChangeStatus,
  dragActive,
  travelSuppressedId,
}: {
  status: Status;
  apps: Application[];
  onOpen: (id: string) => void;
  onChangeStatus: (id: string, status: Status) => void;
  dragActive: boolean;
  travelSuppressedId: string | null;
}) {
  // The whole column is the drop target — dropping anywhere in it sets that status.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  // Drop affordance: while a drag is in flight every column reads as a target
  // (brighter border), and the one under the pointer is picked out in Signal.
  const dropState = isOver
    ? 'border-signal bg-signal/5'
    : dragActive
      ? 'border-line/80 border-dashed'
      : 'border-line';

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABEL[status]}, ${apps.length} ${apps.length === 1 ? 'application' : 'applications'}`}
      className={`flex min-h-0 w-72 shrink-0 flex-col rounded-card border bg-surface transition-colors duration-fast ${dropState}`}
    >
      <header className="flex items-center gap-xs border-b border-line px-md py-sm">
        <span
          className="size-2 rounded-pill"
          style={{ backgroundColor: statusColor(status) }}
          aria-hidden
        />
        <h2 className="font-mono text-xs uppercase tracking-wide text-content">
          {STATUS_LABEL[status]}
        </h2>
        <span className="ml-auto font-mono text-xs text-muted">
          {apps.length}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-sm">
        {apps.length === 0 ? (
          <div
            className={`flex min-h-24 flex-col items-center justify-center rounded-control border border-dashed p-md text-center transition-colors duration-fast ${
              isOver ? 'border-signal/60' : 'border-line/70'
            }`}
          >
            <p className="text-xs leading-relaxed text-muted">
              {isOver ? `Drop to move here` : EMPTY_COPY[status]}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-sm">
            <AnimatePresence initial={false} mode="popLayout">
              {apps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onOpen={onOpen}
                  onChangeStatus={onChangeStatus}
                  suppressTravel={travelSuppressedId === app.id}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
