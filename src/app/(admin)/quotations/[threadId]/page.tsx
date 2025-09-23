"use client";

import React, { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuotationStore } from "@/context/QuotationStore";
import HRSQuotationTemplate from "@/components/quotation/HRSQuotationTemplate";
import type { HRSQuotationContent, Quotation } from "@/types/quotation";

export default function QuotationThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { threads, createRevision, setFinalQuotation, handleDecline, undoDecline, updateQuotationContent } = useQuotationStore();

  const threadId = String(params?.threadId || "");
  const thread = useMemo(() => threads.find(t => t.threadId === threadId), [threads, threadId]);
  const quotations = useMemo(() => thread?.quotations ?? [], [thread]);

  const [selectedId, setSelectedId] = useState<string | null>(quotations[0]?.id ?? null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [draft, setDraft] = useState<HRSQuotationContent | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const selectedQuotation: Quotation | undefined = useMemo(
    () => quotations.find(q => q.id === selectedId) || quotations[0],
    [selectedId, quotations]
  );

  const content = selectedQuotation?.content as unknown as HRSQuotationContent | undefined;

  const hasFinal = useMemo(() => thread?.quotations.some(q => q.isFinal) ?? false, [thread]);
  const isDeclinedThread = thread?.status === "declined";

  const canCreateRevision = !!selectedQuotation && !isDeclinedThread;
  const canMarkAsFinal = !!selectedQuotation && !selectedQuotation.isFinal && !isDeclinedThread;
  const canMarkAsDeclined = !isDeclinedThread;
  const isLatestSelected = selectedQuotation ? quotations[0]?.id === selectedQuotation.id : false;

  const onCreateRevision = () => {
    if (!selectedQuotation || !thread) return;
    const newQ = createRevision(thread.threadId, selectedQuotation.id);
    if (newQ) {
      setSelectedId(newQ.id);
      const base = (selectedQuotation.content as unknown as HRSQuotationContent) || undefined;
      if (base) {
        setDraft(base);
        setIsEditOpen(true);
      }
    }
  };

  const onMarkAsFinal = () => {
    if (!selectedQuotation || !thread) return;
    setFinalQuotation(thread.threadId, selectedQuotation.id);
  };

  const onMarkAsDeclined = () => {
    if (!thread) return;
    handleDecline(thread.threadId);
  };

  const onUndoDecline = () => {
    if (!thread) return;
    undoDecline(thread.threadId);
  };

  const onOpenEdit = () => {
    if (!selectedQuotation || !isLatestSelected) return;
    const base = selectedQuotation.content as unknown as HRSQuotationContent | undefined;
    if (base) {
      setDraft(base);
      setIsEditOpen(true);
    }
  };

  const onSaveEdit = () => {
    if (!thread || !selectedQuotation || !draft) return;
    const computed = {
      ...draft,
      total: draft.items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
      items: draft.items.map(it => ({ ...it, amount: it.qty * it.unitPrice })),
    } as unknown as Record<string, unknown>;
    updateQuotationContent(thread.threadId, selectedQuotation.id, computed);
    setIsEditOpen(false);
  };

  const onDownloadPdf = () => {
    if (!previewRef.current) return;
    const refId = (content?.refID || thread?.userRefID || thread?.threadId || "quotation").toString();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>${refId}</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/><style>html,body{background:#fff;margin:0;padding:0} @page{size:A4;margin:10mm} .print\-wrap{display:flex;justify-content:center;padding:0} </style></head><body><div class="print-wrap"></div></body></html>`);
    const container = printWindow.document.body.querySelector(".print-wrap");
    if (container) {
      const clone = previewRef.current.cloneNode(true) as HTMLElement;
      clone.style.margin = "0 auto";
      clone.style.overflow = "visible";
      clone.style.background = "#fff";
      clone.style.width = "100%";
      container.appendChild(clone);
    }
    // Give time for images to load
    setTimeout(() => {
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  if (!thread) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="inline-block rotate-180">➔</span>
            <span>Back</span>
          </button>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Quotation Thread</h2>
          <div className="w-[90px]" />
        </div>
        <div className="text-gray-500 dark:text-gray-400">Thread not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span className="inline-block rotate-180">➔</span>
          <span>Back</span>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Ref: {thread.userRefID || thread.threadId}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select a quotation version to preview and manage</p>
        </div>
        <div className="w-[90px]" />
      </div>

      {isDeclinedThread && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-rose-800 dark:text-rose-300">
            This thread is currently marked as declined. Actions are limited.
              </div>
          <button onClick={onUndoDecline} className="px-3 py-1.5 text-sm rounded-md bg-white dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60">Undo</button>
            </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Quotations</div>
              {hasFinal && <span className="text-xs text-emerald-600 dark:text-emerald-400">Final set</span>}
            </div>
            <div className="max-h-[420px] overflow-auto">
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {quotations.map(q => (
                  <li
                    key={q.id}
                    className={`group px-4 py-3 cursor-pointer transition-colors ${selectedQuotation?.id === q.id ? 'bg-brand-50/60 dark:bg-brand-500/5 border-l-4 border-brand-500' : 'hover:bg-gray-50/80 dark:hover:bg-white/5'}`}
                    onClick={() => setSelectedId(q.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                          <span>{q.version}{q.isFinal ? ' (Final)' : ''}</span>
                          {selectedQuotation?.id === q.id && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">Selected</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(q.createdAt).toLocaleString()}</div>
                      </div>
                      <span className={`px-2 py-1 text-[10px] rounded-full ${q.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : q.status === 'declined' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                        {q.status}
                      </span>
                    </div>
                  </li>
                ))}
                {quotations.length === 0 && (
                  <li className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No quotations</li>
                )}
              </ul>
            </div>
              </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={onCreateRevision} disabled={!canCreateRevision} className={`h-9 px-3 rounded-md text-sm font-medium border transition-all ${canCreateRevision ? 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm active:scale-[0.98]' : 'border-gray-100 dark:border-gray-800 text-gray-400 cursor-not-allowed'}`}>
                Create Revision
              </button>
              <button onClick={onMarkAsFinal} disabled={!canMarkAsFinal} className={`h-9 px-3 rounded-md text-sm font-medium transition-all ${canMarkAsFinal ? 'text-white bg-brand-600 hover:bg-brand-500 shadow-sm active:scale-[0.98]' : 'bg-gray-200/60 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
                Mark as Final
              </button>
              <button onClick={onMarkAsDeclined} disabled={!canMarkAsDeclined} className={`h-9 px-3 rounded-md text-sm font-medium border transition-all ${canMarkAsDeclined ? 'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30 hover:shadow-sm active:scale-[0.98]' : 'border-gray-100 text-gray-400 cursor-not-allowed'}`}>
                Mark as Declined
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-0.5" />
              <button onClick={onOpenEdit} disabled={!selectedQuotation || !isLatestSelected} className={`h-9 px-3 rounded-md text-sm font-medium border transition-all ${selectedQuotation && isLatestSelected ? 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm active:scale-[0.98]' : 'border-gray-100 dark:border-gray-800 text-gray-400 cursor-not-allowed'}`}>
                Edit
              </button>
              <button onClick={onDownloadPdf} className="h-9 px-3 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 hover:shadow-sm active:scale-[0.98]">Download</button>
              <button onClick={()=>alert('Share feature coming soon')} className="h-9 px-3 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm active:scale-[0.98]">Share</button>
            </div>
            {isDeclinedThread && (
              <div className="mt-3 text-xs text-rose-600 dark:text-rose-400">Thread is declined. Actions are disabled.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Preview</div>
              {selectedQuotation?.isFinal && <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Final</span>}
                </div>
            <div className="p-4 overflow-auto" ref={previewRef}>
              {content ? (
                <div className="w-full flex justify-center">
                  <HRSQuotationTemplate content={content} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">Select a quotation to preview</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsEditOpen(false)}></div>
          <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Edit Quotation</div>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">Party Name
                  <input value={draft.partyName} onChange={(e)=>setDraft({ ...draft, partyName: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Party Address
                  <input value={draft.partyAddress} onChange={(e)=>setDraft({ ...draft, partyAddress: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-2 00 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Vessel Name
                  <input value={draft.vesselName} onChange={(e)=>setDraft({ ...draft, vesselName: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Date
                  <input type="date" value={new Date(draft.date).toISOString().slice(0,10)} onChange={(e)=>setDraft({ ...draft, date: new Date(e.target.value).toISOString() })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Items</div>
                {draft.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <input value={it.slNo} onChange={(e)=>{
                      const items = draft.items.slice(); items[idx] = { ...it, slNo: e.target.value }; setDraft({ ...draft, items });
                    }} className="col-span-2 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" placeholder="SL" />
                    <input value={it.description} onChange={(e)=>{
                      const items = draft.items.slice(); items[idx] = { ...it, description: e.target.value }; setDraft({ ...draft, items });
                    }} className="col-span-6 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" placeholder="Description" />
                    <input type="number" value={it.qty} onChange={(e)=>{
                      const items = draft.items.slice(); items[idx] = { ...it, qty: parseFloat(e.target.value)||0 }; setDraft({ ...draft, items });
                    }} className="col-span-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-right" placeholder="Qty" />
                    <input type="number" step="0.01" value={it.unitPrice} onChange={(e)=>{
                      const items = draft.items.slice(); items[idx] = { ...it, unitPrice: parseFloat(e.target.value)||0 }; setDraft({ ...draft, items });
                    }} className="col-span-2 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-right" placeholder="Unit Price" />
                    <button onClick={(e)=>{ e.preventDefault(); const items = draft.items.filter((_,i)=>i!==idx); setDraft({ ...draft, items }); }} className="col-span-1 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 text-rose-600 dark:text-rose-300">Remove</button>
                  </div>
                ))}
                <div>
                  <button onClick={(e)=>{ e.preventDefault(); setDraft({ ...draft, items: [...draft.items, { slNo: "", description: "", qty: 1, unitPrice: 0, amount: 0 }] }); }} className="px-3 py-1.5 rounded-md bg-brand-600 text-white text-sm">Add Item</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">Note
                  <textarea value={draft.note} onChange={(e)=>setDraft({ ...draft, note: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Delivery Terms
                  <textarea value={draft.deliveryTerms} onChange={(e)=>setDraft({ ...draft, deliveryTerms: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Payment Terms
                  <textarea value={draft.paymentTerms} onChange={(e)=>setDraft({ ...draft, paymentTerms: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Mobile Number
                  <input value={draft.mobileNumber} onChange={(e)=>setDraft({ ...draft, mobileNumber: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Email
                  <input type="email" value={draft.email} onChange={(e)=>setDraft({ ...draft, email: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm md:col-span-2">Total Amount In Words
                  <input value={draft.totalAmountInWords} onChange={(e)=>setDraft({ ...draft, totalAmountInWords: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
              <button onClick={() => setIsEditOpen(false)} className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
              <button onClick={onSaveEdit} className="px-3 py-2 text-sm rounded-md bg-brand-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

