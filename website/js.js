
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

  // *** VIEW PAGE FUNCTIONS ***
  function isViewPage() {
    return window.location.pathname.startsWith("/view/");
  }

  function handleViewPage() {
    const path = window.location.pathname;
    const match = path.match(/\/view\/(.+)/);
    const experimentId = match ? match[1] : null;

    if (!experimentId) {
      document.getElementById("error-message").style.display = "block";
      document.getElementById("loading").style.display = "none";
      return;
    }

    console.log("Loading experiment:", experimentId);

    document.getElementById("loading").style.display = "block";
    document.getElementById("entry-container").style.display = "none";
    document.getElementById("error-message").style.display = "none";

    fetchExperimentById(experimentId)
      .done(function(experiment) {
        document.getElementById("loading").style.display = "none";
        populateExperimentDetails(experiment);
        document.getElementById("entry-container").style.display = "block";
      })
      .fail(function(xhr, status, error) {
        document.getElementById("loading").style.display = "none";
        console.error("Failed to load experiment:", error);
        document.getElementById("error-message").style.display = "block";
      });
  }

  function populateExperimentDetails(experiment) {
    const statusClass = getStatusClass(experiment.status);
    
    const html = `<div class="entry-container" data-id="${experiment.id}">
      <!-- Entry Header -->
      <div class="entry-header">
        <h2 class="entry-title">
          ${experiment.name || 'Unnamed Experiment'}
        </h2>

        <div class="entry-meta">
          <div class="entry-meta-item">
            <span class="entry-meta-label">Date:</span>
            <span class="entry-meta-value">
              ${experiment.date || experiment.timestamp || 'N/A'}
            </span>
          </div>
          <div class="entry-meta-item">
            <span class="entry-meta-label">Status:</span>
            <span class="entry-meta-value">
              <span class="chip ${statusClass} white-text">
                ${experiment.status || 'Unknown'}
              </span>
            </span>
          </div>
          <div class="entry-meta-item">
            <span class="entry-meta-label">Actions:</span>
            <button
              class="delete-experiment btn-floating btn-small waves-effect waves-light red"
              data-id="${experiment.id}"
              title="Delete"
            >
              <i class="material-icons">delete</i>
            </button>
          </div>
        </div>
      </div>

      <!-- Results Section (includes everything) -->
      <div class="entry-section">
        <h3 class="section-title">Results</h3>
        <div class="section-content">
          ${experiment.result || '<p>No results yet.</p>'}
        </div>
      </div>
    </div>
    `;
    
    document.getElementById("entry-container").innerHTML = html;

    document.querySelector(".delete-experiment").addEventListener("click", function() {
      if (!confirm("Delete this experiment? This cannot be undone.")) return;
      
      const experimentId = this.dataset.id;
      if (typeof deleteExperimentById === "function") {
        if (typeof M !== "undefined" && M.toast) {
          M.toast({html: 'Deleting...', classes: 'rounded blue', displayLength: 4000});
        }
        
        deleteExperimentById(experimentId)
          .done(function() {
            if (typeof M !== "undefined" && M.Toast) M.Toast.dismissAll();
            if (typeof M !== "undefined" && M.toast) {
              M.toast({html: 'Deleted successfully!', classes: 'green rounded'});
            }
            setTimeout(() => window.location.href = './', 1500);
          })
          .fail(function(xhr, status, error) {
            if (typeof M !== "undefined" && M.Toast) M.Toast.dismissAll();
            if (typeof M !== "undefined" && M.toast) {
              M.toast({html: `Delete failed: ${error}`, classes: 'red rounded'});
            }
          });
      }
    });
  }

  function getStatusClass(status) {
    const statusLower = (status || "").toLowerCase();
    switch (statusLower) {
      case "completed": return "green";
      case "failed": return "red";
      case "pending": case "queued": return "blue";
      default: return "grey";
    }
  }

  // Check if we're on view page first
  if (isViewPage()) {
    handleViewPage();
    return;
  }

  // Search state management
  let currentSearchType = localStorage.getItem("searchType") || "quick";
  let dataSource = [];
  let isDataLoaded = false;

  const searchTypeLinks = document.querySelectorAll("[data-search-type]");
  const dropdownTrigger = document.querySelector(".dropdown-trigger span");

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
        <td class="actions-cell">
          <a class="btn waves-effect waves-light details-btn" data-id="${entry.id || ''}" href="view/${entry.id || ''}" title="View Details">
            <i class="material-icons">arrow_forward</i>
          </a>
          <button class="btn waves-effect waves-light delete-btn red white-text" 
                  data-id="${entry.id || ''}" 
                  title="Delete Experiment">
            <i class="material-icons">delete</i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Delete event delegation - Proper Materialize toast handling
  const tableBody = document.getElementById("entries-table");
  if (tableBody) {
    tableBody.addEventListener("click", function(e) {
      if (e.target.closest(".delete-btn")) {
        e.preventDefault();
        e.stopPropagation();
        
        const deleteBtn = e.target.closest(".delete-btn");
        const experimentId = deleteBtn.dataset.id;
        
        if (!experimentId) {
          console.error("No experiment ID found");
          return;
        }
        
        const experimentName = dataSource.find(e => e.id === experimentId)?.name || experimentId;
        
        if (!confirm(`Delete experiment "${experimentName}"? This cannot be undone.`)) {
          return;
        }
        
        // Call deleteExperimentById
        if (typeof deleteExperimentById === "function") {
          deleteExperimentById(experimentId)
            .then(() => {
              // Success - dismiss all toasts and show success
              if (typeof M !== "undefined" && M.Toast) {
                M.Toast.dismissAll();
              }
              if (typeof M !== "undefined" && M.toast) {
                M.toast({html: 'Experiment deleted successfully!', classes: 'green rounded'});
              }
              refreshData();
            })
            .catch((err) => {
              console.error("Delete failed:", err);
              if (typeof M !== "undefined" && M.Toast) {
                M.Toast.dismissAll();
              }
              if (typeof M !== "undefined" && M.toast) {
                M.toast({html: `Delete failed: ${err.message || err || 'Unknown error'}`, classes: 'red rounded'});
              }
            });
        } else {
          console.error("deleteExperimentById function not found in api.js");
          if (typeof M !== "undefined" && M.toast) {
            M.toast({html: 'deleteExperimentById not available from api.js', classes: 'red rounded'});
          }
        }
      }
    });
  }

  // Refresh data function
  function refreshData() {
    if (typeof fetchExperiments === "function") {
      fetchExperiments()
        .done(function(data) {
          dataSource = data;
          isDataLoaded = true;
          applySearchFilter();
        })
        .fail(function(err) {
          console.error("Failed to refresh data", err);
        });
    }
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

  // Load initial data
  if (typeof fetchExperiments === "function") {
    fetchExperiments()
      .done(function(data) {
        dataSource = data;
        isDataLoaded = true;
        applySearchFilter();
      })
      .fail(function(err) {
        console.error("Failed to load experiments", err);
        populateTable([]);
      });
  }

  // Form submission
  const newEntryForm = document.getElementById("new-entry-form");
  if (newEntryForm) {
    newEntryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (typeof submitForm === "function") {
        submitForm("#new-entry-form")
          .done(() => {
            if (typeof M !== "undefined" && M.toast) {
              M.toast({html: "Entry created successfully!", classes: "green rounded"});
            }
            this.reset();
            refreshData();
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
