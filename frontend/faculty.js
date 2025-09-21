// === Faculty Dashboard Functionality ===

// Dynamically load dependencies if needed
['database.js', 'auth.js'].forEach(src => {
  const s = document.createElement('script');
  s.src = src;
  document.head.appendChild(s);
});

let currentUser = null;
let allStudents = [];
let allAttempts = [];

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeFacultyDashboard, 200);

  // Add event listener for week picker
  const weekInput = document.getElementById('weekPicker');
  weekInput.addEventListener('change', () => {
    filterData();
  });
});

async function initializeFacultyDashboard() {
  // Authenticate faculty user
  currentUser = requireAuth('faculty');
  if (!currentUser) return;

  document.getElementById('facultyName').textContent = `Welcome, ${currentUser.fullName || 'Faculty'}!`;

  try {
    // Load students list for this faculty from backend if we have a token
    const token = localStorage.getItem('authToken');
    if (token) {
      const resp = await fetch('/faculty/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const payload = await resp.json();
        const students = payload?.students || [];
        allStudents = students.map((s, idx) => ({
          id: s._id || s.id || idx + 1,
          fullName: s.fullName || s.name || s.username,
          class: s.class || s.className || '',
          role: 'student'
        }));
        // Attempts data is not available via faculty routes; keep empty for now
        allAttempts = [];
      } else if (resp.status === 401) {
        // No valid token; fall back to local mode instead of redirecting
        throw new Error('Unauthorized');
      } else {
        throw new Error('Failed to load students');
      }
    } else {
      // No token (local demo mode)
      throw new Error('No token, using local fallback');
    }

    console.log('Loaded students:', allStudents);
    console.log('Loaded attempts:', allAttempts);

    updateDashboard();
  } catch (error) {
    console.error('Error loading faculty data:', error);
    // Fallback: load students from localStorage (from admin.html demo)
    try {
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const students = localUsers.filter(u => u.role === 'student');
      allStudents = students.map((u, idx) => ({
        id: idx + 1,
        fullName: u.fullName || u.username,
        class: u.userClass || u.class || ''
      }));
      allAttempts = [];
      // If we have fallback students, render normally
      if (allStudents.length > 0) {
        updateDashboard();
        return;
      }
    } catch {}
    // If we reach here, both backend and fallback failed
    document.getElementById('totalStudents').textContent = '0';
    document.getElementById('completedToday').textContent = '0';
    document.getElementById('missedToday').textContent = '0';
    document.getElementById('averageScore').textContent = '0%';
    document.getElementById('performanceTableBody').innerHTML =
      '<tr><td colspan="8">No student data available. Please add students in Admin or check your connection.</td></tr>';
  }
}

function filterData() {
  const classFilter = document.getElementById('classFilter').value;

  // Parse the selected week to a Monday–Friday range
  const weekValue = document.getElementById('weekPicker').value; // Format: "2025-W38"
  const { start, end } = parseWeekToRange(weekValue);

  const attempts = allAttempts.filter(a => {
    const d = new Date(a.date);
    return d >= start && d <= end;
  });

  const students = classFilter ? allStudents.filter(s => s.class === classFilter) : allStudents;

  updateStatistics(students, attempts);
  updateAttendanceTable(students, attempts, { start, end });
}

// Parse ISO week string to Monday–Friday dates
function parseWeekToRange(isoWeek) {
  if (!isoWeek) {
    // Default to current week if no week selected
    const today = new Date();
    const day = today.getDay() || 7; // Make Sunday = 7
    const monday = new Date(today);
    monday.setDate(today.getDate() - day + 1);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return { start: monday, end: friday };
  }

  const [year, week] = isoWeek.split('-W').map(Number);

  // Find the first Thursday of the year
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7; // Make Sunday = 7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7); // Monday of ISO week

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Friday of the same week
  return { start: monday, end: friday };
}

