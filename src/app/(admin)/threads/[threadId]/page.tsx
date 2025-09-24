"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuotationStore } from "@/context/QuotationStore";
import HRSQuotationTemplate from "@/components/quotation/HRSQuotationTemplate";
import type { HRSQuotationContent, Quotation } from "@/types/quotation";

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { threads, setFinalQuotation } = useQuotationStore();

  const threadId = String(params?.threadId || "");
  const storeThread = React.useMemo(() => threads.find(t => t.threadId === threadId), [threads, threadId]);
  const storeQuotations = React.useMemo(() => storeThread?.quotations ?? [], [storeThread]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [fsThread, setFsThread] = React.useState<{ threadId: string; userRefID?: string; status?: string; activeStep?: number; clientName?: string; createdAt?: unknown; updatedAt?: unknown; poId?: string; documents?: Array<{ type: string }> } | null>(null);
  const [fsQuotations, setFsQuotations] = React.useState<Quotation[]>([]);

  React.useEffect(() => {
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
          if (mounted) setFsThread({
            threadId: (tData.threadId as string) || tSnap.id,
            userRefID: (tData.userRefID as string) || undefined,
            status: (tData.status as string) || undefined,
            activeStep: (tData.activeStep as number),
            clientName: (tData.clientName as string) || undefined,
            createdAt: tData.createdAt,
            updatedAt: tData.updatedAt,
          });
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
  const latest = quotations[0];
  const content = latest?.content as unknown as HRSQuotationContent | undefined;
  const previewRef = React.useRef<HTMLDivElement>(null);

  const onDownload = () => {
    if (!previewRef.current) return;
    const refId = (content?.refID || thread?.userRefID || thread?.threadId || "quotation").toString();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>${refId}</title><meta name="viewport" content="width=device-width, initial-scale=1"/><style>html,body{background:#fff;margin:0;padding:0} @page{size:A4;margin:10mm} .print-wrap{display:flex;justify-content:center;padding:0}</style></head><body><div class="print-wrap"></div></body></html>`);
    const container = printWindow.document.body.querySelector(".print-wrap");
    if (container) {
      const clone = previewRef.current.cloneNode(true) as HTMLElement;
      clone.style.margin = "0 auto";
      clone.style.overflow = "visible";
      clone.style.background = "#fff";
      clone.style.width = "100%";
      container.appendChild(clone);
    }
    setTimeout(() => { printWindow.document.close(); printWindow.focus(); printWindow.print(); }, 300);
  };

  const onMarkFinal = async () => {
    if (!thread || !latest) return;
    try {
      const { QuotationService } = await import('@/lib/quotationService');
      await Promise.all([
        QuotationService.setQuotationIsFinal(thread.threadId, latest.id, true),
        QuotationService.setQuotationStatus(thread.threadId, latest.id, 'accepted'),
        QuotationService.setFinalQuotationId(thread.threadId, latest.id),
        QuotationService.setThreadActiveStep(thread.threadId, 1),
        QuotationService.setThreadStatus(thread.threadId, 'QuotationAccepted'),
      ]);
      setFinalQuotation(thread.threadId, latest.id);
      setFsThread((prev) => prev ? { ...prev, activeStep: 1, status: 'QuotationAccepted' } : prev);
      setFsQuotations((prev) => prev.map(q => q.id === latest.id ? { ...q, isFinal: true, status: 'accepted' } : q));
      setActiveStep(1);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark final:', e);
    }
  };

  const steps = [
    { key: "CreateQuotation", label: "Create Quotation" },
    { key: "UploadPurchaseOrder", label: "Upload Purchase Order" },
    { key: "CreateDeliveryNote", label: "Create Delivery Note" },
    { key: "UploadSignedDeliveryNote", label: "Upload Signed Delivery Note" },
    { key: "CreateInvoice", label: "Create Invoice" },
    { key: "DownloadFinalDoc", label: "Download Final Doc" },
  ];
  const [activeStep, setActiveStep] = React.useState(0);
  React.useEffect(() => {
    if (fsThread && typeof fsThread.activeStep === 'number') {
      setActiveStep(fsThread.activeStep);
    }
  }, [fsThread]);

  if (!thread) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="inline-block rotate-180">➔</span>
            <span>Back</span>
          </button>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Thread</h2>
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Thread: {thread.userRefID || thread.threadId}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Workflow</p>
        </div>
        <div className="w-[90px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-brand-500/10 via-indigo-500/10 to-fuchsia-500/10 blur-xl" aria-hidden></div>
            <div className="relative">
              <ul className="space-y-4">
                {steps.map((s, idx) => {
                  const isActive = idx === activeStep;
                  const isDone = idx < activeStep;
                  
                  // Define completion criteria for each step
                  const getStepCompletionStatus = (stepIndex: number) => {
                    // Use storeThread for properties that might not be in fsThread
                    const threadData = storeThread || thread;
                    switch (stepIndex) {
                      case 0: // Create Quotation
                        return latest?.isFinal === true;
                      case 1: // Upload Purchase Order
                        return threadData?.poId !== undefined;
                      case 2: // Create Delivery Note
                        return threadData?.documents?.some((d: { type: string }) => d.type === 'delivery_note_unsigned') === true;
                      case 3: // Upload Signed Delivery Note
                        return threadData?.documents?.some((d: { type: string }) => d.type === 'delivery_note_signed') === true;
                      case 4: // Create Invoice
                        return threadData?.documents?.some((d: { type: string }) => d.type === 'invoice') === true;
                      case 5: // Download Final Doc
                        return threadData?.status === 'Completed';
                      default:
                        return false;
                    }
                  };
                  
                  // Check if current step is completed
                  const isCurrentStepCompleted = getStepCompletionStatus(activeStep);
                  // Allow navigation to current/previous steps or next step if current is completed
                  const canNavigate = idx <= activeStep || (idx === activeStep + 1 && isCurrentStepCompleted);
                  return (
                    <li
                      key={s.key}
                      onClick={() => { if (canNavigate) setActiveStep(idx); }}
                      className={`flex items-start gap-3 select-none ${canNavigate ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-lg -mx-2 px-2 py-1 transition-colors' : 'cursor-not-allowed opacity-60'}`}
                      aria-disabled={!canNavigate}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full grid place-items-center text-sm font-semibold transition-all ${
                          isActive 
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                            : isDone || getStepCompletionStatus(idx)
                            ? 'bg-emerald-600 text-white' 
                            : canNavigate
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}>
                          {isDone || getStepCompletionStatus(idx) ? '✓' : idx+1}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className={`w-px h-8 mt-1 ${isDone || getStepCompletionStatus(idx) ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-800'}`}></div>
                        )}
                      </div>
                      <div className="pt-0.5">
                        <div className={`text-sm font-semibold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {s.label}
                          {getStepCompletionStatus(idx) && !isDone && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {idx === 0 ? 'Prepare and review quotation' : idx === 1 ? 'Attach buyer PO' : idx === 2 ? 'Create delivery note' : idx === 3 ? 'Upload signed delivery note' : idx === 4 ? 'Generate invoice' : 'Download final consolidated document'}
                          {idx === activeStep + 1 && isCurrentStepCompleted && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">← Ready to proceed</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Need details? <a onClick={()=>router.push(`/quotations/${thread.threadId}`)} className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">Open quotation details</a>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {/* Thread details header table - horizontal with specific columns */}
         
          {activeStep === 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Create Quotation</div>
                {latest?.isFinal && <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Final</span>}
              </div>
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Latest: {latest?.version || '—'}</div>
                    {!!latest && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">Status: {latest.status}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={onDownload} disabled={!latest} className={`h-9 px-3 rounded-md text-sm font-medium ${latest ? 'text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]' : 'bg-gray-200/60 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>Download</button>
                    <button onClick={onMarkFinal} disabled={!latest || latest.isFinal} className={`h-9 px-3 rounded-md text-sm font-medium ${latest && !latest.isFinal ? 'text-white bg-brand-600 hover:bg-brand-500 active:scale-[0.98]' : 'bg-gray-200/60 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>Mark as Final</button>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden" ref={previewRef}>
                  {content ? (
                    <div className="w-full flex justify-center bg-gray-50 dark:bg-gray-950/20 p-4">
                      <HRSQuotationTemplate content={content} />
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">{isLoading ? 'Loading...' : 'Latest quotation not available'}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeStep !== 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 p-8 text-center">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{steps[activeStep].label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">This step UI will be implemented next.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


