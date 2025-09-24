"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuotationStore } from "@/context/QuotationStore";
import HRSQuotationTemplate from "@/components/quotation/HRSQuotationTemplate";
import type { HRSQuotationContent, Quotation } from "@/types/quotation";

export default function QuotationThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { threads, createRevision, setFinalQuotation, handleDecline, undoDecline, updateQuotationContent, deleteQuotation } = useQuotationStore();

  const threadId = String(params?.threadId || "");
  const storeThread = useMemo(() => threads.find(t => t.threadId === threadId), [threads, threadId]);
  const storeQuotations = useMemo(() => storeThread?.quotations ?? [], [storeThread]);

  // Firestore-backed fetch for this thread and its quotations
  const [isLoading, setIsLoading] = useState(true);
  const [fsThread, setFsThread] = useState<{ threadId: string; userRefID?: string; status?: string } | null>(null);
  const [fsQuotations, setFsQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const { getFirestore } = await import("@/lib/firebase");
        const db = getFirestore();
        if (!db) return;
        const { doc, getDoc, collection, getDocs, query, orderBy } = await import("firebase/firestore");
        const tRef = doc(db as any, "quotationThreads", threadId);
        const tSnap = await getDoc(tRef);
        if (tSnap.exists()) {
          const tData = tSnap.data() as Record<string, unknown>;
          if (mounted) setFsThread({ threadId: (tData.threadId as string) || tSnap.id, userRefID: (tData.userRefID as string) || undefined, status: (tData.status as string) || undefined });
        }
        const qCol = collection(tRef, "quotations");
        const qSnap = await getDocs(query(qCol, orderBy("createdAt", "desc")));
        const list: Quotation[] = [];
        qSnap.forEach(qd => {
          const qv = qd.data() as Record<string, unknown>;
          list.push({
            id: qd.id,
            threadId,
            version: String(qv.version || "Quotation"),
            status: String(qv.status || "pending") as any,
            content: (qv.content as Record<string, unknown>) || {},
            createdAt: new Date().toISOString(), // for UI only; actual Timestamp shown via toDate below in list
            isFinal: Boolean(qv.isFinal),
          });
        });
        if (mounted) setFsQuotations(list);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch thread detail:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [threadId]);

  const thread = fsThread || storeThread;
  const quotations = fsQuotations.length > 0 ? fsQuotations : storeQuotations;

  const [selectedId, setSelectedId] = useState<string | null>(quotations[0]?.id ?? null);
  // Revision modal state
  const [isRevOpen, setIsRevOpen] = useState(false);
  const [revDraft, setRevDraft] = useState<HRSQuotationContent | null>(null);
  // Delete confirm modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const selectedQuotation: Quotation | undefined = useMemo(
    () => quotations.find(q => q.id === selectedId) || quotations[0],
    [selectedId, quotations]
  );

  const content = selectedQuotation?.content as unknown as HRSQuotationContent | undefined;

  const hasFinal = useMemo(() => (quotations?.some(q => q.isFinal) ?? false), [quotations]);
  const isDeclinedThread = thread?.status === "QuotationDeclined";

  const canCreateRevision = !!selectedQuotation && !isDeclinedThread;
  const canMarkAsFinal = !!selectedQuotation && !selectedQuotation.isFinal && !isDeclinedThread;
  const canMarkAsDeclined = !isDeclinedThread;
  // Edit removed: latest selection no longer needed

  // Stepper UI was moved to thread detail page. Keep quotation detail focused on versions list.

  const onCreateRevision = async () => {
    if (!selectedQuotation) return;
    const base = selectedQuotation.content as unknown as HRSQuotationContent | undefined;
    if (base) {
      // Prepare draft with auto-incremented SL numbers
      const nextIndexStart = 1;
      const updatedItems = base.items.map((it, idx) => ({
        ...it,
        slNo: `H${String(idx + nextIndexStart).padStart(2, '0')}`,
        amount: it.qty * it.unitPrice,
      }));
      setRevDraft({ ...base, items: updatedItems });
      setIsRevOpen(true);
    }
  };

  const onConfirmCreateRevision = async () => {
    if (!thread || !selectedQuotation || !revDraft) return;
    const computed = {
      ...revDraft,
      total: revDraft.items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
      items: revDraft.items.map(it => ({ ...it, amount: it.qty * it.unitPrice })),
    } as unknown as Record<string, unknown>;
    const newQ = await createRevision(thread.threadId, selectedQuotation.id, computed);
    if (newQ) {
      setSelectedId(newQ.id);
      setIsRevOpen(false);
    }
  };

  const onDeleteSelected = async () => {
    if (!thread || !selectedQuotation) return;
    setDeleteTargetId(selectedQuotation.id);
    setIsDeleteOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!thread || !deleteTargetId) return;
    await deleteQuotation(thread.threadId, deleteTargetId);
    const remaining = quotations.filter(q => q.id !== deleteTargetId);
    setSelectedId(remaining[0]?.id ?? null);
    setIsDeleteOpen(false);
    setDeleteTargetId(null);
  };

  const onCancelDelete = () => {
    setIsDeleteOpen(false);
    setDeleteTargetId(null);
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

  // Edit removed

  // Edit removed

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
                {isLoading && (
                  <li className="px-4 py-3">
                    <div className="h-4 w-40 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse" />
                  </li>
                )}
                {!isLoading && quotations.map(q => (
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
                        <div className="text-xs text-gray-500 dark:text-gray-400">{(() => {
                          const anyQ: any = q as any;
                          const ts = anyQ.createdAt && typeof anyQ.createdAt === 'object' && typeof anyQ.createdAt.toDate === 'function' ? anyQ.createdAt.toDate() : (typeof anyQ.createdAt === 'string' || typeof anyQ.createdAt === 'number' ? new Date(anyQ.createdAt) : undefined);
                          return ts ? ts.toLocaleString() : '';
                        })()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-[10px] rounded-full ${q.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : q.status === 'declined' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                          {q.status}
                        </span>
                        <button
                          onClick={(e)=>{ e.stopPropagation(); setSelectedId(q.id); setDeleteTargetId(q.id); setIsDeleteOpen(true); }}
                          className="ml-1 inline-flex items-center px-2 py-1 text-[10px] rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                          aria-label="Delete quotation"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {!isLoading && quotations.length === 0 && (
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
              <button onClick={onDeleteSelected} disabled={!selectedQuotation} className={`h-9 px-3 rounded-md text-sm font-medium border transition-all ${selectedQuotation ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30' : 'border-gray-100 text-gray-400 cursor-not-allowed'}`}>Delete</button>
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

      {isRevOpen && revDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsRevOpen(false)}></div>
          <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">Create Revision</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Review and adjust details, then create the new revision.</div>
              </div>
              <button onClick={() => setIsRevOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
            </div>
            <div className="p-5 space-y-5 max-h-[75vh] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">Party Name
                  <input value={revDraft.partyName} onChange={(e)=>setRevDraft({ ...revDraft, partyName: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Party Address
                  <input value={revDraft.partyAddress} onChange={(e)=>setRevDraft({ ...revDraft, partyAddress: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Vessel Name
                  <input value={revDraft.vesselName} disabled className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400" />
                </label>
                <label className="text-sm">Date
                  <input type="date" value={new Date(revDraft.date).toISOString().slice(0,10)} onChange={(e)=>setRevDraft({ ...revDraft, date: new Date(e.target.value).toISOString() })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Items</div>
                {revDraft.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <input value={it.slNo} readOnly className="col-span-2 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-500" placeholder="SL" />
                    <input value={it.description} onChange={(e)=>{ const items = revDraft.items.slice(); items[idx] = { ...it, description: e.target.value }; setRevDraft({ ...revDraft, items }); }} className="col-span-6 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" placeholder="Description" />
                    <input type="number" value={it.qty} onChange={(e)=>{ const items = revDraft.items.slice(); items[idx] = { ...it, qty: parseFloat(e.target.value)||0 }; setRevDraft({ ...revDraft, items }); }} className="col-span-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-right" placeholder="Qty" />
                    <input type="number" step="0.01" value={it.unitPrice} onChange={(e)=>{ const items = revDraft.items.slice(); items[idx] = { ...it, unitPrice: parseFloat(e.target.value)||0 }; setRevDraft({ ...revDraft, items }); }} className="col-span-2 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-right" placeholder="Unit Price" />
                    <button onClick={(e)=>{ e.preventDefault(); const items = revDraft.items.filter((_,i)=>i!==idx).map((x,i)=>({ ...x, slNo: `H${String(i+1).padStart(2,'0')}` })); setRevDraft({ ...revDraft, items }); }} className="col-span-1 px-2 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300">Remove</button>
                  </div>
                ))}
                <div>
                  <button onClick={(e)=>{ e.preventDefault(); const next = { slNo: `H${String(revDraft.items.length+1).padStart(2,'0')}`, description: "", qty: 1, unitPrice: 0, amount: 0 }; setRevDraft({ ...revDraft, items: [...revDraft.items, next] }); }} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm">Add Item</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">Note
                  <textarea value={revDraft.note} onChange={(e)=>setRevDraft({ ...revDraft, note: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Delivery Terms
                  <textarea value={revDraft.deliveryTerms} onChange={(e)=>setRevDraft({ ...revDraft, deliveryTerms: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Payment Terms
                  <textarea value={revDraft.paymentTerms} onChange={(e)=>setRevDraft({ ...revDraft, paymentTerms: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Mobile Number
                  <input value={revDraft.mobileNumber} onChange={(e)=>setRevDraft({ ...revDraft, mobileNumber: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm">Email
                  <input type="email" value={revDraft.email} onChange={(e)=>setRevDraft({ ...revDraft, email: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-sm md:col-span-2">Total Amount In Words
                  <input value={revDraft.totalAmountInWords} onChange={(e)=>setRevDraft({ ...revDraft, totalAmountInWords: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </label>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
              <button onClick={() => setIsRevOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
              <button onClick={onConfirmCreateRevision} className="px-3 py-2 text-sm rounded-lg bg-brand-600 text-white">Create Revision</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete}></div>
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="text-base font-semibold text-gray-900 dark:text-white">Delete quotation?</div>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">This action cannot be undone. The selected quotation version will be permanently removed.</p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
              <button onClick={onCancelDelete} className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
              <button onClick={onConfirmDelete} className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

