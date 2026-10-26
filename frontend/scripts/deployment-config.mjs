export function createDeploymentConfig(target) {
  const message = 'Set API_PROXY_TARGET to the backend HTTPS origin (no path, query, credentials, or fragment).';
  let url;
  try {
    url = new URL(target);
  } catch {
    throw new Error(message);
  }
  if (
    url.protocol !== 'https:' ||
    url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error(message);
  }
  return {
    framework: 'vite',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    rewrites: [
      { source: '/api/:path*', destination: `${url.origin}/api/:path*` },
      { source: '/health/:path*', destination: `${url.origin}/health/:path*` },
      { source: '/((?!api(?:/|$)|health(?:/|$)|assets(?:/|$)).*)', destination: '/index.html' },
    ],
  };
}
