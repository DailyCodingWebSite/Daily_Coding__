// Admin dashboard functionality

// Load required scripts
const scripts = ['database.js', 'auth.js'];
scripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    document.head.appendChild(script);
});

let currentUser = null;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeAdminDashboard();
    }, 200);
});

async function initializeAdminDashboard() {
    // Check authentication
    currentUser = requireAuth('admin');
    if (!currentUser) return;

    // Display admin name
    document.getElementById('adminName').textContent = `Welcome, Admin!`;

    // Initialize forms
    initializeForms();
    
    // Load existing data
    await loadQuestions();
    await loadScheduledQuizzes();
    await loadUsers();
    await populateQuestionDropdowns();
}

function initializeForms() {
    // Question form
    document.getElementById('questionForm').addEventListener('submit', handleQuestionSubmit);
    
    // Schedule form
    document.getElementById('scheduleForm').addEventListener('submit', handleScheduleSubmit);
    
    // User form
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    
    // User role change handler
    document.getElementById('userRole').addEventListener('change', function() {
        const classGroup = document.getElementById('classGroup');
        if (this.value === 'student') {
            classGroup.style.display = 'block';
            document.getElementById('userClass').required = true;
        } else {
            classGroup.style.display = 'none';
            document.getElementById('userClass').required = false;
        }
    });
}

function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

async function handleQuestionSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    // Build payload matching backend schema
    const letter = formData.get('correctAnswer');
    const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    const questionData = {
        text: formData.get('questionText'),
        options: [
            formData.get('optionA'),
            formData.get('optionB'),
            formData.get('optionC'),
            formData.get('optionD')
        ],
        correctIndex: letterToIndex[letter]
    };
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(questionData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Reset form
            e.target.reset();
            
            // Reload questions list
            await loadQuestions();
            await populateQuestionDropdowns();
            
            alert('Question added successfully!');
        } else {
            alert('Failed to add question');
        }
    } catch (error) {
        console.error('Error adding question:', error);
        alert('Error adding question');
    }
}

async function handleScheduleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const scheduleData = {
        date: formData.get('quizDate'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        className: formData.get('scheduleClass'),
        questionIds: [formData.get('question1'), formData.get('question2')]
    };
    
    // Validate that different questions are selected
    if (scheduleData.questionIds[0] === scheduleData.questionIds[1]) {
        alert('Please select different questions for Question 1 and Question 2');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/quizzes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(scheduleData)
        });
        
        if (response.status === 401) {
            alert('Please log in as Admin against the backend first so questions can be saved to MongoDB. Use setup.html to create an admin if needed, then login on the homepage.');
            return;
        }

        if (response.status === 401) {
            alert('Please log in as Admin against the backend first so questions can be saved to MongoDB. Use setup.html to create an admin if needed, then login on the homepage.');
            return;
        }

        const result = await response.json();
        
        if (response.ok) {
            // Reset form
            e.target.reset();
            
            // Reload scheduled quizzes
            await loadScheduledQuizzes();
            
            alert('Quiz scheduled successfully!');
        } else {
            alert('Failed to schedule quiz');
        }
    } catch (error) {
        console.error('Error scheduling quiz:', error);
        alert('Error scheduling quiz');
    }
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        username: formData.get('newUsername'),
        password: formData.get('newPassword'),
        fullName: formData.get('fullName'),
        role: formData.get('userRole'),
        className: formData.get('userClass') || ''
    };
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(userData)
        });
        
        if (response.status === 401) {
            alert('Please log in with a backend account first (admin) so the user can be saved to MongoDB.');
            return;
        }

        const result = await response.json();
        
        if (response.ok && result.success) {
            // Reset form
            e.target.reset();
            
            // Reload users list
            await loadUsers();
            
            alert('User added successfully!');
        } else {
            alert('Failed to add user');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        alert('Error adding user');
    }
}

