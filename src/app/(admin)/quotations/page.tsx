"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// Removed unused ComponentCard import
import CreateQuotationForm from "@/components/quotation/CreateQuotationForm";

const statusFilters = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
] as const;

export default function QuotationsListPage() {
  const [filter, setFilter] = useState<(typeof statusFilters)[number]["key"]>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const router = useRouter();
  // Firestore-backed view state
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ thread: { threadId: string; userRefID?: string; status?: string; clientName?: string; createdAt?: unknown; updatedAt?: unknown }; latest?: { version: string; status: string; content: Record<string, unknown>; createdAt?: string | number; isFinal?: boolean } }>>([]);

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
        const threadsCol = collection(db, "threads");
        const snap = await getDocs(query(threadsCol, orderBy("createdAt", "desc")));
        const out: Array<{ thread: { threadId: string; userRefID?: string; status?: string; clientName?: string; createdAt?: unknown; updatedAt?: unknown }; latest?: { version: string; status: string; content: Record<string, unknown>; createdAt?: string | number; isFinal?: boolean } }> = [];
        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          const thread = {
            threadId: (data.threadId as string) || d.id,
            userRefID: (data.userRefID as string) || undefined,
            status: (data.status as string) || undefined,
            clientName: (data.clientName as string) || undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          const qCol = collection(doc(threadsCol, d.id), "quotations");
          const latestSnap = await getDocs(query(qCol, orderBy("createdAt", "desc"), limit(1)));
          let latest: { version: string; status: string; content: Record<string, unknown>; createdAt?: string | number; isFinal?: boolean } | undefined;
          if (!latestSnap.empty) {
            const qd = latestSnap.docs[0];
            const qv = qd.data() as Record<string, unknown>;
            latest = {
              version: String(qv.version || "Quotation"),
              status: String(qv.status || "pending"),
              content: (qv.content as Record<string, unknown>) || {},
              createdAt: (qv.createdAt as unknown) as string | number,
              isFinal: Boolean(qv.isFinal),
            };
          }
          out.push({ thread, latest });
        }
        if (mounted) setRows(out);
      } catch (err) {
        console.error("Failed to fetch quotations", err);
        if (mounted) setRows([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredThreads = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter(r => (r.latest?.status || "") === filter);
  }, [rows, filter]);

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    // Refresh after creating
    setTimeout(() => {
      // best-effort refresh
      (async () => {
        try {
          const { getFirestore } = await import("@/lib/firebase");
          const db = getFirestore();
          if (!db) return;
          const { collection, getDocs, query, orderBy, limit, doc } = await import("firebase/firestore");
          const threadsCol = collection(db, "threads");
          const snap = await getDocs(query(threadsCol, orderBy("createdAt", "desc")));
          const out: Array<{ thread: { threadId: string; userRefID?: string; status?: string; clientName?: string; createdAt?: unknown; updatedAt?: unknown }; latest?: { version: string; status: string; content: Record<string, unknown>; createdAt?: string | number; isFinal?: boolean } }> = [];
          for (const d of snap.docs) {
            const data = d.data() as Record<string, unknown>;
            const thread = {
              threadId: (data.threadId as string) || d.id,
              userRefID: (data.userRefID as string) || undefined,
              status: (data.status as string) || undefined,
              clientName: (data.clientName as string) || undefined,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
            const qCol = collection(doc(threadsCol, d.id), "quotations");
            const latestSnap = await getDocs(query(qCol, orderBy("createdAt", "desc"), limit(1)));
            let latest: { version: string; status: string; content: Record<string, unknown>; createdAt?: string | number; isFinal?: boolean } | undefined;
            if (!latestSnap.empty) {
              const qd = latestSnap.docs[0];
              const qv = qd.data() as Record<string, unknown>;
              latest = {
                version: String(qv.version || "Quotation"),
                status: String(qv.status || "pending"),
                content: (qv.content as Record<string, unknown>) || {},
                createdAt: (qv.createdAt as unknown) as string | number,
                isFinal: Boolean(qv.isFinal),
              };
            }
            out.push({ thread, latest });
          }
          setRows(out);
        } catch {}
      })();
    }, 300);
  };

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCreateForm(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="inline-block rotate-180">➔</span>
            <span>Back</span>
          </button>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Create Quotation</h2>
          <div className="w-[90px]" />
        </div>
        <CreateQuotationForm 
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Quotations</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your quotation threads and track their progress
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="relative inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-sm hover:from-brand-500 hover:to-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 active:scale-[0.98] transition-all"
        >
          <span className="text-lg">＋</span>
          <span className="font-medium whitespace-nowrap">Create New Quotation</span>
        </button>
      </div>

      {/* Filter moved inside table card */}

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Quotations</div>
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-white/5 p-1">
            {statusFilters.map((sf) => (
              <button
                key={sf.key}
                onClick={() => setFilter(sf.key)}
                className={`px-3 md:px-4 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === sf.key
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Ref ID</th>
              <th className="text-left font-semibold px-4 py-3">Client Name</th>
              <th className="text-left font-semibold px-4 py-3">Version</th>
              <th className="text-left font-semibold px-4 py-3">Thread Status</th>
              <th className="text-right font-semibold px-4 py-3">Quoted Price</th>
              <th className="text-right font-semibold px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skeleton_${i}`}>
                <td className="px-4 py-4"><div className="h-3 w-28 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse"></div></td>
                <td className="px-4 py-4"><div className="h-3 w-40 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse"></div></td>
                <td className="px-4 py-4"><div className="h-3 w-20 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse"></div></td>
                <td className="px-4 py-4"><div className="h-6 w-20 rounded-full bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 dark:from-amber-900/40 dark:via-amber-900/20 dark:to-amber-900/40 animate-pulse"></div></td>
                <td className="px-4 py-4 text-right"><div className="h-3 w-24 ml-auto rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse"></div></td>
                <td className="px-4 py-4"><div className="h-3 w-24 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse"></div></td>
                <td className="px-4 py-4 text-right"><div className="h-8 w-20 ml-auto rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse"></div></td>
              </tr>
            ))}
            {!isLoading && filteredThreads.map(({ thread, latest }) => {
              const content = latest?.content as Record<string, unknown> | undefined;
              type TotalItem = { quantity: number; price: number };
              const items = (content && (content as { items?: unknown }).items) as TotalItem[] | undefined;
              const totalFromItems = Array.isArray(items)
                ? items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
                : 0;
              const total = (content?.total as number | undefined) ?? totalFromItems;
              const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
              let client = '—';
              if (content) {
                const c = content as Record<string, unknown>;
                if (typeof c.partyName === 'string') {
                  client = c.partyName as string;
                } else if (isRecord(c.clientInfo) && typeof (c.clientInfo as Record<string, unknown>).name === 'string') {
                  client = (c.clientInfo as Record<string, unknown>).name as string;
                } else if (typeof c.client === 'string') {
                  client = c.client as string;
                }
              }
              return (
                <tr
                  key={`${thread.threadId}_main`}
                  className="hover:bg-gray-50/80 dark:hover:bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                  onClick={() => router.push(`/quotations/${thread.threadId}`)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/quotations/${thread.threadId}`); } }}
                  aria-label={`Open quotation ${thread.userRefID || thread.threadId}`}
                >
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{thread.userRefID || thread.threadId}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{thread.clientName || client}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{latest?.version}{latest?.isFinal ? ' (Final)' : ''}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const raw = thread.status || '';
                        // Map backend statuses to UI labels per request
                        const mapLabel = (s: string): string => {
                          const lower = s.toLowerCase();
                          if (lower.includes('quotation') && lower.includes('created')) return 'quotationCreated';
                          if (lower.includes('revised') || lower.includes('reverse')) return 'reverseQuotationCreated';
                          if (lower.includes('accepted')) return 'quotationAccepted';
                          if (lower.includes('declined')) return 'quotationDeclined';
                          if (lower.includes('purchase') && (lower.includes('order') || lower.includes('po'))) return 'PurchaseOrderUploaded';
                          return raw || 'quotationCreated';
                        };
                        const label = mapLabel(raw);
                        const badgeClass = label === 'quotationAccepted'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : label === 'quotationDeclined'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                          : label === 'PurchaseOrderUploaded'
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                          : label === 'reverseQuotationCreated'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                        return (
                          <span className={`px-2 py-1 text-xs rounded-full ${badgeClass}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-600 dark:text-brand-400">${typeof total === 'number' ? total.toFixed(2) : '0.00'} USD</td>

                    <td className="px-4 py-3 text-right">
                      <Link href={`/quotations/${thread.threadId}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span>Open</span>
                        <span className="text-xs">↗</span>
                      </Link>
                    </td>
                  </tr>
              );
            })}
            {!isLoading && filteredThreads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No quotations found</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}


