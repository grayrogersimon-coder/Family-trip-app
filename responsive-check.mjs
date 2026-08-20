import { chromium } from 'playwright';

const viewports = {
  'iPhone SE (small phone)': { width: 375, height: 667 },
  'iPhone 14 Pro (modern phone)': { width: 393, height: 852 },
  'iPad (tablet)': { width: 768, height: 1024 },
  'Small laptop': { width: 1280, height: 800 },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const [name, size] of Object.entries(viewports)) {
  const page = await browser.newPage({ viewport: size });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  // Check for horizontal overflow on the home screen
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  await page.click('text=Start a new trip');
  await page.waitForTimeout(300);
  const onboardingOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  await page.fill('input[placeholder*="airbnb"]', 'Ningaloo Reef, WA');
  await page.click('text=Continue');
  await page.waitForTimeout(300);
  const confirmOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const createBtnVisible = await page.isVisible('text=Create trip');

  console.log(`${name} (${size.width}x${size.height}): home_overflow=${homeOverflow} onboarding_overflow=${onboardingOverflow} confirm_overflow=${confirmOverflow} create_btn_visible=${createBtnVisible} errors=${JSON.stringify(errors)}`);

  await page.close();
}

await browser.close();
