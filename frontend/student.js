// Student dashboard functionality

// Load required scripts
const scripts = ['database.js', 'auth.js'];
scripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    document.head.appendChild(script);
});

let currentUser = null;
let currentQuiz = null;
let quizStartTime = null;

// Initialize student dashboard
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeStudentDashboard();
    }, 200);
});

function initializeStudentDashboard() {
    // Check authentication
    currentUser = requireAuth('student');
    if (!currentUser) return;

    // Display student name
    document.getElementById('studentName').textContent = `Welcome, ${currentUser.fullName}!`;

    // Load today's quiz
    loadTodayQuiz();
}

async function loadTodayQuiz() {
    try {
        // Try backend first if we have a token
        const token = localStorage.getItem('authToken');
        const API_BASE = window.API_BASE || '';
        if (token) {
            const response = await fetch((API_BASE + '/student/quizzes'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            let selected = null;
            if (response.ok) {
                const payload = await response.json();
                const quizzes = payload?.quizzes || [];
                // Pick today's quiz (by date portion of scheduledAt)
                const todayStr = new Date().toISOString().split('T')[0];
                selected = quizzes.find(q => {
                    const d = new Date(q.scheduledAt);
                    return d.toISOString().split('T')[0] === todayStr;
                }) || quizzes[quizzes.length - 1]; // fallback to most recent

                if (selected) {
                    // Shape data similar to existing UI expectations
                    const endTimeStr = computeEndTimeFromDate(selected.scheduledAt, 30); // +30 min
                    const shaped = {
                        quizId: selected._id,
                        endTime: endTimeStr,
                        questions: (selected.questions || []).map(q => ({
                            id: q._id || q.id,
                            text: q.text,
                            options: q.options
                        }))
                    };

                    currentQuiz = shaped;
                    displayQuiz(shaped);
                    return;
                }
            }
            // If backend responded 401/500 or no quiz found, fall through to local mode
        }

        // Fallback: Use localStorage quizzes created from admin.html
        const lsQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        const lsQuestions = JSON.parse(localStorage.getItem('questions') || '[]');
        if (lsQuizzes.length > 0 && lsQuestions.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayQuiz = lsQuizzes.find(q => q.date === todayStr) || lsQuizzes[lsQuizzes.length - 1];
            if (todayQuiz) {
                const shaped = {
                    quizId: `local-${lsQuizzes.indexOf(todayQuiz)}`,
                    endTime: todayQuiz.end,
                    questions: (todayQuiz.questions || []).map(idx => {
                        const q = lsQuestions[idx];
                        return {
                            id: idx,
                            text: q?.text,
                            options: q?.options || []
                        };
                    })
                };
                currentQuiz = shaped;
                displayQuiz(shaped);
                return;
            }
        }

        // If nothing found
        showQuizUnavailable();
    } catch (error) {
        console.error('Error loading quiz:', error);
        showQuizUnavailable('Error loading quiz. Please try again later.');
    }
}

function displayQuiz(quizData) {
    const questions = quizData.questions;
    
    if (!questions || questions.length < 2) {
        showQuizUnavailable('Quiz questions are not available');
        return;
    }
    
    // Show quiz section
    document.getElementById('quizAvailable').style.display = 'block';
    document.getElementById('quizCompleted').style.display = 'none';
    document.getElementById('quizUnavailable').style.display = 'none';
    
    // Populate question 1
    const q1 = questions[0];
    document.getElementById('q1Text').textContent = q1.text || q1.questionText;
    document.getElementById('q1optA').textContent = q1.options[0];
    document.getElementById('q1optB').textContent = q1.options[1];
    document.getElementById('q1optC').textContent = q1.options[2];
    document.getElementById('q1optD').textContent = q1.options[3];
    
    // Populate question 2
    const q2 = questions[1];
    document.getElementById('q2Text').textContent = q2.text || q2.questionText;
    document.getElementById('q2optA').textContent = q2.options[0];
    document.getElementById('q2optB').textContent = q2.options[1];
    document.getElementById('q2optC').textContent = q2.options[2];
    document.getElementById('q2optD').textContent = q2.options[3];
    
    // Start timer with quiz end time
    quizStartTime = new Date();
    const endTime = quizData.endTime || '18:00';
    startQuizTimer(endTime);
}

function startQuizTimer(endTime) {
    const timerElement = document.getElementById('quizTimer');
    
    function updateTimer() {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
        
        if (currentTime >= endTime) {
            timerElement.textContent = 'Quiz time has expired!';
            timerElement.style.color = '#dc3545';
            document.getElementById('submitQuiz').disabled = true;
            return;
        }
        
        // Calculate remaining time
        const endDateTime = new Date();
        const [endHour, endMinute] = endTime.split(':');
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
        
        const remainingMs = endDateTime - now;
        const remainingMinutes = Math.floor(remainingMs / 60000);
        const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
        
        timerElement.textContent = `Time remaining: ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        if (remainingMinutes < 5) {
            timerElement.style.color = '#dc3545';
        } else if (remainingMinutes < 10) {
            timerElement.style.color = '#ffc107';
        } else {
            timerElement.style.color = '#28a745';
        }
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

async function submitQuiz() {
    if (!currentQuiz) return;
    
    // Get selected answers
    const q1Answer = document.querySelector('input[name="q1"]:checked');
    const q2Answer = document.querySelector('input[name="q2"]:checked');
    
    if (!q1Answer || !q2Answer) {
        alert('Please answer both questions before submitting.');
        return;
    }
    
    // Prepare answers
    const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    const answers = [
        { questionId: currentQuiz.questions[0].id, selectedOption: letterToIndex[q1Answer.value] },
        { questionId: currentQuiz.questions[1].id, selectedOption: letterToIndex[q2Answer.value] }
    ];

    // Helper to perform local grading using localStorage questions
    const tryLocalGrade = () => {
        try {
            const lsQuestions = JSON.parse(localStorage.getItem('questions') || '[]');
            let score = 0;
            const detailedResults = [];
            currentQuiz.questions.forEach((q, index) => {
                const questionObj = lsQuestions[q.id];
                // Determine correct answer (support multiple schemas)
                // 1) 'correct' or 'answer' as letter 'A'|'B'|'C'|'D'
                // 2) 'correctAnswer' as numeric index 0..3
                let correctIndex = undefined;
                let correctLetter = undefined;
                if (questionObj) {
                    if (typeof questionObj.correctAnswer === 'number') {
                        correctIndex = questionObj.correctAnswer;
                        correctLetter = ['A','B','C','D'][correctIndex];
                    } else if (typeof questionObj.correct === 'string') {
                        correctLetter = questionObj.correct;
                        correctIndex = letterToIndex[correctLetter];
                    } else if (typeof questionObj.answer === 'string') {
                        correctLetter = questionObj.answer;
                        correctIndex = letterToIndex[correctLetter];
                    }
                }
                const selectedIndex = answers[index].selectedOption;
                const isCorrect = selectedIndex === correctIndex;
                if (isCorrect) score += 1;
                detailedResults.push({
                    questionText: questionObj?.text || `Question ${index + 1}`,
                    studentAnswer: ['A','B','C','D'][selectedIndex],
                    correctAnswer: correctLetter,
                    isCorrect
                });
            });

            const endTime = new Date();
            const timeTaken = Math.round((endTime - quizStartTime) / 1000);
            const attempt = {
                score,
                totalQuestions: currentQuiz.questions.length,
                percentage: Math.round((score / currentQuiz.questions.length) * 100),
                timeTaken,
                date: new Date().toISOString().split('T')[0],
                detailedResults
            };

            showQuizCompleted(attempt);
            return true;
        } catch (e) {
            console.error('Local grading failed:', e);
            return false;
        }
    };

    // If this is a local quiz (created via admin.html and stored in localStorage),
    // grade locally and do not call backend (avoids CORS/network errors on different origins).
    if (String(currentQuiz.quizId || '').startsWith('local-') || typeof currentQuiz.questions[0].id === 'number') {
        try {
            const ok = tryLocalGrade();
            if (ok) {
                console.log('[quiz] graded locally');
                return; // stop here; no backend call
            }
        } catch (e) {
            console.error('Local grading exception:', e);
        }
        alert('Could not grade the quiz locally. Please try again.');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const API_BASE = window.API_BASE || '';
        const response = token ? await fetch((API_BASE + '/student/attempt'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quizId: currentQuiz.quizId, answers })
        }) : null;

        if (response && response.ok) {
            const result = await response.json();
            // Calculate time taken
            const endTime = new Date();
            const timeTaken = Math.round((endTime - quizStartTime) / 1000);
            
            const attempt = {
                score: result.score ?? answers.length, // backend returns score
                totalQuestions: currentQuiz.questions.length,
                percentage: Math.round(((result.score ?? 0) / currentQuiz.questions.length) * 100),
                timeTaken: timeTaken,
                date: new Date().toISOString().split('T')[0],
                detailedResults: result.detailedResults
            };
            
            console.log('[quiz] submitted to backend');
            showQuizCompleted(attempt);
        } else {
            // If backend failed or token missing, grade locally
            const ok = tryLocalGrade();
            if (!ok) alert('Failed to submit quiz');
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        // As a last resort, try local grading if possible
        if (tryLocalGrade()) return;
        alert('Error submitting quiz. Please try again.');
    }
}

function showQuizCompleted(attempt) {
    document.getElementById('quizAvailable').style.display = 'none';
    document.getElementById('quizCompleted').style.display = 'block';
    document.getElementById('quizUnavailable').style.display = 'none';
    
    const resultsDiv = document.getElementById('quizResults');
    
    let detailedResultsHTML = '';
    if (attempt.detailedResults) {
        detailedResultsHTML = `
            <div class="detailed-results">
                <h4>Question-wise Results:</h4>
                ${attempt.detailedResults.map((result, index) => `
                    <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                        <p><strong>Q${index + 1}:</strong> ${result.questionText}</p>
                        <p><strong>Your Answer:</strong> ${result.studentAnswer}</p>
                        <p><strong>Correct Answer:</strong> ${result.correctAnswer}</p>
                        <span class="result-status">${result.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    resultsDiv.innerHTML = `
        <div class="quiz-results">
            <h3>Your Results:</h3>
            <p><strong>Score:</strong> ${attempt.score}/${attempt.totalQuestions || 2} (${attempt.percentage}%)</p>
            <p><strong>Time Taken:</strong> ${Math.floor(attempt.timeTaken / 60)}:${(attempt.timeTaken % 60).toString().padStart(2, '0')}</p>
            <p><strong>Date:</strong> ${new Date(attempt.timestamp || attempt.date).toLocaleDateString()}</p>
            ${detailedResultsHTML}
        </div>
    `;
}

function showQuizUnavailable(message = null) {
    document.getElementById('quizAvailable').style.display = 'none';
    document.getElementById('quizCompleted').style.display = 'none';
    document.getElementById('quizUnavailable').style.display = 'block';
    
    if (message) {
        const unavailableDiv = document.getElementById('quizUnavailable');
        const messageP = unavailableDiv.querySelector('p:last-child');
        messageP.textContent = message;
    }
}