async function loadQuestions() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/questions', {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });
        
        if (response && response.status === 401) {
            // stay on page; operate in local mode
            return;
        }
        
        const payload = response ? await response.json() : null;
        const questions = Array.isArray(payload) ? payload : (payload?.questions || []);
        const questionsList = document.getElementById('questionsList');
        
        questionsList.innerHTML = '';
        
        const idxToLetter = ['A','B','C','D'];
        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.innerHTML = `
                <div class="question-text">
                    <strong>Q:</strong> ${question.text}<br>
                    <small><strong>Options:</strong> ${question.options.join(' | ')}</small><br>
                    <small><strong>Correct:</strong> ${idxToLetter[typeof question.correctIndex === 'number' ? question.correctIndex : 0] || '-'}</small>
                </div>
                <div class="actions">
                    <button class="btn-delete" onclick="deleteQuestion('${question._id}')">Delete</button>
                </div>
            `;
            questionsList.appendChild(questionDiv);
        });
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

async function loadScheduledQuizzes() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/quizzes', {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });
        
        if (response && response.status === 401) {
            return; // local mode
        }
        
        const payload = response ? await response.json() : null;
        const schedules = Array.isArray(payload) ? payload : (payload?.quizzes || []);
        const scheduledList = document.getElementById('scheduledList');
        
        scheduledList.innerHTML = '';
        
        schedules.forEach(schedule => {
            const scheduleDiv = document.createElement('div');
            scheduleDiv.className = 'schedule-item';
            scheduleDiv.innerHTML = `
                <div>
                    <strong>Class:</strong> ${schedule.classId?.name || '-'}<br>
                    <strong>When:</strong> ${new Date(schedule.scheduledAt).toLocaleString()}<br>
                    <strong>Questions:</strong> ${(schedule.questions || []).length} questions
                </div>
                <div class="actions">
                    <button class="btn-delete" onclick="deleteSchedule('${schedule._id}')">Delete</button>
                </div>
            `;
            scheduledList.appendChild(scheduleDiv);
        });
    } catch (error) {
        console.error('Error loading scheduled quizzes:', error);
    }
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/admin/users', {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });
        
        if (response && response.status === 401) {
            return; // local mode
        }
        
        const payload = response ? await response.json() : null;
        const users = Array.isArray(payload) ? payload : (payload?.users || []);
        const usersList = document.getElementById('usersList');
        
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <div>
                    <strong>${user.fullName}</strong> (${user.username})<br>
                    <small>Role: ${user.role}${user.classId ? ` | Class: ${user.classId.name || user.classId}` : ''}</small>
                </div>
                <div class="actions">
                    <button class="btn-delete" onclick="deleteUser('${user._id || user.id}')">Delete</button>
                </div>
            `;
            usersList.appendChild(userDiv);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function populateQuestionDropdowns() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/questions', {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });
        
        if (response && response.status === 401) {
            return;
        }
        
        const payload = response ? await response.json() : [];
        const questions = Array.isArray(payload) ? payload : (payload?.questions || []);
        const question1Select = document.getElementById('question1');
        const question2Select = document.getElementById('question2');
        
        // Clear existing options (except first one)
        question1Select.innerHTML = '<option value="">Select Question</option>';
        question2Select.innerHTML = '<option value="">Select Question</option>';
        
        questions.forEach(question => {
            const option1 = document.createElement('option');
            option1.value = question._id;
            option1.textContent = `${question.text.substring(0, 50)}...`;
            question1Select.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = question._id;
            option2.textContent = `${question.text.substring(0, 50)}...`;
            question2Select.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading questions for dropdowns:', error);
    }
}

async function deleteQuestion(id) {
    if (confirm('Are you sure you want to delete this question?')) {
        const questionElement = event.target.closest('.question-item');
        try {
            const token = localStorage.getItem('authToken');
            await fetch(`/questions/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            // Remove from DOM immediately
            questionElement.remove();
            await populateQuestionDropdowns();
            alert('Question deleted successfully!');
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Error deleting question');
        }
    }
}

async function deleteSchedule(id) {
    if (confirm('Are you sure you want to delete this scheduled quiz?')) {
        const scheduleElement = event.target.closest('.schedule-item');
        try {
            const token = localStorage.getItem('authToken');
            await fetch(`/quizzes/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            // Remove from DOM immediately
            scheduleElement.remove();
            alert('Scheduled quiz deleted successfully!');
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('Error deleting schedule');
        }
    }
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        const userElement = event.target.closest('.user-item');
        try {
            const token = localStorage.getItem('authToken');
            await fetch(`/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            // Remove from DOM immediately
            userElement.remove();
            alert('User deleted successfully!');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }
}
