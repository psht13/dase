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
  save(input: SaveCustomerInput): Promise<CustomerRecord>;
}
