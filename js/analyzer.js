/* ============================================================
   ResumeIQ — Analyzer Module
   Scores resumes against job descriptions with explainability.
   ============================================================ */

const ResumeAnalyzer = (() => {

    // Weight configuration
    const WEIGHTS = {
        skills: 0.40,
        experience: 0.30,
        education: 0.15,
        projects: 0.15
    };

    /**
     * Parse a job description to extract requirements
     */
    function parseJobDescription(jdText) {
        if (!jdText || !jdText.trim()) {
            return { requiredSkills: [], preferredSkills: [], yearsRequired: 0, educationRequired: [], rawText: '' };
        }

        const lowerJD = jdText.toLowerCase();

        // Extract skills mentioned in JD
        const allSkills = ResumeParser.extractSkills(jdText);

        // Try to separate required vs preferred
        const requiredSection = jdText.match(/(?:required|must have|requirements|qualifications)[:\s]*([\s\S]*?)(?=(?:preferred|nice to have|bonus|desired|about|benefits|$))/i);
        const preferredSection = jdText.match(/(?:preferred|nice to have|bonus|desired|good to have)[:\s]*([\s\S]*?)(?=(?:about|benefits|how to apply|$))/i);

        let requiredSkills = allSkills;
        let preferredSkills = [];

        if (requiredSection && preferredSection) {
            requiredSkills = ResumeParser.extractSkills(requiredSection[1]);
            preferredSkills = ResumeParser.extractSkills(preferredSection[1]);
            // Any remaining skills not in required go to preferred
            for (const s of allSkills) {
                if (!requiredSkills.includes(s) && !preferredSkills.includes(s)) {
                    preferredSkills.push(s);
                }
            }
        }

        // Extract years of experience requirement
        let yearsRequired = 0;
        const yearsMatch = jdText.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i);
        if (yearsMatch) yearsRequired = parseInt(yearsMatch[1]);

        // Extract education requirements
        const educationRequired = [];
        if (/\b(ph\.?d|doctorate)\b/i.test(lowerJD)) educationRequired.push('PhD');
        if (/\b(master|m\.?s\.?|m\.?b\.?a|m\.?tech)\b/i.test(lowerJD)) educationRequired.push('Masters');
        if (/\b(bachelor|b\.?s\.?|b\.?a\.?|b\.?tech|b\.?e\.?|degree)\b/i.test(lowerJD)) educationRequired.push('Bachelors');

        return {
            requiredSkills,
            preferredSkills,
            allSkills: [...new Set([...requiredSkills, ...preferredSkills])],
            yearsRequired,
            educationRequired,
            rawText: jdText
        };
    }

    /**
     * Calculate skill match score
     */
    function calculateSkillScore(resumeSkills, jdRequirements) {
        const allRequired = jdRequirements.allSkills;
        if (allRequired.length === 0) return { score: 70, matched: resumeSkills, missing: [], details: 'No specific skills extracted from JD' };

        const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
        const matched = [];
        const missing = [];

        for (const skill of allRequired) {
            if (resumeSkillsLower.includes(skill.toLowerCase())) {
                matched.push(skill);
            } else {
                missing.push(skill);
            }
        }

        const score = allRequired.length > 0 ? Math.round((matched.length / allRequired.length) * 100) : 0;

        return { score, matched, missing, details: `${matched.length}/${allRequired.length} required skills found` };
    }

    /**
     * Calculate experience score
     */
    function calculateExperienceScore(resumeData, jdRequirements) {
        const yearsExp = resumeData.yearsOfExperience;
        const yearsReq = jdRequirements.yearsRequired;

        if (yearsReq === 0) {
            // No specific requirement; give score based on having any experience
            if (yearsExp >= 5) return { score: 90, details: `${yearsExp} years of experience detected` };
            if (yearsExp >= 2) return { score: 75, details: `${yearsExp} years of experience detected` };
            if (yearsExp > 0) return { score: 60, details: `${yearsExp} years of experience detected` };
            return { score: 40, details: 'Limited experience detected' };
        }

        const ratio = Math.min(yearsExp / yearsReq, 1.5);
        const score = Math.min(Math.round(ratio * 70 + 10), 100);

        let details = `${yearsExp} years detected vs ${yearsReq} years required`;
        if (yearsExp >= yearsReq) details += ' ✓';
        else details += ` (gap: ${yearsReq - yearsExp} years)`;

        return { score, details };
    }

    /**
     * Calculate education score
     */
    function calculateEducationScore(resumeData, jdRequirements) {
        const eduItems = resumeData.education;
        const required = jdRequirements.educationRequired;

        if (required.length === 0) {
            return { score: eduItems.length > 0 ? 80 : 50, details: eduItems.length > 0 ? 'Education credentials found' : 'No education details detected' };
        }

        const eduText = eduItems.join(' ').toLowerCase();
        let matched = false;

        for (const req of required) {
            if (req === 'PhD' && /ph\.?d|doctor/i.test(eduText)) { matched = true; break; }
            if (req === 'Masters' && /master|m\.?s\.?|m\.?b\.?a|m\.?tech/i.test(eduText)) { matched = true; break; }
            if (req === 'Bachelors' && /bachelor|b\.?s\.?|b\.?a\.?|b\.?tech|b\.?e\.?|degree/i.test(eduText)) { matched = true; break; }
        }

        return {
            score: matched ? 90 : 40,
            details: matched ? `Education matches requirement (${required.join(', ')})` : `Required: ${required.join(', ')} — not clearly matched`
        };
    }

    /**
     * Calculate project relevance score
     */
    function calculateProjectScore(resumeData, jdRequirements) {
        const projects = resumeData.projects;
        const projectText = projects.join(' ').toLowerCase();

        if (projects.length === 0) {
            return { score: 30, details: 'No project section detected' };
        }

        // Check if project text mentions any required skills
        let relevantCount = 0;
        for (const skill of jdRequirements.allSkills) {
            if (projectText.includes(skill.toLowerCase())) relevantCount++;
        }

        const relevance = jdRequirements.allSkills.length > 0
            ? (relevantCount / jdRequirements.allSkills.length)
            : 0.5;

        const score = Math.round(30 + relevance * 60 + Math.min(projects.length * 5, 10));
        const details = relevantCount > 0
            ? `${projects.length} projects found, ${relevantCount} skills demonstrated`
            : `${projects.length} projects found but limited skill alignment`;

        return { score: Math.min(score, 100), details };
    }

    /**
     * Calculate overall match score with explainability
     */
    function analyzeResume(resumeData, jdRequirements) {
        const skillResult = calculateSkillScore(resumeData.skills, jdRequirements);
        const expResult = calculateExperienceScore(resumeData, jdRequirements);
        const eduResult = calculateEducationScore(resumeData, jdRequirements);
        const projResult = calculateProjectScore(resumeData, jdRequirements);

        // Weighted score
        const overallScore = Math.round(
            skillResult.score * WEIGHTS.skills +
            expResult.score * WEIGHTS.experience +
            eduResult.score * WEIGHTS.education +
            projResult.score * WEIGHTS.projects
        );

        // Determine strength
        let strength;
        if (overallScore >= 75) strength = 'Strong';
        else if (overallScore >= 50) strength = 'Moderate';
        else strength = 'Weak';

        // Generate explanation
        const explanation = generateExplanation(overallScore, skillResult, expResult, eduResult, projResult, resumeData, jdRequirements);

        // Highlight influencing sections
        const sectionInfluence = [
            { section: 'Skills Match', score: skillResult.score, weight: WEIGHTS.skills, contribution: Math.round(skillResult.score * WEIGHTS.skills) },
            { section: 'Experience', score: expResult.score, weight: WEIGHTS.experience, contribution: Math.round(expResult.score * WEIGHTS.experience) },
            { section: 'Education', score: eduResult.score, weight: WEIGHTS.education, contribution: Math.round(eduResult.score * WEIGHTS.education) },
            { section: 'Projects', score: projResult.score, weight: WEIGHTS.projects, contribution: Math.round(projResult.score * WEIGHTS.projects) }
        ];

        return {
            overallScore,
            strength,
            breakdown: {
                skills: skillResult,
                experience: expResult,
                education: eduResult,
                projects: projResult
            },
            sectionInfluence,
            explanation,
            matchedSkills: skillResult.matched,
            missingSkills: skillResult.missing,
            resumeData
        };
    }

    /**
     * Generate human-readable explanation for the score
     */
    function generateExplanation(score, skills, exp, edu, proj, resumeData, jd) {
        const reasons = [];

        if (skills.score >= 80) reasons.push(`Strong skill alignment with ${skills.matched.length} matching skills identified.`);
        else if (skills.score >= 50) reasons.push(`Moderate skill match — ${skills.matched.length} skills match, ${skills.missing.length} required skills are missing.`);
        else reasons.push(`Low skill match — only ${skills.matched.length} of ${skills.matched.length + skills.missing.length} required skills found.`);

        if (exp.score >= 75) reasons.push(`Experience level meets or exceeds requirements.`);
        else if (exp.score >= 50) reasons.push(`Experience is close to requirements but may have gaps.`);
        else reasons.push(`Experience appears below the expected level for this role.`);

        if (edu.score >= 75) reasons.push(`Education background aligns with job requirements.`);
        else reasons.push(`Education credentials could not be fully verified against requirements.`);

        if (proj.score >= 60) reasons.push(`Project portfolio demonstrates relevant practical experience.`);
        else reasons.push(`Project section is limited — consider adding relevant project details.`);

        if (score >= 75) {
            reasons.unshift(`This candidate is a strong match for the position.`);
        } else if (score >= 50) {
            reasons.unshift(`This candidate shows potential but has some gaps to address.`);
        } else {
            reasons.unshift(`This candidate may need significant development for this specific role.`);
        }

        return reasons;
    }

    /**
     * Rank multiple candidates
     */
    function rankCandidates(analyses) {
        return [...analyses].sort((a, b) => b.overallScore - a.overallScore)
            .map((analysis, idx) => ({ ...analysis, rank: idx + 1 }));
    }

    return { parseJobDescription, analyzeResume, rankCandidates };
})();
