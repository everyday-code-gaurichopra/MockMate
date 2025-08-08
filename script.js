import { collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Authentication Check ---
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
    }
}

// --- DOM Element References ---
const logoutBtn = document.getElementById('logoutBtn');
const setupSection = document.getElementById('setup-section');
const interviewSetupForm = document.getElementById('interviewSetupForm');
const startSetupBtn = document.getElementById('startSetupBtn');
const startInterviewBtn = document.getElementById('startInterviewBtn');
const interviewSection = document.getElementById('interview-section');
const webcamVideo = document.getElementById('webcam');
const answerBtn = document.getElementById('answerBtn');
const endInterviewBtn = document.getElementById('endInterviewBtn');
const recordingIndicator = document.getElementById('recording-indicator');
const transcriptContainer = document.getElementById('transcript-container');
const messageBox = document.getElementById('message-box');
const interviewHistory = document.getElementById('interviewHistory');
const historyLoading = document.getElementById('history-loading');

// Modal Elements
const summaryModal = document.getElementById('summaryModal');
const summaryContent = document.getElementById('summaryContent');
const closeModalBtn = document.getElementById('closeModalBtn');

// --- State Variables ---
let mediaStream;
let interviewStarted = false;
let currentQuestionIndex = 0;
let isRecording = false;
let fullTranscript = [];
let interviewQuestions = [];
let interviewConfig = {};
let db, auth, userId;

// --- Speech Recognition & Synthesis ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
} else {
    console.error("Speech Recognition not supported in this browser.");
    if (document.body.contains(messageBox)) {
        alert("Speech Recognition not supported in this browser. Please use Google Chrome.");
    }
}
const synth = window.speechSynthesis;

// --- Utility Functions ---
function showMessage(message, type = 'success') {
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.className = `message-box ${type} show`;
    setTimeout(() => {
        messageBox.className = 'message-box';
    }, 3000);
}

function speak(text) {
    return new Promise((resolve, reject) => {
        if (synth.speaking) synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = resolve;
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            reject(event);
        };
        synth.speak(utterance);
    });
}

function addToTranscript(speaker, text) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'transcript-entry';
    // FIX: Added const to declare speakerDiv properly
    const speakerDiv = document.createElement('div');
    speakerDiv.className = `transcript-speaker ${speaker}`;
    speakerDiv.innerHTML = speaker === 'ai' ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg> AI Interviewer` : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> You`;
    const textDiv = document.createElement('div');
    textDiv.className = 'transcript-text';
    textDiv.textContent = text;
    entryDiv.appendChild(speakerDiv);
    entryDiv.appendChild(textDiv);
    transcriptContainer.appendChild(entryDiv);
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    return textDiv;
}

