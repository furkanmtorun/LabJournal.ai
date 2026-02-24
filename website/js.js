document.addEventListener("DOMContentLoaded", () => {
  if (window.M) {
    M.AutoInit();
    const dropdownElems = document.querySelectorAll(".dropdown-trigger");
    if (dropdownElems.length) {
      M.Dropdown.init(dropdownElems, { coverTrigger: false, constrainWidth: false });
    }
  }

  // Dark/Light mode
  const modeToggle = document.getElementById("mode-toggle");
  if (modeToggle) {
    const body = document.body;
    const savedMode = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const shouldBeDark = savedMode === "dark" || (savedMode === null && prefersDark);
    if (shouldBeDark) body.classList.add("dark-mode");

    const icon = modeToggle.querySelector("i");
    if (icon) icon.textContent = body.classList.contains("dark-mode") ? "brightness_7" : "brightness_6";

    modeToggle.addEventListener("click", () => {
      body.classList.toggle("dark-mode");
      const isDark = body.classList.contains("dark-mode");
      if (icon) icon.textContent = isDark ? "brightness_7" : "brightness_6";
      localStorage.setItem("darkMode", isDark ? "dark" : "light");
    });
  }

  // Helper guards
  const isViewPage = () => window.location.pathname.startsWith("/view/");
  const isSearchPage = () => ["/search", "/search/", "/search.html", "search.html"].includes(window.location.pathname) || window.location.pathname.endsWith("/search.html");

  // VIEW page
  const handleViewPage = () => {
    const path = window.location.pathname;
    const match = path.match(/\/view\/(.+)/);
    const experimentId = match?.[1] ?? null;
    if (!experimentId) {
      document.getElementById("error-message").style.display = "block";
      document.getElementById("loading").style.display = "none";
      return;
    }

    document.getElementById("loading").style.display = "block";
    document.getElementById("entry-container").style.display = "none";
    document.getElementById("error-message").style.display = "none";

    fetchExperimentById(experimentId)
      .done((experiment) => {
        document.getElementById("loading").style.display = "none";
        populateExperimentDetails(experiment);
        document.getElementById("entry-container").style.display = "block";
      })
      .fail((xhr, status, error) => {
        document.getElementById("loading").style.display = "none";
        console.error("Failed to load experiment:", error);
        document.getElementById("error-message").style.display = "block";
      });
  };

  const getStatusClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return "green";
      case "failed":
        return "red";
      case "pending":
      case "queued":
        return "blue";
      default:
        return "grey";
    }
  };

  const populateExperimentDetails = (experiment) => {
    const statusClass = getStatusClass(experiment.status);
    const resultHtml = experiment.result || "<p class='no-data'>No results yet.</p>";
    const html = `
      <div class="entry-container" data-id="${experiment.id}">
        <div class="entry-header">
          <h2 class="entry-title">${experiment.name || "Unnamed Experiment"}</h2>
          <div class="entry-meta">
            <div class="entry-meta-item">
              <span class="entry-meta-label">Date:</span>
              <span class="entry-meta-value">${experiment.date || experiment.timestamp || "N/A"}</span>
            </div>
            <div class="entry-meta-item">
              <span class="entry-meta-label">Status:</span>
              <span class="entry-meta-value"><span class="chip ${statusClass} white-text">${experiment.status || "Unknown"}</span></span>
            </div>
            <div class="entry-meta-item">
              <span class="entry-meta-label">Actions:</span>
              <button class="delete-experiment btn-floating btn-small waves-effect waves-light red" data-id="${experiment.id}" title="Delete">
                <i class="material-icons">delete</i>
              </button>
            </div>
          </div>
        </div>
        <div class="entry-section">
          <h3 class="section-title">Results</h3>
          <div class="section-content lab-report">${resultHtml}</div>
        </div>
      </div>`;

    document.getElementById("entry-container").innerHTML = html;
    const del = document.querySelector(".delete-experiment");
    if (del) {
      del.addEventListener("click", function () {
        if (!confirm("Delete this experiment? This cannot be undone.")) return;
        const experimentId = this.dataset.id;
        deleteExperimentById(experimentId)
          .done(() => {
            if (M?.Toast) M.Toast.dismissAll();
            if (M?.toast) M.toast({ html: "Deleted successfully!", classes: "green rounded" });
            setTimeout(() => (window.location.href = "/"), 1500);
          })
          .fail((xhr, status, err) => {
            if (M?.Toast) M.Toast.dismissAll();
            if (M?.toast) M.toast({ html: `Delete failed: ${err}`, classes: "red rounded" });
          });
      });
    }
  };

  if (isViewPage()) {
    handleViewPage();
    return;
  }

  if (isSearchPage()) {
    handleSearchPage();
    return;
  }

  // Search state
  let currentSearchType = localStorage.getItem("searchType") || "quick";
  let dataSource = [];
  let isDataLoaded = false;

  const searchTypeLinks = document.querySelectorAll("[data-search-type]");
  const dropdownTriggerSpan = document.querySelector(".dropdown-trigger span");
  if (dropdownTriggerSpan) dropdownTriggerSpan.textContent = currentSearchType === "quick" ? "Quick Search" : "Semantic Search";

  searchTypeLinks.forEach((link) => {
    if (link.getAttribute("data-search-type") === currentSearchType) link.classList.add("active");
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const st = link.getAttribute("data-search-type");
      currentSearchType = st;
      localStorage.setItem("searchType", st);
      if (dropdownTriggerSpan) dropdownTriggerSpan.textContent = st === "quick" ? "Quick Search" : "Semantic Search";
      searchTypeLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      if (st === "semantic" && M?.toast) M.toast({ html: "Semantic search mode activated", classes: "rounded" });
      const dropdownInstance = M?.Dropdown?.getInstance(link.closest(".dropdown-trigger"));
      dropdownInstance?.close();
      if (isDataLoaded && dataSource.length) applySearchFilter();
    });
  });

  // Table rendering
  const populateTable = (data) => {
    const tableBody = document.getElementById("entries-table") || document.getElementById("search-table");
    if (!tableBody || !Array.isArray(data)) return;
    tableBody.innerHTML = "";

    data.forEach((entry) => {
      let statusColor = "grey lighten-2";
      switch ((entry.status || "").toLowerCase()) {
        case "completed":
          statusColor = "green white-text";
          break;
        case "failed":
          statusColor = "red lighten-2";
          break;
        case "pending":
        case "queued":
          statusColor = "blue lighten-1";
          break;
      }

      const row = document.createElement("tr");
      const isSearchTable = tableBody.id === "search-table";
      const score = entry._score ?? entry.score ?? entry.similarity;
      const similarityHtml = isSearchTable && (score || score === 0) ? `<span class="similarity-score">${Number(score).toFixed(3)}</span>` : "";
      const deleteBtnHtml = isSearchTable ? "" : `<button class="btn waves-effect waves-light delete-btn red white-text" data-id="${entry.id || ""}" title="Delete Experiment"><i class="material-icons">delete</i></button>`;

      row.innerHTML = `
        <td>${entry.name || ""} ${similarityHtml}</td>
        <td>${entry.category || ""}</td>
        <td>${entry.timestamp || ""}</td>
        <td><span class="chip ${statusColor}">${entry.status || "Unknown"}</span></td>
        <td class="actions-cell">
          <a class="btn waves-effect waves-light details-btn" data-id="${entry.id || ""}" href="view/${entry.id || ""}" title="View Details"><i class="material-icons">arrow_forward</i></a>
          ${deleteBtnHtml}
        </td>`;
      tableBody.appendChild(row);
    });
  };

  // Delete delegation
  const entriesTable = document.getElementById("entries-table");
  entriesTable?.addEventListener("click", (e) => {
    const del = e.target.closest(".delete-btn");
    if (!del) return;
    e.preventDefault();
    const experimentId = del.dataset.id;
    if (!experimentId) return console.error("No experiment ID found");
    const experimentName = dataSource.find((it) => it.id === experimentId)?.name || experimentId;
    if (!confirm(`Delete experiment "${experimentName}"? This cannot be undone.`)) return;
    deleteExperimentById(experimentId)
      .then(() => {
        if (M?.Toast) M.Toast.dismissAll();
        if (M?.toast) M.toast({ html: "Experiment deleted successfully!", classes: "green rounded" });
        refreshData();
      })
      .catch((err) => {
        console.error("Delete failed:", err);
        if (M?.Toast) M.Toast.dismissAll();
        if (M?.toast) M.toast({ html: `Delete failed: ${err.message || err || "Unknown error"}`, classes: "red rounded" });
      });
  });

  const refreshData = () => {
    fetchExperiments()
      .done((data) => {
        dataSource = data;
        isDataLoaded = true;
        applySearchFilter();
      })
      .fail((err) => console.error("Failed to refresh data", err));
  };

  const applySearchFilter = (searchTerm = "") => {
    const searchValue = (searchTerm || document.getElementById("search")?.value || "").toLowerCase().trim();
    let filteredEntries = [];
    if (!searchValue) filteredEntries = dataSource;
    else if (currentSearchType === "quick") filteredEntries = dataSource.filter((entry) => (entry.name || "").toLowerCase().includes(searchValue) || (entry.category || "").toLowerCase().includes(searchValue) || (entry.status || "").toLowerCase().includes(searchValue));
    else filteredEntries = dataSource.filter((entry) => (entry.name || "").toLowerCase().includes(searchValue) || (entry.category || "").toLowerCase().includes(searchValue) || (entry.timestamp || "").toLowerCase().includes(searchValue) || (entry.status || "").toLowerCase().includes(searchValue));
    populateTable(filteredEntries);
  };

  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(function (e) { if (isDataLoaded) applySearchFilter(e.target.value); }, 300));
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && currentSearchType === "semantic") {
        const q = this.value && this.value.trim();
        if (!q) return;
        window.location.href = "/search?query=" + encodeURIComponent(q);
      }
    });
  }

  // Load initial data
  fetchExperiments()
    .done((data) => { dataSource = data; isDataLoaded = true; applySearchFilter(); })
    .fail((err) => { console.error("Failed to load experiments", err); populateTable([]); });

  // Form submit
  const newEntryForm = document.getElementById("new-entry-form");
  if (newEntryForm) {
    newEntryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      submitForm("#new-entry-form")
        .done(() => { if (M?.toast) M.toast({ html: "Entry created successfully!", classes: "green rounded" }); this.reset(); refreshData(); })
        .fail((err) => { if (M?.toast) M.toast({ html: `Error: ${err.message || err}`, classes: "red rounded" }); });
    });
  }

  // Utility debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
});

// Handle search page logic (separated so loader can early-return above)
function handleSearchPage() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query") || "";
  const searchedTextEl = document.getElementById("searched_text");
  if (searchedTextEl) searchedTextEl.textContent = query ? `Results for: "${query}"` : "Enter a query to run a semantic search";
  if (!query) return populateTable([]);

  semanticSearch(query, 5)
    .done((data) => {
      let results = [];
      if (Array.isArray(data)) results = data;
      else if (data && Array.isArray(data.results)) results = data.results.map((r) => {
        const meta = r.metadata || {};
        const out = Object.assign({}, meta);
        if (r.content) out.result = r.content;
        if (typeof r.score !== "undefined") out._score = r.score;
        return out;
      });
      else if (data && Array.isArray(data.hits)) results = data.hits;
      else if (data && data.hits && Array.isArray(data.hits.hits)) results = data.hits.hits.map((h) => h._source || h);
      else if (data && Array.isArray(data.items)) results = data.items;
      else if (data && typeof data === "object") results = [data];
      populateTable(results);
    })
    .fail((err) => { console.error("Semantic search failed:", err); populateTable([]); });
}

