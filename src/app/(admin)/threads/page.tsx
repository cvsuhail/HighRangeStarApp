"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";

type Row = {
  thread: { threadId: string; userRefID?: string };
  latest?: { status: string; content: Record<string, unknown> };
};

export default function ThreadsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [rows, setRows] = React.useState<Row[]>([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const { getFirestore } = await import("@/lib/firebase");
        const db = getFirestore();
        if (!db) {
          if (mounted) setRows([]);
          return;
        }
        const { collection, getDocs, query, orderBy, limit, doc } = await import("firebase/firestore");
        const threadsCol = collection(db, "quotationThreads");
        const snap = await getDocs(query(threadsCol, orderBy("createdAt", "desc")));
        const out: Row[] = [];
        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          const thread = { threadId: (data.threadId as string) || d.id, userRefID: (data.userRefID as string) || undefined };
          const qCol = collection(doc(threadsCol, d.id), "quotations");
          const latestSnap = await getDocs(query(qCol, orderBy("createdAt", "desc"), limit(1)));
          let latest: Row["latest"];
          if (!latestSnap.empty) {
            const qd = latestSnap.docs[0];
            const qv = qd.data() as Record<string, unknown>;
            latest = {
              status: String(qv.status || "pending"),
              content: (qv.content as Record<string, unknown>) || {},
            };
          }
          out.push({ thread, latest });
        }
        if (mounted) setRows(out);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch threads", err);
        if (mounted) setRows([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Threads</h1>
      <ComponentCard title="All Threads" desc="Click a row to open the thread">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <th className="py-3 pr-4">Thread ID</th>
                <th className="py-3 pr-4">Party Name</th>
                <th className="py-3 pr-4">Ref ID</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">Loading…</td>
                </tr>
              )}
              {!isLoading && rows.map(({ thread, latest }) => {
                const content = (latest?.content as Record<string, unknown>) || {};
                const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
                let party = "—";
                if (typeof content.partyName === 'string') {
                  party = content.partyName as string;
                } else if (isRecord(content.clientInfo) && typeof (content.clientInfo as Record<string, unknown>).name === 'string') {
                  party = (content.clientInfo as Record<string, unknown>).name as string;
                } else if (typeof content.client === 'string') {
                  party = content.client as string;
                }

                let refId = thread.userRefID || "—";
                if (typeof (content as Record<string, unknown>).ref === 'string') refId = (content as Record<string, unknown>).ref as string;
                else if (typeof (content as Record<string, unknown>).reference === 'string') refId = (content as Record<string, unknown>).reference as string;
                else if (typeof (content as Record<string, unknown>).refId === 'string') refId = (content as Record<string, unknown>).refId as string;
                const status = latest?.status || 'pending';
                return (
                  <tr
                    key={thread.threadId}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-white/5 cursor-pointer"
                    onClick={() => router.push(`/threads/${thread.threadId}`)}
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{thread.threadId}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{party}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{refId}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        status === 'accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        status === 'declined' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                        'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                      }`}>{status}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link href={`/threads/${thread.threadId}`} className="btn-tertiary">Open</Link>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">No threads found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ComponentCard>

    </div>
  );
}


