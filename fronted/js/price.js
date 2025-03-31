// 價格表相關的全局變數
let currentSortColumn = null;
let currentSortDirection = 'default';
let originalData = {}; // 原始API資料
let filteredData = {}; // 篩選後的資料
let currentPage = 1;
let itemsPerPage = 10; // 默認每頁顯示數量
let totalPages = 1;

// 從API獲取數據
async function fetchPricingData(currency) {
    // 顯示載入狀態
    const tableBody = document.querySelector('#pricingTable tbody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-data">載入中...</td></tr>';

    try {
        // 從API獲取數據，帶上貨幣參數
        const response = await fetch(`https://api.panzihk.shop/getprice?transcur=${currency}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // 更新全局數據
        originalData = { ...data };
        filteredData = { ...data };

        // 生成表格
        generateTable(filteredData);

        // 應用排序（如果需要）
        if (currentSortColumn && currentSortDirection !== 'default') {
            sortTable(currentSortColumn, currentSortDirection);
        }

        return data;
    } catch (error) {
        console.error('獲取數據時出錯:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="error-data">
            <i class="fas fa-exclamation-circle"></i> 
            載入數據時出錯: ${error.message}
        </td></tr>`;
        return {};
    }
}

// 貨幣格式化
function formatCurrency(amount, currency) {
    // 檢查是否需要特別格式化 (例如千位分隔符)
    amount = parseFloat(amount);

    // 根據貨幣調整精度
    let precision = 2;
    if (currency === 'JPY' || currency === 'NGN' || currency === 'TWD' || currency === 'INR') {
        precision = 0;
    }

    // 如果金額很小，保持更多小數位
    if (amount < 0.1 && precision === 2) {
        precision = 4;
    }

    // 格式化數字
    const formattedAmount = amount.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
    });

    return `${currency} ${formattedAmount}`;
}

// 生成表格內容
function generateTable(data) {
    const tableBody = document.querySelector('#pricingTable tbody');
    tableBody.innerHTML = '';

    // 檢查數據是否為空
    if (Object.keys(data).length === 0) {
        const noResultsRow = document.createElement('tr');
        const noResultsCell = document.createElement('td');
        noResultsCell.setAttribute('colspan', '6');
        noResultsCell.classList.add('no-results');
        noResultsCell.innerHTML = '<i class="fas fa-search"></i> 找不到符合的結果';
        noResultsRow.appendChild(noResultsCell);
        tableBody.appendChild(noResultsRow);

        // Clear pagination when no results
        updatePagination(0);
        return;
    }

    // Calculate pagination
    const dataEntries = Object.entries(data);
    totalPages = Math.ceil(dataEntries.length / itemsPerPage);

    // Ensure current page is valid
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    // Update pagination controls
    updatePagination(dataEntries.length);

    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, dataEntries.length);

    // Get only the data for current page
    const currentPageData = dataEntries.slice(startIndex, endIndex);

    let delay = 0;
    for (const [iso2Code, countryData] of currentPageData) {
        // 檢查countryData是否存在並正確
        if (!countryData) {
            console.error('無效的國家數據:', iso2Code);
            continue;
        }

        const row = document.createElement('tr');
        row.style.animationDelay = `${delay}ms`;
        delay += 50;

        // 國家欄位
        const countryCell = document.createElement('td');

        // 創建國家容器
        const countryContainer = document.createElement('div');
        countryContainer.classList.add('country-container');

        // 只顯示國家代碼，但保留 data 屬性存儲完整名稱
        const countryCode = document.createElement('span');
        countryCode.classList.add('country-code');
        countryCode.setAttribute('data-full-name', countryData.full_name || iso2Code);
        countryCode.textContent = countryData.iso3_code || iso2Code;

        // 將元素添加到容器
        countryContainer.appendChild(countryCode);
        countryCell.appendChild(countryContainer);
        row.appendChild(countryCell);

        // 價格欄位
        const plans = ['Mobile', 'Basic/Ads', 'Standard/Ads', 'Standard', 'Premium'];
        plans.forEach(plan => {
            const priceCell = document.createElement('td');
            const priceContainer = document.createElement('div');
            priceContainer.classList.add('price-container');


            // 檢查是否有價格數據
            if (countryData.og_price && countryData.og_price[plan] !== undefined && countryData.og_price[plan] !== "") {
                // 原始價格
                const ogPrice = document.createElement('div');
                ogPrice.classList.add('og-price');
                ogPrice.textContent = `${countryData.currency || ''} ${countryData.og_price[plan]}`;

                // 如果當前顯示的是本地貨幣，突出顯示
                if (currentCurrency === countryData.currency) {
                    ogPrice.classList.add('highlighted-price');
                }

                priceContainer.appendChild(ogPrice);
            }

            // 檢查是否有等值價格數據
            if (countryData.ec_price && countryData.ec_price[plan] !== undefined && countryData.ec_price[plan] !== "") {
                // 換算價格
                const ecPrice = document.createElement('div');
                ecPrice.classList.add('ec-price');
                ecPrice.textContent = `${countryData.ec_currency || ''} ${countryData.ec_price[plan]}`;
                priceContainer.appendChild(ecPrice);
            }

            priceCell.appendChild(priceContainer);
            row.appendChild(priceCell);
        });

        tableBody.appendChild(row);
    }
}

