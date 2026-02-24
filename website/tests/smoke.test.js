const http = require('http');

const pages = [
  { path: '/', expectedFile: 'index.html' },
  { path: '/index.html', expectedFile: 'index.html' },
  { path: '/new', expectedFile: 'new.html' },
  { path: '/new.html', expectedFile: 'new.html' },
  { path: '/view/abc-123', expectedFile: 'view.html' },
  { path: '/view.html', expectedFile: 'view.html' },
  { path: '/search', expectedFile: 'search.html' },
  { path: '/search.html', expectedFile: 'search.html' },
  { path: '/error', expectedFile: 'error.html' },
  { path: '/error.html', expectedFile: 'error.html' },
];

let passed = 0;
let failed = 0;

const testPage = (path, expectedFile) => {
  return new Promise((resolve) => {
    const url = `http://127.0.0.1:8000${path}`;
    console.log(`Testing ${path}...`);

    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.error(`  ✗ Bad status ${res.statusCode}`);
          failed++;
          resolve();
          return;
        }
        // Check for nav/footer placeholders (injected by nav-footer.js on client)
        if (!data.includes('id="site-nav"')) {
          console.error(`  ✗ #site-nav placeholder not found`);
          failed++;
          resolve();
          return;
        }
        if (!data.includes('id="site-footer"')) {
          console.error(`  ✗ #site-footer placeholder not found`);
          failed++;
          resolve();
          return;
        }
        // Check that nav-footer.js script is included
        if (!data.includes('nav-footer.js')) {
          console.error(`  ✗ nav-footer.js script not loaded`);
          failed++;
          resolve();
          return;
        }
        console.log(`  ✓ ${expectedFile} loaded (nav/footer placeholders ready)`);
        passed++;
        resolve();
      });
    }).on('error', (err) => {
      console.error(`  ✗ ${err.message}`);
      failed++;
      resolve();
    });
  });
};

(async () => {
  try {
    for (const { path, expectedFile } of pages) {
      await testPage(path, expectedFile);
    }

    console.log(`\n✓ Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      console.log('Note: nav/footer content injection happens client-side via nav-footer.js');
      console.log('This smoke test verifies placeholders exist and script is included.');
    }
    process.exit(failed > 0 ? 2 : 0);
  } catch (err) {
    console.error('Smoke tests error:', err);
    process.exit(2);
  }
})();
