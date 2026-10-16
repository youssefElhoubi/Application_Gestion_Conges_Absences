'use server';

import { revalidatePath } from 'next/cache';
import { SessionResolver } from '../auth/session.resolver';
import { AbsenceService } from './absence.service';
import {
  CreateAbsenceSchema,
  ApproveAbsenceSchema,
  RejectAbsenceSchema,
  CancelAbsenceSchema,
  CreateAbsenceInput,
  ApproveAbsenceInput,
  RejectAbsenceInput,
  CancelAbsenceInput,
} from './absence.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function createAbsenceAction(rawInput: CreateAbsenceInput) {
  try {
    const session = await SessionResolver.require();
    const validated = CreateAbsenceSchema.parse(rawInput);
    const result = await AbsenceService.createAbsenceRequest(validated, session);
    revalidatePath('/absences');
    revalidatePath('/portal/requests');
    revalidatePath('/');
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to submit absence request.' };
  }
}

export async function approveAbsenceAction(absenceId: string | number | bigint, rawInput: ApproveAbsenceInput = {}) {
  try {
    const session = await SessionResolver.require();
    const validated = ApproveAbsenceSchema.parse(rawInput);
    const result = await AbsenceService.approveAbsence(BigInt(absenceId), validated, session);
    revalidatePath('/absences');
    revalidatePath('/portal/requests');
    revalidatePath('/');
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to approve absence.' };
  }
}

export async function rejectAbsenceAction(absenceId: string | number | bigint, rawInput: RejectAbsenceInput) {
  try {
    const session = await SessionResolver.require();
    const validated = RejectAbsenceSchema.parse(rawInput);
    const result = await AbsenceService.rejectAbsence(BigInt(absenceId), validated, session);
    revalidatePath('/absences');
    revalidatePath('/portal/requests');
    revalidatePath('/');
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject absence.' };
  }
}

export async function cancelAbsenceAction(absenceId: string | number | bigint, rawInput: CancelAbsenceInput = {}) {
  try {
    const session = await SessionResolver.require();
    const validated = CancelAbsenceSchema.parse(rawInput);
    const result = await AbsenceService.cancelAbsence(BigInt(absenceId), validated, session);
    revalidatePath('/absences');
    revalidatePath('/portal/requests');
    revalidatePath('/');
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel absence.' };
  }
}

export async function updateAbsenceAction(absenceId: string | number | bigint, rawInput: CreateAbsenceInput) {
  try {
    const session = await SessionResolver.require();
    const validated = CreateAbsenceSchema.parse(rawInput);
    const result = await AbsenceService.updateAbsenceRequest(BigInt(absenceId), validated, session);
    revalidatePath('/absences');
    revalidatePath('/portal/requests');
    revalidatePath('/');
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update absence request.' };
  }
}

