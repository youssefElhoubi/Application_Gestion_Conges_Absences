'use server';

import { SessionResolver } from '../auth/session.resolver';
import { SiteService } from './site.service';
import { CreateSiteSchema, UpdateSiteSchema, CreateSiteInput, UpdateSiteInput } from './site.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function createSiteAction(rawInput: CreateSiteInput) {
  try {
    const session = await SessionResolver.require();
    const validated = CreateSiteSchema.parse(rawInput);
    const result = await SiteService.createSite(validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: unknown) {
    const { message } = extractErrorInfo(error);
    return { success: false, error: message || 'Failed to create site.' };
  }
}

export async function updateSiteAction(siteId: number, rawInput: UpdateSiteInput) {
  try {
    const session = await SessionResolver.require();
    const validated = UpdateSiteSchema.parse(rawInput);
    const result = await SiteService.updateSite(siteId, validated, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: unknown) {
    const { message } = extractErrorInfo(error);
    return { success: false, error: message || 'Failed to update site.' };
  }
}

export async function toggleSiteActiveAction(siteId: number, active: boolean) {
  try {
    const session = await SessionResolver.require();
    const result = await SiteService.setSiteActive(siteId, active, session);
    return { success: true, data: serializeForClient(result) };
  } catch (error: unknown) {
    const { message } = extractErrorInfo(error);
    return { success: false, error: message || 'Failed to change site status.' };
  }
}
