import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  email: string | null;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string | null;
}
