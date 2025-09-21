// auth.js - Authentication system for frontend

// Handle login form submission and seed demo users if needed
document.addEventListener("DOMContentLoaded", () => {
  // Seed local demo users if not present so fallback login works
  try {
    const existing = JSON.parse(localStorage.getItem('users') || 'null');
    if (!Array.isArray(existing) || existing.length === 0) {
      const demoUsers = [
        { username: "admin", password: "admin123", role: "admin", fullName: "System Admin", userClass: "" },
        { username: "faculty1", password: "faculty123", role: "faculty", fullName: "Faculty One", userClass: "CSE-A" },
        { username: "student1", password: "student123", role: "student", fullName: "Student One", userClass: "CSE-B" }
      ];
      localStorage.setItem('users', JSON.stringify(demoUsers));
    }
  } catch (e) {
    console.warn('Could not seed demo users:', e);
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
});

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = "";

  try {
    // 1) Try backend auth if available
    let backendOk = false;
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, role })
      });
      if (response.ok) {
        const result = await response.json();
        if (result && (result.success || result.user)) {
          const user = {
            username: result.user?.username || username,
            fullName: result.user?.fullName || username,
            role: result.user?.role || role,
            class: result.user?.class || ''
          };
          localStorage.setItem("loggedInUser", JSON.stringify(user));
          if (result.token) {
            localStorage.setItem('authToken', result.token);
          }
          backendOk = true;
        }
      }
    } catch (_) {
      // backend not available -> fallback
    }

    // 2) Fallback to localStorage users (from admin.html demo)
    if (!backendOk) {
      const lsUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const found = lsUsers.find(u => u.username === username && u.password === password && (u.role === role || !u.role));
      if (!found) {
        errorDiv.textContent = '❌ Invalid credentials.';
        return;
      }
      const user = {
        username: found.username,
        fullName: found.fullName || found.username,
        role: role,
        class: found.userClass || ''
      };
      localStorage.setItem('loggedInUser', JSON.stringify(user));
    }

    // Redirect to correct dashboard
    if (role === "admin") {
      window.location.href = "admin.html";
    } else if (role === "faculty") {
      window.location.href = "faculty.html";
    } else if (role === "student") {
      window.location.href = "student.html";
    }
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = "❌ Login failed. Please try again.";
  }
}

// Logout function
async function logout() {
  try {
    // Clear client-side storage
    localStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("authToken");

    // Call server logout endpoint
    await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.warn('Server logout failed:', error);
  }

  // Redirect to login page
  window.location.href = "index.html";
}

// Page guard function
function protectPage(requiredRole) {
  const userData = localStorage.getItem("loggedInUser");
  if (!userData) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(userData);
  if (user.role !== requiredRole) {
    alert("Unauthorized access! Redirecting...");
    window.location.href = "index.html";
  }
}

// Make functions globally available
window.logout = logout;
window.protectPage = protectPage;