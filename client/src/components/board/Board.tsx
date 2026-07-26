import { useMemo, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import { trpc, type Application } from '../../trpc';
import { STATUS_ORDER, type Status } from '../../lib/status';
import { Button } from '../ui/Button';
import { ErrorNote, Skeleton } from '../ui/feedback';
import { FunnelBar } from './FunnelBar';
import { Column } from './Column';
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
  const list = trpc.applications.list.useQuery();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);

  // Optimistic status change: the card moves (and travels) immediately, before
  // the server responds; on error we roll the cache back.
  const updateStatus = trpc.applications.update.useMutation({
    onMutate: async ({ id, data }) => {
      await utils.applications.list.cancel();
      const prev = utils.applications.list.getData();
      utils.applications.list.setData(undefined, (old) =>
        old?.map((a) =>
          a.id === id && data.status ? { ...a, status: data.status } : a,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.applications.list.setData(undefined, ctx.prev);
    },
    onSettled: () => void utils.applications.list.invalidate(),
  });

  const changeStatus = (id: string, status: Status) =>
    updateStatus.mutate({ id, data: { status } });

  const grouped = useMemo(() => {
    const byStatus = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, [] as Application[]]),
    ) as Record<Status, Application[]>;
    for (const app of list.data ?? []) byStatus[app.status].push(app);
    return byStatus;
  }, [list.data]);

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
              <LayoutGroup>
                <div className="flex min-h-0 flex-1 gap-md overflow-x-auto pb-sm">
                  {STATUS_ORDER.map((status) => (
                    <Column
                      key={status}
                      status={status}
                      apps={grouped[status]}
                      onOpen={setDetailId}
                      onChangeStatus={changeStatus}
                    />
                  ))}
                </div>
              </LayoutGroup>
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
