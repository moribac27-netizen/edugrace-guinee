import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";

/**
 * Non-regression test: the pricing cards (#tarifs) must remain rendered
 * immediately above the FAQ (#faq) on desktop, tablet and mobile.
 *
 * Guards against:
 *  - RLS/permission regressions that cause `subscription_plans` to return 0 rows
 *    for anonymous visitors (the cards would disappear).
 *  - Accidental reordering of the sections on the landing page.
 */

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:8080";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 1800 },
  { name: "tablet", width: 800, height: 1400 },
  { name: "mobile", width: 390, height: 1600 },
] as const;

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

describe("Landing page — Tarifs section", () => {
  for (const vp of VIEWPORTS) {
    it(`renders 3 pricing cards immediately above the FAQ on ${vp.name}`, async () => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      try {
        await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
        // Wait for dynamic plans to be fetched and rendered.
        await page.waitForSelector(
          "#tarifs .grid.md\\:grid-cols-3 > div h3",
          { timeout: 10_000 },
        );

        const layout = await page.evaluate(() => {
          const tarifs = document.querySelector("#tarifs");
          const faq = document.querySelector("#faq");
          const cards = document.querySelectorAll(
            "#tarifs .grid.md\\:grid-cols-3 > div",
          );
          const titles = Array.from(cards).map(
            (c) => c.querySelector("h3")?.textContent?.trim() ?? "",
          );
          const tarifsRect = tarifs?.getBoundingClientRect();
          const faqRect = faq?.getBoundingClientRect();
          return {
            hasTarifs: !!tarifs,
            hasFaq: !!faq,
            cardCount: cards.length,
            titles,
            tarifsTop: tarifsRect ? tarifsRect.top + window.scrollY : null,
            tarifsBottom: tarifsRect ? tarifsRect.bottom + window.scrollY : null,
            faqTop: faqRect ? faqRect.top + window.scrollY : null,
          };
        });

        expect(layout.hasTarifs, "#tarifs section must exist").toBe(true);
        expect(layout.hasFaq, "#faq section must exist").toBe(true);
        expect(layout.cardCount, "3 plan cards must render").toBe(3);
        expect(layout.titles).toEqual(["Basic", "Standard", "Premium"]);
        expect(layout.tarifsTop!).toBeLessThan(layout.faqTop!);
        expect(layout.tarifsBottom!).toBeLessThanOrEqual(layout.faqTop!);
      } finally {
        await context.close();
      }
    }, 30_000);
  }
});
