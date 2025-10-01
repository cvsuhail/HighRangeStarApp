"use client";

import React from "react";
import { useQuotationStore } from "@/context/QuotationStore";
import Image from "next/image";

export default function PurchaseOrdersPage() {
  const { threads } = useQuotationStore();

  // Existing purchase orders across threads
  const rows = threads.flatMap((t) =>
    t.documents
      .filter((d) => d.type === "purchase_order")
      .map((d) => ({ t, d }))
  );

  // Purchase order upload functionality has been removed
  // Users can now mark purchase orders as uploaded from the thread detail page

  return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Purchase Orders</h1>
      {/* Table of uploaded purchase orders */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-sm font-semibold text-gray-900 dark:text-white">Uploaded Purchase Orders</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="text-left font-semibold px-4 py-3">PoID</th>
                <th className="text-left font-semibold px-4 py-3">File name</th>
                <th className="text-left font-semibold px-4 py-3">Thread</th>
                <th className="text-left font-semibold px-4 py-3">Uploaded</th>
                <th className="text-right font-semibold px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map(({ t, d }) => (
                <tr key={`row-${d.id}`} className="hover:bg-gray-50/80 dark:hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{t.poId || '-'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 break-all">{d.filename}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.userRefID || t.threadId}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{new Date(d.uploadedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={d.filepath} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">View</a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No purchase orders uploaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Existing purchase order cards */}
        {rows.map(({ t, d }) => (
          <div key={d.id} className="col-span-12 md:col-span-6 xl:col-span-4">
            <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{d.filename}</div>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{t.userRefID || t.threadId}</span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-8 shrink-0">
                    <Image src="/images/icons/file-pdf.svg" alt="PDF" fill className="object-contain" />
                  </div>
                  <div className="min-w-0">
                    <a href={d.filepath} target="_blank" rel="noreferrer" className="text-sm text-brand-600 dark:text-brand-400 hover:underline break-all">
                      View PDF
                    </a>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Uploaded: {new Date(d.uploadedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
  );
}


