"use client";
import React from "react";
import { useQuotationStore } from "@/context/QuotationStore";
import ComponentCard from "@/components/common/ComponentCard";

export default function DeliveryNotesPage() {
  const { threads } = useQuotationStore();
  const rows = threads.flatMap((t) => t.documents
    .filter((d) => d.type === "delivery_note_unsigned" || d.type === "delivery_note_signed")
    .map((d) => ({ t, d }))
  );
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Notes</h1>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {rows.map(({ t, d }) => (
          <div key={d.id} className="col-span-12 md:col-span-6 xl:col-span-4">
            <ComponentCard title={d.type} desc={`Thread: ${t.threadId}`}>
              <div className="text-sm text-gray-600 dark:text-gray-300">{d.filename}</div>
              <div className="text-xs text-gray-500">{new Date(d.uploadedAt).toLocaleString()}</div>
            </ComponentCard>
          </div>
        ))}
      </div>
    </div>
  );
}