function addFeedbackToTranscript(userTextElement, feedback, example) {
    const parentEntry = userTextElement.parentElement;
    const feedbackContainer = document.createElement('div');
    feedbackContainer.className = 'feedback-container';
    feedbackContainer.innerHTML = `<div class="feedback-title">Feedback</div><div class="feedback-text">${feedback}</div><br><div class="feedback-title">Example Answer</div><div class="feedback-text">${example}</div>`;
    parentEntry.appendChild(feedbackContainer);
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

// --- Firebase & History Logic ---
async function loadInterviewHistory() {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const historyCollection = collection(db, `/artifacts/${appId}/users/${userId}/interviews`);
    try {
        const querySnapshot = await getDocs(historyCollection);
        historyLoading.classList.add('hidden');
        if (querySnapshot.empty) {
            interviewHistory.innerHTML = '<p>No past interviews found.</p>';
            return;
        }
        interviewHistory.innerHTML = '';
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-item-info">
                    <span>${data.config.jobRole} (${data.config.experienceLevel})</span>
                    <span>${new Date(data.timestamp.seconds * 1000).toLocaleString()}</span>
                </div>
                <button class="btn btn-secondary view-feedback-btn" data-id="${doc.id}">View Feedback</button>
            `;
            interviewHistory.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading interview history:", error);
        historyLoading.textContent = "Could not load history.";
    }
}

async function saveInterview() {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const historyCollection = collection(db, `/artifacts/${appId}/users/${userId}/interviews`);
    try {
        await addDoc(historyCollection, {
            config: interviewConfig,
            transcript: fullTranscript,
            timestamp: new Date()
        });
        showMessage("Interview saved successfully!", "success");
    } catch (error) {
        console.error("Error saving interview:", error);
        showMessage("Could not save interview.", "error");
    }
}

function showSummaryModal(transcript, config) {
    summaryContent.innerHTML = '';
    const userEntries = transcript.filter(entry => entry.speaker === 'user');
    if (userEntries.length > 0) {
        userEntries.forEach((entry) => {
            const questionIndex = transcript.findIndex(e => e === entry) - 1;
            const question = transcript[questionIndex]?.text;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'summary-item';
            itemDiv.innerHTML = `
                <h3 class="summary-question">Q: ${question || 'Question not found'}</h3>
                <p class="summary-answer-title">Your Answer:</p>
                <div class="summary-answer-text">${entry.text || 'No answer provided.'}</div>
                <p class="summary-feedback-title">Feedback:</p>
                <div class="summary-feedback-text">${entry.feedback || 'No feedback available.'}</div>
                <p class="summary-feedback-title" style="margin-top: 1rem;">Example Answer:</p>
                <div class="summary-feedback-text">${entry.exampleAnswer || 'No example available.'}</div>
            `;
            summaryContent.appendChild(itemDiv);
        });
    } else {
        summaryContent.innerHTML = `<p>No questions were answered during this interview.</p>`;
    }
    summaryModal.classList.remove('hidden');
}

// --- Core Application Logic ---
async function handleSetupForm(event) {
    event.preventDefault();
    const jobRole = document.getElementById('jobRole').value;
    const experienceLevel = document.getElementById('experienceLevel').value;
    interviewConfig = { jobRole, experienceLevel };
    startSetupBtn.textContent = "Generating Questions...";
    startSetupBtn.disabled = true;

    const prompt = `Generate 5 interview questions for a candidate applying for the role of "${jobRole}" with "${experienceLevel}" experience. Return the questions as a JSON array of strings. Do not include any introductory text, just the raw JSON array.`;
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    try {
        const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        
        if (!response.ok) {
            // Log the raw response text for non-200 status codes
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API call failed: ${response.status}`);
        }

        const result = await response.json();
        const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // DEBUG: Log the raw text received from the API
        console.log("Raw response from API:", rawJsonText);

        if (!rawJsonText) {
            throw new Error("API returned an empty response.");
        }

        interviewQuestions = JSON.parse(rawJsonText);

        if (!Array.isArray(interviewQuestions) || interviewQuestions.length === 0) {
            throw new Error("Invalid question format from API. Expected a non-empty array.");
        }
        
        await setupMedia();
    } catch (error) {
        // DEBUG: Log the specific error to the console for better diagnosis
        console.error("Error in handleSetupForm:", error);
        showMessage("Could not generate questions. Please try again.", "error");
        startSetupBtn.textContent = "Let's Get Started";
        startSetupBtn.disabled = false;
    }
}

async function setupMedia() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        webcamVideo.srcObject = mediaStream;
        showMessage('Camera and microphone ready!', 'success');
        startSetupBtn.classList.add('hidden');
        startInterviewBtn.classList.remove('hidden');
    } catch (err) {
        console.error("Error accessing media devices.", err);
        showMessage('Could not access camera or microphone.', 'error');
        startSetupBtn.textContent = "Let's Get Started";
        startSetupBtn.disabled = false;
    }
}

function startInterview() {
    interviewStarted = true;
    setupSection.classList.add('hidden');
    interviewSection.classList.remove('hidden');
    askNextQuestion();
}

async function askNextQuestion() {
    if (currentQuestionIndex < interviewQuestions.length) {
        const question = interviewQuestions[currentQuestionIndex];
        answerBtn.disabled = true;
        addToTranscript('ai', question);
        fullTranscript.push({ speaker: 'ai', text: question });
        try {
            await speak(question);
        } catch (error) {
            console.error("Speech synthesis failed.", error);
        } finally {
            answerBtn.disabled = false;
        }
    } else {
        await endInterview();
    }
}

