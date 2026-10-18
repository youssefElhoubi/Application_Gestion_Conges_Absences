import { NextResponse } from 'next/server';
import { openApiDocument } from '@/src/docs/openapi';

export async function GET() {
  return NextResponse.json(openApiDocument, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
