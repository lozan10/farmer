import 'server-only';
import { chromium, type Browser, type BrowserContext } from 'playwright-core';

/**
 * FarmerLink is an ExoLink/OpenIddict OIDC app: there is no static API token, you
 * sign in through account.exolink.app and the app then talks to its own OData API
 * using that browser session (bearer token + tenant cookie). To read live numbers
 * we log in once with a headless browser, keep the session alive, and run the
 * dashboard's own count queries inside that authenticated page.
 *
 * Required environment variables (add these to .env yourself):
 *   FARMERLINK_EMAIL      your FarmerLink login email
 *   FARMERLINK_PASSWORD   your FarmerLink login password
 * Optional:
 *   FARMERLINK_BASE_URL   defaults to https://farmerlink.exolink.app
 *   FARMERLINK_TENANT     tenant name to pick if the account has several
 *   FARMERLINK_CHROME     path to a Chrome/Edge executable (auto-detected otherwise)
 */

export type Counts = {
  farmers: number;
  groups: number;
  plots: number;
  salesTransactions: number;
  lotcodes: number;
  surveyresponses: number;
  assets: number;
  dataQualityAlerts: number;
};

// Each dashboard count maps to an OData collection on /api.
const ENDPOINTS: Record<keyof Counts, string> = {
  farmers: '/farmers',
  groups: '/groups',
  plots: '/plots',
  salesTransactions: '/salesTransactions',
  lotcodes: '/lotcodes',
  surveyresponses: '/surveyresponses',
  assets: '/assets',
  dataQualityAlerts: '/dataQualityAlerts',
};

const BASE = (process.env.FARMERLINK_BASE_URL ?? 'https://farmerlink.exolink.app').replace(/\/$/, '');

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function chromePath(): string | undefined {
  if (process.env.FARMERLINK_CHROME) return process.env.FARMERLINK_CHROME;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const fs = require('node:fs') as typeof import('node:fs');
  return candidates.find((p) => fs.existsSync(p));
}

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let loginInFlight: Promise<void> | null = null;
let cache: { at: number; counts: Counts } | null = null;

const CACHE_MS = 60_000; // match the dashboard's 60s auto-refresh

async function ensureBrowser(): Promise<BrowserContext> {
  if (context) return context;
  const executablePath = chromePath();
  if (!executablePath) {
    throw new Error(
      'No Chrome/Edge found. Set FARMERLINK_CHROME to a Chrome or Edge executable path.',
    );
  }
  browser = await chromium.launch({ headless: true, executablePath });
  context = await browser.newContext();
  context.setDefaultTimeout(45_000);
  return context;
}

/** Drive the ExoLink login form: method -> email -> password -> (tenant). */
async function login(): Promise<void> {
  const email = process.env.FARMERLINK_EMAIL;
  const password = process.env.FARMERLINK_PASSWORD;
  if (!email || !password) {
    throw new Error('Set FARMERLINK_EMAIL and FARMERLINK_PASSWORD in .env to enable live data.');
  }
  const ctx = await ensureBrowser();
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/app/dashboard`, { waitUntil: 'domcontentloaded' });
    // Redirects to account.exolink.app. Step 1: the "how do you want to sign in"
    // screen. Wait for either its "Email Address" method card or the email box to
    // render (the SPA hydrates after navigation, so we can't check visibility yet).
    const emailMethod = page.getByText('Email Address', { exact: true });
    const emailBox = page
      .getByPlaceholder(/email address/i)
      .or(page.locator('input[type="email"]'));
    await Promise.race([
      emailMethod.first().waitFor({ state: 'visible' }).catch(() => {}),
      emailBox.first().waitFor({ state: 'visible' }).catch(() => {}),
    ]);
    if (await emailMethod.first().isVisible().catch(() => false)) {
      await emailMethod.first().click();
      await page.getByRole('button', { name: /continue/i }).click();
    }
    // Step 2: email.
    await emailBox.first().waitFor({ state: 'visible' });
    await emailBox.first().fill(email);
    await page.getByRole('button', { name: /next|continue/i }).first().click();
    // Step 3: password.
    const pwBox = page.locator('input[type="password"]');
    await pwBox.first().waitFor();
    await pwBox.first().fill(password);
    await page.getByRole('button', { name: /sign in|log in|continue|next/i }).first().click();
    // Step 4: tenant selection. Accounts with more than one tenant land on
    // /select-tenant; pick FARMERLINK_TENANT by its exact list-item label so we
    // don't grab an arbitrary tenant (or the "Logout"/language controls).
    await page.waitForLoadState('domcontentloaded');
    await page.waitForURL(/select-tenant/, { timeout: 15_000 }).catch(() => {});
    if (/select-tenant/.test(page.url())) {
      const wanted = process.env.FARMERLINK_TENANT;
      if (!wanted) {
        throw new Error(
          'This FarmerLink account has multiple tenants. Set FARMERLINK_TENANT in .env to the workspace name (e.g. "Trust&Trade pilot").',
        );
      }
      const choice = page
        .getByRole('listitem')
        .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(wanted)}\\s*$`) })
        .or(page.getByText(wanted, { exact: true }));
      await choice.first().click();
    }
    // Wait until we are back inside the app on the FarmerLink origin.
    await page.waitForURL((u) => u.href.startsWith(BASE) && /\/app\//.test(u.href), {
      timeout: 45_000,
    });
    await page.waitForLoadState('networkidle').catch(() => {});
  } finally {
    await page.close();
  }
}

async function ensureLogin(): Promise<void> {
  if (!loginInFlight) {
    loginInFlight = login()
      .catch((e) => {
        context = null;
        browser?.close().catch(() => {});
        browser = null;
        throw e;
      })
      .finally(() => {
        loginInFlight = null;
      });
  }
  return loginInFlight;
}

/** Run the OData $count queries inside the authenticated page (reuses its auth). */
async function fetchCounts(): Promise<Counts> {
  const ctx = await ensureBrowser();
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/app/dashboard`, { waitUntil: 'domcontentloaded' });
    if (!page.url().startsWith(BASE)) throw new Error('SESSION_EXPIRED');

    const filter = encodeURIComponent('DeleteStatus eq 0');
    const results = await page.evaluate(
      async ({ endpoints, filter }) => {
        const out: Record<string, number> = {};
        for (const [key, path] of Object.entries(endpoints)) {
          try {
            const res = await fetch(`/api${path}?$top=0&$count=true&$filter=${filter}`, {
              headers: { Accept: 'application/json' },
            });
            if (res.status === 401 || res.status === 403) throw new Error('SESSION_EXPIRED');
            const body = await res.json();
            out[key] = body['@odata.count'] ?? 0;
          } catch (e) {
            if (e instanceof Error && e.message === 'SESSION_EXPIRED') throw e;
            out[key] = 0;
          }
        }
        return out;
      },
      { endpoints: ENDPOINTS, filter },
    );
    return results as unknown as Counts;
  } finally {
    await page.close();
  }
}

export async function getCounts(): Promise<Counts> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.counts;
  await ensureLogin();
  let counts: Counts;
  try {
    counts = await fetchCounts();
  } catch (e) {
    if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
      context = null;
      await browser?.close().catch(() => {});
      browser = null;
      await ensureLogin();
      counts = await fetchCounts();
    } else {
      throw e;
    }
  }
  cache = { at: Date.now(), counts };
  return counts;
}
