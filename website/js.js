document.addEventListener("DOMContentLoaded", function () {
  // Initialize Materialize components
  M.AutoInit();

  // Initialize dropdown
  const dropdownElems = document.querySelectorAll(".dropdown-trigger");
  M.Dropdown.init(dropdownElems, {
    coverTrigger: false,
    constrainWidth: false,
  });

  // Dark/Light mode toggle (shared across all pages)
  const modeToggle = document.getElementById("mode-toggle");
  if (modeToggle) {
    const body = document.body;
    const savedMode = localStorage.getItem("darkMode");
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedMode === "dark" || (savedMode === null && prefersDarkMode)) {
      body.classList.add("dark-mode");
      modeToggle.querySelector("i").textContent = "brightness_7";
    }

    modeToggle.addEventListener("click", function () {
      body.classList.toggle("dark-mode");
      const isDarkMode = body.classList.contains("dark-mode");
      this.querySelector("i").textContent = isDarkMode
        ? "brightness_7"
        : "brightness_6";
      localStorage.setItem("darkMode", isDarkMode ? "dark" : "light");
    });
  }

  // Search type selection (from index.html)
  const searchTypeLinks = document.querySelectorAll("[data-search-type]");
  if (searchTypeLinks.length > 0) {
    const dropdownTrigger = document.querySelector(".dropdown-trigger span");
    let currentSearchType = "quick";

    searchTypeLinks.forEach((link) => {
      link.addEventListener("click", function () {
        const searchType = this.getAttribute("data-search-type");
        currentSearchType = searchType;
        dropdownTrigger.textContent =
          searchType === "quick" ? "Quick Search" : "Detailed Search";
        if (searchType === "detailed") {
          M.toast({
            html: "Detailed search mode activated",
            classes: "rounded",
          });
        }
      });
    });
  }

  // Table population function (from index.html)
  function populateTable(data) {
    const tableBody = document.getElementById("entries-table");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    data.forEach((entry) => {
      let statusColor;
      switch (entry.status.toLowerCase()) {
        case "active":
          statusColor = "light-green white-text";
          break;
        case "completed":
          statusColor = "grey lighten-1 white-text";
          break;
        case "pending":
        case "scheduled":
          statusColor = "amber lighten-2";
          break;
        case "in progress":
          statusColor = "blue-grey lighten-3";
          break;
        default:
          statusColor = "grey lighten-3";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
              <td>${entry.id}</td>
              <td>${entry.name}</td>
              <td>${entry.category}</td>
              <td>${entry.date}</td>
              <td><span class="chip ${statusColor}">${entry.status}</span></td>
              <td>
                  <a class="btn waves-effect details-btn" data-id="${entry.id}" href="view.html">
                      Details
                      <i class="material-icons right">arrow_forward</i>
                  </a>
              </td>
          `;
      tableBody.appendChild(row);
    });
  }

  // Cards population function (from index.html)
  function populateCards(data) {
    const cardsContainer = document.getElementById("entries-cards");
    if (!cardsContainer) return;

    cardsContainer.innerHTML = "";
    data.forEach((entry) => {
      let statusColor;
      switch (entry.status.toLowerCase()) {
        case "active":
          statusColor = "light-green white-text";
          break;
        case "completed":
          statusColor = "grey lighten-1 white-text";
          break;
        case "pending":
        case "scheduled":
          statusColor = "amber lighten-2";
          break;
        case "in progress":
          statusColor = "blue-grey lighten-3";
          break;
        default:
          statusColor = "grey lighten-3";
      }

      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
              <div class="entry-card-header">
                  <h3 class="entry-card-title">${entry.name}</h3>
                  <span class="chip ${statusColor}">${entry.status}</span>
              </div>
              <div class="entry-card-field">
                  <div class="entry-card-label">ID:</div>
                  <div class="entry-card-value">${entry.id}</div>
              </div>
              <div class="entry-card-field">
                  <div class="entry-card-label">Category:</div>
                  <div class="entry-card-value">${entry.category}</div>
              </div>
              <div class="entry-card-field">
                  <div class="entry-card-label">Date:</div>
                  <div class="entry-card-value">${entry.date}</div>
              </div>
              <div class="entry-card-actions">
                  <button class="btn waves-effect details-btn card-details-btn" data-id="${entry.id}">
                      Details
                      <i class="material-icons right">arrow_forward</i>
                  </button>
              </div>
          `;
      cardsContainer.appendChild(card);
    });

    document.querySelectorAll(".card-details-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        const entry = STATIC_ENTRY_DATA.find((e) => e.id == id);
        M.toast({
          html: `Details for: ${entry.name}`,
          classes: "rounded",
        });
      });
    });
  }

  // Search functionality (from index.html)
  const searchInput = document.getElementById("search");
  if (searchInput) {
    let currentSearchType = "quick";
    searchInput.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      let filteredEntries =
        currentSearchType === "quick"
          ? STATIC_ENTRY_DATA.filter(
              (entry) =>
                entry.name.toLowerCase().includes(searchTerm) ||
                entry.category.toLowerCase().includes(searchTerm) ||
                entry.status.toLowerCase().includes(searchTerm),
            )
          : STATIC_ENTRY_DATA.filter(
              (entry) =>
                entry.id.toString().includes(searchTerm) ||
                entry.name.toLowerCase().includes(searchTerm) ||
                entry.category.toLowerCase().includes(searchTerm) ||
                entry.date.includes(searchTerm) ||
                entry.status.toLowerCase().includes(searchTerm),
            );

      populateTable(filteredEntries);
      populateCards(filteredEntries);
    });
  }

  // Form submission (from third file)
  const newEntryForm = document.getElementById("new-entry-form");
  if (newEntryForm) {
    newEntryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const category = document.getElementById("category").value;
      const fileInput = document.getElementById("file-upload");
      const fileName =
        fileInput.files.length > 0
          ? fileInput.files[0].name
          : "No file selected";

      M.toast({
        html: `Entry created: ${name} (${category}) - File: ${fileName}`,
        classes: "rounded",
        displayLength: 4000,
      });

      console.log({
        name,
        category,
        file: fileInput.files[0] || null,
      });

      this.reset();
    });
  }

  // Table controls (from index.html)
  const tableControls = document.querySelectorAll(".table-controls .btn");
  if (tableControls.length > 0 && typeof STATIC_ENTRY_DATA !== "undefined") {
    populateTable(STATIC_ENTRY_DATA);
    populateCards(STATIC_ENTRY_DATA);

    tableControls.forEach((btn) => {
      btn.addEventListener("click", function () {
        if (this.title.includes("Sort")) {
          document
            .querySelectorAll('.table-controls .btn[title*="Sort"]')
            .forEach((b) => b.classList.remove("active"));
          this.classList.add("active");

          const sortDirection = this.title.includes("Ascending")
            ? "asc"
            : "desc";
          const sortedEntries = [...STATIC_ENTRY_DATA].sort((a, b) =>
            sortDirection === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name),
          );

          populateTable(sortedEntries);
          populateCards(sortedEntries);
        } else {
          M.toast({
            html: `${this.title} clicked!`,
            classes: "rounded",
          });
        }
      });
    });
  }
});