// Function to update pagination controls
function updatePagination(totalItems) {
    const paginationContainer = document.querySelector('#price-tab .pagination-container');

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

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    paginationInfo.textContent = `${startItem}-${endItem} / ${totalItems} 項`;
    paginationContainer.appendChild(paginationInfo);

    // Create pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.classList.add('pagination-controls');

    // Previous page button
    const prevButton = document.createElement('button');
    prevButton.classList.add('pagination-button', 'prev-button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            changePage(currentPage - 1);
        }
    });
    paginationControls.appendChild(prevButton);

    // Page numbers
    const pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.classList.add('page-numbers');

    // Determine which page numbers to show
    let startPage = Math.max(1, currentPage - 2);
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
        firstPageButton.addEventListener('click', () => changePage(1));
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
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => changePage(i));
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
        lastPageButton.addEventListener('click', () => changePage(totalPages));
        pageNumbersContainer.appendChild(lastPageButton);
    }

    paginationControls.appendChild(pageNumbersContainer);

    // Next page button
    const nextButton = document.createElement('button');
    nextButton.classList.add('pagination-button', 'next-button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            changePage(currentPage + 1);
        }
    });
    paginationControls.appendChild(nextButton);

    paginationContainer.appendChild(paginationControls);

    // Add page size selector
    const pageSizeContainer = document.createElement('div');
    pageSizeContainer.classList.add('page-size-container');

    const pageSizeLabel = document.createElement('label');
    pageSizeLabel.textContent = '每頁顯示:';
    pageSizeLabel.setAttribute('for', 'pageSizeSelector');
    pageSizeContainer.appendChild(pageSizeLabel);

    const pageSizeSelector = document.createElement('select');
    pageSizeSelector.id = 'pageSizeSelector';
    pageSizeSelector.classList.add('page-size-selector');

    [5, 10, 25, 50, 100].forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        option.selected = size === itemsPerPage;
        pageSizeSelector.appendChild(option);
    });

    pageSizeSelector.addEventListener('change', function () {
        itemsPerPage = parseInt(this.value);
        localStorage.setItem('preferredPageSize', itemsPerPage);
        changePage(1); // Reset to first page with new page size
    });

    pageSizeContainer.appendChild(pageSizeSelector);
    paginationContainer.appendChild(pageSizeContainer);
}

// Function to change page
function changePage(pageNumber) {
    currentPage = pageNumber;
    generateTable(filteredData);

    // Scroll to top of table
    document.querySelector('#price-tab .table-responsive').scrollTop = 0;
}

// 搜尋功能
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');

    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase().trim();

        // 顯示/隱藏清除按鈕
        clearButton.style.display = searchTerm ? 'flex' : 'none';

        // 篩選數據
        filteredData = {};
        for (const [key, country] of Object.entries(originalData)) {
            // 安全地檢查屬性是否存在並進行比較
            const iso3Match = country.iso3_code ? country.iso3_code.toLowerCase().includes(searchTerm) : false;
            const fullNameMatch = country.full_name ? country.full_name.toLowerCase().includes(searchTerm) : false;
            const iso2Match = country.iso2_code ? country.iso2_code.toLowerCase().includes(searchTerm) : false;
            const currencyMatch = country.currency ? country.currency.toLowerCase().includes(searchTerm) : false;

            if (iso3Match || fullNameMatch || iso2Match || currencyMatch) {
                filteredData[key] = country;
            }
        }

        // Reset to page 1 when searching
        currentPage = 1;

        // 重新生成表格
        generateTable(filteredData);

        // 保持排序
        if (currentSortColumn && currentSortDirection !== 'default') {
            sortTable(currentSortColumn, currentSortDirection);
        }
    });

    // 清除搜尋
    clearButton.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        filteredData = { ...originalData };
        clearButton.style.display = 'none';

        // Reset to page 1
        currentPage = 1;

        generateTable(filteredData);

        // 保持排序
        if (currentSortColumn && currentSortDirection !== 'default') {
            sortTable(currentSortColumn, currentSortDirection);
        }
    });
}

