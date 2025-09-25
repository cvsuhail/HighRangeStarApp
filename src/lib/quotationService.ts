import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, getFirebaseStorage } from './firebase';
import type { HRSQuotationContent, Quotation, Thread } from '@/types/quotation';

const THREADS_COLLECTION = 'threads';

export type CreateQuotationPayload = {
  userRefID: string; // required; treat as external thread id as well
  hrsContent: Omit<HRSQuotationContent, 'total'>;
};

export class QuotationService {
  private static getDb() {
    const db = getFirestore();
    if (!db) throw new Error('Firestore not initialized');
    return db;
  }

  /**
   * Create a quotation thread (if not exists) and the initial quotation document
   * - Thread doc id = provided userRefID (stable, human-friendly)
   * - Stores `userRefID` on thread for redundancy
   * - Adds subcollection `quotations` with the first quotation content
   */
  static async createQuotationWithHRS(payload: CreateQuotationPayload): Promise<{ thread: Thread; quotation: Quotation }>{
    const db = this.getDb();

    const threadId = payload.userRefID; // use given ref as thread id
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);

    // Upsert thread document
    // Firestore: avoid undefined fields; only set supported values
    await setDoc(
      threadRef,
      {
        threadId,
        userRefID: payload.userRefID,
        status: 'QuotationCreated',
        clientName: payload.hrsContent.partyName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Prepare quotation content with derived total
    const total = payload.hrsContent.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
    const quotationContent = { ...payload.hrsContent, total } as HRSQuotationContent;

    const quotationsCol = collection(threadRef, 'quotations');
    const qRef = await addDoc(quotationsCol, {
      version: 'Quotation',
      status: 'pending',
      content: quotationContent,
      isFinal: false,
      createdAt: serverTimestamp(),
    });

    // Return normalized runtime shapes (with ids). Timestamps are ISO only after fetching; provide placeholders.
    const thread: Thread = {
      threadId,
      userRefID: payload.userRefID,
      status: 'QuotationCreated',
      clientName: payload.hrsContent.partyName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const quotation: Quotation = {
      id: qRef.id,
      threadId,
      version: 'Quotation',
      status: 'pending',
      content: quotationContent as unknown as Record<string, unknown>,
      createdAt: new Date().toISOString(),
      isFinal: false,
    };

    return { thread, quotation };
  }

  /**
   * Create a revised quotation based on a previous quotation in the same thread.
   * - Computes next version name: `QuotationRevised<N>` where N is count+1
   * - Copies previous content, sets status to pending, isFinal false
   */
  static async createRevision(
    threadId: string,
    previousQuotationId: string,
    contentOverride?: Record<string, unknown>
  ): Promise<{ quotation: Quotation }> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    const quotationsCol = collection(threadRef, 'quotations');

    // Load previous quotation content
    const prevRef = doc(quotationsCol, previousQuotationId);
    const prevSnap = await getDoc(prevRef);
    if (!prevSnap.exists()) {
      throw new Error('Previous quotation not found');
    }
    const prevData = prevSnap.data() as Record<string, unknown>;

    // Determine next revision number
    const allSnap = await getDocs(query(quotationsCol, orderBy('createdAt', 'desc')));
    let countRevisions = 0;
    allSnap.forEach((d) => {
      const v = String((d.data() as Record<string, unknown>).version || '');
      if (v.startsWith('QuotationRevised')) countRevisions += 1;
    });
    const version = `QuotationRevised${countRevisions + 1}`;

    // Clone content (ensure object) and optionally override
    const content = (contentOverride as Record<string, unknown>) || (prevData.content as Record<string, unknown>) || {};

    const qRef = await addDoc(quotationsCol, {
      version,
      status: 'pending',
      content,
      isFinal: false,
      createdAt: serverTimestamp(),
    });

    const quotation: Quotation = {
      id: qRef.id,
      threadId,
      version,
      status: 'pending',
      content: content as Record<string, unknown>,
      createdAt: new Date().toISOString(),
      isFinal: false,
    };

    return { quotation };
  }

  /**
   * Compute next ref id from existing threads in Firestore
   * Pattern: HRS-QN-<number>, optional suffix is ignored
   */
  static async getNextRefID(): Promise<string> {
    const db = this.getDb();
    const col = collection(db, THREADS_COLLECTION);
    const qy = query(col, orderBy('createdAt', 'desc'));
    const snap = await getDocs(qy);
    const numbers: number[] = [];
    snap.forEach(d => {
      const data = d.data() as { userRefID?: string };
      const ref = data.userRefID || d.id;
      const m = typeof ref === 'string' ? ref.match(/HRS-QN-(\d{2,})/i) : null;
      if (m) numbers.push(parseInt(m[1], 10));
    });
    const seedBase = 25000;
    const base = numbers.length ? Math.max(...numbers) : seedBase;
    return `HRS-QN-${base + 1}`;
  }

  /**
   * Mark a quotation as final on a thread by storing its id on the thread doc.
   * Call this when a user confirms the final quotation version.
   */
  static async setFinalQuotationId(threadId: string, quotationId: string): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    await updateDoc(threadRef, {
      finalQuotationId: quotationId,
      updatedAt: serverTimestamp(),
    });
  }

