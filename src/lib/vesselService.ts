import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { getFirestore } from './firebase';
import type { Vessel, CreateVesselData, UpdateVesselData, VesselFilters } from '../types/vessel';

const COLLECTION_NAME = 'vessels';

export class VesselService {
  private static getCollection() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    return collection(db, COLLECTION_NAME);
  }

  /**
   * Create a new vessel
   */
  static async createVessel(data: CreateVesselData): Promise<Vessel> {
    try {
      const col = this.getCollection();
      const now = new Date().toISOString();
      
      const vesselData = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(col, vesselData);
      
      return {
        id: docRef.id,
        ...vesselData,
      };
    } catch (error) {
      console.error('Error creating vessel:', error);
      throw new Error('Failed to create vessel');
    }
  }

  /**
   * Get all vessels with optional filtering and pagination
   */
  static async getVessels(filters: VesselFilters = {}): Promise<Vessel[]> {
    try {
      const col = this.getCollection();
      let q = query(col);

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      q = query(q, orderBy(sortBy, sortOrder));

      // Apply search filter
      if (filters.search) {
        // Note: Firestore doesn't support case-insensitive search natively
        // For production, consider using Algolia or implementing server-side search
        const searchTerm = filters.search.toLowerCase();
        // We'll filter in memory for now, but this should be optimized
      }

      const querySnapshot = await getDocs(q);
      const vessels: Vessel[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        vessels.push({
          id: doc.id,
          name: data.name,
          number: data.number,
          slnoFormat: data.slnoFormat,
          code: data.code,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Apply search filter in memory (temporary solution)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return vessels.filter(vessel =>
          vessel.name.toLowerCase().includes(searchTerm) ||
          vessel.number.toLowerCase().includes(searchTerm) ||
          vessel.code.toLowerCase().includes(searchTerm)
        );
      }

      return vessels;
    } catch (error) {
      console.error('Error fetching vessels:', error);
      throw new Error('Failed to fetch vessels');
    }
  }

  /**
   * Get a single vessel by ID
   */
  static async getVesselById(id: string): Promise<Vessel | null> {
    try {
      const col = this.getCollection();
      const vesselDoc = doc(col, id);
      const docSnap = await getDoc(vesselDoc);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          number: data.number,
          slnoFormat: data.slnoFormat,
          code: data.code,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching vessel:', error);
      throw new Error('Failed to fetch vessel');
    }
  }

  /**
   * Update a vessel
   */
  static async updateVessel(id: string, data: UpdateVesselData): Promise<Vessel> {
    try {
      const col = this.getCollection();
      const vesselDoc = doc(col, id);
      
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(vesselDoc, updateData);
      
      // Fetch and return the updated vessel
      const updatedVessel = await this.getVesselById(id);
      if (!updatedVessel) {
        throw new Error('Vessel not found after update');
      }
      
      return updatedVessel;
    } catch (error) {
      console.error('Error updating vessel:', error);
      throw new Error('Failed to update vessel');
    }
  }

  /**
   * Delete a vessel
   */
  static async deleteVessel(id: string): Promise<void> {
    try {
      const col = this.getCollection();
      const vesselDoc = doc(col, id);
      await deleteDoc(vesselDoc);
    } catch (error) {
      console.error('Error deleting vessel:', error);
      throw new Error('Failed to delete vessel');
    }
  }

  /**
   * Check if a vessel number already exists (for validation)
   */
  static async checkVesselNumberExists(number: string, excludeId?: string): Promise<boolean> {
    try {
      const col = this.getCollection();
      const q = query(col, where('number', '==', number));
      const querySnapshot = await getDocs(q);
      
      // Check if any document with this number exists
      // If excludeId is provided, exclude that document from the check
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    } catch (error) {
      console.error('Error checking vessel number:', error);
      throw new Error('Failed to check vessel number');
    }
  }

  /**
   * Check if a vessel code already exists (for validation)
   */
  static async checkVesselCodeExists(code: string, excludeId?: string): Promise<boolean> {
    try {
      const col = this.getCollection();
      const q = query(col, where('code', '==', code));
      const querySnapshot = await getDocs(q);
      
      // Check if any document with this code exists
      // If excludeId is provided, exclude that document from the check
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    } catch (error) {
      console.error('Error checking vessel code:', error);
      throw new Error('Failed to check vessel code');
    }
  }
}
