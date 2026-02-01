import { Request } from 'express';
import { TUserRole } from '../../auth/user.type';

export interface IAuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    email?: string;
    role?: TUserRole;
  };
}

export interface IGoogleAuthRequest extends Request {
  user?: {
    user: Record<string, any>;
    token: string;
  };
}
