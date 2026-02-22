/* ============================================================
   ResumeIQ — Authenticity Detection Module
   Detects generic language, inconsistencies, and exaggeration.
   ============================================================ */

const AuthenticityChecker = (() => {

    // Generic / AI-style buzzword phrases
    const GENERIC_PHRASES = [
        'results-oriented', 'results-driven', 'highly motivated', 'self-starter',
        'team player', 'go-getter', 'detail-oriented', 'strong communicator',
        'proven track record', 'dynamic professional', 'strategic thinker',
        'passionate about', 'leveraged expertise', 'synergized efforts',
        'spearheaded initiatives', 'drove innovation', 'transformative leader',
        'hardworking', 'dedicated professional', 'thought leader',
        'committed to excellence', 'seasoned professional', 'best-in-class',
        'cutting-edge', 'paradigm shift', 'value-added', 'world-class',
        'fast-paced environment', 'outside the box', 'move the needle',
        'proactive approach', 'excellent interpersonal skills',
        'strong work ethic', 'quick learner', 'able to multitask',
        'take ownership', 'self-motivated individual', 'innovative thinker'
    ];

    // Patterns suggesting AI-generated text
    const AI_PATTERNS = [
        /utilized? (?:a )?(?:comprehensive|holistic|multifaceted) approach/i,
        /(?:demonstrated|showcased) (?:exceptional|outstanding|exemplary) (?:proficiency|expertise|skills)/i,
        /adept at (?:navigating|managing|handling) (?:complex|diverse|dynamic)/i,
        /instrumental in (?:driving|facilitating|orchestrating)/i,
        /possess(?:es|ing)? a (?:keen|deep|thorough) understanding/i,
        /committed to (?:delivering|ensuring|maintaining) (?:high-quality|exceptional|superior)/i,
        /(?:proficient|skilled|experienced) in (?:all aspects of|a wide range of|multiple)/i,
        /a (?:highly|deeply) (?:skilled|experienced|qualified) professional/i
    ];

    // Expert-level skill keywords
    const ADVANCED_SKILL_INDICATORS = [
        'expert', 'advanced', 'proficient', 'mastery', 'specialist',
        'architect', 'lead', 'senior', 'principal', 'staff'
    ];

    /**
     * Detect generic/buzzword language
     */
    function detectGenericLanguage(text) {
        const lowerText = text.toLowerCase();
        const found = [];

        for (const phrase of GENERIC_PHRASES) {
            if (lowerText.includes(phrase.toLowerCase())) {
                found.push(phrase);
            }
        }

        return {
            count: found.length,
            phrases: found,
            severity: found.length >= 5 ? 'high' : found.length >= 2 ? 'medium' : 'low'
        };
    }

    /**
     * Detect AI-style writing patterns
     */
    function detectAIPatterns(text) {
        const found = [];
        for (const pattern of AI_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                found.push(match[0]);
            }
        }
        return {
            count: found.length,
            patterns: found,
            severity: found.length >= 3 ? 'high' : found.length >= 1 ? 'medium' : 'low'
        };
    }

    /**
     * Check skill-experience consistency
     * Flags skills that are listed but not mentioned in experience/projects
     */
    function checkSkillConsistency(resumeData) {
        const { skills, projects, experience, rawText } = resumeData;
        const experienceText = experience.map(e => e.context).join(' ').toLowerCase();
        const projectText = projects.join(' ').toLowerCase();
        const contextText = experienceText + ' ' + projectText;

        const supported = [];
        const unsupported = [];

        for (const skill of skills) {
            // Check if the skill appears in experience or project context (not just skills section)
            if (contextText.includes(skill.toLowerCase())) {
                supported.push(skill);
            } else {
                unsupported.push(skill);
            }
        }

        return {
            supported,
            unsupported,
            consistencyRatio: skills.length > 0 ? Math.round((supported.length / skills.length) * 100) : 100,
            flag: unsupported.length > skills.length * 0.5
        };
    }

    /**
     * Detect potential exaggeration
     * Flags when many advanced skills are claimed with short experience
     */
    function detectExaggeration(resumeData) {
        const { skills, yearsOfExperience, rawText } = resumeData;
        const lowerText = rawText.toLowerCase();
        const alerts = [];

        // Count advanced skill claims
        let advancedClaims = 0;
        for (const indicator of ADVANCED_SKILL_INDICATORS) {
            const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) advancedClaims += matches.length;
        }

        // Flag: many skills, short experience
        if (skills.length > 15 && yearsOfExperience < 3) {
            alerts.push({
                type: 'warn',
                message: `${skills.length} skills listed with only ${yearsOfExperience} years of experience — may require verification`
            });
        }

        // Flag: advanced claims with limited experience
        if (advancedClaims >= 3 && yearsOfExperience < 5) {
            alerts.push({
                type: 'warn',
                message: `Multiple expert/advanced skill claims with ${yearsOfExperience} years of experience`
            });
        }

        // Flag: too many skills overall
        if (skills.length > 25) {
            alerts.push({
                type: 'info',
                message: `Resume lists ${skills.length} skills — breadth may indicate less depth in individual areas`
            });
        }

        return { advancedClaims, alerts };
    }

    /**
     * Check if experience descriptions are too generic (lack specific metrics/numbers)
     */
    function checkExperienceSpecificity(resumeData) {
        const { experience, rawText } = resumeData;
        const lines = rawText.split('\n');

        // Look for quantifiable achievements
        const metricPatterns = /\d+%|\$[\d,]+|\d+\s*(?:users|customers|clients|projects|teams?|employees|revenue|sales|increase|decrease|growth|reduction|improvement|savings)/i;
        const hasMetrics = metricPatterns.test(rawText);

        // Check for specific action verbs with context
        const specificVerbs = /(?:built|designed|implemented|developed|created|deployed|migrated|optimized|reduced|increased|managed|led|architected|launched|automated)\s+\w+/gi;
        const specificCount = (rawText.match(specificVerbs) || []).length;

        const isGeneric = !hasMetrics && specificCount < 3;

        return {
            hasMetrics,
            specificActionCount: specificCount,
            isGeneric,
            suggestion: isGeneric ? 'Experience descriptions lack specific metrics or measurable achievements' : null
        };
    }

    /**
     * Full authenticity analysis
     */
    function analyzeAuthenticity(resumeData) {
        const genericLang = detectGenericLanguage(resumeData.rawText);
        const aiPatterns = detectAIPatterns(resumeData.rawText);
        const consistency = checkSkillConsistency(resumeData);
        const exaggeration = detectExaggeration(resumeData);
        const specificity = checkExperienceSpecificity(resumeData);

        // Compile all alerts
        const alerts = [];

        if (consistency.unsupported.length > 0) {
            alerts.push({
                type: 'warn',
                message: `Skills listed but no project/experience evidence found: ${consistency.unsupported.slice(0, 5).join(', ')}${consistency.unsupported.length > 5 ? ` (+${consistency.unsupported.length - 5} more)` : ''}`
            });
        }

        if (specificity.isGeneric) {
            alerts.push({
                type: 'warn',
                message: 'Experience descriptions too generic — lacks quantifiable achievements or specific metrics'
            });
        }

        if (genericLang.severity !== 'low') {
            alerts.push({
                type: 'info',
                message: `Resume contains ${genericLang.count} generic/buzzword phrases that may reduce impact (e.g., "${genericLang.phrases[0]}")`
            });
        }

        if (aiPatterns.severity !== 'low') {
            alerts.push({
                type: 'warn',
                message: 'Resume contains language patterns commonly associated with AI-generated content'
            });
        }

        for (const alert of exaggeration.alerts) {
            alerts.push(alert);
        }

        // Overall risk level
        const highSeverityCount = [genericLang, aiPatterns].filter(r => r.severity === 'high').length + exaggeration.alerts.filter(a => a.type === 'warn').length;

        let riskLevel;
        if (highSeverityCount >= 2 || (consistency.flag && specificity.isGeneric)) {
            riskLevel = 'high';
            alerts.push({
                type: 'info',
                message: 'Resume may require verification in interview stage'
            });
        } else if (highSeverityCount >= 1 || consistency.flag) {
            riskLevel = 'medium';
        } else {
            riskLevel = 'low';
        }

        return {
            riskLevel,
            alerts,
            genericLanguage: genericLang,
            aiPatterns,
            consistency,
            exaggeration,
            specificity
        };
    }

    return { analyzeAuthenticity };
})();
