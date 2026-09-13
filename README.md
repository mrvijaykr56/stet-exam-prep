# Bihar STET 2026 — CS Paper II Exam Prep Web App

A complete, production-ready **static web application** for students preparing for **Bihar STET 2026 Paper II (Computer Science)**. Built with pure HTML5 + CSS3 + Vanilla JavaScript — zero frameworks, zero build step, deployable directly on GitHub Pages.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📚 **Syllabus Explorer** | Interactive expandable tree of all 15 units, with topic-level progress marking |
| 📖 **Materials Hub** | Curated notes, videos, PDFs — searchable and filterable by unit/type/difficulty |
| 🎯 **Practice Mode** | 50+ MCQs with instant feedback, explanations, and score tracking |
| 📝 **Mock Exam** | Timed full exam with question navigator, flagging, and detailed scorecard |
| 📊 **Progress Dashboard** | Overall % ring, unit breakdown, streak counter, badges, study time |
| 🔥 **Streak & Badges** | 9 achievement badges, daily streaks, motivational quotes |
| 🌙 **Dark Mode** | Full dark theme with persistent preference |
| 📱 **Mobile-first** | Fully responsive on all screen sizes |
| 🔌 **Offline Support** | Service Worker caches all core assets — works without internet |

---

## 📁 Project Structure

```
STET EXAM/
├── index.html          ← Dashboard
├── syllabus.html       ← Interactive Syllabus Explorer
├── materials.html      ← Study Materials Hub
├── practice.html       ← MCQ Practice Mode
├── mock-exam.html      ← Timed Mock Exam
├── progress.html       ← Progress & Achievements
├── sw.js               ← Service Worker (offline support)
│
├── css/
│   ├── styles.css      ← Design system (tokens, layout, typography, dark mode)
│   └── components.css  ← UI components (cards, buttons, quiz, badges, etc.)
│
├── js/
│   ├── app.js          ← Core: theme, nav, toast, utilities
│   ├── storage.js      ← localStorage abstraction (progress, results, streaks)
│   ├── syllabus.js     ← Syllabus Explorer module
│   ├── practice.js     ← Practice mode module
│   ├── exam.js         ← Mock Exam module
│   └── progress.js     ← Progress Dashboard module
│
├── data/
│   ├── syllabus.json   ← All 15 units with topics & sub-topics
│   ├── questions.json  ← 50+ MCQ questions with explanations
│   └── materials.json  ← Study material links
│
└── README.md
```

---

## 🚀 Running Locally

> **Important:** Browsers block `fetch()` on `file://` URLs. You must use a local server.

### Option 1 — npx serve (Recommended)

```bash
cd "c:\workspace\STET EXAM"
npx serve .
```
Then open `http://localhost:3000` in your browser.

### Option 2 — VS Code Live Server

1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **Open with Live Server**

### Option 3 — Python HTTP Server

```bash
cd "c:\workspace\STET EXAM"
python -m http.server 8080
```
Then open `http://localhost:8080`

---

## 🌐 Deploy to GitHub Pages

1. Create a new GitHub repository (e.g., `bihar-stet-2026-cs`)
2. Push this folder to the `main` branch:
```bash
git init
git add .
git commit -m "Initial commit — Bihar STET 2026 CS Prep App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bihar-stet-2026-cs.git
git push -u origin main
```
3. In your GitHub repo → **Settings → Pages** → Source: `main` branch → `/root`
4. Your app will be live at: `https://YOUR_USERNAME.github.io/bihar-stet-2026-cs/`

---

## 📝 Adding New Questions

Open `data/questions.json` and add a new object to the `questions` array:

```json
{
  "id": "q51",
  "unit": "unit1",
  "topicId": "u1t3",
  "topic": "Boolean Algebra",
  "difficulty": "medium",
  "question": "Your question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "Detailed explanation of why Option A is correct."
}
```

**Unit IDs:** `unit1` through `unit15`  
**Difficulty:** `"easy"` | `"medium"` | `"hard"`  
**correct:** 0-indexed (0=A, 1=B, 2=C, 3=D)

---

## 📚 Adding New Syllabus Topics

Open `data/syllabus.json` and add a topic to the relevant unit's `topics` array:

```json
{
  "id": "u1t8",
  "title": "Your New Topic",
  "subtopics": [
    "Sub-topic 1",
    "Sub-topic 2",
    "Sub-topic 3"
  ]
}
```

---

## 📖 Adding Study Materials

Open `data/materials.json` and add an entry to the `materials` array:

```json
{
  "id": "m21",
  "unit": "unit1",
  "topicId": "u1t3",
  "title": "Your Material Title",
  "type": "notes",
  "difficulty": "medium",
  "description": "Brief description of this resource.",
  "url": "https://your-link-here.com",
  "tags": ["relevant", "tags"]
}
```

**Types:** `"notes"` | `"video"` | `"pdf"` | `"practice"`

---

## 🎨 Customizing the Theme

Open `css/styles.css` and modify the CSS custom properties in `:root`:

```css
:root {
  --color-primary-600: #4f46e5;  /* Change primary color */
  --color-accent:      #4f6ef7;  /* Change accent color */
  --font-sans: 'Inter', sans-serif; /* Change font */
}
```

---

## 🔔 Browser Notifications

The app will ask permission for daily study reminders. To trigger reminders manually, call in the browser console:

```javascript
import { sendDailyReminder } from './js/app.js';
sendDailyReminder('Time to study DBMS today!');
```

---

## 📋 Syllabus Coverage

| Unit | Topic | Priority |
|------|-------|----------|
| 1 | Digital Logic | ⭐⭐⭐ High |
| 2 | Computer Organization & Architecture | ⭐⭐⭐ High |
| 3 | Programming and Data Structures | ⭐⭐⭐ High |
| 4 | Algorithms | ⭐⭐ Medium |
| 5 | Operating Systems | ⭐⭐⭐ High |
| 6 | Database Management System | ⭐⭐⭐ High |
| 7 | Computer Networks | ⭐⭐⭐ High |
| 8 | Software Engineering | ⭐⭐ Medium |
| 9 | Object-Oriented Programming | ⭐⭐ Medium |
| 10 | Web-Based Application Development | ⭐ Low |
| 11 | Theory of Computation | ⭐⭐ Medium |
| 12 | Internet of Things (IoT) | ⭐ Low |
| 13 | Artificial Intelligence | ⭐⭐ Medium |
| 14 | E-Commerce | ⭐ Low |
| 15 | Multimedia | ⭐ Low |

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure, ARIA accessibility
- **CSS3** — Custom properties, Flexbox, Grid, animations
- **Vanilla JavaScript ES6+** — Modules, async/await, localStorage
- **Service Worker API** — Offline caching
- **Notification API** — Daily reminders
- **No frameworks. No build tools. No dependencies.**

---

## 📌 Important Notes

1. Always verify the latest syllabus from the official BSEB/STET portal before the exam
2. Progress data is stored in your browser's localStorage — clearing browser data will reset progress
3. The app works best when served via HTTPS (GitHub Pages) for full Service Worker support

---

*Built with ❤️ for Bihar STET 2026 CS aspirants. Best of luck! 🎓*
