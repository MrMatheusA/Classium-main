import { describe, it, expect } from 'vitest';
import serverlessHandler, { app as vercelApp } from '../../api/server.ts';
import { app as mainApp, createServerApp } from '../../server.ts';

describe('Vercel Serverless Handler Suite (P2.327.07)', () => {
  it('1. should export configured Express app and handler function from api/server.ts', () => {
    expect(typeof serverlessHandler).toBe('function');
    expect(vercelApp).toBeDefined();
    expect(vercelApp).toBe(mainApp);
  });

  it('2. should instantiate createServerApp without listening on a port', () => {
    const testApp = createServerApp();
    expect(testApp).toBeDefined();
    expect(typeof testApp.use).toBe('function');
    expect(typeof testApp.get).toBe('function');
    expect(typeof testApp.post).toBe('function');
  });

  it('3. should have registered critical API routes in Express router stack', () => {
    const routerStack = (mainApp as any)._router?.stack || [];
    expect(routerStack.length).toBeGreaterThan(0);

    const routes: string[] = [];
    for (const layer of routerStack) {
      if (layer.route?.path) {
        routes.push(layer.route.path);
      }
    }

    expect(routes).toContain('/api/health');
    expect(routes.some((r: string) => r.startsWith('/api/studio'))).toBe(true);
    expect(routes.some((r: string) => r.includes('attendance'))).toBe(true);
    expect(routes.some((r: string) => r.includes('classes'))).toBe(true);
  });

  it('4. should process /api/health request through the serverless handler without port binding', async () => {
    let responseStatus = 0;
    let responseBody: any = null;

    const mockReq = {
      method: 'GET',
      url: '/api/health',
      headers: {},
      query: {},
      body: {},
    };

    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return mockRes;
      },
      json(data: any) {
        responseBody = data;
        return mockRes;
      },
      setHeader() {
        return mockRes;
      },
      end() {
        return mockRes;
      },
    };

    await new Promise<void>((resolve) => {
      const originalJson = mockRes.json;
      mockRes.json = (data: any) => {
        originalJson(data);
        resolve();
        return mockRes;
      };

      serverlessHandler(mockReq, mockRes);
    });

    expect(responseStatus).toBe(200);
    expect(responseBody).toBeDefined();
    expect(responseBody.status).toBe('ok');
    expect(responseBody.timestamp).toBeDefined();
  });
});
