import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './index.js';

describe('health endpoint', () => {
  it('should return 200 with status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.environment).toBeDefined();
  });
});
