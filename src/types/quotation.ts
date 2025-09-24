export type ThreadStatus =
  | 'QuotationCreated'
  | 'QuotationDeclined'
  | 'QuotationAccepted'
  | 'PurchaseOrderRecieved'
  | 'WorkStarted'
  | 'DeliveryNoteCreated'
  | 'UploadedSignedDeliveryNote'
  | 'InvoiceCreated'
  | 'Completed';
export type QuotationStatus = 'pending' | 'accepted' | 'declined';
export type DocumentType = 'purchase_order' | 'delivery_note_unsigned' | 'delivery_note_signed' | 'invoice';

export type Thread = {
  threadId: string;
  userRefID?: string; // User-provided reference ID for the quotation
  poId?: string;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
  finalQuotationId?: string;
};

export type Quotation = {
  id: string;
  threadId: string;
  version: string; // e.g., 'Quotation', 'QuotationRevised1'
  status: QuotationStatus;
  content: Record<string, unknown>;
  createdAt: string;
  isFinal?: boolean;
};

export type Document = {
  id: string;
  threadId: string;
  type: DocumentType;
  filename: string;
  filepath: string;
  uploadedAt: string;
};

export type ThreadWithRelations = Thread & {
  quotations: Quotation[];
  documents: Document[];
};

export type QuotationTemplate = {
  id: string;
  name: string;
  description: string;
  content: Record<string, unknown>;
  isDefault?: boolean;
};

// High Range Star specific quotation content
export type HRSQuotationItem = {
  slNo: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number; // derived: qty * unitPrice (still store for simplicity)
};

export type HRSQuotationContent = {
  refID: string;
  partyName: string;
  partyAddress: string;
  date: string; // ISO string
  vesselName: string;
  items: HRSQuotationItem[];
  total: number;
  totalAmountInWords: string;
  note: string;
  deliveryTerms: string;
  paymentTerms: string;
  mobileNumber: string;
  email: string;
};

export type CreateQuotationData = {
  userRefID: string;
  templateId?: string;
  // Backward compatible generic client info kept but optional for our template
  clientInfo?: {
    name?: string;
    email?: string;
    company?: string;
    address?: string;
  };
  // New HRS content fields used by our template
  hrsContent: Omit<HRSQuotationContent, "total">; // total computed at creation
  // Generic items/template fields kept for other templates
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
    unit: string;
  }>;
  additionalInfo?: Record<string, unknown>;
};


