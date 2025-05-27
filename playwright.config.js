import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './global-setup.js',
  snapshotPathTemplate:
    '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}',
});
