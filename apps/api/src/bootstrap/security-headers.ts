import type { RequestHandler } from 'express';
import helmet from 'helmet';

/** The API serves JSON only: nothing may load, frame or run from its responses. */
const apiHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
});

/** Swagger UI needs its own scripts, styles and inline styles, but nothing from other origins. */
const docsHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      frameAncestors: ["'none'"],
    },
  },
});

/** helmet with a strict CSP everywhere, relaxed just enough for the Swagger UI at /api/docs. */
export function securityHeaders(): RequestHandler {
  return (req, res, next) => {
    (req.path.startsWith('/api/docs') ? docsHeaders : apiHeaders)(req, res, next);
  };
}