  /** Update the thread status string */
  static async setThreadStatus(threadId: string, status: string): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    await updateDoc(threadRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /** Mark a specific quotation document's isFinal flag */
  static async setQuotationIsFinal(threadId: string, quotationId: string, isFinal = true): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    const qRef = doc(collection(threadRef, 'quotations'), quotationId);
    await updateDoc(qRef, {
      isFinal,
      updatedAt: serverTimestamp(),
    });
  }

  /** Update a specific quotation document's status */
  static async setQuotationStatus(threadId: string, quotationId: string, status: 'pending' | 'accepted' | 'declined'): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    const qRef = doc(collection(threadRef, 'quotations'), quotationId);
    await updateDoc(qRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /** Persist the current active step on the thread document */
  static async setThreadActiveStep(threadId: string, activeStep: number): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    await updateDoc(threadRef, {
      activeStep,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Attach a Purchase Order id to a thread once a PO is uploaded/linked.
   */
  static async setPurchaseOrderId(threadId: string, poId: string): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    await updateDoc(threadRef, {
      poId,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Upload a file to Firebase Storage and return the download URL
   */
  static async uploadFile(file: File, path: string): Promise<string> {
    const storage = getFirebaseStorage();
    if (!storage) throw new Error('Firebase Storage not initialized');
    
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  }

  /**
   * Upload a Purchase Order PDF file and update thread with PoID
   */
  static async uploadPurchaseOrder(
    threadId: string, 
    file: File, 
    poId: string
  ): Promise<{ downloadURL: string; documentId: string }> {
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed for Purchase Orders');
    }

    const db = this.getDb();
    
    // Create document entry first (renamed subcollection: purchaseOrders)
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    const purchaseOrdersCol = collection(threadRef, 'purchaseOrders');
    const docRef = await addDoc(purchaseOrdersCol, {
      type: 'purchase_order',
      filename: file.name,
      filepath: '', // Will be updated after upload
      uploadedAt: serverTimestamp(),
    });

    // Upload file to storage
    const filePath = `purchase-orders/${threadId}/${docRef.id}/${file.name}`;
    const downloadURL = await this.uploadFile(file, filePath);

    // Update document with file path
    await updateDoc(doc(purchaseOrdersCol, docRef.id), {
      filepath: downloadURL,
    });

    // Update thread with PoID and move to next step
    await updateDoc(threadRef, {
      poId,
      activeStep: 3, // Step 3: Create Delivery Note
      status: 'PurchaseOrderUploaded',
      updatedAt: serverTimestamp(),
    });

    return { downloadURL, documentId: docRef.id };
  }

  /** Replace an existing purchase order file by uploading a new PDF and updating the document */
  static async replacePurchaseOrder(
    threadId: string,
    documentId: string,
    file: File
  ): Promise<{ downloadURL: string }>{
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed for Purchase Orders');
    }

    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    const purchaseOrdersCol = collection(threadRef, 'purchaseOrders');

    const filePath = `purchase-orders/${threadId}/${documentId}/${file.name}`;
    const downloadURL = await this.uploadFile(file, filePath);

    await updateDoc(doc(purchaseOrdersCol, documentId), {
      filename: file.name,
      filepath: downloadURL,
      uploadedAt: serverTimestamp(),
    });

    return { downloadURL };
  }

  /** Update a quotation content in Firestore */
  static async updateQuotationContent(threadId: string, quotationId: string, content: Record<string, unknown>): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    const qRef = doc(collection(threadRef, 'quotations'), quotationId);
    await updateDoc(qRef, {
      content,
      updatedAt: serverTimestamp(),
    });
  }

  /** Delete a quotation from a thread */
  static async deleteQuotation(threadId: string, quotationId: string): Promise<void> {
    const db = this.getDb();
    const threadRef = doc(collection(db, THREADS_COLLECTION), threadId);
    const qRef = doc(collection(threadRef, 'quotations'), quotationId);
    await deleteDoc(qRef);
  }
}


