import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { SiteService } from '@/src/modules/sites/site.service';
import { UpdateSiteSchema } from '@/src/modules/sites/site.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const site = await SiteService.getSiteById(Number(id), session);
    return NextResponse.json(serializeForClient(site));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateSiteSchema.parse(body);
    const updated = await SiteService.updateSite(Number(id), validated, session);
    return NextResponse.json(serializeForClient(updated));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
