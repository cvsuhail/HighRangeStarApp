export interface Vessel {
  id: string;
  name: string;
  number: string;
  slnoFormat: string;
  code: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVesselData {
  name: string;
  number: string;
  slnoFormat: string;
  code: string;
}

export interface UpdateVesselData extends Partial<CreateVesselData> {
  updatedAt: string;
}

export interface VesselFilters {
  search?: string;
  sortBy?: 'name' | 'number' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
