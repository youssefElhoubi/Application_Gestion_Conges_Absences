'use server';

import { SessionResolver } from '../auth/session.resolver';
import { HolidayWorkCreditService } from './holiday-work-credit.service';
import {
  GrantHolidayCreditSchema,
  CorrectHolidayCreditSchema,
  GrantHolidayCreditInput,
  CorrectHolidayCreditInput,
} from './holiday-work-credit.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function grantHolidayCreditAction(rawInput: GrantHolidayCreditInput) {
  try {
    const session = await SessionResolver.require();
    const validated = GrantHolidayCreditSchema.parse(rawInput);
    const result = await HolidayWorkCreditService.grantCredit(validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to grant recovery credit.' };
  }
}

export async function correctHolidayCreditAction(creditId: string | number | bigint, rawInput: CorrectHolidayCreditInput) {
  try {
    const session = await SessionResolver.require();
    const validated = CorrectHolidayCreditSchema.parse(rawInput);
    const result = await HolidayWorkCreditService.correctCredit(BigInt(creditId), validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to correct recovery credit.' };
  }
}
