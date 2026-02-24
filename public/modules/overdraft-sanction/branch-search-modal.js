// State management
let searchResults = [];
let selectedRow = null;
let selectedBranch = null;

// Sample branches for demonstration
const sampleBranches = [
    { branchId: '0101', branchName: 'Head Office' },
    { branchId: '0102', branchName: 'Nairobi Branch' },
    { branchId: '0103', branchName: 'Mombasa Branch' },
    { branchId: '0104', branchName: 'Kisumu Branch' },
    { branchId: '0105', branchName: 'Nakuru Branch' },
    { branchId: '0106', branchName: 'Eldoret Branch' },
    { branchId: '0107', branchName: 'Thika Branch' },
    { branchId: '0108', branchName: 'Kitale Branch' }
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Auto-focus on Branch ID search field
    document.getElementById('searchBranchId').focus();

    // Add enter key listeners
    document.getElementById('searchBranchId').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    document.getElementById('searchBranchName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Load all branches initially
    performSearch();
});

// Perform search
function performSearch() {
    const branchIdValue = document.getElementById('searchBranchId').value.trim().toLowerCase();
    const branchNameValue = document.getElementById('searchBranchName').value.trim().toLowerCase();
    const branchIdOperator = document.getElementById('branchIdOperator').value;
    const branchNameOperator = document.getElementById('branchNameOperator').value;

    // In real implementation, this would call the backend API
    // For now, filter the sample data
    searchResults = sampleBranches.filter(branch => {
        let idMatch = true;
        let nameMatch = true;

        if (branchIdValue) {
            switch (branchIdOperator) {
                case 'like':
                    idMatch = branch.branchId.toLowerCase().includes(branchIdValue);
                    break;
                case 'equals':
                    idMatch = branch.branchId.toLowerCase() === branchIdValue;
                    break;
                case 'startsWith':
                    idMatch = branch.branchId.toLowerCase().startsWith(branchIdValue);
                    break;
            }
        }

        if (branchNameValue) {
            switch (branchNameOperator) {
                case 'like':
                    nameMatch = branch.branchName.toLowerCase().includes(branchNameValue);
                    break;
                case 'equals':
                    nameMatch = branch.branchName.toLowerCase() === branchNameValue;
                    break;
                case 'startsWith':
                    nameMatch = branch.branchName.toLowerCase().startsWith(branchNameValue);
                    break;
            }
        }

        return idMatch && nameMatch;
    });

    displaySearchResults();
}

// Display search results
function displaySearchResults() {
    const tableBody = document.getElementById('searchResultsTable');
    tableBody.innerHTML = '';

    if (searchResults.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted">No branches found</td>
            </tr>
        `;
        return;
    }

    searchResults.forEach((branch, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${branch.branchId}</td>
            <td>${branch.branchName}</td>
        `;
        
        row.addEventListener('click', function() {
            selectRow(index);
        });

        tableBody.appendChild(row);
    });

    // Auto-select first result
    if (searchResults.length > 0) {
        selectRow(0);
    }
}

// Select a row
function selectRow(index) {
    // Remove previous selection
    if (selectedRow !== null) {
        const rows = document.querySelectorAll('#searchResultsTable tr');
        if (rows[selectedRow]) {
            rows[selectedRow].classList.remove('selected');
        }
    }

    // Add new selection
    selectedRow = index;
    selectedBranch = searchResults[index];
    const rows = document.querySelectorAll('#searchResultsTable tr');
    if (rows[selectedRow]) {
        rows[selectedRow].classList.add('selected');
    }
}

// Select branch and close modal
function selectBranch() {
    if (selectedBranch) {
        // Pass selected branch to parent window
        if (window.parent && window.parent.setBranchFromSearch) {
            window.parent.setBranchFromSearch(selectedBranch);
        }
        
        // Close modal
        if (window.parent && window.parent.closeBranchSearchModal) {
            window.parent.closeBranchSearchModal();
        }
    } else {
        alert('Please select a branch from the search results.');
    }
}

// Navigate to previous result
function navigatePrevious() {
    if (searchResults.length === 0) return;
    
    if (selectedRow === null || selectedRow === 0) {
        selectRow(searchResults.length - 1);
    } else {
        selectRow(selectedRow - 1);
    }

    // Scroll to selected row
    scrollToSelectedRow();
}

// Navigate to next result
function navigateNext() {
    if (searchResults.length === 0) return;
    
    if (selectedRow === null || selectedRow === searchResults.length - 1) {
        selectRow(0);
    } else {
        selectRow(selectedRow + 1);
    }

    // Scroll to selected row
    scrollToSelectedRow();
}

// Scroll to selected row
function scrollToSelectedRow() {
    const rows = document.querySelectorAll('#searchResultsTable tr');
    if (rows[selectedRow]) {
        rows[selectedRow].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
