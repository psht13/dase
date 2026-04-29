export type CustomerRecord = {
  createdAt: Date;
  email: string | null;
  fullName: string;
  id: string;
  phone: string;
  updatedAt: Date;
};

export type SaveCustomerInput = {
  email?: string | null;
  fullName: string;
  phone: string;
};

export interface CustomerRepository {
  findById(customerId: string): Promise<CustomerRecord | null>;
  save(input: SaveCustomerInput): Promise<CustomerRecord>;
}
