import { NextRequest, NextResponse } from 'next/server';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { EmployeeService } from '@/src/modules/employees/employee.service';
import {
  CreateEmployeeSchema,
  EmployeeQuerySchema,
} from '@/src/modules/employees/employee.schema';
import { serializeForClient } from '@/src/server/serializers/response.serializer';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = EmployeeQuerySchema.parse(searchParams);
    const result = await EmployeeService.listEmployees(query, session);
    return NextResponse.json(serializeForClient(result));
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionResolver.require();
    const body = await request.json();
    const validated = CreateEmployeeSchema.parse(body);
    const employee = await EmployeeService.createEmployee(validated, session);
    return NextResponse.json(serializeForClient(employee), { status: 201 });
  } catch (error: any) {
    const status = error.statusCode ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
