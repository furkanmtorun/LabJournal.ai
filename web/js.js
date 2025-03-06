document.addEventListener('DOMContentLoaded', function() {
    // Initialize dropdown
    const dropdownElems = document.querySelectorAll('.dropdown-trigger');
    M.Dropdown.init(dropdownElems, {
      coverTrigger: false,
      constrainWidth: false
    });
    
    // Dark/Light mode toggle
    const modeToggle = document.getElementById('mode-toggle');
    const body = document.body;
    
    // Check for saved mode preference or respect OS preference
    const savedMode = localStorage.getItem('darkMode');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode === 'dark' || (savedMode === null && prefersDarkMode)) {
      body.classList.add('dark-mode');
      modeToggle.querySelector('i').textContent = 'brightness_7';
    }
    
    // Toggle dark/light mode
    modeToggle.addEventListener('click', function() {
      body.classList.toggle('dark-mode');
      const isDarkMode = body.classList.contains('dark-mode');
      
      // Update icon
      this.querySelector('i').textContent = isDarkMode ? 'brightness_7' : 'brightness_6';
      
      // Save preference
      localStorage.setItem('darkMode', isDarkMode ? 'dark' : 'light');
    });
    
    // Search type selection
    const searchTypeLinks = document.querySelectorAll('[data-search-type]');
    const dropdownTrigger = document.querySelector('.dropdown-trigger span');
    let currentSearchType = 'quick';
    
    searchTypeLinks.forEach(link => {
      link.addEventListener('click', function() {
        const searchType = this.getAttribute('data-search-type');
        currentSearchType = searchType;
        dropdownTrigger.textContent = searchType === 'quick' ? 'Quick Search' : 'Detailed Search';
        
        // You could modify the search behavior here based on the type
        if (searchType === 'detailed') {
          M.toast({html: 'Detailed search mode activated', classes: 'rounded'});
        }
      });
    });
    
    // Sample data
    const entries = [
      { id: 1, name: "Project Alpha", category: "Development", date: "2023-05-15", status: "Active" },
      { id: 2, name: "Marketing Campaign", category: "Marketing", date: "2023-06-22", status: "Pending" },
      { id: 3, name: "Server Upgrade", category: "Infrastructure", date: "2023-04-10", status: "Completed" },
      { id: 4, name: "Client Meeting", category: "Sales", date: "2023-07-05", status: "Scheduled" },
      { id: 5, name: "Website Redesign", category: "Design", date: "2023-06-30", status: "In Progress" }
    ];

    // Populate table for desktop
    function populateTable(data) {
      const tableBody = document.getElementById('entries-table');
      tableBody.innerHTML = '';
      
      data.forEach(entry => {
        const row = document.createElement('tr');
        
        // Create status chip with appropriate color
        let statusColor;
        switch(entry.status.toLowerCase()) {
          case 'active':
            statusColor = 'light-green white-text';
            break;
          case 'completed':
            statusColor = 'grey lighten-1 white-text';
            break;
          case 'pending':
          case 'scheduled':
            statusColor = 'amber lighten-2';
            break;
          case 'in progress':
            statusColor = 'blue-grey lighten-3';
            break;
          default:
            statusColor = 'grey lighten-3';
        }

        row.innerHTML = `
          <td>${entry.id}</td>
          <td>${entry.name}</td>
          <td>${entry.category}</td>
          <td>${entry.date}</td>
          <td><span class="chip ${statusColor}">${entry.status}</span></td>
          <td>
            <button class="btn waves-effect details-btn" data-id="${entry.id}">
              Details
              <i class="material-icons right">arrow_forward</i>
            </button>
          </td>
        `;
        
        tableBody.appendChild(row);
      });
      
      // Add event listeners to details buttons in table
      document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          const entry = entries.find(e => e.id == id);
          M.toast({html: `Details for: ${entry.name}`, classes: 'rounded'});
        });
      });
    }
    
    // Populate cards for mobile
    function populateCards(data) {
      const cardsContainer = document.getElementById('entries-cards');
      cardsContainer.innerHTML = '';
      
      data.forEach(entry => {
        // Create status chip with appropriate color
        let statusColor;
        switch(entry.status.toLowerCase()) {
          case 'active':
            statusColor = 'light-green white-text';
            break;
          case 'completed':
            statusColor = 'grey lighten-1 white-text';
            break;
          case 'pending':
          case 'scheduled':
            statusColor = 'amber lighten-2';
            break;
          case 'in progress':
            statusColor = 'blue-grey lighten-3';
            break;
          default:
            statusColor = 'grey lighten-3';
        }
        
        const card = document.createElement('div');
        card.className = 'entry-card';
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
      
      // Add event listeners to details buttons in cards
      document.querySelectorAll('.card-details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          const entry = entries.find(e => e.id == id);
          M.toast({html: `Details for: ${entry.name}`, classes: 'rounded'});
        });
      });
    }

    // Initial population
    populateTable(entries);
    populateCards(entries);
    
    // Search functionality
    document.getElementById('search').addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      let filteredEntries;
      
      if (currentSearchType === 'quick') {
        // Quick search - search in name, category, status
        filteredEntries = entries.filter(entry => 
          entry.name.toLowerCase().includes(searchTerm) || 
          entry.category.toLowerCase().includes(searchTerm) ||
          entry.status.toLowerCase().includes(searchTerm)
        );
      } else {
        // Detailed search - search in all fields
        filteredEntries = entries.filter(entry => 
          entry.id.toString().includes(searchTerm) ||
          entry.name.toLowerCase().includes(searchTerm) || 
          entry.category.toLowerCase().includes(searchTerm) ||
          entry.date.includes(searchTerm) ||
          entry.status.toLowerCase().includes(searchTerm)
        );
      }
      
      populateTable(filteredEntries);
      populateCards(filteredEntries);
    });
    
    // Create button functionality
    document.getElementById('create-btn').addEventListener('click', function() {
      M.toast({html: 'Create new entry clicked!', classes: 'rounded'});
    });
    
    // Initialize Materialize components
    M.AutoInit();

// Add this after the initial table population
document.querySelectorAll('.table-controls .btn').forEach(btn => {
btn.addEventListener('click', function() {
  // If it's a sort button
  if (this.title.includes('Sort')) {
    // Remove active class from other sort buttons
    document.querySelectorAll('.table-controls .btn[title*="Sort"]')
      .forEach(b => b.classList.remove('active'));
    // Add active class to clicked button
    this.classList.add('active');
    
    // Sort the entries
    const sortDirection = this.title.includes('Ascending') ? 'asc' : 'desc';
    const sortedEntries = [...entries].sort((a, b) => {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });
    
    // Update the table
    populateTable(sortedEntries);
    populateCards(sortedEntries);
  }
  
  // Show toast for other buttons (placeholder functionality)
  else {
    M.toast({html: `${this.title} clicked!`, classes: 'rounded'});
  }
});
});
  });