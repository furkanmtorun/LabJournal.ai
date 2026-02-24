const express = require('express');
const path = require('path');

const app = express();
// root is the website folder (parent of tests/)
const root = path.join(__dirname, '..');

// serve static assets first
app.use(express.static(root, { extensions: ['html'] }));

// rewrite logic mirroring url_rewrite.js
app.get('*', (req, res, next) => {
  try {
    const uri = req.path;

    if (uri === '/' || uri === '/home') return res.sendFile(path.join(root, 'index.html'));
    if (uri === '/new') return res.sendFile(path.join(root, 'new.html'));
    if (uri.startsWith('/view/')) return res.sendFile(path.join(root, 'view.html'));
    if (uri === '/search' || uri === '/search/') return res.sendFile(path.join(root, 'search.html'));
    if (uri === '/error') return res.sendFile(path.join(root, 'error.html'));

    // if no extension provided and no static file matched, serve error
    if (!uri.includes('.')) return res.sendFile(path.join(root, 'error.html'));

    // otherwise fall back to static handling
    next();
  } catch (err) {
    next(err);
  }
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Rewrite server listening on http://127.0.0.1:${port}`));