// 設置排序功能
function setupSorting() {
    document.querySelectorAll('#pricingTable th.sortable').forEach(header => {
        header.addEventListener('click', function () {
            const sortBy = this.getAttribute('data-sort');
            let direction = 'asc';

            // 確定排序方向
            if (currentSortColumn === sortBy) {
                if (currentSortDirection === 'asc') {
                    direction = 'desc';
                } else if (currentSortDirection === 'desc') {
                    direction = 'default';
                }
            }

            // 更新排序狀態
            currentSortColumn = sortBy;
            currentSortDirection = direction;

            // 更新排序圖標
            document.querySelectorAll('#pricingTable th.sortable').forEach(th => {
                th.classList.remove('asc', 'desc');
            });

            if (direction !== 'default') {
                this.classList.add(direction);
            }

            // 執行排序
            sortTable(sortBy, direction);
        });
    });
}

// 排序表格
function sortTable(sortBy, direction) {
    if (direction === 'default') {
        // 恢復預設排序
        generateTable(filteredData);
        return;
    }

    // 將 filteredData 轉換為數組以便排序
    const dataArray = Object.entries(filteredData);

    dataArray.sort((entryA, entryB) => {
        const [keyA, countryDataA] = entryA;
        const [keyB, countryDataB] = entryB;

        if (sortBy === 'country') {
            // 按國家代碼排序
            const valueA = countryDataA.iso3_code || keyA;
            const valueB = countryDataB.iso3_code || keyB;

            return direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        } else if (sortBy === 'mobile' || sortBy === 'standardads' || sortBy === 'basic') {
            let plan = 'Mobile';
            if (sortBy === 'basic') plan = 'Basic/Ads';
            else if (sortBy === 'standardads') plan = 'Standard/Ads';
            console.log('Sorting by plan:', plan);

            let valueA = 0;
            let valueB = 0;

            if (countryDataA.ec_price && countryDataA.ec_price[plan] !== undefined && countryDataA.ec_price[plan] !== "") {
                valueA = parseFloat(countryDataA.ec_price[plan]);
            }
            if (countryDataB.ec_price && countryDataB.ec_price[plan] !== undefined && countryDataB.ec_price[plan] !== "") {
                valueB = parseFloat(countryDataB.ec_price[plan]);
            }
            if (valueA === 0) {
                valueA = 999999999999;
            }
            if (valueB === 0) {
                valueB = 999999999999;
            }

            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        }
        else {
            // 按價格排序
            let plan;
            if (sortBy === 'standard') plan = 'Standard';
            else if (sortBy === 'premium') plan = 'Premium';

            // 獲取等值價格用於排序 (ec_price)
            let valueA = 0;
            let valueB = 0;

            if (countryDataA.ec_price && countryDataA.ec_price[plan] !== undefined) {
                valueA = parseFloat(countryDataA.ec_price[plan]);
            }

            if (countryDataB.ec_price && countryDataB.ec_price[plan] !== undefined) {
                valueB = parseFloat(countryDataB.ec_price[plan]);
            }

            // 如果無法獲取等值價格，嘗試使用原始價格
            if (isNaN(valueA) && countryDataA.og_price && countryDataA.og_price[plan] !== undefined) {
                valueA = parseFloat(countryDataA.og_price[plan]);
            }

            if (isNaN(valueB) && countryDataB.og_price && countryDataB.og_price[plan] !== undefined) {
                valueB = parseFloat(countryDataB.og_price[plan]);
            }


            // 如果仍然無法解析為數字，使用0
            valueA = isNaN(valueA) ? 0 : valueA;
            valueB = isNaN(valueB) ? 0 : valueB;

            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        }
    });

    // 將排序後的數組轉換回對象
    const sortedData = {};
    dataArray.forEach(([key, value]) => {
        sortedData[key] = value;
    });

    // 更新過濾後的數據
    filteredData = sortedData;

    // 重新生成表格（會自動處理分頁）
    generateTable(filteredData);
}

// 設置貨幣選擇器
function setupCurrencySelector() {
    const currencySelector = document.getElementById('currencySelector');

    // 設置初始選中值
    currencySelector.value = currentCurrency;

    // 當選擇改變時重新獲取數據
    currencySelector.addEventListener('change', function () {
        currentCurrency = this.value;

        // Reset to page 1
        currentPage = 1;

        // 使用新選擇的貨幣重新獲取數據
        fetchPricingData(currentCurrency);

        // 保存用戶偏好到本地存儲
        localStorage.setItem('preferredCurrency', currentCurrency);
    });
}

// 處理國家代碼點擊事件 (針對移動設備)
function setupCountryCodeTap() {
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('country-code')) {
            const countryName = event.target.getAttribute('data-full-name');
            if (countryName) {
                // 在移動設備上，點擊時顯示國家全名
                if (window.innerWidth <= 768) {
                    alert(countryName);
                }
            }
        }
    });
}

// 初始化價格表功能
function initPriceTable() {
    // 從本地存儲加載用戶偏好
    if (localStorage.getItem('preferredPageSize')) {
        itemsPerPage = parseInt(localStorage.getItem('preferredPageSize'));
    }

    setupSearch();
    setupSorting();
    setupCurrencySelector();
    setupCountryCodeTap();
}