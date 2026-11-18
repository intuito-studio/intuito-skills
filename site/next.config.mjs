import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Static export: the site is plain HTML with no server. */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // The skills live one folder up, in the repo root.
  turbopack: { root: join(here, '..') },
  outputFileTracingRoot: join(here, '..'),
};

export default nextConfig;
