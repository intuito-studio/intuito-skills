import { execSync } from 'node:child_process';

// Written once at build time: the site is a static export, so this becomes the file out/health.json.
// netlify.toml serves it at /health as well.
export const dynamic = 'force-static';

const commit = () => {
  // Netlify sets COMMIT_REF during a build. Locally, ask git.
  if (process.env.COMMIT_REF) return process.env.COMMIT_REF;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
};

export const GET = () =>
  Response.json({
    status: 'ok',
    commit: commit(),
    branch: process.env.BRANCH ?? null,
    context: process.env.CONTEXT ?? 'local',
    deployId: process.env.DEPLOY_ID ?? null,
    builtAt: new Date().toISOString(),
  });
