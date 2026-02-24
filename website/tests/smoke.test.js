const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pages = [
    '/',
    '/index.html',
    '/new',
    '/new.html',
    '/view/abc-123',
    '/view.html',
    '/search',
    '/search.html',
    '/error',
    '/error.html',
  ];

  try {
    for (const path of pages) {
      const url = `http://127.0.0.1:8000${path}`;
      console.log('Visiting', url);
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 10000 });
      if (!resp || resp.status() >= 400) throw new Error(`Bad status ${resp ? resp.status() : 'no response'} for ${url}`);

      // Ensure placeholders exist and nav/footer injected
      const navHandle = await page.$('#site-nav');
      if (!navHandle) throw new Error(`#site-nav not found on ${url}`);
      const footerHandle = await page.$('#site-footer');
      if (!footerHandle) throw new Error(`#site-footer not found on ${url}`);

      // check that nav-footer.js inserted content
      const navHtml = await page.evaluate(() => document.getElementById('site-nav')?.innerHTML || '');
      if (navHtml.length < 10) throw new Error(`nav content appears empty on ${url}`);
    }

    await browser.close();
    console.log('Smoke tests passed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke tests failed:', err);
    await browser.close();
    process.exit(2);
  }
})();
