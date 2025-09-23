"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type {
  CreateQuotationData,
  Document,
  DocumentType,
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
  getNextRefID: () => string;
  createQuotationWithTemplate: (data: CreateQuotationData) => { thread: Thread; quotation: Quotation };
  createInitialQuotation: (quotationData: Record<string, unknown>) => { thread: Thread; quotation: Quotation };
  handleDecline: (threadId: string) => void;
  undoDecline: (threadId: string) => void;
  createRevision: (threadId: string, previousQuotationId: string) => Quotation | undefined;
  handleAcceptance: (quotationId: string, threadId: string, userMarksAsFinal?: boolean) => void;
  setFinalQuotation: (threadId: string, quotationId: string) => void;
  updateQuotationContent: (threadId: string, quotationId: string, content: Record<string, unknown>) => void;
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
  const currentYear = new Date().getFullYear();
  const yearPrefix = `QT-${currentYear}`;
  
  // Find all refIDs that match the current year pattern
  const existingRefs = existingThreads
    .map(thread => thread.userRefID)
    .filter(refID => refID && refID.startsWith(yearPrefix))
    .map(refID => {
      const match = refID?.match(/QT-(\d{4})-(\d+)/);
      return match ? parseInt(match[2], 10) : 0;
    })
    .filter(num => !isNaN(num));
  
  // Get the highest number and increment
  const maxNumber = existingRefs.length > 0 ? Math.max(...existingRefs) : 0;
  const nextNumber = maxNumber + 1;
  
  // Format with leading zeros (e.g., 001, 002, etc.)
  return `${yearPrefix}-${nextNumber.toString().padStart(3, '0')}`;
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

  const [threads, setThreads] = useState<ThreadWithRelations[]>(() => {
    // Create some realistic dummy data
    const thread1: ThreadWithRelations = {
      threadId: "TRD-QT-2024-001",
      userRefID: "QT-2024-001",
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      quotations: [
        {
          id: randomId("q"),
          threadId: "TRD-QT-2024-001",
          version: "Quotation",
          status: "pending",
          content: {
            clientInfo: {
              name: "Ocean Freight Solutions Ltd",
              email: "procurement@oceanfreight.com",
              company: "Ocean Freight Solutions Ltd",
              address: "123 Maritime Drive, Port City, PC 12345",
            },
            items: [
              { name: "Container Shipping - 20ft", description: "Standard container shipping", quantity: 2, price: 2500, unit: "container" },
              { name: "Customs Clearance", description: "Full customs documentation and clearance", quantity: 1, price: 350, unit: "service" },
            ],
            total: 5350,
            currency: "USD",
          },
          createdAt: nowIso(),
          isFinal: false,
        },
      ],
      documents: [],
    };

    const thread2: ThreadWithRelations = {
      threadId: "TRD-QT-2024-002",
      userRefID: "QT-2024-002",
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      quotations: [
        {
          id: randomId("q"),
          threadId: "TRD-QT-2024-002",
          version: "Quotation",
          status: "accepted",
          content: {
            clientInfo: {
              name: "Global Logistics Corp",
              email: "quotes@globallogistics.com",
              company: "Global Logistics Corp",
              address: "456 Trade Avenue, Commerce City, CC 67890",
            },
            items: [
              { name: "Express Air Freight", description: "Priority air cargo service", quantity: 1, price: 4500, unit: "shipment" },
              { name: "Insurance Coverage", description: "Full cargo insurance", quantity: 1, price: 225, unit: "service" },
            ],
            total: 4725,
            currency: "USD",
          },
          createdAt: nowIso(),
          isFinal: true,
        },
      ],
      documents: [
        {
          id: randomId("doc"),
          threadId: "TRD-QT-2024-002",
          type: "purchase_order",
          filename: "PO-GLC-2024-002.pdf",
          filepath: "/mock/PO-GLC-2024-002.pdf",
          uploadedAt: nowIso(),
        },
      ],
    };

    return [thread1, thread2];
  });

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
      status: (data.status as ThreadStatus) || "active",
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

  const createQuotationWithTemplate: Store["createQuotationWithTemplate"] = (data) => {
    const threadId = generateUniqueThreadId(data.userRefID);
    const thread = createThread({ threadId, userRefID: data.userRefID, status: "active" });
    
    // Get template content
    const template = templates.find(t => t.id === data.templateId) || templates.find(t => t.isDefault);
    
    // If HRS content is provided, prioritize it
    let quotationContent: Record<string, unknown>;
    if (data.hrsContent) {
      const hrs = data.hrsContent as HRSQuotationContent;
      const total = hrs.items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
      quotationContent = { ...hrs, total } as HRSQuotationContent;
    } else {
      const items = data.items || [];
      quotationContent = {
        ...template?.content,
        clientInfo: data.clientInfo,
        items,
        total: items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
        currency: "USD",
        ...data.additionalInfo,
      } as Record<string, unknown>;
    }

    const quotation = createQuotation({
      threadId,
      version: "Quotation",
      status: "pending",
      content: quotationContent,
    });
    return { thread, quotation };
  };

  const createInitialQuotation: Store["createInitialQuotation"] = (quotationData) => {
    const threadId = generateUniqueThreadId();
    const thread = createThread({ threadId, status: "active" });
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
              status: "declined",
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
              status: "active",
              updatedAt: nowIso(),
              quotations: t.quotations.map((q) =>
                q.status === "declined" ? { ...q, status: "pending" as QuotationStatus } : q
              ),
            }
          : t
      )
    );
  };

  const createRevision: Store["createRevision"] = (threadId, previousQuotationId) => {
    const t = threads.find((x) => x.threadId === threadId);
    const prev = t?.quotations.find((q) => q.id === previousQuotationId);
    if (!prev) return undefined;
    const versionNumber = getNextVersionNumber(threadId);
    return createQuotation({
      threadId,
      version: `QuotationRevised${versionNumber}`,
      status: "pending",
      content: { ...prev.content },
    });
  };

  const handleAcceptance: Store["handleAcceptance"] = (quotationId, threadId, userMarksAsFinal) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === threadId
          ? {
              ...t,
              updatedAt: nowIso(),
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
              status: "active",
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

  const updateQuotationContent: Store["updateQuotationContent"] = (threadId, quotationId, content) => {
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
    updateThread(threadId, { status: "completed" });
  };

  const value = useMemo<Store>(() => ({
    threads,
    templates,
    getNextRefID: () => generateNextRefID(threads),
    createQuotationWithTemplate,
    createInitialQuotation,
    handleDecline,
    undoDecline,
    createRevision,
    handleAcceptance,
    setFinalQuotation,
    updateQuotationContent,
    uploadPurchaseOrder,
    createDeliveryNote,
    uploadSignedDeliveryNote,
    generateInvoice,
    completeThread,
  }), [threads, templates]);

  return <QuotationContext.Provider value={value}>{children}</QuotationContext.Provider>;
};

export const useQuotationStore = () => {
  const ctx = useContext(QuotationContext);
  if (!ctx) throw new Error("useQuotationStore must be used within QuotationProvider");
  return ctx;
};


