"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type {
  CreateQuotationData,
  Document,
  Quotation,
  QuotationStatus,
  QuotationTemplate,
  Thread,
  ThreadStatus,
  ThreadWithRelations,
} from "@/types/quotation";
import type { HRSQuotationContent } from "@/types/quotation";

type Store = {
  threads: ThreadWithRelations[];
  templates: QuotationTemplate[];
  getNextRefID: () => Promise<string>;
  createQuotationWithTemplate: (data: CreateQuotationData) => Promise<{ thread: Thread; quotation: Quotation }>;
  createInitialQuotation: (quotationData: Record<string, unknown>) => { thread: Thread; quotation: Quotation };
  handleDecline: (threadId: string) => void;
  undoDecline: (threadId: string) => void;
  createRevision: (threadId: string, previousQuotationId: string, contentOverride?: Record<string, unknown>) => Promise<Quotation | undefined>;
  handleAcceptance: (quotationId: string, threadId: string, userMarksAsFinal?: boolean) => void;
  setFinalQuotation: (threadId: string, quotationId: string) => void;
  updateQuotationContent: (threadId: string, quotationId: string, content: Record<string, unknown>) => Promise<void>;
  deleteQuotation: (threadId: string, quotationId: string) => Promise<void>;
  uploadPurchaseOrder: (threadId: string, file: File, poId: string) => Document | undefined;
  createDeliveryNote: (threadId: string, data: Record<string, unknown>) => Record<string, unknown> | undefined;
  uploadSignedDeliveryNote: (threadId: string, file: File) => { unsignedDoc: Document; signedDoc: Document } | undefined;
  generateInvoice: (threadId: string) => Document | undefined;
  completeThread: (threadId: string) => void;
};

const QuotationContext = createContext<Store | null>(null);

const nowIso = () => new Date().toISOString();
const randomId = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const generateUniqueThreadId = (userRefID?: string) => {
  if (userRefID) {
    return userRefID;
  }
  return randomId("thread");
};

