import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeploymentConfig } from './deployment-config.mjs';

test('deployment requires a valid HTTPS backend origin', () => {
  for (const target of [undefined, '', 'invalid', 'http://api.example.com',
    'https://localhost', 'https://127.0.0.1', 'https://[::1]',
    'https://user:password@api.example.com', 'https://api.example.com/api/v1',
    'https://api.example.com?key=value', 'https://api.example.com#fragment']) {
    assert.throws(() => createDeploymentConfig(target), /API_PROXY_TARGET/);
  }
});

test('API and health paths retain their prefixes and precede SPA fallback', () => {
  const { rewrites } = createDeploymentConfig('https://api.example.com/');
  assert.deepEqual(rewrites.slice(0, 2), [
    { source: '/api/:path*', destination: 'https://api.example.com/api/:path*' },
    { source: '/health/:path*', destination: 'https://api.example.com/health/:path*' },
  ]);
  const fallback = new RegExp(`^${rewrites[2].source}$`);
  for (const path of ['/api', '/api/v1/session', '/api/v1/missing', '/health/ready', '/assets/missing.js']) {
    assert.equal(fallback.test(path), false, path);
  }
  for (const path of ['/', '/management/venues', '/sign-in', '/apiary']) {
    assert.equal(fallback.test(path), true, path);
  }
});
