import { UnauthorizedException } from '@nestjs/common';
import { IAuthenticatedRequest } from '../types/authenticated-request.interface';

export async function validateUserId(req: IAuthenticatedRequest) {
  const userId = req?.user?.userId;

  if (!userId) {
    throw new UnauthorizedException('User not authenticated.');
  }
  return userId;
}
