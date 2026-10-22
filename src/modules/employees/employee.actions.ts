'use server';

import { SessionResolver } from '../auth/session.resolver';
import { EmployeeService } from './employee.service';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from './employee.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function createEmployeeAction(rawInput: CreateEmployeeInput) {
  try {
    const session = await SessionResolver.require();
    const validated = CreateEmployeeSchema.parse(rawInput);
    const result = await EmployeeService.createEmployee(validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: unknown) {
    const { message } = extractErrorInfo(error);
    return { success: false, error: message || 'Failed to create employee.' };
  }
}

export async function updateEmployeeAction(employeeId: string, rawInput: UpdateEmployeeInput) {
  try {
    const session = await SessionResolver.require();
    const validated = UpdateEmployeeSchema.parse(rawInput);
    const result = await EmployeeService.updateEmployee(employeeId, validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: unknown) {
    const { message } = extractErrorInfo(error);
    return { success: false, error: message || 'Failed to update employee.' };
  }
}

export async function toggleEmployeeActiveAction(employeeId: string, active: boolean) {
  try {
    const session = await SessionResolver.require();
    const result = await EmployeeService.setEmployeeStatus(employeeId, active, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: unknown) {
    const { message } = extractErrorInfo(error);
    return { success: false, error: message || 'Failed to change employee status.' };
  }
}