const generateNextRefID = (existingThreads: ThreadWithRelations[]): string => {
  // New scheme: HRS-QN-<number>[-<vesselCode>]
  // Find all numeric parts from existing HRS-QN refs (ignore vessel code suffix)
  const hrsNumbers = existingThreads
    .map(t => t.userRefID)
    .filter(Boolean)
    .map(ref => {
      // Accept both with and without vessel suffix
      const m = (ref as string).match(/HRS-QN-(\d{2,})(?:-[A-Z]\d+)?$/);
      return m ? parseInt(m[1], 10) : undefined;
    })
    .filter((n): n is number => typeof n === 'number' && !isNaN(n));

  // If none exist yet, seed using thread count to avoid collisions in mock/local data
  const seedBase = 25000; // starting base to keep IDs looking like 25xxx
  const fallbackNumber = seedBase + (existingThreads.length + 1);
  const maxNumber = hrsNumbers.length > 0 ? Math.max(...hrsNumbers) : (fallbackNumber - 1);
  const nextNumber = maxNumber + 1;

  // Return base without vessel code; UI may append -<code> dynamically when vessel is selected
  return `HRS-QN-${nextNumber}`;
};
const saveFile = (file: File) => `/mock/${randomId("file")}_${file.name}`;
const generateUnsignedDeliveryNotePath = (threadId: string) => `/mock/${threadId}/delivery_note_unsigned.pdf`;
const generateInvoiceNumber = () => `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

export const QuotationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Predefined quotation templates
  const [templates] = useState<QuotationTemplate[]>([
    {
      id: "hrs-single-template",
      name: "High Range Star Quotation",
      description: "Official HRS quotation template",
      isDefault: true,
      content: { header: "HRS Quotation" },
    },
  ]);

  const [threads, setThreads] = useState<ThreadWithRelations[]>([]);

  const updateThread = (threadId: string, update: Partial<Thread>) => {
    setThreads((prev) =>
      prev.map((t) => (t.threadId === threadId ? { ...t, ...update, updatedAt: nowIso() } : t))
    );
  };

  const createThread = (data: Partial<Thread>): Thread => {
    const threadId = data.threadId || generateUniqueThreadId(data.userRefID);
    const thread: ThreadWithRelations = {
      threadId,
      userRefID: data.userRefID,
      status: (data.status as ThreadStatus) || "QuotationCreated",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      quotations: [],
      documents: [],
    };
    setThreads((prev) => [thread, ...prev]);
    return thread;
  };

  const createQuotation = (q: Omit<Quotation, "id" | "createdAt"> & { id?: string }): Quotation => {
    const newQ: Quotation = {
      id: q.id || randomId("q"),
      createdAt: nowIso(),
      ...q,
    };
    setThreads((prev) =>
      prev.map((t) => (t.threadId === newQ.threadId ? { ...t, quotations: [newQ, ...t.quotations] } : t))
    );
    return newQ;
  };

  const createDocument = (d: Omit<Document, "id" | "uploadedAt">): Document => {
    const newD: Document = { id: randomId("doc"), uploadedAt: nowIso(), ...d };
    setThreads((prev) => prev.map((t) => (t.threadId === d.threadId ? { ...t, documents: [newD, ...t.documents] } : t)));
    return newD;
  };

  const hasAcceptedQuotation = (threadId: string) => {
    const t = threads.find((x) => x.threadId === threadId);
    return t?.quotations.some((q) => q.status === "accepted");
  };

  const getFinalQuotation = (threadId: string): Quotation | undefined => {
    const t = threads.find((x) => x.threadId === threadId);
    return t?.quotations.find((q) => q.isFinal) || t?.quotations.find((q) => q.status === "accepted");
  };

  const getNextVersionNumber = (threadId: string) => {
    const t = threads.find((x) => x.threadId === threadId);
    const count = t?.quotations.filter((q) => q.version.startsWith("QuotationRevised")).length || 0;
    return count + 1;
  };

  const createQuotationWithTemplate: Store["createQuotationWithTemplate"] = async (data) => {
    const { QuotationService } = await import("@/lib/quotationService");
    const result = await QuotationService.createQuotationWithHRS({
      userRefID: data.userRefID,
      hrsContent: data.hrsContent as HRSQuotationContent,
    });

    // reflect in local state for immediate UI
    const threadWithRelations: ThreadWithRelations = {
      threadId: result.thread.threadId,
      userRefID: result.thread.userRefID,
      status: result.thread.status,
      createdAt: result.thread.createdAt,
      updatedAt: result.thread.updatedAt,
      quotations: [result.quotation],
      documents: [],
    } as ThreadWithRelations;
    setThreads((prev) => [threadWithRelations, ...prev]);
    return result;
  };

  const createInitialQuotation: Store["createInitialQuotation"] = (quotationData) => {
    const threadId = generateUniqueThreadId();
    const thread = createThread({ threadId, status: "QuotationCreated" });
    const quotation = createQuotation({
      threadId,
      version: "Quotation",
      status: "pending",
      content: quotationData,
    });
    return { thread, quotation };
  };

  const handleDecline: Store["handleDecline"] = (threadId) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === threadId
          ? {
              ...t,
              status: "QuotationDeclined",
              updatedAt: nowIso(),
              quotations: t.quotations.map((q) => ({ ...q, status: "declined" as QuotationStatus, isFinal: false })),
            }
          : t
      )
    );
  };

  const undoDecline: Store["undoDecline"] = (threadId) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === threadId
          ? {
              ...t,
              status: "QuotationCreated",
              updatedAt: nowIso(),
              quotations: t.quotations.map((q) =>
                q.status === "declined" ? { ...q, status: "pending" as QuotationStatus } : q
              ),
            }
          : t
      )
    );
  };

  const createRevision: Store["createRevision"] = async (threadId, previousQuotationId, contentOverride) => {
    try {
      const { QuotationService } = await import("@/lib/quotationService");
      const { quotation } = await QuotationService.createRevision(threadId, previousQuotationId, contentOverride);
      // Reflect in local state for immediate UI
      setThreads((prev) => prev.map((t) => (
        t.threadId === threadId
          ? { ...t, quotations: [quotation, ...t.quotations] }
          : t
      )));
      return quotation;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to create revision', e);
      return undefined;
    }
  };

  const handleAcceptance: Store["handleAcceptance"] = (quotationId, threadId, userMarksAsFinal) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === threadId
          ? {
              ...t,
              updatedAt: nowIso(),
              status: "QuotationAccepted",
              quotations: t.quotations.map((q) =>
                q.id === quotationId ? { ...q, status: "accepted", isFinal: userMarksAsFinal || q.isFinal } : q
              ),
              finalQuotationId: userMarksAsFinal ? quotationId : t.finalQuotationId,
            }
          : t
      )
    );
  };

  const setFinalQuotation: Store["setFinalQuotation"] = (threadId, quotationId) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === threadId
          ? {
              ...t,
              // When marking final: clear decline on thread, and ensure mutual exclusivity
              status: "QuotationAccepted",
              updatedAt: nowIso(),
              quotations: t.quotations.map((q) => ({
                ...q,
                isFinal: q.id === quotationId,
                status: q.status === "declined" && q.id === quotationId ? ("pending" as QuotationStatus) : q.status,
              })),
              finalQuotationId: quotationId,
            }
          : t
      )
    );
  };

  const updateQuotationContent: Store["updateQuotationContent"] = async (threadId, quotationId, content) => {
    try {
      const { QuotationService } = await import("@/lib/quotationService");
      await QuotationService.updateQuotationContent(threadId, quotationId, content);
    } finally {
      // Update local state regardless to keep UI responsive
      setThreads((prev) =>
        prev.map((t) =>
          t.threadId === threadId
            ? {
                ...t,
                updatedAt: nowIso(),
                quotations: t.quotations.map((q) => (q.id === quotationId ? { ...q, content } : q)),
              }
            : t
        )
      );
    }
  };

  const deleteQuotation: Store["deleteQuotation"] = async (threadId, quotationId) => {
    try {
      const { QuotationService } = await import("@/lib/quotationService");
      await QuotationService.deleteQuotation(threadId, quotationId);
    } finally {
      setThreads((prev) =>
        prev.map((t) =>
          t.threadId === threadId
            ? { ...t, quotations: t.quotations.filter((q) => q.id !== quotationId), updatedAt: nowIso() }
            : t
        )
      );
    }
  };

  const hasPurchaseOrder = (threadId: string) => {
    const t = threads.find((x) => x.threadId === threadId);
    return t?.documents.some((d) => d.type === "purchase_order");
  };

  const uploadPurchaseOrder: Store["uploadPurchaseOrder"] = (threadId, file, poId) => {
    if (!hasAcceptedQuotation(threadId)) return undefined;
    const document = createDocument({
      threadId,
      type: "purchase_order",
      filename: file.name,
      filepath: saveFile(file),
    });
    updateThread(threadId, { poId });
    return document;
  };

  const createDeliveryNote: Store["createDeliveryNote"] = (threadId, deliveryNoteData) => {
    if (!hasPurchaseOrder(threadId)) return undefined;
    return { ...deliveryNoteData, generatedAt: nowIso() };
  };

  const uploadSignedDeliveryNote: Store["uploadSignedDeliveryNote"] = (threadId, file) => {
    const unsignedDoc = createDocument({
      threadId,
      type: "delivery_note_unsigned",
      filename: "delivery_note_unsigned.pdf",
      filepath: generateUnsignedDeliveryNotePath(threadId),
    });
    const signedDoc = createDocument({
      threadId,
      type: "delivery_note_signed",
      filename: file.name,
      filepath: saveFile(file),
    });
    return { unsignedDoc, signedDoc };
  };

  const hasSignedDeliveryNote = (threadId: string) => {
    const t = threads.find((x) => x.threadId === threadId);
    return t?.documents.some((d) => d.type === "delivery_note_signed");
  };

  const generateInvoice: Store["generateInvoice"] = (threadId) => {
    if (!hasSignedDeliveryNote(threadId)) return undefined;
    const t = threads.find((x) => x.threadId === threadId);
    const finalQuotation = getFinalQuotation(threadId);
    const invoiceData = {
      ...((finalQuotation?.content as Record<string, unknown>) || {}),
      poId: t?.poId,
      invoiceNumber: generateInvoiceNumber(),
      invoiceDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(invoiceData, null, 2)], { type: "application/json" });
    const file = new File([blob], `invoice_${t?.poId || threadId}.json`, { type: "application/json" });
    return createDocument({
      threadId,
      type: "invoice",
      filename: file.name,
      filepath: saveFile(file),
    });
  };

  const completeThread: Store["completeThread"] = (threadId) => {
    updateThread(threadId, { status: "Completed" });
  };

  const value = useMemo<Store>(() => ({
    threads,
    templates,
    getNextRefID: async () => {
      const { QuotationService } = await import("@/lib/quotationService");
      try {
        return await QuotationService.getNextRefID();
      } catch {
        return generateNextRefID(threads);
      }
    },
    createQuotationWithTemplate,
    createInitialQuotation,
    handleDecline,
    undoDecline,
    createRevision,
    handleAcceptance,
    setFinalQuotation,
    updateQuotationContent,
    deleteQuotation,
    uploadPurchaseOrder,
    createDeliveryNote,
    uploadSignedDeliveryNote,
    generateInvoice,
    completeThread,
  }), [threads, templates, createQuotationWithTemplate, createInitialQuotation, handleDecline, undoDecline, createRevision, handleAcceptance, setFinalQuotation, updateQuotationContent, uploadPurchaseOrder, createDeliveryNote, uploadSignedDeliveryNote, generateInvoice, completeThread]);

  return <QuotationContext.Provider value={value}>{children}</QuotationContext.Provider>;
};

export const useQuotationStore = () => {
  const ctx = useContext(QuotationContext);
  if (!ctx) throw new Error("useQuotationStore must be used within QuotationProvider");
  return ctx;
};


