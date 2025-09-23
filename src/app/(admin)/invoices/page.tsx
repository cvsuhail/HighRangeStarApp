"use client";
import React from "react";
import { useQuotationStore } from "@/context/QuotationStore";
import ComponentCard from "@/components/common/ComponentCard";

export default function InvoicesPage() {
  const { threads } = useQuotationStore();
  const rows = threads.flatMap((t) => t.documents.filter((d) => d.type === "invoice").map((d) => ({ t, d })));
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Invoices</h1>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {rows.map(({ t, d }) => (
          <div key={d.id} className="col-span-12 md:col-span-6 xl:col-span-4">
            <ComponentCard title={d.filename} desc={`Thread: ${t.threadId}`}>
              <div className="text-sm text-gray-600 dark:text-gray-300">Uploaded: {new Date(d.uploadedAt).toLocaleString()}</div>
            </ComponentCard>
          </div>
        ))}
      </div>
    </div>
  );
}


