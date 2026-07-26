import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MatchRing } from '../ui/feedback';
import { Select } from '../ui/fields';
import { formatDateShort } from '../../lib/format';
import { STATUS_ORDER, STATUS_LABEL, type Status } from '../../lib/status';
import { CARD_TRAVEL, tween } from '../../lib/motion';
import type { Application } from '../../trpc';

export const ApplicationCard = forwardRef<
  HTMLLIElement,
  {
    app: Application;
    onOpen: (id: string) => void;
    onChangeStatus: (id: string, status: Status) => void;
  }
>(function ApplicationCard({ app, onOpen, onChangeStatus }, ref) {
  const reduce = useReducedMotion();

  return (
    <motion.li
      ref={ref}
      layout={!reduce}
      layoutId={app.id}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={reduce ? {} : { opacity: 1, scale: 1 }}
      exit={reduce ? {} : { opacity: 0, scale: 0.96 }}
      transition={{ layout: CARD_TRAVEL, ...tween('fast') }}
      className="list-none"
    >
      <div className="rounded-card border border-line bg-surface-2 p-sm transition-[border-color] duration-fast hover:border-signal/40">
        {/* Opens the detail view. Contains only non-interactive content. */}
        <button
          type="button"
          onClick={() => onOpen(app.id)}
          className="block w-full text-left transition-transform duration-fast ease-out hover:-translate-y-0.5"
          aria-label={`Open ${app.company} — ${app.role}`}
        >
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
        </button>

        {/* Move control — sibling of the open button (no nested interactives). */}
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
