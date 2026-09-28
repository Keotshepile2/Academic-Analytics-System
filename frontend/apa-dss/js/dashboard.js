// ============================================
// DASHBOARD - Main Dashboard JavaScript
// ============================================

// ============================================
// DATA - Hardcoded from your database
// ============================================
const dashboardData = {
    total_students: 52,
    total_programmes: 5,
    total_faculties: 5,
    total_modules: 117,
    overall_pass_rate: "91.87",
    overall_failure_rate: 8.13,
    overall_avg_mark: "73.91",
    at_risk_students: 3
};

// ============================================
// CHARTS DATA
// ============================================
const semesterData = {
    labels: ['S20231', 'S20232', 'S20241', 'S20242', 'S20251', 'S20252'],
    passRates: [82, 78, 85, 79, 88, 92],
    avgMarks: [68, 71, 69, 73, 72, 76]
};

const gradeData = {
    labels: ['A', 'B', 'C', 'D', 'F'],
    counts: [45, 78, 95, 62, 35],
    colors: ['#2ECC71', '#3498DB', '#F39C12', '#E67E22', '#E74C3C']
};

const moduleData = {
    labels: ['CS101', 'CS102', 'CS103', 'CS104', 'CS201', 'CS202'],
    passRates: [78, 65, 82, 71, 75, 68],
    colors: ['#1A3A5C', '#D4A847', '#2ECC71', '#3498DB', '#8E44AD', '#E74C3C']
};

const programmeData = {
    labels: ['BSC-CS', 'BEN-CE', 'BBA-BA', 'BSC706', 'BSC723'],
    passRates: [82, 76, 79, 85, 74],
    avgMarks: [71, 68, 73, 70, 66]
};

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderKPIs(data) {
    const container = document.getElementById('kpiContainer');
    if (!container) {
        console.error('❌ kpiContainer not found');
        return;
    }
    
    const cards = [
        { 
            label: 'Total Students', 
            value: data.total_students, 
            icon: 'fa-users', 
            color: 'blue',
            sub: 'Active students',
            trend: '▲ 12% from last year'
        },
        { 
            label: 'Total Programmes', 
            value: data.total_programmes, 
            icon: 'fa-graduation-cap', 
            color: 'gold',
            sub: 'Academic programmes',
            trend: '● 5 Faculties'
        },
        { 
            label: 'Total Modules', 
            value: data.total_modules, 
            icon: 'fa-book', 
            color: 'purple',
            sub: 'Available modules',
            trend: '▲ 8 new this year'
        },
        { 
            label: 'Pass Rate', 
            value: data.overall_pass_rate + '%', 
            icon: 'fa-check-circle', 
            color: 'green',
            sub: data.overall_failure_rate + '% failure rate',
            trend: '▲ 2.3% improvement'
        },
        { 
            label: 'Average Mark', 
            value: data.overall_avg_mark + '%', 
            icon: 'fa-star', 
            color: 'orange',
            sub: 'Overall performance',
            trend: '▲ 1.8% from last year'
        },
        { 
            label: 'At-Risk Students', 
            value: data.at_risk_students, 
            icon: 'fa-exclamation-triangle', 
            color: 'red',
            sub: 'Need academic attention',
            trend: '▼ 2 from last semester'
        }
    ];
    
    container.innerHTML = cards.map(card => `
        <div class="kpi-card ${card.color}">
            <div class="icon-circle">
                <i class="fas ${card.icon}"></i>
            </div>
            <div class="label">${card.label}</div>
            <div class="value">${card.value}</div>
            <div class="sub">${card.sub}</div>
            ${card.trend ? `<div class="trend trend-up">${card.trend}</div>` : ''}
        </div>
    `).join('');
    
    console.log('✅ KPIs rendered');
}

function renderCharts() {
    // Pass Rate Chart
    const passCtx = document.getElementById('passRateChart');
    if (passCtx) {
        new Chart(passCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: semesterData.labels,
                datasets: [
                    {
                        label: 'Pass Rate %',
                        data: semesterData.passRates,
                        borderColor: '#2ECC71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#2ECC71',
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Average Mark %',
                        data: semesterData.avgMarks,
                        borderColor: '#1A3A5C',
                        backgroundColor: 'rgba(26, 58, 92, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#1A3A5C',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: function(value) { return value + '%'; } }
                    }
                }
            }
        });
        console.log('✅ Pass Rate Chart rendered');
    }

    // Grade Distribution Chart
    const gradeCtx = document.getElementById('gradeChart');
    if (gradeCtx) {
        new Chart(gradeCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: gradeData.labels,
                datasets: [{
                    data: gradeData.counts,
                    backgroundColor: gradeData.colors,
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { usePointStyle: true, padding: 20 }
                    }
                },
                cutout: '65%'
            }
        });
        console.log('✅ Grade Distribution Chart rendered');
    }

    // Module Performance Chart
    const moduleCtx = document.getElementById('moduleChart');
    if (moduleCtx) {
        new Chart(moduleCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: moduleData.labels,
                datasets: [{
                    label: 'Pass Rate %',
                    data: moduleData.passRates,
                    backgroundColor: moduleData.colors,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: function(value) { return value + '%'; } }
                    }
                }
            }
        });
        console.log('✅ Module Performance Chart rendered');
    }

    // Programme Comparison Chart
    const progCtx = document.getElementById('programmeChart');
    if (progCtx) {
        new Chart(progCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: programmeData.labels,
                datasets: [
                    {
                        label: 'Pass Rate %',
                        data: programmeData.passRates,
                        backgroundColor: 'rgba(26, 58, 92, 0.8)',
                        borderRadius: 8,
                        borderSkipped: false
                    },
                    {
                        label: 'Average Mark %',
                        data: programmeData.avgMarks,
                        backgroundColor: 'rgba(212, 168, 71, 0.8)',
                        borderRadius: 8,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: function(value) { return value + '%'; } }
                    }
                }
            }
        });
        console.log('✅ Programme Comparison Chart rendered');
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================

function filterKPIs() {
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const filterType = document.getElementById('filterType')?.value || 'all';
    
    const cards = document.querySelectorAll('.kpi-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
        const label = card.querySelector('.label')?.textContent?.toLowerCase() || '';
        const value = card.querySelector('.value')?.textContent?.toLowerCase() || '';
        const sub = card.querySelector('.sub')?.textContent?.toLowerCase() || '';
        
        const matchesSearch = label.includes(searchTerm) || 
                             value.includes(searchTerm) || 
                             sub.includes(searchTerm);
        
        const matchesFilter = filterType === 'all' || 
                             card.classList.contains(filterType);
        
        if (matchesSearch && matchesFilter) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    const resultCount = document.getElementById('resultCount');
    if (resultCount) {
        resultCount.textContent = visibleCount + ' KPIs visible';
    }
}

// ============================================
// INITIALIZATION
// ============================================
function initDashboard() {
    console.log('📊 Dashboard initializing...');
    
    // Set date and year
    const dateElement = document.getElementById('currentDate');
    if (dateElement) dateElement.textContent = getCurrentDate();
    
    const yearElement = document.getElementById('footerYear');
    if (yearElement) yearElement.textContent = getCurrentYear();
    
    // Render everything
    renderKPIs(dashboardData);
    renderCharts();
    
    // Setup search listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterKPIs, 300));
    }
    
    const filterType = document.getElementById('filterType');
    if (filterType) {
        filterType.addEventListener('change', filterKPIs);
    }
    
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            if (filterType) filterType.value = 'all';
            filterKPIs();
        });
    }
    
    console.log('✅ Dashboard initialized successfully!');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}