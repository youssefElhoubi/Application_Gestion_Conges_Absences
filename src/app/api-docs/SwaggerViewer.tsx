'use client';

import { useEffect, useRef, useState } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

interface SwaggerViewerProps {
  specUrl?: string;
}

export default function SwaggerViewer({ specUrl = '/api/openapi.json' }: SwaggerViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initSwagger() {
      try {
        const swaggerDist = await import('swagger-ui-dist');
        const SwaggerUIBundle =
          swaggerDist.SwaggerUIBundle ||
          (swaggerDist as unknown as { default: { SwaggerUIBundle: typeof swaggerDist.SwaggerUIBundle } }).default
            ?.SwaggerUIBundle;

        if (!isMounted || !containerRef.current || !SwaggerUIBundle) return;

        // Initialize Swagger UI
        SwaggerUIBundle({
          domNode: containerRef.current,
          url: specUrl,
          deepLinking: true,
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 2,
          tryItOutEnabled: true,
          requestInterceptor: (req) => {
            // Apply fallback development header if authorization was not filled
            const r = req as unknown as { headers?: Record<string, string> };
            if (!r.headers) {
              r.headers = {};
            }
            if (!r.headers['x-user-id'] && !r.headers['Authorization']) {
              r.headers['x-user-id'] = 'usr-admin-default';
            }
            return req;
          },
        });

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize Swagger UI:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSwagger();

    return () => {
      isMounted = false;
    };
  }, [specUrl]);

  return (
    <div className="swagger-ui-wrapper min-h-screen bg-white text-slate-800">
      {isLoading && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="text-sm font-medium">Chargement de la documentation API...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
