// database.js - Frontend database utilities and authentication helpers

// Authentication helper function
function requireAuth(requiredRole) {
    const userData = localStorage.getItem("loggedInUser");
    if (!userData) {
        alert("Please log in first.");
        window.location.href = "index.html";
        return null;
    }

    const user = JSON.parse(userData);
    if (user.role !== requiredRole) {
        alert("Unauthorized access! Redirecting...");
        window.location.href = "index.html";
        return null;
    }

    return user;
}

// Get current logged in user
function getCurrentUser() {
    const userData = localStorage.getItem("loggedInUser");
    return userData ? JSON.parse(userData) : null;
}

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem("loggedInUser") !== null;
}

// Logout function
function doLogout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
}

// API helper functions
// Optional: set API_BASE in window to point to a remote backend; defaults to same-origin
const API_BASE = window.API_BASE || '';

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        }
    };

    let url = endpoint.startsWith('http') ? endpoint : (API_BASE + endpoint);
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
        // Do NOT auto-logout or redirect; let caller decide fallback (local mode)
        return null;
    }

    return response;
}

// Get students data for faculty dashboard
async function getStudentsData() {
    try {
        const response = await apiCall('/get-student-performance');
        if (!response) return [];
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching students data:', error);
        return [];
    }
}

// Get today's quiz for students
async function getTodayQuiz() {
    try {
        const response = await apiCall('/get-today-quiz');
        if (!response) return null;
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching today\'s quiz:', error);
        return null;
    }
}

// Submit quiz answers
async function submitQuizAnswers(answers) {
    try {
        const response = await apiCall('/submit-quiz', {
            method: 'POST',
            body: JSON.stringify({ answers })
        });
        
        if (!response) return null;
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error submitting quiz:', error);
        return null;
    }
}

// Export functions for use in other files
window.requireAuth = requireAuth;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.doLogout = doLogout;
window.apiCall = apiCall;
window.getStudentsData = getStudentsData;
window.getTodayQuiz = getTodayQuiz;
window.submitQuizAnswers = submitQuizAnswers;
