import { defineConfig } from '@playwright/test'

// В CI запускаем против production build (vite preview, порт 4173),
// чтобы Service Worker регистрировался корректно.
// Локально — dev-сервер (порт 5173).
const isCI = !!process.env.CI
const baseURL = isCI ? 'http://localhost:4173' : 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: isCI ? 'npm run preview' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
