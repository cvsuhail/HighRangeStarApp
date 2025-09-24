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

  const refreshThreadData = async () => {
    try {
      const { getFirestore } = await import("@/lib/firebase");
      const db = getFirestore();
      if (!db) return;
      const { doc, getDoc, collection, getDocs, query, orderBy } = await import("firebase/firestore");
      const tRef = doc(db as any, "quotationThreads", threadId);
      const tSnap = await getDoc(tRef);
      if (tSnap.exists()) {
        const tData = tSnap.data() as Record<string, unknown>;
        setFsThread({ threadId: (tData.threadId as string) || tSnap.id, userRefID: (tData.userRefID as string) || undefined, status: (tData.status as string) || undefined });
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
          createdAt: new Date().toISOString(),
          isFinal: Boolean(qv.isFinal),
        });
      });
      setFsQuotations(list);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to refresh thread data:", e);
    }
  };

  const thread = fsThread || storeThread;
  const quotations = (fsQuotations && fsQuotations.length > 0) ? fsQuotations : storeQuotations;
  const isSingleQuotation = quotations.length <= 1;

  const [selectedId, setSelectedId] = useState<string | null>(quotations[0]?.id ?? null);
  // Keep selection in sync when quotations list changes, prefer newest first item
  useEffect(() => {
    if (!quotations || quotations.length === 0) return;
    const exists = quotations.some(q => q.id === selectedId);
    if (!exists) {
      setSelectedId(quotations[0]?.id ?? null);
    }
  }, [quotations]);
  // Revision modal state
  const [isRevOpen, setIsRevOpen] = useState(false);
  const [revDraft, setRevDraft] = useState<HRSQuotationContent | null>(null);
  // Delete confirm modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Attractive action loading overlay state (UI only)
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>("");
  const previewRef = useRef<HTMLDivElement>(null);
  const selectedQuotation: Quotation | undefined = useMemo(
    () => quotations.find(q => q.id === selectedId) || quotations[0],
    [selectedId, quotations]
  );

  const content = selectedQuotation?.content as unknown as HRSQuotationContent | undefined;

  const hasFinal = useMemo(() => (quotations?.some(q => q.isFinal) ?? false), [quotations]);
  const isDeclinedThread = thread?.status === "QuotationDeclined";

  const canCreateRevision = !!selectedQuotation && !isDeclinedThread;
  const canMarkAsDeclined = !isDeclinedThread;
  // Edit removed: latest selection no longer needed

  // Stepper UI was moved to thread detail page. Keep quotation detail focused on versions list.
  const selectedIndex = useMemo(() => {
    const idx = quotations.findIndex(q => q.id === selectedQuotation?.id);
    return idx >= 0 ? idx : 0;
  }, [quotations, selectedQuotation]);

  // For stepper: show oldest -> newest to make progress sense
  const stepperQuotations = useMemo(() => {
    return quotations.slice().reverse();
  }, [quotations]);
  const activeStepperIndex = useMemo(() => {
    const id = selectedQuotation?.id;
    const idx = stepperQuotations.findIndex(q => q.id === id);
    return idx >= 0 ? idx : stepperQuotations.length - 1;
  }, [stepperQuotations, selectedQuotation]);

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
    try {
      setActionMessage("Creating revision...");
      setIsActionLoading(true);
      const newQ = await createRevision(thread.threadId, selectedQuotation.id, computed);
      if (newQ) {
        setSelectedId(newQ.id);
        setIsRevOpen(false);
        await refreshThreadData();
      }
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const onDeleteSelected = async () => {
    if (!thread || !selectedQuotation) return;
    setDeleteTargetId(selectedQuotation.id);
    setIsDeleteOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!thread || !deleteTargetId) return;
    try {
      setActionMessage("Deleting quotation...");
      setIsActionLoading(true);
      await deleteQuotation(thread.threadId, deleteTargetId);
      await refreshThreadData();
      const remaining = quotations.filter(q => q.id !== deleteTargetId);
      setSelectedId(remaining[0]?.id ?? null);
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } finally {
      setIsActionLoading(false);
      setActionMessage("");
    }
  };

  const onCancelDelete = () => {
    setIsDeleteOpen(false);
    setDeleteTargetId(null);
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
    // Copy styles from current document so Tailwind and component CSS are available
    const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')) as HTMLElement[];
    const headStyles = styleNodes.map(node => node.outerHTML).join("");
    // Use the inner HTML of the preview content to avoid container padding clipping
    const clone = previewRef.current.cloneNode(true) as HTMLElement;
    clone.classList.remove('p-4');
    const printableInner = clone.innerHTML || previewRef.current.innerHTML;
    const html = `<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title></title>
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>
    ${headStyles}
    <style>
      html, body { background: #fff; margin: 0; padding: 0; }
      @page { size: A4 portrait; margin: 0; }
      .print-page { display: block; width: 100%; }
      .print-content { width: 210mm; margin: 0 auto; padding: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
      img, svg { break-inside: avoid; page-break-inside: avoid; }
      @media print {
        html, body, .print-page, .print-content { height: auto !important; overflow: visible !important; }
        .print-page, .print-content { page-break-before: avoid !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
        *, *::before, *::after { animation: none !important; transition: none !important; }
      }
    </style>
  </head>
  <body>
    <div class=\"print-page\">
      <div class=\"print-content\">${printableInner}</div>
    </div>
  </body>
  </html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.title = '';
    const waitForImages = async () => {
      const imgs = Array.from(printWindow.document.images || []);
      const pending = imgs.filter(img => !img.complete || img.naturalWidth === 0);
      if (pending.length === 0) return;
      await Promise.all(
        pending.map(img => new Promise(resolve => {
          const onDone = () => { img.removeEventListener('load', onDone); img.removeEventListener('error', onDone); resolve(null); };
          img.addEventListener('load', onDone);
          img.addEventListener('error', onDone);
        }))
      );
    };
    const afterLoad = async () => {
      try {
        await waitForImages();
        printWindow.requestAnimationFrame(() => {
          try {
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          } catch (_) {}
        });
      } catch (_) {}
    };
    // Ensure we wait for the new document to be fully loaded
    if (printWindow.document.readyState === 'complete') {
      afterLoad();
    } else {
      printWindow.addEventListener('load', afterLoad, { once: true });
    }
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
      {/* Local UI animations (UI-only) */}
      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp .35s ease both; }
        @keyframes softPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.0);} 50% { box-shadow: 0 0 0 6px rgba(59,130,246,0.08);} }
        .soft-pulse { animation: softPulse 1.8s ease-in-out infinite; }
        @keyframes hrspin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .hrs-loader { width: 56px; height: 56px; border-radius: 9999px; border-width: 3px; border-style: solid; border-color: rgba(99,102,241,0.25); border-top-color: rgba(99,102,241,1); animation: hrspin 0.9s linear infinite; }
      `}</style>
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
                          <span>{(() => { const idxChrono = stepperQuotations.findIndex(x => x.id === q.id); return idxChrono <= 0 ? 'Quotation' : `QuotationR${idxChrono}`; })()}{q.isFinal ? ' (Final)' : ''}</span>
                          {selectedQuotation?.id === q.id && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">Selected</span>}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Ref: {(() => { const c = (q.content || {}) as Record<string, unknown>; const rv = c.refID as string | undefined; return rv || thread.userRefID || thread.threadId; })()}</div>
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
            <div className="flex flex-wrap items-center justify-between gap-2.5 md:gap-3">
              <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
              <button onClick={onCreateRevision} disabled={!canCreateRevision} className={`h-9 px-3 rounded-md text-sm font-medium border transition-all ${canCreateRevision ? 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm active:scale-[0.98]' : 'border-gray-100 dark:border-gray-800 text-gray-400 cursor-not-allowed'}`}>
                Create Revision
              </button>
              <button onClick={onMarkAsDeclined} disabled={!canMarkAsDeclined} className={`h-9 px-3 rounded-md text-sm font-medium border transition-all ${canMarkAsDeclined ? 'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30 hover:shadow-sm active:scale-[0.98]' : 'border-gray-100 text-gray-400 cursor-not-allowed'}`}>
                Mark as Declined
              </button>
              </div>
              <div className="flex items-center gap-2.5 md:gap-3">
                <button onClick={onDownloadPdf} className="h-9 px-3 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 hover:shadow-sm active:scale-[0.98]">Download</button>
                <button onClick={()=>alert('Share feature coming soon')} className="h-9 px-3 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm active:scale-[0.98]">Share</button>
                <button onClick={onDeleteSelected} disabled={!selectedQuotation || isSingleQuotation} className={`h-9 px-3 rounded-md text-sm font-medium border transition-all ${!selectedQuotation || isSingleQuotation ? 'border-gray-100 text-gray-400 cursor-not-allowed' : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30'}`}>Delete</button>
              </div>
            </div>
            {isDeclinedThread && (
              <div className="mt-3 text-xs text-rose-600 dark:text-rose-400">Thread is declined. Actions are disabled.</div>
            )}
            {!isDeclinedThread && isSingleQuotation && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">At least one quotation must remain. Delete is disabled.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Preview</div>
              {selectedQuotation?.isFinal && <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Final</span>}
                </div>
            <div key={selectedQuotation?.id} className="p-4 overflow-auto fade-in-up" ref={previewRef}>
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
        <div className="fixed inset-0 z-99999 flex items-center justify-center">
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
        <div className="fixed inset-0 z-99999 flex items-center justify-center">
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
      {isActionLoading && (
        <div className="fixed inset-0 z-[100000]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="relative h-full w-full flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl px-6 py-8 text-center fade-in-up">
              <div className="mx-auto hrs-loader"></div>
              <div className="mt-4 text-sm font-medium text-gray-900 dark:text-white">{actionMessage || 'Processing...'}</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Please wait while we update your quotation.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

