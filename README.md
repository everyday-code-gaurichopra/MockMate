# MockMate - AI-Powered Mock Interview Platform

## Overview

MockMate is an innovative web application designed to help users prepare for job interviews by simulating a real-world interview experience. The platform leverages artificial intelligence to provide a dynamic and interactive environment where users can practice answering questions tailored to specific job roles and experience levels, receive instant feedback, and track their progress over time.

This project was built using modern frontend technologies, integrating directly with Google's Gemini API for AI capabilities and Google Firestore for persistent data storage.

**Live Demo:** `[Link to your deployed application]`

---

## Features

-   **Dynamic Interview Generation:** Users can specify a job role and experience level to get a set of relevant, AI-generated interview questions.
-   **Interactive Video Interface:** Utilizes the user's webcam for a realistic face-to-face interview simulation.
-   **Speech-to-Text Transcription:** Captures and transcribes user answers in real-time using the browser's Web Speech API.
-   **AI-Powered Feedback:** After each answer, the Gemini API provides a detailed critique and a well-structured example of an improved response.
-   **Persistent Interview History:** Securely saves all completed interview sessions, including transcripts and feedback, to a Firestore database.
-   **Review Past Sessions:** Users can access their full interview history from the dashboard to track their progress and review past feedback.
-   **Multi-Page Experience:** Includes informative static pages like "How It Works," "About Us," and "FAQ" for a complete user experience.
-   **Responsive Design:** The user interface is fully responsive and optimized for both desktop and mobile devices.

---

## Technology Stack

-   **Frontend:**
    -   HTML5
    -   CSS3 (Custom Properties & Flexbox/Grid)
    -   JavaScript (ES6 Modules, `async/await`)
-   **Backend & AI Services (Serverless):**
    -   **Google Gemini API:** For all AI tasks, including question generation and feedback analysis.
    -   **Google Firestore:** A NoSQL cloud database for storing user interview history.
    -   **Firebase Authentication:** Used for user session management.
-   **Browser APIs:**
    -   Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)
    -   `getUserMedia` (WebRTC) for camera/microphone access.
    -   `Fetch` API for network requests.

---

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   A modern web browser that supports the Web Speech API (Google Chrome is recommended).
-   A working microphone and webcam.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [Link to your GitHub repository]
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd MockMate
    ```
3.  **Set up Firebase (for full functionality):**
    -   Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    -   In your project, create a new Web App.
    -   Copy the `firebaseConfig` object.
    -   You will need to configure this within the `index.html` file or a separate configuration file (the current setup assumes this is provided by the environment).
    -   In the Firestore Database section, create a database and set up security rules.

4.  **Run the application:**
    -   Since the project uses ES6 modules, it needs to be served by a local server to avoid CORS errors.
    -   You can use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code.
    -   Right-click on `login.html` and select "Open with Live Server".

---

## How to Use

1.  **Login:** Open the application and use any username and password to log in.
2.  **Setup Interview:** On the dashboard, enter the **Job Role** and **Experience Level** you want to practice for.
3.  **Start:** Click "Let's Get Started." The AI will generate questions, and your browser will ask for camera/microphone permissions. Grant them.
4.  **Conduct Interview:** Click "Start Interview." The AI will ask questions one by one. Click "Answer Now" to record your answer and "Stop Answering" when you're done.
5.  **Get Feedback:** After each answer, instant feedback will appear in the transcript.
6.  **Review:** Once the interview is complete, it will be saved. You can view it immediately in the summary modal or later from the "Your Past Interviews" list on the dashboard.

---

## Future Enhancements

-   **Full-fledged Authentication:** Implement OAuth 2.0 (e.g., Sign in with Google) for secure and persistent user accounts.
-   **Advanced Feedback Metrics:** Analyze speaking pace, filler word usage, and sentiment.
-   **Customizable Interviews:** Allow users to set the number of questions or interview duration.
-   **Shareable Reports:** Generate a public link to an interview report that can be shared with mentors.
