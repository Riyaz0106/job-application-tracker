import {
  forwardRef,
  useEffect,
  useRef,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type TouchEventHandler,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { MatchRing } from '../ui/feedback';
import { Select } from '../ui/fields';
import { formatDateShort } from '../../lib/format';
import { STATUS_ORDER, STATUS_LABEL, type Status } from '../../lib/status';
import { CARD_TRAVEL, durationMs, tween } from '../../lib/motion';
import type { Application } from '../../trpc';

// How long after a drop a click is treated as the tail of that drag rather than
// a fresh tap. Derived from the motion tokens, not a magic number.
const CLICK_AFTER_DRAG_MS = durationMs('slow');

// Card content, with no motion and no drag wiring — shared by the real card and
// the drag overlay so the two are pixel-identical.
function CardFace({ app }: { app: Application }) {
  return (
    <>
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{app.company}</p>
          <p className="truncate text-sm text-muted">{app.role}</p>
        </div>
        {app.matchScore != null && <MatchRing score={app.matchScore} />}
      </div>
      <p className="mt-xs font-mono text-xs text-muted">
        {formatDateShort(app.appliedDate)}
      </p>
    </>
  );
}

// What follows the pointer/keyboard during a drag. Rendered by <DragOverlay> in a
// portal, so it needs its own width. Deliberately NOT a motion component and
// carries no layoutId — otherwise Framer Motion would try to animate between the
// overlay and the real card. The status row is a static facsimile so the overlay
// keeps the real card's exact height (no interactive duplicates in the portal).
export function CardDragPreview({ app }: { app: Application }) {
  return (
    <div className="card-lift w-72 rounded-card border border-signal/60 bg-surface-2 p-sm shadow-lift">
      <CardFace app={app} />
      <div className="mt-sm min-h-11 rounded-control border border-line bg-surface px-sm py-2 text-xs text-content">
        {STATUS_LABEL[app.status]}
      </div>
    </div>
  );
}

export const ApplicationCard = forwardRef<
  HTMLLIElement,
  {
    app: Application;
    onOpen: (id: string) => void;
    onChangeStatus: (id: string, status: Status) => void;
    // True for the one card whose status change came from a drag. The drag
    // gesture already showed the movement, so the Framer Motion travel is
    // suppressed for that commit (see Board.tsx) — exactly one system animates.
    suppressTravel?: boolean;
  }
>(function ApplicationCard(
  { app, onOpen, onChangeStatus, suppressTravel = false },
  ref,
) {
  const reduce = useReducedMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      id: app.id,
      data: { status: app.status },
    });

  // Split the activators by device, and attach each explicitly. Mouse/touch drag
  // can start anywhere on the card body; keyboard drag lives on a dedicated
  // handle. If the keyboard activator were on the body button, Space/Enter would
  // start a drag instead of opening the detail view — taking the card's primary
  // action away from keyboard users. (dnd-kit types these as bare `Function`.)
  const startMouseDrag = listeners?.onMouseDown as
    MouseEventHandler<HTMLElement> | undefined;
  const startTouchDrag = listeners?.onTouchStart as
    TouchEventHandler<HTMLElement> | undefined;
  const startKeyboardDrag = listeners?.onKeyDown as
    KeyboardEventHandler<HTMLElement> | undefined;

  // A drag ends in a click too, so record when one finished and swallow clicks
  // that land inside that window. A timestamp rather than a sticky flag: after a
  // touch drag the browser can emit emulated mouse events, which would reset a
  // flag and let the detail view open on drop.
  const dragEndedAt = useRef(0);
  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true;
    } else if (wasDragging.current) {
      wasDragging.current = false;
      dragEndedAt.current = Date.now();
    }
  }, [isDragging]);

  const animate = !reduce && !suppressTravel;

  return (
    <motion.li
      ref={ref}
      layout={animate}
      // Dropping layoutId as well as layout: the shared-layout animation is what
      // makes a card "travel" between columns, and it must not run on a drop.
      layoutId={animate ? app.id : undefined}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={reduce ? {} : { opacity: 1, scale: 1 }}
      exit={reduce ? {} : { opacity: 0, scale: 0.96 }}
      transition={{ layout: CARD_TRAVEL, ...tween('fast') }}
      className="list-none"
    >
      <div
        ref={setNodeRef}
        // The real card never receives dnd-kit's follow-the-pointer transform —
        // the overlay does. That's what keeps dnd-kit and Framer Motion from
        // fighting over `transform` on the same node.
        className={`rounded-card border border-line bg-surface-2 p-sm transition-[border-color,opacity] duration-fast hover:border-signal/40 ${
          isDragging ? 'opacity-dragging' : ''
        }`}
      >
        <div className="flex items-start gap-2xs">
          {/* Opens the detail view; also the pointer/touch drag surface. */}
          <button
            type="button"
            onClick={() => {
              // Swallow the click that follows a drop.
              if (Date.now() - dragEndedAt.current < CLICK_AFTER_DRAG_MS)
                return;
              onOpen(app.id);
            }}
            onMouseDown={startMouseDrag}
            onTouchStart={startTouchDrag}
            // touch-action: manipulation keeps panning (so the board and columns
            // still scroll from anywhere on the card) while dropping the
            // double-tap-zoom gesture, so the press-and-hold reaches dnd-kit
            // cleanly. `none` would kill scrolling; the default `auto` lets the
            // browser claim the gesture before the 250ms delay elapses.
            className="min-w-0 flex-1 touch-manipulation text-left transition-transform duration-fast ease-out hover:-translate-y-0.5"
            aria-label={`Open ${app.company} — ${app.role}`}
          >
            <CardFace app={app} />
          </button>

          {/* Explicit drag handle. Space/Enter picks the card up, ←/→ move it a
              column at a time, Space/Enter drops, Esc cancels. It also accepts
              mouse and touch drags so the grab cursor isn't a lie — touch-none
              here because a deliberate handle shouldn't scroll the board. */}
          <span
            {...attributes}
            onKeyDown={startKeyboardDrag}
            onMouseDown={startMouseDrag}
            onTouchStart={startTouchDrag}
            ref={setActivatorNodeRef}
            aria-label={`Move ${app.company}. Press space, then use left and right arrows.`}
            className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted transition-colors duration-fast hover:text-content active:cursor-grabbing"
          >
            <span aria-hidden className="font-mono text-xs leading-none">
              ⠿
            </span>
          </span>
        </div>

        {/* Always-available accessible path — unchanged from Phase 5. Lives
            outside the drag surfaces, so using it never starts a drag. */}
        <div className="mt-sm">
          <Select
            aria-label={`Move ${app.company} to another status`}
            value={app.status}
            onChange={(e) => onChangeStatus(app.id, e.target.value as Status)}
            className="text-xs"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </motion.li>
  );
});
