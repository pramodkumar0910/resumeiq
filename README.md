# ResumeIQ 🧠 — AI-Powered Resume Screening & Improvement

ResumeIQ is a modern, intelligent resume analysis tool designed for both recruiters and candidates. It uses rule-based AI to provide detailed insights, match scores, and improvement suggestions.

## 🚀 Key Features

### 👔 For Recruiters
- **Batch Analysis**: Upload multiple resumes (PDF/TXT) and compare them against a job description.
- **Explainable AI Scoring**: See exactly how candidates are scored across Skills, Experience, Education, and Projects.
- **Bias-Aware Evaluation**: Focuses on objective data to help reduce hiring bias.
- **Authenticity Detection**: Identifies potential red flags or inconsistencies in resumes.
- **CSV Export**: Download a ranked list of candidates as a shortlist.

### 🎓 For Candidates
- **Optimization Tips**: Get specific feedback on your resume based on a target job description.
- **Skill Gap Analysis**: Identify missing keywords and experience areas.
- **Career Readiness**: Understand your fit for the role with a clear readiness level.
- **Checklist Export**: Generate a markdown checklist of improvements to make.

## 🛠️ Tech Stack
- **Frontend**: HTML5, Vanilla CSS (Modern, Responsive UI)
- **Logic**: Vanilla JavaScript (ES6+)
- **Analysis Engine**: Custom rule-based extraction and scoring.
- **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/)

## 📂 Project Structure
- `index.html`: Main application interface.
- `css/styles.css`: Modern styling and animations.
- `js/app.js`: Application orchestrator and routing.
- `js/analyzer.js`: Core scoring and analysis engine.
- `js/charts.js`: Visualization components (score circles, meters).
- `js/export.js`: CSV and Markdown export utilities.
- `samples/`: Sample resumes for testing.

## 🏁 Getting Started

### Prerequisites
- A modern web browser.
- (Optional) A local server for best performance (e.g., Python `http.server`).

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/pramodkumar0910/resumeiq.git
   ```
2. Open `index.html` in your browser.

OR run with a local server:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080`.

## 📄 License
This project is open-source. Feel free to use and improve it!
