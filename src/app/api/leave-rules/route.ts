import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { LeaveRuleService } from '@/src/modules/leave-rules/leave-rule.service';
import {
  CreateLeaveRuleSchema,
  LeaveRuleQuerySchema,
} from '@/src/modules/leave-rules/leave-rule.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = LeaveRuleQuerySchema.parse(searchParams);
    const result = await LeaveRuleService.listRules(query, session);
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
    const validated = CreateLeaveRuleSchema.parse(body);
    const rule = await LeaveRuleService.createRule(validated, session);
    return NextResponse.json(serializeForClient(rule), { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message } = extractErrorInfo(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
