import type { Instrumentation } from 'next';
import { scrubText } from './lib/scrub';

// Errors thrown while rendering, or in route handlers and server actions, go to Vercel's runtime
// logs as one line each, with emails and link tokens removed. Request bodies are never logged.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const e = error as Error & { digest?: string };
  console.error(JSON.stringify({
    level: 'error',
    message: scrubText(e.message ?? String(error)),
    name: e.name,
    digest: e.digest,
    method: request.method,
    path: scrubText(request.path),
    route: context.routePath,
    kind: context.routerKind + ':' + context.routeType,
    stack: e.stack ? scrubText(e.stack.split('\n').slice(0, 6).join('\n')) : undefined,
  }));
};
