import app from '../server.ts';

/**
 * Vercel Serverless Function entry point.
 * Reuses the canonical Express application instance from server.ts without invoking app.listen().
 */
export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };
