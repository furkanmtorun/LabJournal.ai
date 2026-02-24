/* Inject shared navbar and footer to keep HTML DRY while preserving IDs/classes */
const NAV_HTML = `
<nav>
  <div class="nav-wrapper">
    <div class="nav-content">
      <div class="nav-left">
        <a href="/" class="brand-logo">LabJournal.ai</a>
      </div>

      <div class="nav-middle">
        <div class="search-options">
          <div class="search-wrapper">
            <i class="material-icons">search</i>
            <input id="search" type="text" placeholder="Search Experiments..." required />
          </div>

          <a class="dropdown-trigger" href="#" data-target="search-dropdown">
            <span>Quick Search</span>
            <i class="material-icons">arrow_drop_down</i>
          </a>

          <ul id="search-dropdown" class="dropdown-content">
            <li><a href="#!" data-search-type="quick">Quick Search</a></li>
            <li><a href="#!" data-search-type="semantic">Semantic Search</a></li>
          </ul>
        </div>
      </div>

      <div class="nav-right">
        <a class="btn waves-effect waves-light create-btn" id="create-btn" href="/new">
          <i class="material-icons">add</i>
          <span>New</span>
        </a>

        <div class="mode-toggle" id="mode-toggle">
          <i class="material-icons">brightness_6</i>
        </div>
      </div>
    </div>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer>
  <div class="container">
    Made and served by
    <a href="https://furkanmtorun.github.io/" target="_blank">@FurkanMTorun</a>.
  </div>
</footer>`;

(() => {
  try {
    const navTarget = document.getElementById("site-nav");
    if (navTarget) navTarget.innerHTML = NAV_HTML;

    const footerTarget = document.getElementById("site-footer");
    if (footerTarget) footerTarget.innerHTML = FOOTER_HTML;

    // After injection, allow pages to customize the navbar in two ways:
    // 1) Add data attributes to the host container `#site-nav`, e.g.:
    //    <div id="site-nav" data-hide-search="true" data-hide-new="true"></div>
    // 2) If attributes aren't present, use sensible auto-detection based on
    //    page elements (forms or entry containers) so pages don't need edits.
    if (navTarget) {
      const hideSearchAttr = navTarget.dataset.hideSearch;
      const hideNewAttr = navTarget.dataset.hideNew;
      const hideHomeAttr = navTarget.dataset.hideHome;

      // Elements inside injected NAV
      const searchWrapper = navTarget.querySelector('.search-options');
      const createBtn = navTarget.querySelector('#create-btn');
      const brandLogo = navTarget.querySelector('.brand-logo');

      // Auto-detect pages where search is not relevant
      const hasNewForm = !!document.getElementById('new-entry-form');
      const hasEntryContainer = !!document.getElementById('entry-container');

      // Decide visibility: prefer explicit data-* attributes, otherwise fall back
      // to auto-detection.
      const shouldHideSearch = hideSearchAttr === 'true' || (hideSearchAttr === undefined && (hasNewForm || hasEntryContainer));
      const shouldHideNew = hideNewAttr === 'true' || (hideNewAttr === undefined && hasNewForm);
      const shouldHideHome = hideHomeAttr === 'true';

      if (shouldHideSearch && searchWrapper) searchWrapper.style.display = 'none';
      if (shouldHideNew && createBtn) createBtn.style.display = 'none';
      if (shouldHideHome && brandLogo) brandLogo.style.display = 'none';

      // Initialize Materialize dropdown only if present
      if (typeof M !== 'undefined') {
        const elems = document.querySelectorAll('.dropdown-trigger');
        if (elems && elems.length) M.Dropdown.init(elems, { constrainWidth: false });
      }
    }
  } catch (e) {
    // fail silently - pages should still work
    console.error("nav-footer injection failed", e);
  }
})();
