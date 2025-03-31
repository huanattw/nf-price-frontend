// Global variables for changelog
let changelogData = [];
let filteredChangelogData = [];
let changelogCurrentPage = 1;
let changelogItemsPerPage = 10;
let changelogDataLoaded = false;

// Fetch changelog data from API
async function fetchChangelogData() {
    console.log('Starting fetchChangelogData()');
    const tableBody = document.querySelector('#changelogTable tbody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-data">載入中...</td></tr>';

    try {
        // Fetch data from the API
        // console.log('Attempting to fetch from API:', 'http://192.168.0.31:5002/old_diff');
        const response = await fetch('https://api.panzihk.shop/change_log');
        console.log('API response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response received, data length:', Array.isArray(data) ? data.length : 'not an array');

        // Set the data as loaded
        changelogDataLoaded = true;

        // Process the API data into our required format
        changelogData = processChangelogData(data);
        console.log('Processed changelog data, entries:', changelogData.length);

        // Update filtered data and generate table
        // No sorting, display as-is from the API
        filteredChangelogData = [...changelogData];
        generateChangelogTable(filteredChangelogData);

        return changelogData;
    } catch (error) {
        console.error('獲取變更記錄數據時出錯:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="error-data">
            <i class="fas fa-exclamation-circle"></i> 
            載入數據時出錯: ${error.message}
        </td></tr>`;
        return [];
    }
}

// Process API data into the format needed for the changelog table
function processChangelogData(apiData) {
    console.log('Processing changelog data');
    // Make sure we're working with an array
    const dataArray = Array.isArray(apiData) ? apiData : [];
    console.log('Data array length:', dataArray.length);

    return dataArray.map(item => {
        // Create a formatted change entry based on the provided data structure
        const changeEntry = {
            date: item.date || '',
            country: item.full_name || '',
            countryCode: item.iso2_code || '',
            changes: {
                Mobile: processChangePlan(item, 'Mobile'),
                'Basic/Ads': processChangePlan(item, 'Basic/Ads'),
                Standard: processChangePlan(item, 'Standard'),
                Premium: processChangePlan(item, 'Premium'),
                'Standard/Ads': processChangePlan(item, 'Standard/Ads')  // Added support for Standard/Ads plan
            }
        };

        return changeEntry;
    });
}

// Helper function to process the price change for a specific plan
function processChangePlan(item, planName) {
    // Check if the plan has old and new prices
    const oldPrice = item.old_price && item.old_price[planName];
    const newPrice = item.new_price && item.new_price[planName];

    // If both old and new prices are empty or missing, the plan has no changes
    if ((!oldPrice || oldPrice === '') && (!newPrice || newPrice === '')) {
        return null;
    }

    // Format prices with currency - swapped as requested
    const formattedOldPrice = newPrice ? `${item.new_currency || ''} ${newPrice}` : '-';
    const formattedNewPrice = oldPrice ? `${item.old_currency || ''} ${oldPrice}` : '-';

    // Calculate percentage change if both prices exist and are numbers
    let changePercentage = '0%';
    if (oldPrice && newPrice && oldPrice !== '' && newPrice !== '') {
        const oldNumeric = parseFloat(newPrice);
        const newNumeric = parseFloat(oldPrice);

        if (!isNaN(oldNumeric) && !isNaN(newNumeric) && oldNumeric > 0) {
            // Modified calculation logic to ensure correct price increase percentage
            // Since we've swapped the display, we use oldNumeric (actually newPrice) minus newNumeric (actually oldPrice)
            const percentChange = ((oldNumeric - newNumeric) / newNumeric * 100).toFixed(1);
            changePercentage = percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`;
        }
    } else if ((oldPrice && oldPrice !== '') && (!newPrice || newPrice === '')) {
        // Plan was removed (with swapped logic)
        changePercentage = 'Removed';
    } else if ((!oldPrice || oldPrice === '') && (newPrice && newPrice !== '')) {
        // Plan was added (with swapped logic)
        changePercentage = 'New';
    }

    return {
        old: formattedOldPrice,
        new: formattedNewPrice,
        change: changePercentage
    };
}

// Generate changelog table with improved handling and debugging
function generateChangelogTable(data) {
    console.log('Generating changelog table with data:', data.length, 'items');
    const tableBody = document.querySelector('#changelogTable tbody');
    tableBody.innerHTML = '';

    // Check if data is empty
    if (!data || data.length === 0) {
        console.log('No changelog data available');
        const noResultsRow = document.createElement('tr');
        const noResultsCell = document.createElement('td');
        noResultsCell.setAttribute('colspan', '7'); // Updated to 7 to account for Standard/Ads column
        noResultsCell.classList.add('no-results');
        noResultsCell.innerHTML = '<i class="fas fa-search"></i> 找不到符合的變更記錄';
        noResultsRow.appendChild(noResultsCell);
        tableBody.appendChild(noResultsRow);

        // Clear pagination
        updateChangelogPagination(0);
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(data.length / changelogItemsPerPage);
    console.log('Changelog pagination: total pages =', totalPages, 'current page =', changelogCurrentPage);

    // Ensure current page is valid
    if (changelogCurrentPage > totalPages) {
        changelogCurrentPage = totalPages;
    }
    if (changelogCurrentPage < 1) {
        changelogCurrentPage = 1;
    }

    // Update pagination controls
    updateChangelogPagination(data.length);

    // Calculate start and end indices for current page
    const startIndex = (changelogCurrentPage - 1) * changelogItemsPerPage;
    const endIndex = Math.min(startIndex + changelogItemsPerPage, data.length);

    // Get only the data for current page
    const currentPageData = data.slice(startIndex, endIndex);
    console.log('Displaying changelog items', startIndex + 1, 'to', endIndex);

    let delay = 0;
    for (const changeItem of currentPageData) {
        const row = document.createElement('tr');
        row.style.animationDelay = `${delay}ms`;
        delay += 50;

        // Date column
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(changeItem.date);
        row.appendChild(dateCell);

        // Country column
        const countryCell = document.createElement('td');
        const countryContainer = document.createElement('div');
        countryContainer.classList.add('country-container');

        const countryCode = document.createElement('span');
        countryCode.classList.add('country-code');
        countryCode.setAttribute('data-full-name', changeItem.country);
        countryCode.textContent = changeItem.countryCode;

        countryContainer.appendChild(countryCode);
        countryCell.appendChild(countryContainer);
        row.appendChild(countryCell);

        // Plan change columns
        const plans = ['Mobile', 'Basic/Ads', 'Standard/Ads', 'Standard', 'Premium'];
        plans.forEach(plan => {
            const changeCell = document.createElement('td');

            if (changeItem.changes && changeItem.changes[plan]) {
                const changeContainer = document.createElement('div');
                changeContainer.classList.add('price-container');

                // Old price
                const oldPrice = document.createElement('div');
                oldPrice.classList.add('og-price');
                oldPrice.textContent = changeItem.changes[plan].old;

                // New price
                const newPrice = document.createElement('div');
                newPrice.classList.add('ec-price');

                // Add change percentage with color
                let changeText = changeItem.changes[plan].new;
                const changeValue = changeItem.changes[plan].change;

                if (changeValue !== '0%') {
                    const changeSpan = document.createElement('span');
                    changeSpan.textContent = ` (${changeValue})`;

                    if (changeValue.includes('+')) {
                        changeSpan.style.color = '#ef4444'; // Red for price increase
                    } else if (changeValue.includes('-')) {
                        changeSpan.style.color = '#22c55e'; // Green for price decrease
                    } else if (changeValue === 'New') {
                        changeSpan.style.color = '#3b82f6'; // Blue for new plans
                    } else if (changeValue === 'Removed') {
                        changeSpan.style.color = '#f97316'; // Orange for removed plans
                    }

                    newPrice.appendChild(document.createTextNode(changeText + ' '));
                    newPrice.appendChild(changeSpan);
                } else {
                    newPrice.textContent = changeText;
                }

                changeContainer.appendChild(oldPrice);
                changeContainer.appendChild(newPrice);
                changeCell.appendChild(changeContainer);
            } else {
                changeCell.textContent = '-';
            }

            row.appendChild(changeCell);
        });

        tableBody.appendChild(row);
    }

    console.log('Changelog table generation complete');
}

// Update changelog pagination
function updateChangelogPagination(totalItems) {
    const paginationContainer = document.querySelector('#changelogPagination');

    // Clear existing pagination
    paginationContainer.innerHTML = '';

    // If no items, hide pagination
    if (totalItems === 0) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    // Add information about current page and total items
    const paginationInfo = document.createElement('div');
    paginationInfo.classList.add('pagination-info');

    const startItem = totalItems === 0 ? 0 : (changelogCurrentPage - 1) * changelogItemsPerPage + 1;
    const endItem = Math.min(changelogCurrentPage * changelogItemsPerPage, totalItems);

    paginationInfo.textContent = `${startItem}-${endItem} / ${totalItems} 項`;
    paginationContainer.appendChild(paginationInfo);

    // Create pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.classList.add('pagination-controls');

    const totalPages = Math.ceil(totalItems / changelogItemsPerPage);

    // Previous page button
    const prevButton = document.createElement('button');
    prevButton.classList.add('pagination-button', 'prev-button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = changelogCurrentPage === 1;
    prevButton.addEventListener('click', () => {
        if (changelogCurrentPage > 1) {
            changeChangelogPage(changelogCurrentPage - 1);
        }
    });
    paginationControls.appendChild(prevButton);

    // Page numbers
    const pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.classList.add('page-numbers');

    // Determine which page numbers to show
    let startPage = Math.max(1, changelogCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust start page if we're near the end
    if (endPage - startPage < 4 && startPage > 1) {
        startPage = Math.max(1, endPage - 4);
    }

    // First page button (if not already showing)
    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.classList.add('pagination-button', 'page-number');
        firstPageButton.textContent = '1';
        firstPageButton.addEventListener('click', () => changeChangelogPage(1));
        pageNumbersContainer.appendChild(firstPageButton);

        // Ellipsis if necessary
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.classList.add('pagination-ellipsis');
            ellipsis.textContent = '...';
            pageNumbersContainer.appendChild(ellipsis);
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.classList.add('pagination-button', 'page-number');
        if (i === changelogCurrentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => changeChangelogPage(i));
        pageNumbersContainer.appendChild(pageButton);
    }

    // Last page button (if not already showing)
    if (endPage < totalPages) {
        // Ellipsis if necessary
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.classList.add('pagination-ellipsis');
            ellipsis.textContent = '...';
            pageNumbersContainer.appendChild(ellipsis);
        }

        const lastPageButton = document.createElement('button');
        lastPageButton.classList.add('pagination-button', 'page-number');
        lastPageButton.textContent = totalPages;
        lastPageButton.addEventListener('click', () => changeChangelogPage(totalPages));
        pageNumbersContainer.appendChild(lastPageButton);
    }

    paginationControls.appendChild(pageNumbersContainer);

    // Next page button
    const nextButton = document.createElement('button');
    nextButton.classList.add('pagination-button', 'next-button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = changelogCurrentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (changelogCurrentPage < totalPages) {
            changeChangelogPage(changelogCurrentPage + 1);
        }
    });
    paginationControls.appendChild(nextButton);

    paginationContainer.appendChild(paginationControls);

    // Add page size selector
    const pageSizeContainer = document.createElement('div');
    pageSizeContainer.classList.add('page-size-container');

    const pageSizeLabel = document.createElement('label');
    pageSizeLabel.textContent = '每頁顯示:';
    pageSizeLabel.setAttribute('for', 'changelogPageSizeSelector');
    pageSizeContainer.appendChild(pageSizeLabel);

    const pageSizeSelector = document.createElement('select');
    pageSizeSelector.id = 'changelogPageSizeSelector';
    pageSizeSelector.classList.add('page-size-selector');

    [5, 10, 25, 50, 100].forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        option.selected = size === changelogItemsPerPage;
        pageSizeSelector.appendChild(option);
    });

    pageSizeSelector.addEventListener('change', function () {
        changelogItemsPerPage = parseInt(this.value);
        localStorage.setItem('changelogPreferredPageSize', changelogItemsPerPage);
        changeChangelogPage(1); // Reset to first page with new page size
    });

    pageSizeContainer.appendChild(pageSizeSelector);
    paginationContainer.appendChild(pageSizeContainer);
}

