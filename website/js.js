document.addEventListener("DOMContentLoaded", function () {
  // Initialize Materialize components safely
  if (typeof M !== "undefined") {
    M.AutoInit();
    
    const dropdownElems = document.querySelectorAll(".dropdown-trigger");
    if (dropdownElems.length > 0) {
      M.Dropdown.init(dropdownElems, {
        coverTrigger: false,
        constrainWidth: false,
      });
    }
  }

  // Dark/Light mode toggle
  const modeToggle = document.getElementById("mode-toggle");
  if (modeToggle) {
    const body = document.body;
    const savedMode = localStorage.getItem("darkMode");
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const shouldBeDark = savedMode === "dark" || (savedMode === null && prefersDarkMode);
    if (shouldBeDark) {
      body.classList.add("dark-mode");
    }
    
    const icon = modeToggle.querySelector("i");
    if (icon) {
      icon.textContent = body.classList.contains("dark-mode") ? "brightness_7" : "brightness_6";
    }

    modeToggle.addEventListener("click", function () {
      body.classList.toggle("dark-mode");
      const isDarkMode = body.classList.contains("dark-mode");
      if (icon) {
        icon.textContent = isDarkMode ? "brightness_7" : "brightness_6";
      }
      localStorage.setItem("darkMode", isDarkMode ? "dark" : "light");
    });
  }

  // Search state management
  let currentSearchType = localStorage.getItem("searchType") || "quick";
  let dataSource = []; // Will be populated by fetchExperiments()
  let isDataLoaded = false;

  const searchTypeLinks = document.querySelectorAll("[data-search-type]");
  const dropdownTrigger = document.querySelector(".dropdown-trigger span");

  // Set initial dropdown text
  if (dropdownTrigger) {
    dropdownTrigger.textContent = currentSearchType === "quick" ? "Quick Search" : "Detailed Search";
  }

  if (searchTypeLinks.length > 0) {
    searchTypeLinks.forEach((link) => {
      if (link.getAttribute("data-search-type") === currentSearchType) {
        link.classList.add("active");
      }
      
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const searchType = this.getAttribute("data-search-type");
        
        currentSearchType = searchType;
        localStorage.setItem("searchType", searchType);
        
        if (dropdownTrigger) {
          dropdownTrigger.textContent = searchType === "quick" ? "Quick Search" : "Detailed Search";
        }
        
        searchTypeLinks.forEach(l => l.classList.remove("active"));
        this.classList.add("active");
        
        if (searchType === "detailed" && typeof M !== "undefined" && M.toast) {
          M.toast({ html: "Detailed search mode activated", classes: "rounded" });
        }
        
        const dropdownInstance = M.Dropdown.getInstance(this.closest('.dropdown-trigger'));
        if (dropdownInstance) {
          dropdownInstance.close();
        }
        
        // Re-apply current search if data exists
        if (isDataLoaded && dataSource.length > 0) {
          applySearchFilter();
        }
      });
    });
  }

  // Table population function
  function populateTable(data) {
    const tableBody = document.getElementById("entries-table");
    if (!tableBody || !Array.isArray(data)) return;

    tableBody.innerHTML = "";
    
    data.forEach((entry) => {
      let statusColor = "grey lighten-2";
      const statusLower = (entry.status || "").toLowerCase();
      
      switch (statusLower) {
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
      row.innerHTML = `
        <td>${entry.name || ''}</td>
        <td>${entry.category || ''}</td>
        <td>${entry.timestamp || ''}</td>
        <td><span class="chip ${statusColor}">${entry.status || 'Unknown'}</span></td>
        <td>
          <a class="btn waves-effect waves-light details-btn" data-id="${entry.id || ''}" href="view/${entry.id || ''}">
            Details
            <i class="material-icons right">arrow_forward</i>
          </a>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Search filter logic
  function applySearchFilter(searchTerm = '') {
    const searchValue = (searchTerm || document.getElementById("search")?.value || '').toLowerCase().trim();
    
    let filteredEntries = [];
    if (searchValue === "") {
      filteredEntries = dataSource;
    } else if (currentSearchType === "quick") {
      filteredEntries = dataSource.filter((entry) =>
        (entry.name || "").toLowerCase().includes(searchValue) ||
        (entry.category || "").toLowerCase().includes(searchValue) ||
        (entry.status || "").toLowerCase().includes(searchValue)
      );
    } else {
      filteredEntries = dataSource.filter((entry) =>
        (entry.name || "").toLowerCase().includes(searchValue) ||
        (entry.category || "").toLowerCase().includes(searchValue) ||
        (entry.timestamp || "").toLowerCase().includes(searchValue) ||
        (entry.status || "").toLowerCase().includes(searchValue)
      );
    }
    
    populateTable(filteredEntries);
  }

  // Search input handler
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(function () {
      if (isDataLoaded) {
        applySearchFilter(this.value);
      }
    }, 300));
  }

  // CRITICAL: Load data from fetchExperiments FIRST
  if (typeof fetchExperiments === "function") {
    fetchExperiments()
      .done(function(data) {
        dataSource = data;
        isDataLoaded = true;
        
        // Initial population with current search type
        applySearchFilter();
        
        if (typeof M !== "undefined" && M.toast) {
          M.toast({html: `Loaded ${data.length} experiments`, classes: "green rounded"});
        }
      })
      .fail(function(err) {
        console.error("Failed to load experiments", err);
        if (typeof M !== "undefined" && M.toast) {
          M.toast({html: "Failed to load experiments", classes: "red rounded"});
        }
        populateTable([]);
      });
  } else {
    console.error("fetchExperiments function not defined");
    populateTable([]);
  }

  // Form submission
  const newEntryForm = document.getElementById("new-entry-form");
  if (newEntryForm) {
    newEntryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (typeof submitForm === "function") {
        submitForm("#new-entry-form")
          .done((data) => {
            if (typeof M !== "undefined" && M.toast) {
              M.toast({html: "Entry created successfully!", classes: "green rounded"});
            }
            this.reset();
            
            // Refresh data
            if (typeof fetchExperiments === "function") {
              fetchExperiments()
                .done(function(newData) {
                  dataSource = newData;
                  isDataLoaded = true;
                  applySearchFilter(); // Re-apply current search filter
                });
            }
          })
          .fail((err) => {
            if (typeof M !== "undefined" && M.toast) {
              M.toast({html: `Error: ${err.message || err}`, classes: "red rounded"});
            }
          });
      }
    });
  }

  // Utility: Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});
