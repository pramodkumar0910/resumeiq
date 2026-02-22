/* ============================================================
   ResumeIQ — Export Module
   CSV shortlist for recruiters, checklist for candidates.
   ============================================================ */

const ExportUtils = (() => {

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function generateCSVShortlist(rankedResults) {
        const headers = ['Rank', 'Name', 'File', 'Score (%)', 'Strength', 'Matched Skills', 'Missing Skills', 'Authenticity Risk', 'Alerts'];
        const rows = rankedResults.map(r => [
            r.rank,
            `"${r.resumeData.name}"`,
            `"${r.resumeData.fileName}"`,
            r.overallScore,
            r.strength,
            `"${r.matchedSkills.join('; ')}"`,
            `"${r.missingSkills.join('; ')}"`,
            r.authenticity ? r.authenticity.riskLevel : 'N/A',
            r.authenticity ? `"${r.authenticity.alerts.map(a => a.message).join('; ')}"` : ''
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        downloadFile(csv, 'ResumeIQ_Shortlist.csv', 'text/csv');
    }

    function generateChecklist(analysis, suggestions, authenticity) {
        const lines = [
            '# ResumeIQ — Improvement Checklist',
            `# Generated: ${new Date().toLocaleDateString()}`,
            `# Overall Score: ${analysis.overallScore}% (${analysis.strength})`,
            ''
        ];
        for (const s of suggestions.suggestions) {
            lines.push(`## ${s.icon} ${s.title} [Priority: ${s.priority}]`);
            s.items.forEach(item => lines.push(`  [ ] ${item.replace(/\*\*/g, '')}`));
            lines.push('');
        }
        if (suggestions.careerReadiness) {
            lines.push(`## Career Readiness: ${suggestions.careerReadiness.readinessLevel}`);
            suggestions.careerReadiness.items.forEach(item => lines.push(`  - ${item}`));
        }
        downloadFile(lines.join('\n'), 'ResumeIQ_Checklist.md', 'text/markdown');
    }

    return { generateCSVShortlist, generateChecklist };
})();