function updateDashboard(classFilter = '', selectedWeek = '') {
  const students = classFilter ? allStudents.filter(s => s.class === classFilter) : allStudents;

  const dateRange = getDateRangeFromWeek(selectedWeek);

  const attempts = allAttempts.filter(a => {
    const d = new Date(a.date);
    return d >= dateRange.start && d <= dateRange.end;
  });

  updateStatistics(students, attempts);
  updateAttendanceTable(students, attempts, dateRange);
}

function getDateRangeFromWeek(weekValue) {
  if (!weekValue) {
    const today = new Date();
    const day = today.getDay() || 7;
    const start = new Date(today);
    start.setDate(today.getDate() - day + 1); // Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 4); // Friday
    return { start, end };
  }

  // weekValue is like "2025-W37"
  const [year, week] = weekValue.split('-W');
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (parseInt(week) - 1) * 7;
  const monday = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() - firstDayOfYear.getDay() + 1 + daysOffset));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { start, monday, end: friday };
}

function updateStatistics(students, attempts) {
  const today = new Date().toISOString().split('T')[0];
  const todayAttempts = attempts.filter(a => a.date === today);

  const totalStudents = students.length;
  const completedToday = todayAttempts.length;
  const missedToday = totalStudents - completedToday;

  const avg = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length)
    : 0;

  document.getElementById('totalStudents').textContent = totalStudents;
  document.getElementById('completedToday').textContent = completedToday;
  document.getElementById('missedToday').textContent = missedToday;
  document.getElementById('averageScore').textContent = `${avg}%`;
}

function updateAttendanceTable(students, attempts, dateRange) {
  const tbody = document.getElementById('performanceTableBody');
  const thead = document.querySelector('#performanceTable thead tr');
  
  // Clear existing content
  tbody.innerHTML = '';
  
  // Check if we have students data
  if (!students || students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8">No student data available</td></tr>';
    return;
  }
  
  // Generate date range for the week
  const dates = generateDateRange(dateRange.start, dateRange.end);
  
  // Update table header with actual dates
  thead.innerHTML = `
    <th>Student Name</th>
    <th>Class</th>
    <th>Mon</th>
    <th>Tue</th>
    <th>Wed</th>
    <th>Thu</th>
    <th>Fri</th>
    <th>Marks</th>
  `;

  // Map: userId → attempts + total marks
  const attemptMap = new Map();
  if (attempts && attempts.length > 0) {
    attempts.forEach(a => {
      if (!attemptMap.has(a.userId)) {
        attemptMap.set(a.userId, { dates: new Set(), totalMarks: 0 });
      }
      const data = attemptMap.get(a.userId);
      data.dates.add(a.date);
      data.totalMarks += a.score || a.marks || 0;
    });
  }

  students.forEach(student => {
    const tr = document.createElement('tr');
    
    // Add student name and class
    tr.innerHTML = `
      <td>${student.fullName || 'Unknown Student'}</td>
      <td>${student.class || 'N/A'}</td>
    `;

    // Add attendance for each day of the week
    dates.forEach(date => {
      const td = document.createElement('td');
      const attended = attemptMap.get(student.id)?.dates.has(date);
      
      if (attended) {
        td.innerHTML = '<span class="attendance attended">✔</span>';
      } else {
        td.innerHTML = '<span class="attendance missed">✘</span>';
      }
      
      tr.appendChild(td);
    });

    // Add Marks column
    const marksCell = document.createElement('td');
    marksCell.textContent = attemptMap.get(student.id)?.totalMarks || '0';
    marksCell.className = 'marks';
    tr.appendChild(marksCell);

    tbody.appendChild(tr);
  });
}

function generateDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
async function doLogout() {
    // 1) Clear any client-side tokens
    try {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
    } catch (e) {
      console.warn('Storage clear failed:', e);
    }

    // 2) Call server to clear session / cookie (if backend supports /logout)
    try {
      const resp = await fetch('logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (resp.ok) {
        window.location.href = 'index.html';
        return;
      }
    } catch (err) {
      console.warn('Server logout failed:', err);
    }

    // 3) Fallback: just redirect
    window.location.href = 'index.html';
  }

  // Attach click handler to any .logout-btn
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        doLogout();
      });
    });
  });
