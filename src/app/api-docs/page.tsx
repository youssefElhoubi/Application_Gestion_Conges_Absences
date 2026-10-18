import type { Metadata } from 'next';
import SwaggerViewer from './SwaggerViewer';

export const metadata: Metadata = {
  title: 'API Documentation | Swagger UI',
  description: 'Interactive OpenAPI specification and live exploration interface for Leave & Absence Management API.',
};

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <SwaggerViewer specUrl="/api/openapi.json" />
    </main>
  );
}
