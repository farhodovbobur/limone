import { api } from '../../../shared/api/axios';

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  role: string;
}

export type UpdateUserInput = Partial<
  Omit<CreateUserInput, 'username' | 'password'> & { isActive: boolean }
>;

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),
  create: (input: CreateUserInput) =>
    api.post<User>('/users', input).then((r) => r.data),
  update: (id: number, input: UpdateUserInput) =>
    api.patch<User>(`/users/${id}`, input).then((r) => r.data),
};

export const ASSIGNABLE_ROLES = [
  'admin',
  'warehouse_keeper',
  'workshop_manager',
  'worker',
  'sales',
] as const;
