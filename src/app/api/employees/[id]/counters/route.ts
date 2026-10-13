import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { EmployeeService } from '@/src/modules/employees/employee.service';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const balances = await EmployeeService.getEmployeeBalances(id, session);
    return NextResponse.json(serializeForClient(balances));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
