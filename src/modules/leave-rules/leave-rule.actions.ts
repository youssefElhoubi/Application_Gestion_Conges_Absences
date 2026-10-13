'use server';

import { SessionResolver } from '../auth/session.resolver';
import { LeaveRuleService } from './leave-rule.service';
import {
  CreateLeaveRuleSchema,
  UpdateLeaveRuleSchema,
  CreateLeaveRuleInput,
  UpdateLeaveRuleInput,
} from './leave-rule.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function createLeaveRuleAction(rawInput: CreateLeaveRuleInput) {
  try {
    const session = await SessionResolver.require();
    const validated = CreateLeaveRuleSchema.parse(rawInput);
    const result = await LeaveRuleService.createRule(validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create leave rule.' };
  }
}

export async function updateLeaveRuleAction(id: string | number | bigint, rawInput: UpdateLeaveRuleInput) {
  try {
    const session = await SessionResolver.require();
    const validated = UpdateLeaveRuleSchema.parse(rawInput);
    const result = await LeaveRuleService.updateRule(BigInt(id), validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update leave rule.' };
  }
}

export async function toggleLeaveRuleActiveAction(id: string | number | bigint, active: boolean) {
  try {
    const session = await SessionResolver.require();
    const result = await LeaveRuleService.setRuleActive(BigInt(id), active, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to toggle rule status.' };
  }
}
