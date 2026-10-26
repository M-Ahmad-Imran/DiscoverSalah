import { createDeploymentConfig } from './scripts/deployment-config.mjs';

export const config = createDeploymentConfig(process.env.API_PROXY_TARGET);
