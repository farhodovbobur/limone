#!/usr/bin/env node
import { chromium } from 'playwright-core';
import { APP, seedSession, signIn } from './lib/session.mjs';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  const mark = pass ? '[32m✓[0m' : '[31m✗[0m';
  console.log(`  ${mark} ${name}${detail && !pass ? `  — ${detail}` : ''}`);
};

/** One read of everything the shell exposes without waiting for animation. */
const shell = (page) =>
  page.evaluate(() => {
    const panel = document.getElementById('app-sidebar');
    const toggle = document.getElementById('app-nav-toggle');
    const content = toggle?.closest('div.shell-motion') ?? null;
    const scrim = document.querySelector('button.z-25');
    const dd = document.querySelector('.ant-dropdown');
    const cls = dd ? [...dd.classList] : null;
    const size = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      path: location.pathname,
      width: window.innerWidth,
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      drawerOpen: panel ? !panel.classList.contains('-translate-x-full') : null,
      contentInert: content ? content.hasAttribute('inert') : null,
      focusInPanel: panel ? panel.contains(document.activeElement) : null,
      focusOnToggle: document.activeElement === toggle,
      scrimHidden: scrim ? getComputedStyle(scrim).display === 'none' : null,
      dropdown: !dd
        ? 'absent'
        : cls.includes('ant-dropdown-hidden')
          ? 'closed'
          : cls.some((c) => /-leave/.test(c))
            ? 'leaving'
            : 'open',
      layout: document.querySelector('.ant-table') ? 'table' : 'stacked',
      contentPaddingLeft: content
        ? getComputedStyle(content).paddingLeft
        : null,
      targets: {
        navToggle: size(toggle),
        bell: size(document.querySelector('header [aria-label]:last-of-type')),
        back: size(document.querySelector('[aria-label]')),
      },
    };
  });

const settle = (page, ms = 350) => page.waitForTimeout(ms);

async function openDrawer(page) {
  if (!(await shell(page)).drawerOpen) {
    await page.locator('#app-nav-toggle').click();
    await settle(page);
  }
}

// ── Drawer dismissal: every navigation source × route-changed or not ────────
async function drawerFlows(page) {
  console.log('\ndrawer — navigatsiya');

  const flows = [
    ['nav → boshqa sahifa', '/users', '[data-nav="dashboard"]'],
    ['nav → turgan sahifa', '/users', '[data-nav="users"]'],
  ];
  for (const [label, start, selector] of flows) {
    await page.goto(`${APP}${start}`, { waitUntil: 'networkidle' });
    await openDrawer(page);
    const before = (await shell(page)).path;
    await page.locator(selector).click();
    await settle(page);
    const after = await shell(page);
    check(
      `${label} (marshrut ${before === after.path ? "o'zgarmadi" : "o'zgardi"})`,
      after.drawerOpen === false,
      `drawerOpen=${after.drawerOpen}`,
    );
  }

  const menuFlows = [
    ['menyu → boshqa sahifa', '/users'],
    ['menyu → turgan sahifa', '/profile'],
  ];
  for (const [label, start] of menuFlows) {
    await page.goto(`${APP}${start}`, { waitUntil: 'networkidle' });
    await openDrawer(page);
    await page.locator('[data-menu-trigger]').click();
    await settle(page);
    const before = (await shell(page)).path;
    await page.locator('[data-menu="profile"]').click();
    await settle(page);
    const after = await shell(page);
    check(
      `${label} (marshrut ${before === after.path ? "o'zgarmadi" : "o'zgardi"})`,
      after.drawerOpen === false,
      `drawerOpen=${after.drawerOpen}`,
    );
  }
}

// ── Drawer dismissal: the non-navigation exits ──────────────────────────────
async function drawerExits(page) {
  console.log('\ndrawer — yopish usullari');

  await page.goto(`${APP}/users`, { waitUntil: 'networkidle' });
  await openDrawer(page);
  const opened = await shell(page);
  check('toggle ochadi', opened.drawerOpen === true);
  check("kontent inert bo'ladi", opened.contentInert === true);
  check('fokus panelga kiradi', opened.focusInPanel === true);

  const { width, height } = page.viewportSize();
  await page
    .locator('button.z-25')
    .click({ position: { x: width - 24, y: Math.round(height / 2) } });
  await settle(page);
  check('scrim yopadi', (await shell(page)).drawerOpen === false);

  await openDrawer(page);
  await page.keyboard.press('Escape');
  await settle(page);
  const closed = await shell(page);
  check('Escape yopadi', closed.drawerOpen === false);
  check("fokus toggle'ga qaytadi", closed.focusOnToggle === true);
  check('kontent inert emas', closed.contentInert === false);
}

