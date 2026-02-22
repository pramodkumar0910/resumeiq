/* ============================================================
   ResumeIQ — App Module
   Main orchestrator: routing, file uploads, analysis pipeline.
   ============================================================ */

(function () {
    'use strict';

    // ── DOM References ──
    const views = {
        roleSelection: document.getElementById('roleSelectionView'),
        recruiter: document.getElementById('recruiterView'),
        candidate: document.getElementById('candidateView')
    };

    const els = {
        navBackBtn: document.getElementById('navBackBtn'),
        modeBadge: document.getElementById('modeBadge'),
        logoHome: document.getElementById('logoHome'),
        // Recruiter
        recruiterUploadZone: document.getElementById('recruiterUploadZone'),
        recruiterFileInput: document.getElementById('recruiterFileInput'),
        recruiterFileList: document.getElementById('recruiterFileList'),
        recruiterJD: document.getElementById('recruiterJD'),
        recruiterAnalyzeBtn: document.getElementById('recruiterAnalyzeBtn'),
        recruiterResults: document.getElementById('recruiterResults'),
        recruiterSummary: document.getElementById('recruiterSummary'),
        candidatesGrid: document.getElementById('candidatesGrid'),
        downloadShortlistBtn: document.getElementById('downloadShortlistBtn'),
        // Candidate
        candidateUploadZone: document.getElementById('candidateUploadZone'),
        candidateFileInput: document.getElementById('candidateFileInput'),
        candidateFileList: document.getElementById('candidateFileList'),
        candidateJD: document.getElementById('candidateJD'),
        candidateAnalyzeBtn: document.getElementById('candidateAnalyzeBtn'),
        candidateResults: document.getElementById('candidateResults'),
        candidateDashboard: document.getElementById('candidateDashboard'),
        downloadChecklistBtn: document.getElementById('downloadChecklistBtn'),
        // Loading
        loadingOverlay: document.getElementById('loadingOverlay'),
        loadingText: document.getElementById('loadingText'),
        loadingProgressBar: document.getElementById('loadingProgressBar')
    };

    // ── State ──
    let currentMode = null; // 'recruiter' | 'candidate'
    let recruiterFiles = [];
    let candidateFile = null;
    let lastRecruiterResults = null;
    let lastCandidateResult = null;

    // ── View Routing ──
    function showView(viewName) {
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[viewName].classList.add('active');

        if (viewName === 'roleSelection') {
            els.navBackBtn.style.display = 'none';
            els.modeBadge.style.display = 'none';
            currentMode = null;
        } else {
            els.navBackBtn.style.display = 'inline-flex';
            els.modeBadge.style.display = 'inline-flex';
            els.modeBadge.textContent = viewName === 'recruiter' ? '🏢 Recruiter Mode' : '👤 Candidate Mode';
            currentMode = viewName;
        }
    }

    // ── Event Bindings ──
    // Role selection
    document.getElementById('recruiterCard').addEventListener('click', () => showView('recruiter'));
    document.getElementById('candidateCard').addEventListener('click', () => showView('candidate'));
    els.navBackBtn.addEventListener('click', () => showView('roleSelection'));
    els.logoHome.addEventListener('click', () => showView('roleSelection'));

    // ── File Upload Handling ──
    function setupUploadZone(zone, fileInput, mode) {
        zone.addEventListener('click', () => fileInput.click());
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files, mode);
        });
        fileInput.addEventListener('change', e => handleFiles(e.target.files, mode));
    }

    function handleFiles(fileList, mode) {
        const files = Array.from(fileList).filter(f =>
            f.name.endsWith('.pdf') || f.name.endsWith('.txt')
        );
        if (mode === 'recruiter') {
            recruiterFiles = [...recruiterFiles, ...files];
            renderFileChips(recruiterFiles, els.recruiterFileList, 'recruiter');
            updateAnalyzeBtn('recruiter');
        } else {
            candidateFile = files[0] || null;
            renderFileChips(candidateFile ? [candidateFile] : [], els.candidateFileList, 'candidate');
            updateAnalyzeBtn('candidate');
        }
    }

    function renderFileChips(files, container, mode) {
        container.innerHTML = '';
        files.forEach((f, i) => {
            const chip = document.createElement('div');
            chip.className = 'file-chip';
            chip.innerHTML = `📄 ${f.name} <button class="file-chip-remove" data-index="${i}">×</button>`;
            chip.querySelector('.file-chip-remove').addEventListener('click', e => {
                e.stopPropagation();
                if (mode === 'recruiter') {
                    recruiterFiles.splice(i, 1);
                    renderFileChips(recruiterFiles, container, mode);
                } else {
                    candidateFile = null;
                    renderFileChips([], container, mode);
                }
                updateAnalyzeBtn(mode);
            });
            container.appendChild(chip);
        });
    }

    function updateAnalyzeBtn(mode) {
        if (mode === 'recruiter') {
            els.recruiterAnalyzeBtn.disabled = !(recruiterFiles.length > 0 && els.recruiterJD.value.trim());
        } else {
            els.candidateAnalyzeBtn.disabled = !candidateFile;
        }
    }

    setupUploadZone(els.recruiterUploadZone, els.recruiterFileInput, 'recruiter');
    setupUploadZone(els.candidateUploadZone, els.candidateFileInput, 'candidate');
    els.recruiterJD.addEventListener('input', () => updateAnalyzeBtn('recruiter'));
    els.candidateJD.addEventListener('input', () => updateAnalyzeBtn('candidate'));

    // ── Loading UI ──
    function showLoading(text) {
        els.loadingOverlay.style.display = 'flex';
        els.loadingText.textContent = text;
        els.loadingProgressBar.style.width = '0%';
    }

    function updateLoading(text, progress) {
        els.loadingText.textContent = text;
        els.loadingProgressBar.style.width = progress + '%';
    }

    function hideLoading() {
        els.loadingProgressBar.style.width = '100%';
        setTimeout(() => { els.loadingOverlay.style.display = 'none'; }, 400);
    }

    // ── Recruiter Analysis Pipeline ──
    els.recruiterAnalyzeBtn.addEventListener('click', async () => {
        showLoading('Extracting text from resumes...');
        try {
            const jdReqs = ResumeAnalyzer.parseJobDescription(els.recruiterJD.value);
            const analyses = [];
            for (let i = 0; i < recruiterFiles.length; i++) {
                updateLoading(`Parsing resume ${i + 1} of ${recruiterFiles.length}...`,
                    Math.round(((i) / recruiterFiles.length) * 60));
                const parsed = await ResumeParser.parseResume(recruiterFiles[i]);
                updateLoading(`Analyzing ${parsed.name}...`,
                    Math.round(((i + 0.5) / recruiterFiles.length) * 60) + 20);
                const analysis = ResumeAnalyzer.analyzeResume(parsed, jdReqs);
                analysis.authenticity = AuthenticityChecker.analyzeAuthenticity(parsed);
                analyses.push(analysis);
            }
            updateLoading('Ranking candidates...', 90);
            const ranked = ResumeAnalyzer.rankCandidates(analyses);
            lastRecruiterResults = ranked;
            await new Promise(r => setTimeout(r, 500));
            renderRecruiterResults(ranked, jdReqs);
            hideLoading();
        } catch (err) {
            hideLoading();
            alert('Error analyzing resumes: ' + err.message);
            console.error(err);
        }
    });

    // ── Candidate Analysis Pipeline ──
    els.candidateAnalyzeBtn.addEventListener('click', async () => {
        showLoading('Extracting resume text...');
        try {
            const jdText = els.candidateJD.value;
            const jdReqs = ResumeAnalyzer.parseJobDescription(jdText);
            updateLoading('Parsing resume structure...', 30);
            const parsed = await ResumeParser.parseResume(candidateFile);
            updateLoading('Analyzing skills and experience...', 55);
            const analysis = ResumeAnalyzer.analyzeResume(parsed, jdReqs);
            updateLoading('Checking authenticity...', 70);
            const authenticity = AuthenticityChecker.analyzeAuthenticity(parsed);
            analysis.authenticity = authenticity;
            updateLoading('Generating improvement suggestions...', 85);
            const suggestions = SuggestionEngine.generateAllSuggestions(analysis, authenticity);
            lastCandidateResult = { analysis, authenticity, suggestions };
            await new Promise(r => setTimeout(r, 500));
            renderCandidateResults(analysis, authenticity, suggestions);
            hideLoading();
        } catch (err) {
            hideLoading();
            alert('Error analyzing resume: ' + err.message);
            console.error(err);
        }
    });

    // ── Render Recruiter Results ──
    function renderRecruiterResults(ranked, jdReqs) {
        els.recruiterResults.style.display = 'block';
        // Summary cards
        const avgScore = Math.round(ranked.reduce((s, r) => s + r.overallScore, 0) / ranked.length);
        const strongCount = ranked.filter(r => r.strength === 'Strong').length;
        els.recruiterSummary.innerHTML = `
      <div class="summary-card"><div class="summary-value">${ranked.length}</div><div class="summary-label">Candidates</div></div>
      <div class="summary-card"><div class="summary-value">${avgScore}%</div><div class="summary-label">Avg Score</div></div>
      <div class="summary-card"><div class="summary-value">${strongCount}</div><div class="summary-label">Strong Matches</div></div>
      <div class="summary-card"><div class="summary-value">${jdReqs.allSkills.length}</div><div class="summary-label">Required Skills</div></div>`;

        // Candidate cards
        els.candidatesGrid.innerHTML = '';
        ranked.forEach((r, idx) => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.style.animationDelay = `${idx * 0.12}s`;
            card.innerHTML = buildCandidateCard(r);
            els.candidatesGrid.appendChild(card);
        });
        Charts.animateElements(els.candidatesGrid);
        els.recruiterResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function buildCandidateCard(r) {
        let html = `<div class="card-top">
      <div class="card-rank ${r.rank <= 1 ? 'rank-1' : ''}">#${r.rank}</div>
      <div class="card-info">
        <div class="card-name">${r.resumeData.name}</div>
        <div class="card-meta">${r.resumeData.fileName} • ${r.resumeData.yearsOfExperience} yrs exp • ${r.resumeData.skills.length} skills</div>
      </div>
      <div class="card-score-area">
        ${Charts.createScoreCircle(r.overallScore)}
        ${Charts.createStrengthBadge(r.strength)}
      </div>
    </div>`;

        html += '<div class="card-body">';
        // Matched Skills
        html += `<div><div class="card-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Matched Skills (${r.matchedSkills.length})</div>`;
        html += Charts.createSkillTags(r.matchedSkills.slice(0, 12), []);
        html += '</div>';
        // Missing Skills
        html += `<div><div class="card-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Missing Skills (${r.missingSkills.length})</div>`;
        html += Charts.createSkillTags([], r.missingSkills.slice(0, 12));
        html += '</div>';
        // Explainable AI
        html += Charts.createExplanationPanel(r.sectionInfluence);
        // Explanation text
        html += `<div class="score-explanation" style="grid-column:1/-1"><div class="card-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Score Explanation</div>`;
        r.explanation.forEach(e => { html += `<p style="font-size:0.8125rem;color:var(--grey-600);margin:0.25rem 0;">${e}</p>`; });
        html += '</div>';
        // Authenticity Panel
        if (r.authenticity && r.authenticity.alerts.length > 0) {
            html += `<div class="authenticity-panel"><div class="auth-panel-header">⚠️ Authenticity Awareness (${r.authenticity.riskLevel} risk)</div><div class="auth-panel-body">`;
            r.authenticity.alerts.forEach(a => {
                html += `<div class="auth-alert"><div class="auth-alert-icon ${a.type}">${a.type === 'warn' ? '⚠' : 'ℹ'}</div><span>${a.message}</span></div>`;
            });
            html += '</div></div>';
        }
        // Consistency Panel
        if (r.authenticity) {
            const c = r.authenticity.consistency;
            html += `<div class="consistency-panel"><div class="card-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>Consistency Check (${c.consistencyRatio}% verified)</div>`;
            html += '<div class="consistency-grid">';
            html += `<div class="consistency-col"><h4>Skills Listed</h4>${r.resumeData.skills.slice(0, 6).map(s => `<div class="consistency-item"><span class="consistency-dot ${c.supported.includes(s) ? 'green' : 'amber'}"></span>${s}</div>`).join('')}</div>`;
            html += `<div class="consistency-col"><h4>In Projects</h4>${r.resumeData.projects.slice(0, 6).map(p => `<div class="consistency-item"><span class="consistency-dot green"></span>${p.substring(0, 40)}...</div>`).join('') || '<div class="consistency-item"><span class="consistency-dot red"></span>No projects found</div>'}</div>`;
            html += `<div class="consistency-col"><h4>In Experience</h4>${r.resumeData.experience.slice(0, 6).map(e => `<div class="consistency-item"><span class="consistency-dot green"></span>${e.dateRange}</div>`).join('') || '<div class="consistency-item"><span class="consistency-dot red"></span>No dates found</div>'}</div>`;
            html += '</div></div>';
        }
        html += '</div>';
        return html;
    }

    // ── Render Candidate Results ──
    function renderCandidateResults(analysis, authenticity, suggestions) {
        els.candidateResults.style.display = 'block';
        const d = els.candidateDashboard;
        let html = '';

        // Top row: Score + Skills
        html += '<div class="dashboard-top-row">';
        // Score panel
        html += `<div class="score-panel">
      ${Charts.createBigScoreCircle(analysis.overallScore)}
      ${Charts.createStrengthMeter(analysis.overallScore)}
      <div style="margin-top:1rem;"><strong>${analysis.resumeData.name}</strong></div>
      <div style="font-size:0.75rem;color:var(--grey-400);margin-top:0.25rem;">${analysis.resumeData.skills.length} skills • ${analysis.resumeData.yearsOfExperience} yrs exp</div>
    </div>`;
        // Skills + Breakdown panel
        html += '<div class="skills-panel">';
        html += Charts.createExplanationPanel(analysis.sectionInfluence);
        html += `<div style="margin-top:1.5rem"><div class="card-section-title" style="margin-bottom:0.75rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Skill Match Breakdown</div>`;
        html += Charts.createSkillTags(analysis.matchedSkills, analysis.missingSkills);
        html += '</div></div>';
        html += '</div>';

        // Career readiness banner
        const cr = suggestions.careerReadiness;
        const crColor = cr.readinessLevel === 'High' ? 'var(--green-500)' :
            cr.readinessLevel === 'Moderate' ? 'var(--amber-500)' : 'var(--red-500)';
        html += `<div class="suggestion-card" style="border-left:4px solid ${crColor}">
      <div class="suggestion-header"><div class="suggestion-icon" style="background:${crColor}20;font-size:22px">🎓</div>
      <div><div class="suggestion-title">Career Readiness: ${cr.readinessLevel}</div></div></div>
      <ul class="suggestion-list">${cr.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;

        // Suggestion cards
        html += '<div class="suggestions-grid">';
        for (const s of suggestions.suggestions) {
            const iconClass = s.title.includes('Missing') ? 'skills-icon' :
                s.title.includes('Experience') ? 'exp-icon' :
                    s.title.includes('Project') ? 'project-icon' :
                        s.title.includes('Structure') ? 'structure-icon' :
                            s.title.includes('Keyword') ? 'keyword-icon' : 'achieve-icon';
            html += `<div class="suggestion-card">
        <div class="suggestion-header"><div class="suggestion-icon ${iconClass}">${s.icon}</div>
        <div><div class="suggestion-title">${s.title}</div><span class="strength-badge ${s.priority === 'high' ? 'strength-weak' : s.priority === 'medium' ? 'strength-moderate' : 'strength-strong'}" style="font-size:0.65rem;margin-top:0.25rem;display:inline-block">${s.priority} priority</span></div></div>
        <ul class="suggestion-list">${s.items.map(i => `<li>${i.replace(/\*\*/g, '')}</li>`).join('')}</ul></div>`;
        }
        html += '</div>';

        // Authenticity panel
        if (authenticity.alerts.length > 0) {
            html += `<div class="authenticity-panel"><div class="auth-panel-header">⚠️ Authenticity Awareness</div><div class="auth-panel-body">`;
            authenticity.alerts.forEach(a => {
                html += `<div class="auth-alert"><div class="auth-alert-icon ${a.type}">${a.type === 'warn' ? '⚠' : 'ℹ'}</div><span>${a.message}</span></div>`;
            });
            html += '</div></div>';
        }

        d.innerHTML = html;
        Charts.animateElements(d);
        els.candidateResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Export ──
    els.downloadShortlistBtn.addEventListener('click', () => {
        if (lastRecruiterResults) ExportUtils.generateCSVShortlist(lastRecruiterResults);
    });
    els.downloadChecklistBtn.addEventListener('click', () => {
        if (lastCandidateResult) {
            ExportUtils.generateChecklist(
                lastCandidateResult.analysis,
                lastCandidateResult.suggestions,
                lastCandidateResult.authenticity
            );
        }
    });
})();
