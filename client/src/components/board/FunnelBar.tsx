import {
  statusColor,
  STATUS_LABEL,
  STATUS_ORDER,
  TERMINAL_STATUSES,
  type Status,
} from '../../lib/status';
import type { Application } from '../../trpc';

// THE signature element — the one saturated, bold piece: your whole search as a
// single readout. Counts are derived here from the applications.list data (no
// separate API call).
export function FunnelBar({ apps }: { apps: Application[] }) {
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: apps.filter((a) => a.status === status).length,
  }));
  const total = apps.length;
  const active = apps.filter(
    (a) => !TERMINAL_STATUSES.includes(a.status),
  ).length;
  const byStatus = (s: Status) =>
    counts.find((c) => c.status === s)?.count ?? 0;

  return (
    <section
      aria-label="Pipeline overview"
      className="rounded-card border border-line bg-surface p-lg"
    >
      <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="mb-sm font-mono text-xs uppercase tracking-widest text-muted">
            Pipeline
          </p>
          {/* Segmented bar — the bold moment. */}
          <div
            className="flex h-3 overflow-hidden rounded-pill bg-surface-2"
            role="img"
            aria-label={counts
              .filter((c) => c.count > 0)
              .map((c) => `${STATUS_LABEL[c.status]} ${c.count}`)
              .join(', ')}
          >
            {counts
              .filter((c) => c.count > 0)
              .map((c) => (
                <div
                  key={c.status}
                  style={{
                    flexGrow: c.count,
                    backgroundColor: statusColor(c.status),
                  }}
                  title={`${STATUS_LABEL[c.status]}: ${c.count}`}
                />
              ))}
          </div>
        </div>

        {/* Readout tiles. Offers drawn in the signal color — the eye goes there. */}
        <dl className="flex gap-xl">
          <Stat label="Active" value={active} />
          <Stat label="Offers" value={byStatus('OFFER')} tone="signal" />
          <Stat label="Accepted" value={byStatus('ACCEPTED')} />
          <Stat label="Total" value={total} />
        </dl>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = 'content',
}: {
  label: string;
  value: number;
  tone?: 'content' | 'signal';
}) {
  return (
    <div>
      <dd
        className={`font-mono text-3xl leading-none ${tone === 'signal' ? 'text-signal' : 'text-content'}`}
      >
        {value}
      </dd>
      <dt className="mt-2xs font-mono text-xs uppercase tracking-wide text-muted">
        {label}
      </dt>
    </div>
  );
}
