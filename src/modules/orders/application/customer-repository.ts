export type CustomerRecord = {
  createdAt: Date;
  email: string | null;
  fullName: string;
  id: string;
  instagramUsername: string | null;
  phone: string;
  updatedAt: Date;
};

export type SaveCustomerInput = {
  email?: string | null;
  fullName: string;
  instagramUsername?: string | null;
  phone: string;
};

export interface CustomerRepository {
  findById(customerId: string): Promise<CustomerRecord | null>;
  save(input: SaveCustomerInput): Promise<CustomerRecord>;
}
