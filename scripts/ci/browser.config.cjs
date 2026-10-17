const { defineConfig } = require('@playwright/test');
const base = require('../../playwright.config.ts').default;
module.exports = defineConfig(base, {
  testDir: require('node:path').resolve(__dirname, '../../e2e'),
  webServer: undefined,
  outputDir: process.env.BUBBLE_CI_OUTPUT,
  use: { ...base.use, launchOptions: { chromiumSandbox: true }, trace: 'off', screenshot: 'off' },
});
