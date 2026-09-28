// ============================================
// STUDENTS PAGE - JavaScript
// ============================================

// ============================================
// STUDENT DATA
// ============================================

const students = [
    { id: 202407341, name: 'Tshepiso Nico', email: 'tshepiso@gmail.com', programme: 'BSC706', faculty: 'FCS', status: 'Active', avgMark: 72.5, passed: 18, failed: 2, risk: 'Low', semester: 'S20252' },
    { id: 202407344, name: 'Ofe Ntsee', email: 'ofe@gmail.com', programme: 'BSC723', faculty: 'FCS', status: 'Active', avgMark: 68.3, passed: 16, failed: 4, risk: 'Medium', semester: 'S20252' },
    { id: 202407349, name: 'Alice Johnson', email: 'alice.johnson@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 81.5, passed: 20, failed: 0, risk: 'Low', semester: 'S20251' },
    { id: 202407350, name: 'Bob Williams', email: 'bob.williams@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 62.5, passed: 14, failed: 6, risk: 'High', semester: 'S20251' },
    { id: 202407351, name: 'Carol Smith', email: 'carol.smith@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 87.6, passed: 20, failed: 0, risk: 'Low', semester: 'S20251' },
    { id: 202407352, name: 'David Brown', email: 'david.brown@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 48.8, passed: 10, failed: 10, risk: 'High', semester: 'S20251' },
    { id: 202407353, name: 'Emma Wilson', email: 'emma.wilson@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 77.1, passed: 19, failed: 1, risk: 'Low', semester: 'S20251' },
    { id: 202407354, name: 'Frank Davis', email: 'frank.davis@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 65.5, passed: 15, failed: 5, risk: 'Medium', semester: 'S20251' },
    { id: 202407355, name: 'Grace Miller', email: 'grace.miller@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 80.3, passed: 20, failed: 0, risk: 'Low', semester: 'S20241' },
    { id: 202407356, name: 'Henry Wilson', email: 'henry.wilson@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 67.8, passed: 16, failed: 4, risk: 'Medium', semester: 'S20241' },
    { id: 202407357, name: 'Ivy Moore', email: 'ivy.moore@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 58.2, passed: 12, failed: 8, risk: 'High', semester: 'S20241' },
    { id: 202407358, name: 'Jack Taylor', email: 'jack.taylor@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 78.4, passed: 19, failed: 1, risk: 'Low', semester: 'S20241' },
    { id: 202407359, name: 'Kelly Anderson', email: 'kelly.anderson@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 53.8, passed: 11, failed: 9, risk: 'High', semester: 'S20241' },
    { id: 202407360, name: 'Lisa Thomas', email: 'lisa.thomas@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 85.9, passed: 20, failed: 0, risk: 'Low', semester: 'S20241' },
    { id: 202407361, name: 'Mike Jackson', email: 'mike.jackson@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 83.8, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' },
    { id: 202407362, name: 'Nancy White', email: 'nancy.white@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 66.8, passed: 15, failed: 5, risk: 'Medium', semester: 'S20252' },
    { id: 202407363, name: 'Oliver Martin', email: 'oliver.martin@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Active', avgMark: 46.3, passed: 9, failed: 11, risk: 'High', semester: 'S20252' },
    { id: 202407364, name: 'Paul Robinson', email: 'paul.robinson@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Graduated', avgMark: 91.6, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' },
    { id: 202407365, name: 'Quinn Clark', email: 'quinn.clark@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Graduated', avgMark: 71.2, passed: 18, failed: 2, risk: 'Low', semester: 'S20252' },
    { id: 202407366, name: 'Rachel Lee', email: 'rachel.lee@student.edu', programme: 'BSC-CS', faculty: 'FCS', status: 'Withdrawn', avgMark: 58.3, passed: 10, failed: 10, risk: 'High', semester: 'S20252' },
    { id: 202407367, name: 'Samuel Turner', email: 'samuel.turner@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 78.3, passed: 19, failed: 1, risk: 'Low', semester: 'S20251' },
    { id: 202407368, name: 'Tina Moore', email: 'tina.moore@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 65.5, passed: 15, failed: 5, risk: 'Medium', semester: 'S20251' },
    { id: 202407369, name: 'Umar Khan', email: 'umar.khan@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 80.5, passed: 20, failed: 0, risk: 'Low', semester: 'S20251' },
    { id: 202407370, name: 'Vanessa Gomez', email: 'vanessa.gomez@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 51.8, passed: 11, failed: 9, risk: 'High', semester: 'S20251' },
    { id: 202407371, name: 'William Harris', email: 'william.harris@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 82.3, passed: 20, failed: 0, risk: 'Low', semester: 'S20251' },
    { id: 202407372, name: 'Xavier Coleman', email: 'xavier.coleman@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 76.0, passed: 18, failed: 2, risk: 'Low', semester: 'S20241' },
    { id: 202407373, name: 'Yvonne Walker', email: 'yvonne.walker@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 62.3, passed: 14, failed: 6, risk: 'Medium', semester: 'S20241' },
    { id: 202407374, name: 'Zachary Hall', email: 'zachary.hall@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 79.0, passed: 19, failed: 1, risk: 'Low', semester: 'S20241' },
    { id: 202407375, name: 'Abigail Scott', email: 'abigail.scott@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 44.3, passed: 8, failed: 12, risk: 'High', semester: 'S20241' },
    { id: 202407376, name: 'Benjamin Young', email: 'benjamin.young@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 78.0, passed: 19, failed: 1, risk: 'Low', semester: 'S20241' },
    { id: 202407377, name: 'Chloe Anderson', email: 'chloe.anderson@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 81.6, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' },
    { id: 202407378, name: 'Daniel Evans', email: 'daniel.evans@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Graduated', avgMark: 72.0, passed: 18, failed: 2, risk: 'Low', semester: 'S20252' },
    { id: 202407379, name: 'Ella Roberts', email: 'ella.roberts@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 82.2, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' },
    { id: 202407380, name: 'Fiona Edwards', email: 'fiona.edwards@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Graduated', avgMark: 78.0, passed: 19, failed: 1, risk: 'Low', semester: 'S20252' },
    { id: 202407381, name: 'George Nelson', email: 'george.nelson@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Withdrawn', avgMark: 51.7, passed: 9, failed: 11, risk: 'High', semester: 'S20252' },
    { id: 202407382, name: 'Hannah Carter', email: 'hannah.carter@student.edu', programme: 'BEN-CE', faculty: 'FEN', status: 'Active', avgMark: 82.8, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' },
    { id: 202407383, name: 'Ian Porter', email: 'ian.porter@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 78.8, passed: 19, failed: 1, risk: 'Low', semester: 'S20251' },
    { id: 202407384, name: 'Julia Martinez', email: 'julia.martinez@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 50.0, passed: 10, failed: 10, risk: 'High', semester: 'S20251' },
    { id: 202407385, name: 'Kevin Ramirez', email: 'kevin.ramirez@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 76.5, passed: 18, failed: 2, risk: 'Low', semester: 'S20251' },
    { id: 202407386, name: 'Laura Mitchell', email: 'laura.mitchell@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 65.0, passed: 15, failed: 5, risk: 'Medium', semester: 'S20251' },
    { id: 202407387, name: 'Matthew Perez', email: 'matthew.perez@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 83.5, passed: 20, failed: 0, risk: 'Low', semester: 'S20251' },
    { id: 202407388, name: 'Nicole Campbell', email: 'nicole.campbell@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 78.0, passed: 19, failed: 1, risk: 'Low', semester: 'S20241' },
    { id: 202407389, name: 'Oscar Diaz', email: 'oscar.diaz@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 63.5, passed: 14, failed: 6, risk: 'Medium', semester: 'S20241' },
    { id: 202407390, name: 'Paula Rogers', email: 'paula.rogers@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 79.0, passed: 19, failed: 1, risk: 'Low', semester: 'S20241' },
    { id: 202407391, name: 'Robert Flores', email: 'robert.flores@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 45.0, passed: 8, failed: 12, risk: 'High', semester: 'S20241' },
    { id: 202407392, name: 'Samantha Garcia', email: 'samantha.garcia@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 79.5, passed: 19, failed: 1, risk: 'Low', semester: 'S20241' },
    { id: 202407393, name: 'Thomas Brooks', email: 'thomas.brooks@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 80.0, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' },
    { id: 202407394, name: 'Olivia Collins', email: 'olivia.collins@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Graduated', avgMark: 79.3, passed: 19, failed: 1, risk: 'Low', semester: 'S20252' },
    { id: 202407395, name: 'Patrick Cox', email: 'patrick.cox@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 83.0, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' },
    { id: 202407396, name: 'Ruby Ward', email: 'ruby.ward@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Graduated', avgMark: 76.0, passed: 18, failed: 2, risk: 'Low', semester: 'S20252' },
    { id: 202407397, name: 'Simon Foster', email: 'simon.foster@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Withdrawn', avgMark: 51.7, passed: 9, failed: 11, risk: 'High', semester: 'S20252' },
    { id: 202407398, name: 'Tara Reed', email: 'tara.reed@student.edu', programme: 'BBA-BA', faculty: 'FBS', status: 'Active', avgMark: 84.3, passed: 20, failed: 0, risk: 'Low', semester: 'S20252' }
];

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderStats(data) {
    const total = data.length;
    const avgMark = data.reduce((sum, s) => sum + s.avgMark, 0) / total;
    const passed = data.filter(s => s.status !== 'Withdrawn').length;
    const passRate = total > 0 ? (passed / total * 100) : 0;
    const atRisk = data.filter(s => s.risk === 'High' || s.status === 'At-Risk').length;
    
    document.getElementById('totalStudents').textContent = total;
    document.getElementById('avgMark').textContent = avgMark.toFixed(1) + '%';
    document.getElementById('passRate').textContent = passRate.toFixed(1) + '%';
    document.getElementById('atRiskCount').textContent = atRisk;
}

function renderTable(data) {
    const container = document.getElementById('tableContent');
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-slash"></i>
                <h3>No students found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th onclick="sortTable('id')">Student ID <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('name')">Name <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('programme')">Programme <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('faculty')">Faculty <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('avgMark')">Avg Mark <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('passed')">Passed/Failed <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('status')">Status <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('risk')">Risk <i class="fas fa-sort"></i></th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(student => {
        const statusClass = student.status === 'Active' ? 'status-active' : 
                           student.status === 'At-Risk' ? 'status-atrisk' :
                           student.status === 'Graduated' ? 'status-graduated' : 'status-withdrawn';
        
        const riskClass = student.risk === 'Low' ? 'risk-low' : 
                         student.risk === 'Medium' ? 'risk-medium' : 'risk-high';
        
        const riskIcon = student.risk === 'Low' ? 'fa-check-circle' : 
                        student.risk === 'Medium' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
        
        html += `
            <tr>
                <td><strong>${student.id}</strong></td>
                <td>${student.name}</td>
                <td>${student.programme}</td>
                <td>${student.faculty}</td>
                <td>${student.avgMark}%</td>
                <td>${student.passed}/${student.failed}</td>
                <td><span class="status-badge ${statusClass}">${student.status}</span></td>
                <td>
                    <i class="fas ${riskIcon} ${riskClass}"></i>
                    ${student.risk}
                </td>
                <td>
                    <button class="btn-detail" onclick="alert('View details for ${student.name} (${student.id})')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    document.getElementById('resultCount').textContent = data.length + ' students';
}

// ============================================
// FILTER FUNCTIONS
// ============================================

let currentSort = { column: 'id', direction: 'asc' };

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const programmeFilter = document.getElementById('programmeFilter')?.value || 'all';
    const facultyFilter = document.getElementById('facultyFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const riskFilter = document.getElementById('riskFilter')?.value || 'all';
    
    let filtered = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm) || 
                             student.id.toString().includes(searchTerm) ||
                             student.email.toLowerCase().includes(searchTerm);
        const matchesProgramme = programmeFilter === 'all' || student.programme === programmeFilter;
        const matchesFaculty = facultyFilter === 'all' || student.faculty === facultyFilter;
        const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
        const matchesRisk = riskFilter === 'all' || student.risk === riskFilter;
        
        return matchesSearch && matchesProgramme && matchesFaculty && matchesStatus && matchesRisk;
    });
    
    // Sort
    filtered.sort((a, b) => {
        let aVal = a[currentSort.column];
        let bVal = b[currentSort.column];
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderStats(filtered);
    renderTable(filtered);
}

// ============================================
// INITIALIZATION
// ============================================
function initStudents() {
    console.log('👨‍🎓 Students page initializing...');
    
    // Set date and year
    document.getElementById('currentDate').textContent = getCurrentDate();
    document.getElementById('footerYear').textContent = getCurrentYear();

    // Initial render
    applyFilters();

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('programmeFilter').addEventListener('change', applyFilters);
    document.getElementById('facultyFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('riskFilter').addEventListener('change', applyFilters);
    
    document.getElementById('clearFilters').addEventListener('click', function() {
        document.getElementById('searchInput').value = '';
        document.getElementById('programmeFilter').value = 'all';
        document.getElementById('facultyFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('riskFilter').value = 'all';
        applyFilters();
    });
    
    console.log('✅ Students page initialized successfully!');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudents);
} else {
    initStudents();
}