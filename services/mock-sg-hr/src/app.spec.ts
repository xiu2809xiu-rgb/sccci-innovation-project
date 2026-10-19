import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('mock-sg-hr', () => {
  it('reports health', async () => {
    const response = await request(createApp()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'mock-sg-hr' });
  });
});
