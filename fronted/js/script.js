// 共用全局變數
let currentCurrency = 'TWD'; // 默認顯示貨幣

// 主題切換功能
function setupThemeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // 檢查本地存儲中是否有已保存的主題偏好
    const currentTheme = localStorage.getItem('theme');

    // 如果有已保存的主題偏好，則應用它
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }
    // 否則根據系統偏好設置主題
    else if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }

    // 切換主題的點擊事件
    darkModeToggle.addEventListener('click', function () {
        let theme = 'light';

        // 如果當前是亮色主題，切換到暗色主題
        if (!document.documentElement.hasAttribute('data-theme') ||
            document.documentElement.getAttribute('data-theme') === 'light') {
            theme = 'dark';
        }

        // 設置主題
        document.documentElement.setAttribute('data-theme', theme);
        // 保存主題偏好到本地存儲
        localStorage.setItem('theme', theme);
    });
}

// Tab functionality with improved debugging
function setupTabs() {
    console.log('Setting up tabs');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    console.log('Found tab buttons:', tabButtons.length);
    console.log('Found tab contents:', tabContents.length);

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            console.log('Tab clicked:', tabId);

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Show corresponding tab content
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
                console.log('Tab content activated:', tabId);
            } else {
                console.error('Tab content not found for ID:', tabId);
            }

            // If switching to changelog tab and it hasn't been loaded yet, fetch the data
            if (tabId === 'changelog-tab') {
                // This will now call the function from change.js
                initChangelogTab();
            }
        });
    });
}

// 頁面加載時初始化
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded');

    // 檢查本地存儲中是否有已保存的貨幣偏好
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency) {
        currentCurrency = savedCurrency;
    }

    // Check for saved page size preference
    const savedPageSize = localStorage.getItem('preferredPageSize');
    if (savedPageSize) {
        itemsPerPage = parseInt(savedPageSize);
    }

    // Check for saved changelog page size preference
    const savedChangelogPageSize = localStorage.getItem('changelogPreferredPageSize');
    if (savedChangelogPageSize) {
        changelogItemsPerPage = parseInt(savedChangelogPageSize);
    }

    // Setup tab functionality first
    setupTabs();
    console.log('Tabs setup complete');

    // Setup theme toggle
    setupThemeToggle();
    console.log('Theme toggle setup complete');

    // Initialize price table functionality
    initPriceTable();
    console.log('Price table initialization complete');

    // 獲取初始數據
    console.log('Fetching initial pricing data');
    fetchPricingData(currentCurrency);

    // 防止iOS點擊延遲
    document.addEventListener('touchstart', function () { }, { passive: true });

    console.log('Initialization complete');
});