// Change changelog page
function changeChangelogPage(pageNumber) {
    console.log('Changing changelog page to', pageNumber);
    changelogCurrentPage = pageNumber;
    generateChangelogTable(filteredChangelogData);

    // Scroll to top of table
    document.querySelector('#changelog-tab .table-responsive').scrollTop = 0;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';

    try {
        // Handle different date formats (YYYY/MM/DD or YYYY-MM-DD)
        let date;
        if (dateString.includes('/')) {
            // Split by / and rearrange if needed
            const parts = dateString.split('/');
            if (parts.length === 3) {
                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                date = new Date(dateString);
            }
        } else {
            date = new Date(dateString);
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', dateString);
            return dateString; // Return the original string if parsing failed
        }

        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString; // Return original string in case of error
    }
}

// Setup changelog search
function setupChangelogSearch() {
    const searchInput = document.getElementById('changelogSearchInput');
    const clearButton = document.getElementById('clearChangelogSearch');

    if (!searchInput || !clearButton) {
        console.error('Changelog search elements not found');
        return;
    }

    console.log('Setting up changelog search');

    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase().trim();
        console.log('Changelog search term:', searchTerm);

        // Show/hide clear button
        clearButton.style.display = searchTerm ? 'flex' : 'none';

        // Filter data
        filteredChangelogData = changelogData.filter(item => {
            return (
                (item.country && item.country.toLowerCase().includes(searchTerm)) ||
                (item.countryCode && item.countryCode.toLowerCase().includes(searchTerm)) ||
                (item.date && item.date.toLowerCase().includes(searchTerm))
            );
        });

        console.log('Filtered changelog data:', filteredChangelogData.length, 'items');

        // Reset to page 1 when searching
        changelogCurrentPage = 1;

        // Regenerate table
        generateChangelogTable(filteredChangelogData);
    });

    // Clear search
    clearButton.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        filteredChangelogData = [...changelogData];
        clearButton.style.display = 'none';

        console.log('Changelog search cleared');

        // Reset to page 1
        changelogCurrentPage = 1;

        // Regenerate table
        generateChangelogTable(filteredChangelogData);
    });
}

// Initialize changelog functionality
function initChangelogTab() {
    console.log('Initializing changelog tab');

    // Load preferences from localStorage if available
    if (localStorage.getItem('changelogPreferredPageSize')) {
        changelogItemsPerPage = parseInt(localStorage.getItem('changelogPreferredPageSize'));
    }

    setupChangelogSearch();

    // Only load changelog data when the tab is first activated
    if (!changelogDataLoaded) {
        fetchChangelogData();
    }
}