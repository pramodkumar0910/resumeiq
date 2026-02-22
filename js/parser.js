/* ============================================================
   ResumeIQ — Resume Parser Module
   Extracts text from PDF/TXT files and parses structured data.
   ============================================================ */

const ResumeParser = (() => {

  // ── Skill Dictionary (categorized) ──
  const SKILL_DICTIONARY = {
    programming: ['javascript','typescript','python','java','c++','c#','ruby','go','golang','rust','swift','kotlin','php','scala','r','perl','matlab','dart','lua','haskell','elixir','clojure','objective-c','shell','bash','powershell','sql','nosql','graphql','html','css','sass','less'],
    frameworks: ['react','angular','vue','vue.js','svelte','next.js','nextjs','nuxt','nuxt.js','express','express.js','django','flask','fastapi','spring','spring boot','rails','ruby on rails','laravel','.net','asp.net','flutter','react native','electron','gatsby','remix','nest.js','nestjs','fastify','hapi','koa'],
    data: ['machine learning','deep learning','natural language processing','nlp','computer vision','tensorflow','pytorch','keras','scikit-learn','pandas','numpy','scipy','matplotlib','tableau','power bi','hadoop','spark','apache spark','kafka','apache kafka','airflow','databricks','snowflake','redshift','bigquery','data mining','data analysis','data engineering','data science','statistics','etl','data visualization','data modeling'],
    cloud: ['aws','amazon web services','azure','microsoft azure','gcp','google cloud','cloud computing','ec2','s3','lambda','cloudformation','terraform','ansible','kubernetes','k8s','docker','containerization','microservices','serverless','heroku','digitalocean','vercel','netlify','ci/cd','jenkins','github actions','gitlab ci','circleci','devops','infrastructure as code'],
    databases: ['mysql','postgresql','postgres','mongodb','redis','elasticsearch','cassandra','dynamodb','firebase','supabase','oracle','sql server','mariadb','couchdb','neo4j','influxdb','sqlite','memcached'],
    tools: ['git','github','gitlab','bitbucket','jira','confluence','slack','figma','sketch','adobe xd','photoshop','illustrator','postman','swagger','webpack','vite','babel','npm','yarn','pnpm','linux','unix','agile','scrum','kanban','tdd','bdd','rest','restful','api','soap','grpc','websocket'],
    security: ['cybersecurity','penetration testing','ethical hacking','owasp','encryption','ssl','tls','sso','oauth','jwt','firewalls','ids','ips','siem','vulnerability assessment','security auditing','compliance','gdpr','hipaa','soc2'],
    soft_skills: ['leadership','communication','teamwork','problem solving','critical thinking','project management','time management','adaptability','creativity','mentoring','public speaking','negotiation','strategic planning','stakeholder management','cross-functional collaboration'],
    business: ['product management','business analysis','requirements gathering','user research','ux design','ui design','wireframing','prototyping','a/b testing','seo','sem','digital marketing','content marketing','social media marketing','google analytics','salesforce','crm','erp','excel','financial modeling','business intelligence','market research']
  };

  const ALL_SKILLS = [];
  for (const cat of Object.values(SKILL_DICTIONARY)) {
    for (const skill of cat) {
      ALL_SKILLS.push(skill);
    }
  }

  // ── Education Patterns ──
  const DEGREE_PATTERNS = [
    /\b(ph\.?d|doctor of philosophy)\b/i,
    /\b(m\.?s\.?|master of science|master'?s?\s+(?:of|in)\s+\w+)\b/i,
    /\b(m\.?b\.?a\.?|master of business administration)\b/i,
    /\b(b\.?s\.?|b\.?a\.?|bachelor(?:'?s)?(?:\s+(?:of|in)\s+\w+)?)\b/i,
    /\b(b\.?tech|b\.?e\.?|bachelor of (?:technology|engineering))\b/i,
    /\b(m\.?tech|m\.?e\.?|master of (?:technology|engineering))\b/i,
    /\b(associate'?s?\s+degree)\b/i,
    /\b(diploma|certificate|certification)\b/i,
    /\b(computer science|information technology|software engineering|electrical engineering|data science|mathematics|statistics|physics|business administration|economics|finance|marketing|mechanical engineering|civil engineering|chemical engineering)\b/i
  ];

  // ── Experience Date Patterns ──
  const DATE_RANGE_PATTERN = /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}|20\d{2}|19\d{2})\s*[-–—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}|20\d{2}|19\d{2}|present|current)/gi;

  // ── Section Headers ──
  const SECTION_PATTERNS = {
    skills: /(?:^|\n)\s*(?:skills|technical skills|core competencies|technologies|tech stack|expertise|proficiencies)[:\s]*(?:\n|$)/i,
    experience: /(?:^|\n)\s*(?:experience|work experience|professional experience|employment|work history|career history)[:\s]*(?:\n|$)/i,
    education: /(?:^|\n)\s*(?:education|academic|qualifications|academic background)[:\s]*(?:\n|$)/i,
    projects: /(?:^|\n)\s*(?:projects|personal projects|key projects|notable projects|portfolio)[:\s]*(?:\n|$)/i,
    certifications: /(?:^|\n)\s*(?:certifications?|certificates?|licenses?|credentials)[:\s]*(?:\n|$)/i,
    summary: /(?:^|\n)\s*(?:summary|objective|profile|about|professional summary|career objective)[:\s]*(?:\n|$)/i
  };

  /**
   * Extract text from a PDF file using pdf.js
   */
  async function extractPDFText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(' ') + '\n';
    }
    return fullText;
  }

  /**
   * Extract text from a TXT file
   */
  function extractTXTText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Extract text from any supported file
   */
  async function extractText(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return await extractPDFText(file);
    } else if (ext === 'txt') {
      return await extractTXTText(file);
    }
    throw new Error(`Unsupported file type: .${ext}`);
  }

  /**
   * Detect candidate name from resume text (first non-empty line heuristic)
   */
  function extractName(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines.slice(0, 5)) {
      // Skip lines that look like section headers or contain emails/phones
      if (/^(summary|objective|profile|experience|education|skills|resume|curriculum)/i.test(line)) continue;
      if (/[@]/.test(line) && line.length > 50) continue;
      // A name line is typically short and contains mostly letters
      const cleaned = line.replace(/[^a-zA-Z\s.'-]/g, '').trim();
      if (cleaned.length >= 3 && cleaned.length <= 50 && cleaned.split(/\s+/).length <= 5) {
        // Check it's mostly alphabetic
        const alphaRatio = cleaned.replace(/[^a-zA-Z]/g, '').length / cleaned.length;
        if (alphaRatio > 0.8) return cleaned;
      }
    }
    return 'Unknown Candidate';
  }

  /**
   * Extract skills from text by matching against dictionary
   */
  function extractSkills(text) {
    const lowerText = text.toLowerCase();
    const found = new Set();
    for (const skill of ALL_SKILLS) {
      // Word boundary match
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;|/•\\-])${escaped}(?:[\\s,;|/•\\-]|$)`, 'i');
      if (regex.test(lowerText)) {
        found.add(skill);
      }
    }
    return Array.from(found);
  }

  /**
   * Get skill category for a skill
   */
  function getSkillCategory(skill) {
    for (const [cat, skills] of Object.entries(SKILL_DICTIONARY)) {
      if (skills.includes(skill.toLowerCase())) return cat;
    }
    return 'other';
  }

  /**
   * Extract education info
   */
  function extractEducation(text) {
    const items = [];
    for (const pattern of DEGREE_PATTERNS) {
      const matches = text.match(new RegExp(pattern, 'gi'));
      if (matches) {
        for (const match of matches) {
          const cleaned = match.trim();
          if (cleaned.length > 2 && !items.some(i => i.toLowerCase() === cleaned.toLowerCase())) {
            items.push(cleaned);
          }
        }
      }
    }
    return items;
  }

  /**
   * Extract experience entries
   */
  function extractExperience(text) {
    const dateRanges = text.match(DATE_RANGE_PATTERN) || [];
    const lines = text.split('\n');
    const entries = [];

    for (const dr of dateRanges) {
      // Find the line containing this date range
      const idx = lines.findIndex(l => l.includes(dr.trim().split(/\s+/)[0]));
      if (idx >= 0) {
        // Look around for context
        const contextLines = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3));
        entries.push({
          dateRange: dr.trim(),
          context: contextLines.map(l => l.trim()).filter(l => l).join(' | ')
        });
      } else {
        entries.push({ dateRange: dr.trim(), context: '' });
      }
    }

    return entries;
  }

  /**
   * Calculate approximate years of experience
   */
  function estimateYearsOfExperience(text) {
    const matches = text.match(DATE_RANGE_PATTERN) || [];
    let totalMonths = 0;
    const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

    for (const match of matches) {
      const parts = match.split(/[-–—]|to/i).map(p => p.trim());
      if (parts.length < 2) continue;

      let startYear, endYear;
      const startMatch = parts[0].match(/(\d{4})/);
      const endMatch = parts[1].match(/(\d{4})/);

      if (startMatch) startYear = parseInt(startMatch[1]);
      if (endMatch) endYear = parseInt(endMatch[1]);
      if (/present|current/i.test(parts[1])) endYear = new Date().getFullYear();

      if (startYear && endYear && endYear >= startYear) {
        totalMonths += (endYear - startYear) * 12;
        // Adjust for months if available
        const startMonthMatch = parts[0].match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        const endMonthMatch = parts[1].match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        if (startMonthMatch && endMonthMatch) {
          totalMonths += monthMap[endMonthMatch[1].toLowerCase().slice(0, 3)] - monthMap[startMonthMatch[1].toLowerCase().slice(0, 3)];
        }
      }
    }

    return Math.round(totalMonths / 12 * 10) / 10;
  }

  /**
   * Check which sections exist in the resume
   */
  function detectSections(text) {
    const found = {};
    for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
      found[section] = pattern.test(text);
    }
    return found;
  }

  /**
   * Extract projects section content
   */
  function extractProjects(text) {
    const projectMatch = text.match(/(?:projects?|portfolio)[:\s]*\n([\s\S]*?)(?=\n\s*(?:education|experience|skills|certifications?|references|$))/i);
    if (!projectMatch) return [];

    const lines = projectMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 5);
    return lines.slice(0, 10);
  }

  /**
   * Full parse pipeline
   */
  async function parseResume(file) {
    const rawText = await extractText(file);
    const name = extractName(rawText);
    const skills = extractSkills(rawText);
    const education = extractEducation(rawText);
    const experience = extractExperience(rawText);
    const yearsExp = estimateYearsOfExperience(rawText);
    const sections = detectSections(rawText);
    const projects = extractProjects(rawText);

    // Categorize skills
    const categorizedSkills = {};
    for (const skill of skills) {
      const cat = getSkillCategory(skill);
      if (!categorizedSkills[cat]) categorizedSkills[cat] = [];
      categorizedSkills[cat].push(skill);
    }

    return {
      fileName: file.name,
      rawText,
      name,
      skills,
      categorizedSkills,
      education,
      experience,
      yearsOfExperience: yearsExp,
      sections,
      projects
    };
  }

  return { parseResume, extractSkills, extractText, ALL_SKILLS, SKILL_DICTIONARY, getSkillCategory };
})();
