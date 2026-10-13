'use server';

import { SessionResolver } from '../auth/session.resolver';
import { PublicHolidayService } from './public-holiday.service';
import {
  CreatePublicHolidaySchema,
  UpdatePublicHolidaySchema,
  CreatePublicHolidayInput,
  UpdatePublicHolidayInput,
} from './public-holiday.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function createPublicHolidayAction(rawInput: CreatePublicHolidayInput) {
  try {
    const session = await SessionResolver.require();
    const validated = CreatePublicHolidaySchema.parse(rawInput);
    const result = await PublicHolidayService.createHoliday(validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create holiday.' };
  }
}

export async function updatePublicHolidayAction(id: string | number | bigint, rawInput: UpdatePublicHolidayInput) {
  try {
    const session = await SessionResolver.require();
    const validated = UpdatePublicHolidaySchema.parse(rawInput);
    const result = await PublicHolidayService.updateHoliday(BigInt(id), validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update holiday.' };
  }
}

export async function deletePublicHolidayAction(id: string | number | bigint) {
  try {
    const session = await SessionResolver.require();
    const result = await PublicHolidayService.deleteHoliday(BigInt(id), session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete holiday.' };
  }
}
