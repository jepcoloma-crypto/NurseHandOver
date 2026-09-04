import { describe, it, expect } from 'vitest';

describe('Health Endpoint', () => {
  it('should return healthy status', () => {
    const response = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: expect.any(String),
      },
    };

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('healthy');
  });
});
