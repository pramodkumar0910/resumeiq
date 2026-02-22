/* ============================================================
   ResumeIQ — Suggestions Module
   Generates improvement recommendations for candidates.
   ============================================================ */

const SuggestionEngine = (() => {

    const CERT_MAP = {
        cloud: ['AWS Solutions Architect', 'Azure AZ-900', 'GCP Professional'],
        security: ['CompTIA Security+', 'CISSP', 'CEH'],
        data: ['Google Data Analytics', 'TensorFlow Developer', 'IBM Data Science'],
        databases: ['MongoDB Developer', 'Oracle Professional'],
        tools: ['PMP', 'Certified ScrumMaster'],
        programming: ['Meta Front-End Developer', 'Oracle Java'],
        frameworks: ['Meta React Developer'],
        business: ['Google Digital Marketing', 'HubSpot Inbound']
    };

    const PROJECT_MAP = {
        react: 'Build a full-stack dashboard with React and REST APIs',
        python: 'Create a data pipeline with Python and Pandas',
        'machine learning': 'Develop an ML classification model with evaluation metrics',
        docker: 'Containerize a multi-service app with Docker Compose',
        kubernetes: 'Deploy microservices to Kubernetes with auto-scaling',
        aws: 'Build a serverless app using Lambda and DynamoDB',
        sql: 'Design and optimize a relational database schema',
        javascript: 'Create a real-time collaborative app using WebSockets',
        angular: 'Develop a feature-rich SPA with Angular and RxJS',
        vue: 'Build a PWA with Vue.js and Vuex',
        django: 'Develop a web app with Django, auth, and REST API',
        'next.js': 'Build a production Next.js app with SSR and API routes'
    };

    function suggestMissingSkills(analysis) {
        const { missingSkills } = analysis;
        if (missingSkills.length === 0) {
            return { title: 'Missing Skills', icon: '🎯', items: ['All required skills covered! Deepen expertise in strongest areas.'], priority: 'low' };
        }
        const items = missingSkills.map(s => {
            const cat = ResumeParser.getSkillCategory(s);
            return `Learn **${s}** (${cat}) — add via courses or projects`;
        });
        return { title: 'Missing Skills', icon: '🎯', items, priority: missingSkills.length >= 5 ? 'high' : 'medium' };
    }

    function suggestExperienceImprovements(analysis) {
        const items = [];
        const { breakdown, resumeData } = analysis;
        if (breakdown.experience.score < 60) {
            items.push('Highlight transferable experience from related roles');
            items.push('Include freelance, open-source, or volunteer work');
        }
        if (resumeData.yearsOfExperience < 2) {
            items.push('Emphasize internships, academic projects, and bootcamps');
            items.push('Quantify impact in all roles — even small wins matter');
        }
        if (!resumeData.sections.experience) items.push('Add a clear "Work Experience" section');
        if (items.length === 0) items.push('Experience section is solid. Add more quantifiable achievements.');
        return { title: 'Experience Gaps', icon: '💼', items, priority: items.length > 2 ? 'high' : 'medium' };
    }

    function suggestProjectsAndCerts(analysis) {
        const items = [];
        for (const skill of analysis.missingSkills.slice(0, 4)) {
            const p = PROJECT_MAP[skill.toLowerCase()];
            if (p) items.push(`📁 Project: ${p}`);
        }
        const suggestedCerts = new Set();
        for (const skill of analysis.missingSkills) {
            const cat = ResumeParser.getSkillCategory(skill);
            const certs = CERT_MAP[cat];
            if (certs) { certs.forEach(c => suggestedCerts.add(c)); if (suggestedCerts.size >= 3) break; }
        }
        suggestedCerts.forEach(c => items.push(`🏅 Certification: ${c}`));
        if (items.length === 0) items.push('Skills well-aligned. Consider advanced certifications.');
        return { title: 'Projects & Certifications', icon: '🚀', items, priority: 'medium' };
    }

    function suggestStructureImprovements(resumeData) {
        const items = [];
        const { sections } = resumeData;
        if (!sections.summary) items.push('Add a professional summary at the top (2-3 sentences)');
        if (!sections.skills) items.push('Add a "Technical Skills" section for ATS scanning');
        if (!sections.experience) items.push('Add a "Work Experience" section');
        if (!sections.education) items.push('Add an "Education" section');
        if (!sections.projects) items.push('Add a "Projects" section');
        if (resumeData.rawText.length < 500) items.push('Resume too short — aim for one full page');
        else if (resumeData.rawText.length > 5000) items.push('Consider condensing to 1-2 pages');
        if (items.length === 0) items.push('Structure looks complete ✓');
        return { title: 'Structure & Clarity', icon: '📋', items, priority: items.length > 3 ? 'high' : 'low' };
    }

    function suggestKeywordAlignment(analysis) {
        const items = [];
        if (analysis.missingSkills.length > 0)
            items.push(`Include keywords: **${analysis.missingSkills.slice(0, 8).join(', ')}**`);
        items.push('Use exact terminology from the job description for ATS');
        if (analysis.matchedSkills.length > 0)
            items.push(`Keep prominent: ${analysis.matchedSkills.slice(0, 5).join(', ')}`);
        items.push('Place key skills in summary and experience descriptions');
        return { title: 'Keyword Alignment', icon: '🔑', items, priority: analysis.missingSkills.length > 3 ? 'high' : 'medium' };
    }

    function suggestMeasurableAchievements(resumeData, authenticity) {
        const items = [];
        if (!authenticity.specificity.hasMetrics) {
            items.push('Add metrics: revenue, users impacted, performance %');
            items.push('Transform "Improved performance" → "Improved by 40%, 3s to 1.8s"');
            items.push('Include team sizes managed');
        } else {
            items.push('Good use of metrics! Keep quantifying achievements.');
        }
        items.push('Use XYZ formula: Accomplished [X] measured by [Y] doing [Z]');
        items.push('Replace "helped/assisted" with "architected/optimized"');
        return { title: 'Measurable Achievements', icon: '📊', items, priority: !authenticity.specificity.hasMetrics ? 'high' : 'low' };
    }

    function assessCareerReadiness(analysis, authenticity) {
        const { overallScore, breakdown } = analysis;
        const items = [];
        let readinessLevel;
        if (overallScore >= 80) { readinessLevel = 'High'; items.push('Well-positioned. Focus on interview prep.'); }
        else if (overallScore >= 60) { readinessLevel = 'Moderate'; items.push('Targeted improvements will strengthen candidacy.'); }
        else { readinessLevel = 'Developing'; items.push('Upskill in key areas and build relevant projects.'); }
        if (breakdown.skills.score < 50) items.push('Priority: Bridge skill gaps with online courses');
        if (breakdown.experience.score < 50) items.push('Gain experience via freelance or open source');
        if (breakdown.projects.score < 50) items.push('Build 2-3 portfolio projects for this role');
        items.push('Connect with target-role professionals on LinkedIn');
        return { readinessLevel, items };
    }

    function generateAllSuggestions(analysis, authenticity) {
        return {
            suggestions: [
                suggestMissingSkills(analysis),
                suggestExperienceImprovements(analysis),
                suggestProjectsAndCerts(analysis),
                suggestStructureImprovements(analysis.resumeData),
                suggestKeywordAlignment(analysis),
                suggestMeasurableAchievements(analysis.resumeData, authenticity)
            ],
            careerReadiness: assessCareerReadiness(analysis, authenticity)
        };
    }

    return { generateAllSuggestions, assessCareerReadiness };
})();
