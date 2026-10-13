import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { EmployeeService } from '@/src/modules/employees/employee.service';
import { UpdateEmployeeSchema } from '@/src/modules/employees/employee.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionResolver.require();
    const { id } = await params;
    const employee = await EmployeeService.getEmployeeById(id, session);
    return NextResponse.json(serializeForClient(employee));
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
    const validated = UpdateEmployeeSchema.parse(body);
    const updated = await EmployeeService.updateEmployee(id, validated, session);
    return NextResponse.json(serializeForClient(updated));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
