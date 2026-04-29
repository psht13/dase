import type { AppRole } from "@/modules/users/domain/roles";

export type UserRecord = {
  createdAt: Date;
  email: string;
  id: string;
  name: string | null;
  role: AppRole;
  updatedAt: Date;
};

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}
