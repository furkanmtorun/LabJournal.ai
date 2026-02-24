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
        // Check for nav/footer markers
        if (!data.includes('id="site-nav"')) {
          console.error(`  ✗ #site-nav not found`);
          failed++;
          resolve();
          return;
        }
        if (!data.includes('id="site-footer"')) {
          console.error(`  ✗ #site-footer not found`);
          failed++;
          resolve();
          return;
        }
        // Check that nav-footer.js injected content
        if (!data.includes('class="nav-wrapper"')) {
          console.error(`  ✗ nav content not injected`);
          failed++;
          resolve();
          return;
        }
        console.log(`  ✓ ${expectedFile} loaded with nav/footer`);
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

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 2 : 0);
  } catch (err) {
    console.error('Smoke tests error:', err);
    process.exit(2);
  }
})();
