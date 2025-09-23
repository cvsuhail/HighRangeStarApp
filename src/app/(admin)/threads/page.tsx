"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuotationStore } from "@/context/QuotationStore";
import ComponentCard from "@/components/common/ComponentCard";

export default function ThreadsPage() {
  const router = useRouter();
  const { threads } = useQuotationStore();
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
              {threads.map((t) => {
                const latest = t.quotations[0];
                const content = (latest?.content as Record<string, unknown>) || {};
                const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
                let party = "—";
                if (typeof (content as Record<string, unknown>).partyName === 'string') {
                  party = (content as Record<string, unknown>).partyName as string;
                } else if (isRecord((content as Record<string, unknown>).clientInfo) && typeof ((content as Record<string, unknown>).clientInfo as Record<string, unknown>).name === 'string') {
                  party = ((content as Record<string, unknown>).clientInfo as Record<string, unknown>).name as string;
                } else if (typeof (content as Record<string, unknown>).client === 'string') {
                  party = (content as Record<string, unknown>).client as string;
                }

                let refId = t.userRefID || "—";
                const rc = content as Record<string, unknown>;
                if (typeof rc.ref === 'string') refId = rc.ref;
                else if (typeof rc.reference === 'string') refId = rc.reference as string;
                else if (typeof rc.refId === 'string') refId = rc.refId as string;
                return (
                  <tr
                    key={t.threadId}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-white/5 cursor-pointer"
                    onClick={() => router.push(`/quotations/${t.threadId}`)}
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{t.threadId}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{party}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{refId}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        t.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        t.status === 'declined' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                        'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                      }`}>{t.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link href={`/quotations/${t.threadId}`} className="btn-tertiary">Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ComponentCard>

    </div>
  );
}