// ── The menu must not outlive the panel ─────────────────────────────────────
async function dropdownMotion(page) {
  console.log('\ndropdown — chiqish animatsiyasi');

  await page.goto(`${APP}/profile`, { waitUntil: 'networkidle' });
  await openDrawer(page);
  await page.locator('[data-menu-trigger]').click();
  await settle(page);
  await page.locator('[data-menu="profile"]').click();
  // No settle: an action-close must already be done, not animating.
  const acted = await shell(page);
  check(
    'amal bilan yopilish — animatsiyasiz',
    acted.dropdown === 'closed' || acted.dropdown === 'absent',
    `dropdown=${acted.dropdown} (kutilgan: closed)`,
  );

  await openDrawer(page);
  await page.locator('[data-menu-trigger]').click();
  await settle(page);
  await page.keyboard.press('Escape');
  const escaped = await shell(page);
  check(
    'Escape bilan yopilish — fade qoladi',
    escaped.dropdown === 'leaving',
    `dropdown=${escaped.dropdown} (kutilgan: leaving)`,
  );

  // One press dismisses one layer. Both open, first Escape must take only the
  // menu — the drawer's own handler listens on `window` and used to fire too.
  await settle(page);
  await openDrawer(page);
  await page.locator('[data-menu-trigger]').click();
  await settle(page);
  await page.keyboard.press('Escape');
  await settle(page);
  const first = await shell(page);
  check(
    '1-Escape faqat dropdown yopadi',
    first.drawerOpen === true && first.dropdown !== 'open',
    `drawer=${first.drawerOpen} dropdown=${first.dropdown}`,
  );
  await page.keyboard.press('Escape');
  await settle(page);
  check('2-Escape drawer yopadi', (await shell(page)).drawerOpen === false);
}

const CHROME_TARGETS = [
  ['nav toggle', '#app-nav-toggle'],
  ['bildirishnoma', '#app-notif-toggle'],
];

async function touchTargets(page) {
  console.log('\nsensorli nishonlar');

  await page.goto(`${APP}/users`, { waitUntil: 'networkidle' });
  const state = await shell(page);
  check('coarse pointer emulyatsiyasi yoqilgan', state.coarsePointer === true);

  for (const [name, selector] of CHROME_TARGETS) {
    const min = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return Math.min(Math.round(r.width), Math.round(r.height));
    }, selector);
    check(`${name} \u226544px`, min !== null && min >= 44, `${min}px`);
  }

  const owned = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter(
        (b) =>
          b.querySelector('svg') &&
          !b.textContent.trim() &&
          !b.closest('.ant-pagination') &&
          !b.className.includes('ant-') &&
          b.id !== 'app-nav-toggle' &&
          b.id !== 'app-notif-toggle',
      )
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          label: b.getAttribute('aria-label') || b.title || '?',
          min: Math.min(Math.round(r.width), Math.round(r.height)),
        };
      }),
  );
  const below = owned.filter((t) => t.min < 44);
  if (below.length) {
    console.log(
      '  \u00b7 sahifa boshqaruvlari 44px dan past (qaror, xato emas): ' +
        below.map((t) => `${t.label} ${t.min}px`).join(', '),
    );
  }
}

// ── Layout mode per width ──────────────────────────────────────────────────
async function breakpoints(browser, auth) {
  console.log('\nbreakpointlar');

  const cases = [
    { width: 375, layout: 'stacked', pad: '0px', rail: false },
    { width: 768, layout: 'table', pad: '0px', rail: false },
    { width: 1280, layout: 'table', pad: '248px', rail: true },
  ];
  for (const c of cases) {
    const context = await browser.newContext({
      viewport: { width: c.width, height: 820 },
      hasTouch: c.width < 1024,
    });
    await seedSession(context, auth);
    const page = await context.newPage();
    await page.goto(`${APP}/users`, { waitUntil: 'networkidle' });
    const s = await shell(page);
    check(
      `${c.width}px — ${c.layout}`,
      s.layout === c.layout,
      `layout=${s.layout}`,
    );
    check(
      `${c.width}px — kontent padding ${c.pad}`,
      s.contentPaddingLeft === c.pad,
      `padding=${s.contentPaddingLeft}`,
    );
    check(
      `${c.width}px — scrim ${c.rail ? 'yashirin' : 'mavjud'}`,
      s.scrimHidden === c.rail,
      `scrimHidden=${s.scrimHidden}`,
    );
    check(
      `${c.width}px — gorizontal toshish yo'q`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await context.close();
  }
}

async function main() {
  const auth = await signIn('verify');
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
    });
    await seedSession(context, auth);
    const page = await context.newPage();

    // Each group is isolated: a thrown click should cost its own group, not the
    // twenty-odd checks that come after it.
    for (const group of [
      drawerFlows,
      drawerExits,
      dropdownMotion,
      touchTargets,
    ]) {
      try {
        await group(page);
      } catch (error) {
        check(
          `${group.name} — guruh yiqildi`,
          false,
          error.message.split('\n')[0],
        );
      }
    }
    await context.close();

    try {
      await breakpoints(browser, auth);
    } catch (error) {
      check('breakpoints — guruh yiqildi', false, error.message.split('\n')[0]);
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n${results.length - failed.length}/${results.length} o'tdi` +
      (failed.length ? ` — ${failed.length} yiqildi` : ''),
  );
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
