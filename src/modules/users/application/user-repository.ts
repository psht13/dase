import type { AppRole } from "@/modules/users/domain/roles";

export type UserRecord = {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  image: string | null;
  name: string | null;
  role: AppRole;
  updatedAt: Date;
};

export interface UserRepository {
  countByRole(role: AppRole): Promise<number>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  updateRole(userId: string, role: AppRole): Promise<UserRecord>;
}
