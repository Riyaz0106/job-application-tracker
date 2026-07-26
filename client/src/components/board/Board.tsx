import { useEffect, useMemo, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { trpc, type Application } from '../../trpc';
import { STATUS_LABEL, STATUS_ORDER, type Status } from '../../lib/status';
import { columnKeyboardCoordinates } from '../../lib/dndKeyboard';
import { durationMs } from '../../lib/motion';
import { Button } from '../ui/Button';
import { ErrorNote, Skeleton } from '../ui/feedback';
import { useToast } from '../ui/toastContext';
import { FunnelBar } from './FunnelBar';
import { Column } from './Column';
import { CardDragPreview } from './ApplicationCard';
import { ApplicationForm } from '../application/ApplicationForm';
import { ApplicationDetail } from '../application/ApplicationDetail';

type FormMode = { type: 'create' } | { type: 'edit'; app: Application } | null;

export function Board({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => void;
}) {
  const utils = trpc.useUtils();
  const toast = useToast();
  const list = trpc.applications.list.useQuery();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // The card whose move came from a drag. Framer Motion's travel animation is
  // suppressed for it (see below).
  const [travelSuppressedId, setTravelSuppressedId] = useState<string | null>(
    null,
  );

  // Input-specific activation, because the right gesture differs per device:
  //  - Mouse: 8px of travel. A hold-delay on a mouse feels broken, and 8px
  //    cleanly separates "click to open" from "drag to move".
  //  - Touch: 250ms press-and-hold. Required — the board scrolls horizontally
  //    and columns scroll vertically, so an immediate touch-drag would eat both.
  //  - Keyboard: arrows move a whole column at a time (see columnKeyboardCoordinates).
  //
  // MouseSensor, NOT PointerSensor: Pointer Events unify mouse/touch/pen, so a
  // finger fires pointerdown as well as touchstart. PointerSensor would claim the
  // gesture first and apply its 8px distance rule to touch — TouchSensor's delay
  // would never run, and the browser would fire pointercancel the instant panning
  // began, aborting the drag. MouseSensor listens to onMouseDown only, leaving
  // touch entirely to TouchSensor.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
    }),
  );

  // Optimistic status change, shared by the dropdown and drag-and-drop: the card
  // moves immediately, rolls back on failure, and reports either way.
  const updateStatus = trpc.applications.update.useMutation({
    onMutate: async ({ id, data }) => {
      await utils.applications.list.cancel();
      const prev = utils.applications.list.getData();
      const moved = prev?.find((a) => a.id === id);
      utils.applications.list.setData(undefined, (old) =>
        old?.map((a) =>
          a.id === id && data.status ? { ...a, status: data.status } : a,
        ),
      );
      return { prev, moved };
    },
    onSuccess: (_result, { data }) => {
      if (data.status) toast.success(`Moved to ${STATUS_LABEL[data.status]}`);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.applications.list.setData(undefined, ctx.prev);
      toast.error(
        `Couldn’t move ${ctx?.moved?.company ?? 'that application'} — try again.`,
      );
    },
    onSettled: () => void utils.applications.list.invalidate(),
  });

  const changeStatus = (id: string, status: Status) =>
    updateStatus.mutate({ id, data: { status } });

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    if (!over) return; // released outside any column

    const id = String(active.id);
    const target = over.id as Status;
    const from = active.data.current?.status as Status | undefined;
    if (from === target) return; // dropped back where it started — no-op

    // Set in the same batch as the mutation, so the render that moves the card
    // has its Framer Motion travel already disabled.
    setTravelSuppressedId(id);
    changeStatus(id, target);
  }

  // Re-enable travel once the dropped card has painted in its new column. By
  // then there's no layout delta left to animate, so nothing jumps.
  useEffect(() => {
    if (!travelSuppressedId) return;
    const timer = window.setTimeout(
      () => setTravelSuppressedId(null),
      durationMs('fast'),
    );
    return () => window.clearTimeout(timer);
  }, [travelSuppressedId]);

  const grouped = useMemo(() => {
    const byStatus = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, [] as Application[]]),
    ) as Record<Status, Application[]>;
    for (const app of list.data ?? []) byStatus[app.status].push(app);
    return byStatus;
  }, [list.data]);

  const draggingApp = draggingId
    ? list.data?.find((a) => a.id === draggingId)
    : undefined;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center gap-md border-b border-line px-lg py-sm">
        <span className="text-signal" aria-hidden>
          ◆
        </span>
        <span className="font-mono text-sm uppercase tracking-widest text-content">
          Pipeline
        </span>
        <div className="ml-auto flex items-center gap-sm">
          <span className="hidden font-mono text-xs text-muted sm:inline">
            {email}
          </span>
          <Button onClick={() => setFormMode({ type: 'create' })}>+ New</Button>
          <Button variant="ghost" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-lg p-lg">
        {list.isError ? (
          <ErrorNote>
            Couldn’t load your applications. Make sure the server is running,
            then refresh.
          </ErrorNote>
        ) : (
          <>
            <FunnelBar apps={list.data ?? []} />
            {list.isLoading ? (
              <BoardSkeleton />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setDraggingId(null)}
                // Columns scroll, so their rects must be re-measured during a drag.
                measuring={{
                  droppable: { strategy: MeasuringStrategy.Always },
                }}
                accessibility={{
                  announcements: {
                    onDragStart: ({ active }) =>
                      `Picked up ${labelFor(list.data, active.id)}. Use left and right arrows to choose a column, space to drop.`,
                    onDragOver: ({ over }) =>
                      over
                        ? `Over ${STATUS_LABEL[over.id as Status]}.`
                        : undefined,
                    onDragEnd: ({ over }) =>
                      over
                        ? `Moved to ${STATUS_LABEL[over.id as Status]}.`
                        : 'Drag cancelled.',
                    onDragCancel: () => 'Drag cancelled.',
                  },
                }}
              >
                <LayoutGroup>
                  <div className="flex min-h-0 flex-1 gap-md overflow-x-auto pb-sm">
                    {STATUS_ORDER.map((status) => (
                      <Column
                        key={status}
                        status={status}
                        apps={grouped[status]}
                        onOpen={setDetailId}
                        onChangeStatus={changeStatus}
                        dragActive={draggingId !== null}
                        travelSuppressedId={travelSuppressedId}
                      />
                    ))}
                  </div>
                </LayoutGroup>

                {/* dropAnimation null: the overlay must not fly back to the source
                    column, because the card is already re-rendered at the target. */}
                <DragOverlay dropAnimation={null}>
                  {draggingApp ? <CardDragPreview app={draggingApp} /> : null}
                </DragOverlay>
              </DndContext>
            )}
          </>
        )}
      </main>

      <ApplicationForm
        open={formMode !== null}
        application={formMode?.type === 'edit' ? formMode.app : undefined}
        onClose={() => setFormMode(null)}
      />
      <ApplicationDetail
        id={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(app) => {
          setDetailId(null);
          setFormMode({ type: 'edit', app });
        }}
      />
    </div>
  );
}

function labelFor(apps: Application[] | undefined, id: string | number) {
  const app = apps?.find((a) => a.id === String(id));
  return app ? `${app.company}, ${app.role}` : 'application';
}

function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-md overflow-hidden">
      {STATUS_ORDER.map((s) => (
        <div
          key={s}
          className="flex w-72 shrink-0 flex-col gap-sm rounded-card border border-line bg-surface p-sm"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