function handleAnswerButtonClick() {
    if (!recognition) return showMessage("Speech recognition is not supported.", "error");
    if (isRecording) return recognition.stop();
    
    isRecording = true;
    answerBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M6 6h12v12H6z"/></svg> Stop Answering`;
    answerBtn.classList.add('btn-danger');
    recordingIndicator.classList.add('active');
    endInterviewBtn.disabled = true;

    const userEntry = addToTranscript('user', 'Listening...');
    let finalTranscriptResult = '';
    recognition.onresult = (event) => {
        let interim = '';
        finalTranscriptResult = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const part = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscriptResult += part;
            else interim += part;
        }
        userEntry.textContent = finalTranscriptResult + interim;
    };
    recognition.onend = () => {
        isRecording = false;
        answerBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg> Answer Now`;
        answerBtn.classList.remove('btn-danger');
        recordingIndicator.classList.remove('active');
        endInterviewBtn.disabled = false;
        userEntry.textContent = finalTranscriptResult;
        if (finalTranscriptResult.trim()) {
            fullTranscript.push({ speaker: 'user', text: finalTranscriptResult });
            getAIFeedback(userEntry, finalTranscriptResult);
        } else {
            userEntry.textContent = "No answer was recorded.";
            currentQuestionIndex++;
            setTimeout(askNextQuestion, 500);
        }
    };
    recognition.start();
}

async function getAIFeedback(userTextElement, answer) {
    answerBtn.disabled = true;
    const loadingFeedback = addToTranscript('ai', 'Generating feedback...');
    const question = interviewQuestions[currentQuestionIndex];
    const prompt = `You are an expert career coach. The interview question was: "${question}". The user's answer was: "${answer}". Provide analysis in JSON format with two keys: "feedback" (concise critique) and "exampleAnswer" (an improved example). Provide only the raw JSON object.`;
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    try {
        const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const result = await response.json();
        const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const feedbackData = JSON.parse(rawJsonText);
        loadingFeedback.parentElement.remove();
        addFeedbackToTranscript(userTextElement, feedbackData.feedback, feedbackData.exampleAnswer);
        const lastUserEntry = fullTranscript.findLast(entry => entry.speaker === 'user');
        if (lastUserEntry) {
            lastUserEntry.feedback = feedbackData.feedback;
            lastUserEntry.exampleAnswer = feedbackData.exampleAnswer;
        }
    } catch (error) {
        console.error("Error getting AI feedback:", error);
        showMessage("Couldn't get feedback.", "error");
        loadingFeedback.textContent = "Could not generate feedback.";
    } finally {
        currentQuestionIndex++;
        askNextQuestion();
    }
}

async function endInterview() {
    if (!interviewStarted) return;
    interviewStarted = false;
    isRecording = false;
    recognition?.stop();
    synth?.cancel();
    addToTranscript('ai', "That concludes our interview. Saving your results...");
    await speak("That concludes our interview. Saving your results.");
    await saveInterview();
    showSummaryModal(fullTranscript, interviewConfig);
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

function resetApp() {
    window.location.reload();
}

// --- Event Listeners ---
document.addEventListener('firebase-ready', () => {
    db = window.db;
    auth = window.auth;
    userId = auth.currentUser?.uid || 'anonymous';
    loadInterviewHistory();
});

if (document.body.contains(interviewSetupForm)) {
    interviewSetupForm.addEventListener('submit', handleSetupForm);
    startInterviewBtn.addEventListener('click', startInterview);
    answerBtn.addEventListener('click', handleAnswerButtonClick);
    endInterviewBtn.addEventListener('click', endInterview);
    closeModalBtn.addEventListener('click', () => summaryModal.classList.add('hidden'));
    logoutBtn.addEventListener('click', logout);

    interviewHistory.addEventListener('click', async (e) => {
        if (e.target.classList.contains('view-feedback-btn')) {
            const docId = e.target.dataset.id;
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/interviews`, docId);
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    showSummaryModal(data.transcript, data.config);
                } else {
                    showMessage("Could not find interview data.", "error");
                }
            } catch (error) {
                console.error("Error fetching past interview:", error);
                showMessage("Could not fetch interview data.", "error");
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        if (interviewStarted) {
            recognition?.stop();
            synth?.cancel();
        }
    });
}
