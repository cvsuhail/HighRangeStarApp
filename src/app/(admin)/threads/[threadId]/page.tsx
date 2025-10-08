"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuotationStore } from "@/context/QuotationStore";
import HRSQuotationTemplate from "@/components/quotation/HRSQuotationTemplate";
import FileUpload from "@/components/form/FileUpload";
import WorkflowProgress, { WorkflowProgressMobile } from "@/components/common/WorkflowProgress";
import type { HRSQuotationContent, Quotation, QuotationStatus } from "@/types/quotation";
import type { Firestore } from "firebase/firestore";

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { threads, setFinalQuotation, markPurchaseOrderUploaded, createReverseQuotation, markQuotationDeclined, createDeliveryNoteWithHRS } = useQuotationStore();

  const threadId = String(params?.threadId || "");
  const storeThread = React.useMemo(() => threads.find(t => t.threadId === threadId), [threads, threadId]);
  const storeQuotations = React.useMemo(() => storeThread?.quotations ?? [], [storeThread]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [fsThread, setFsThread] = React.useState<{ threadId: string; userRefID?: string; status?: string; activeStep?: number; clientName?: string; createdAt?: unknown; updatedAt?: unknown; poId?: string; documents?: Array<{ type: string; id: string; filename: string; filepath: string }> } | null>(null);
  const [fsQuotations, setFsQuotations] = React.useState<Quotation[]>([]);
  const [poIdInput, setPoIdInput] = React.useState("");
  const [isMarkingPO, setIsMarkingPO] = React.useState(false);
  const [isUploadingPO, setIsUploadingPO] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const { getFirestore } = await import("@/lib/firebase");
        const db = getFirestore();
        if (!db) return;
        const { doc, getDoc, collection, getDocs, query, orderBy } = await import("firebase/firestore");
        const tRef = doc(db as Firestore, "threads", threadId);
        const tSnap = await getDoc(tRef);
        if (tSnap.exists()) {
          const tData = tSnap.data() as Record<string, unknown>;
          
          // Fetch purchase orders (renamed from documents)
          const purchaseOrdersCol = collection(tRef, "purchaseOrders");
          const documentsSnap = await getDocs(query(purchaseOrdersCol, orderBy("uploadedAt", "desc")));
          const documents: Array<{ type: string; id: string; filename: string; filepath: string }> = [];
          documentsSnap.forEach(docSnap => {
            const docData = docSnap.data() as Record<string, unknown>;
            documents.push({
              id: docSnap.id,
              type: String(docData.type || ''),
              filename: String(docData.filename || ''),
              filepath: String(docData.filepath || '')
            });
          });
          
          if (mounted) {
            setFsThread({
              threadId: tSnap.id,
              userRefID: String(tData.userRefID || ''),
              status: String(tData.status || ''),
              activeStep: Number(tData.activeStep || 0),
              clientName: String(tData.clientName || ''),
            createdAt: tData.createdAt,
            updatedAt: tData.updatedAt,
              poId: String(tData.poId || ''),
              documents
            });
          }
        }
        
        // Fetch quotations
        const quotationsCol = collection(tRef, "quotations");
        const quotationsSnap = await getDocs(query(quotationsCol, orderBy("createdAt", "desc")));
        const quotations: Quotation[] = [];
        quotationsSnap.forEach(docSnap => {
          const qData = docSnap.data() as Record<string, unknown>;
          quotations.push({
            id: docSnap.id,
            threadId: String(qData.threadId || ''),
            version: String(qData.version || ''),
            status: String(qData.status || '') as QuotationStatus,
            isFinal: Boolean(qData.isFinal),
            content: qData.content as HRSQuotationContent,
            createdAt: qData.createdAt as unknown,
            updatedAt: qData.updatedAt as unknown
          });
        });
        
        if (mounted) {
          setFsQuotations(quotations);
        }
      } catch (error) {
        console.error("Error fetching thread data:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();
    
    return () => { mounted = false; };
  }, [threadId]);

  const thread = fsThread || storeThread;
  const quotations = fsQuotations.length > 0 ? fsQuotations : storeQuotations;
  const latest = quotations[0];

  // Helper function to safely format dates
  const formatDate = (dateValue: unknown): string | undefined => {
    if (!dateValue) return undefined;
    
    try {
      const date = new Date(dateValue as string);
      if (isNaN(date.getTime())) return undefined;
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Invalid date value:', dateValue);
      return undefined;
    }
  };

  // Simplified workflow steps
  const workflowSteps = React.useMemo(() => {
    const quotationDate = formatDate(latest?.createdAt);
    
    const steps = [
      {
        id: "quotation",
        title: "Quotation",
        date: quotationDate,
        status: latest?.isFinal ? "completed" as const : "active" as const,
        statusText: latest?.isFinal ? "Completed successfully" : "Ready for action",
        action: latest?.isFinal ? {
          label: "View",
          onClick: () => router.push(`/quotations/${threadId}`),
          variant: "view" as const
        } : {
          label: "Create",
          onClick: () => router.push(`/quotations/${threadId}`),
          variant: "create" as const
        }
      },
      {
        id: "reverse-quotation",
        title: "Reverse Quotation",
        date: quotationDate,
        status: latest?.isFinal ? "completed" as const : "pending" as const,
        statusText: latest?.isFinal ? "Completed successfully" : "Waiting for previous steps",
        action: latest?.isFinal ? {
          label: "View",
          onClick: () => router.push(`/quotations/${threadId}`),
          variant: "view" as const
        } : undefined
      },
      {
        id: "decision",
        title: "Decision",
        date: quotationDate,
        status: latest?.isFinal ? "completed" as const : "pending" as const,
        statusText: latest?.isFinal ? "Quotation finalized" : "Waiting for previous steps",
        action: latest?.isFinal ? {
          label: "View",
          onClick: () => router.push(`/quotations/${threadId}`),
          variant: "view" as const
        } : undefined
      },
      {
        id: "purchase-order",
        title: "Purchase Order",
        date: thread?.poId ? new Date().toISOString().split('T')[0] : undefined,
        status: thread?.poId ? "completed" as const : "active" as const,
        statusText: thread?.poId ? "Completed successfully" : "Ready for action",
        action: thread?.poId ? {
          label: "View",
          onClick: () => {},
          variant: "view" as const
        } : {
          label: "Upload",
          onClick: () => {},
          variant: "create" as const
        }
      },
      {
        id: "delivery-note",
        title: "Delivery Note",
        status: thread?.documents?.some(d => d.type === 'delivery_note_unsigned') ? "completed" as const : "pending" as const,
        statusText: thread?.documents?.some(d => d.type === 'delivery_note_unsigned') ? "Completed successfully" : "Waiting for previous steps",
        action: thread?.documents?.some(d => d.type === 'delivery_note_unsigned') ? {
          label: "View",
          onClick: () => {},
          variant: "view" as const
        } : undefined
      },
      {
        id: "signed-delivery",
        title: "Signed Delivery",
        status: thread?.documents?.some(d => d.type === 'delivery_note_signed') ? "completed" as const : "pending" as const,
        statusText: thread?.documents?.some(d => d.type === 'delivery_note_signed') ? "Completed successfully" : "Waiting for previous steps",
        action: thread?.documents?.some(d => d.type === 'delivery_note_signed') ? {
          label: "View",
          onClick: () => {},
          variant: "view" as const
        } : undefined
      },
      {
        id: "invoice",
        title: "Invoice",
        status: thread?.documents?.some(d => d.type === 'invoice') ? "completed" as const : "pending" as const,
        statusText: thread?.documents?.some(d => d.type === 'invoice') ? "Completed successfully" : "Waiting for previous steps",
        action: thread?.documents?.some(d => d.type === 'invoice') ? {
          label: "View",
          onClick: () => {},
          variant: "view" as const
        } : undefined
      }
    ];

    return steps;
  }, [thread, latest, threadId, router]);

  // Simple action handlers
  const handleCreateQuotation = () => {
    router.push(`/quotations/${threadId}`);
  };

  const handleUploadPO = async () => {
    if (!poIdInput.trim()) {
      alert("Please enter a Purchase Order ID");
      return;
    }
    if (!selectedFile) {
      alert("Please select a file to upload");
      return;
    }
    
    setIsUploadingPO(true);
    try {
      await markPurchaseOrderUploaded(threadId, poIdInput.trim(), selectedFile);
        setPoIdInput("");
        setSelectedFile(null);
      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error("Error uploading PO:", error);
      alert("Failed to upload purchase order. Please try again.");
    } finally {
      setIsUploadingPO(false);
    }
  };

  const handleCreateDeliveryNote = async () => {
    try {
      await createDeliveryNoteWithHRS(threadId);
      window.location.reload();
    } catch (error) {
      console.error("Error creating delivery note:", error);
      alert("Failed to create delivery note. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!thread) {
  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thread Not Found</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">The requested thread could not be found.</p>
          <button
            onClick={() => router.push("/threads")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Threads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {thread.userRefID || thread.threadId}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Document Workflow
              </p>
            </div>
            <button
              onClick={() => router.push("/threads")}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to Threads
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workflow Progress - Desktop */}
          <div className="lg:col-span-1 hidden lg:block">
            <WorkflowProgress steps={workflowSteps} />
          </div>

          {/* Workflow Progress - Mobile */}
          <div className="lg:hidden">
            <WorkflowProgressMobile steps={workflowSteps} />
        </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Step Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Current Step
              </h2>

              {/* Quotation Step */}
              {!latest?.isFinal && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">Create Quotation</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Start by creating a quotation for this client.
                    </p>
                    <button
                      onClick={handleCreateQuotation}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Quotation
                    </button>
              </div>
            </div>
          )}

              {/* Purchase Order Step */}
              {latest?.isFinal && !thread.poId && (
                  <div className="space-y-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h3 className="font-medium text-orange-900 dark:text-orange-100">Upload Purchase Order</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Upload the customer's purchase order document.
                    </p>
                    
                    <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Purchase Order ID
                      </label>
                      <input
                        type="text"
                        value={poIdInput}
                        onChange={(e) => setPoIdInput(e.target.value)}
                          placeholder="Enter PO ID"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Upload File
                      </label>
                      <FileUpload
                          onFileSelect={setSelectedFile}
                          selectedFile={selectedFile}
                          accept=".pdf"
                      />
                    </div>
                    
                      <button
                        onClick={handleUploadPO}
                        disabled={!poIdInput.trim() || !selectedFile || isUploadingPO}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUploadingPO ? "Uploading..." : "Upload Purchase Order"}
                      </button>
                    </div>
              </div>
            </div>
          )}

              {/* Delivery Note Step */}
              {thread.poId && !thread.documents?.some(d => d.type === 'delivery_note_unsigned') && (
                  <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="font-medium text-green-900 dark:text-green-100">Create Delivery Note</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Generate a delivery note for this order.
                    </p>
                    <button
                      onClick={handleCreateDeliveryNote}
                      className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create Delivery Note
                    </button>
              </div>
            </div>
          )}

              {/* Success State */}
              {thread.documents?.some(d => d.type === 'delivery_note_unsigned') && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <h3 className="font-medium text-emerald-900 dark:text-emerald-100">Delivery Note Created</h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    The delivery note has been generated successfully.
                  </p>
                </div>
              )}
            </div>

            {/* Document Status */}
            {thread.documents && thread.documents.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Documents
                </h2>
                <div className="space-y-3">
                  {thread.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.filename}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{doc.type.replace('_', ' ').toUpperCase()}</p>
                        </div>
                      </div>
                      <a
                        href={doc.filepath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}