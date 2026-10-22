import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { SiteService } from '@/src/modules/sites/site.service';
import { CreateSiteSchema, SiteQuerySchema } from '@/src/modules/sites/site.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = SiteQuerySchema.parse(searchParams);
    const result = await SiteService.listSites(query, session);
    return NextResponse.json(serializeForClient(result));
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const body = await request.json();
    const validated = CreateSiteSchema.parse(body);
    const site = await SiteService.createSite(validated, session);
    return NextResponse.json(serializeForClient(site), { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
