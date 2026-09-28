// ============================================
// COMPONENTS - Shared JavaScript
// ============================================

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (first letter only)
 */
function getInitials(name) {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
}

/**
 * Get current formatted date and time
 * @returns {string} Formatted date (e.g., "30 Aug 2026, 14:30")
 */
function getCurrentDate() {
    const now = new Date();
    return now.toLocaleDateString('en-ZA', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get current year
 * @returns {number} Current year (e.g., 2026)
 */
function getCurrentYear() {
    return new Date().getFullYear();
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// RISK & STATUS HELPERS
// ============================================

/**
 * Get CSS class for risk level
 * @param {string} risk - Risk level (Low, Medium, High)
 * @returns {string} CSS class name
 */
function getRiskClass(risk) {
    if (!risk) return '';
    const riskMap = {
        'Low': 'risk-low',
        'Medium': 'risk-medium',
        'High': 'risk-high'
    };
    return riskMap[risk] || '';
}

/**
 * Get Font Awesome icon for risk level
 * @param {string} risk - Risk level (Low, Medium, High)
 * @returns {string} Font Awesome icon class
 */
function getRiskIcon(risk) {
    if (!risk) return 'fa-circle';
    const riskMap = {
        'Low': 'fa-check-circle',
        'Medium': 'fa-exclamation-circle',
        'High': 'fa-exclamation-triangle'
    };
    return riskMap[risk] || 'fa-circle';
}

/**
 * Get CSS class for status badge
 * @param {string} status - Status (Active, At-Risk, Graduated, Withdrawn, High, Medium, Low)
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
    if (!status) return '';
    const statusMap = {
        'Active': 'status-active',
        'At-Risk': 'status-atrisk',
        'Graduated': 'status-graduated',
        'Withdrawn': 'status-withdrawn',
        'High': 'status-high',
        'Medium': 'status-medium',
        'Low': 'status-low'
    };
    return statusMap[status] || '';
}

/**
 * Get CSS class for progress bar
 * @param {string} status - Status (high, medium, low)
 * @returns {string} CSS class name
 */
function getProgressClass(status) {
    if (!status) return '';
    const progressMap = {
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
    };
    return progressMap[status] || '';
}

// ============================================
// TABLE SORTING
// ============================================

/**
 * Sort an array of objects by a specific key
 * @param {Array} data - Array of objects to sort
 * @param {string} key - Key to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
function sortByKey(data, key, direction = 'asc') {
    return [...data].sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];
        
        // Handle string comparison
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format a number as a percentage
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
function formatPercent(value, decimals = 1) {
    if (value === undefined || value === null) return '0%';
    return value.toFixed(decimals) + '%';
}

/**
 * Format a number with commas
 * @param {number} value - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(value) {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString();
}

// ============================================
// COLOR HELPERS
// ============================================

/**
 * Get color for risk level
 * @param {string} risk - Risk level (Low, Medium, High)
 * @returns {string} Hex color code
 */
function getRiskColor(risk) {
    if (!risk) return '#6B7280';
    const riskMap = {
        'Low': '#2ECC71',
        'Medium': '#F39C12',
        'High': '#E74C3C'
    };
    return riskMap[risk] || '#6B7280';
}

/**
 * Get color for status
 * @param {string} status - Status
 * @returns {string} Hex color code
 */
function getStatusColor(status) {
    if (!status) return '#6B7280';
    const statusMap = {
        'Active': '#2ECC71',
        'At-Risk': '#E74C3C',
        'Graduated': '#3498DB',
        'Withdrawn': '#95A5A6',
        'High': '#E74C3C',
        'Medium': '#F39C12',
        'Low': '#2ECC71'
    };
    return statusMap[status] || '#6B7280';
}

// ============================================
// CHART HELPERS
// ============================================

/**
 * Default chart colors
 */
const CHART_COLORS = {
    blue: '#1A3A5C',
    gold: '#D4A847',
    green: '#2ECC71',
    red: '#E74C3C',
    purple: '#8E44AD',
    orange: '#F39C12',
    teal: '#1ABC9C',
    pink: '#E91E63',
    indigo: '#3F51B5',
    cyan: '#00BCD4'
};

/**
 * Get array of chart colors
 * @param {number} count - Number of colors needed
 * @returns {Array} Array of hex color codes
 */
function getChartColors(count) {
    const colors = Object.values(CHART_COLORS);
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

// ============================================
// DOM HELPERS
// ============================================

/**
 * Safely get element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null
 */
function getElement(id) {
    return document.getElementById(id);
}

/**
 * Safely set text content of an element
 * @param {string} id - Element ID
 * @param {string} text - Text to set
 */
function setText(id, text) {
    const el = getElement(id);
    if (el) el.textContent = text;
}

/**
 * Safely set HTML content of an element
 * @param {string} id - Element ID
 * @param {string} html - HTML to set
 */
function setHTML(id, html) {
    const el = getElement(id);
    if (el) el.innerHTML = html;
}

/**
 * Show or hide an element
 * @param {string} id - Element ID
 * @param {boolean} show - Show or hide
 */
function toggleElement(id, show) {
    const el = getElement(id);
    if (el) el.style.display = show ? 'block' : 'none';
}

// ============================================
// EXPORTS (for Node.js/CommonJS)
// ============================================

// Export all functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Utility
        getInitials,
        getCurrentDate,
        getCurrentYear,
        debounce,
        
        // Risk & Status
        getRiskClass,
        getRiskIcon,
        getStatusClass,
        getProgressClass,
        
        // Sorting
        sortByKey,
        
        // Formatting
        formatPercent,
        formatNumber,
        
        // Colors
        getRiskColor,
        getStatusColor,
        CHART_COLORS,
        getChartColors,
        
        // DOM
        getElement,
        setText,
        setHTML,
        toggleElement
    };
}

// Make functions globally available for inline scripts
// (This ensures they work in browser context)
window.getInitials = getInitials;
window.getCurrentDate = getCurrentDate;
window.getCurrentYear = getCurrentYear;
window.debounce = debounce;
window.getRiskClass = getRiskClass;
window.getRiskIcon = getRiskIcon;
window.getStatusClass = getStatusClass;
window.getProgressClass = getProgressClass;
window.sortByKey = sortByKey;
window.formatPercent = formatPercent;
window.formatNumber = formatNumber;
window.getRiskColor = getRiskColor;
window.getStatusColor = getStatusColor;
window.CHART_COLORS = CHART_COLORS;
window.getChartColors = getChartColors;
window.getElement = getElement;
window.setText = setText;
window.setHTML = setHTML;
window.toggleElement = toggleElement;