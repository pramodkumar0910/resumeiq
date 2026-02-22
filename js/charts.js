/* ============================================================
   ResumeIQ — Charts Module
   Renders score circles, bars, strength meters, and skill tags.
   ============================================================ */

const Charts = (() => {

    function createScoreCircle(score, size = 72) {
        const r = (size - 10) / 2;
        const c = Math.PI * 2 * r;
        const offset = c - (score / 100) * c;
        const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

        return `
      <div class="score-circle" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}">
          <circle class="score-circle-bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
          <circle class="score-circle-fill" cx="${size / 2}" cy="${size / 2}" r="${r}"
            stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${c}"
            data-target-offset="${offset}"/>
        </svg>
        <div class="score-circle-text">${score}<small>%</small></div>
      </div>`;
    }

    function createBigScoreCircle(score) {
        const size = 160, r = 68, c = Math.PI * 2 * r;
        const offset = c - (score / 100) * c;
        const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

        return `
      <div class="big-score-circle">
        <svg width="${size}" height="${size}">
          <circle class="score-circle-bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
          <circle class="score-circle-fill" cx="${size / 2}" cy="${size / 2}" r="${r}"
            stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${c}"
            data-target-offset="${offset}"/>
        </svg>
        <div class="big-score-text">
          <div class="score-num">${score}</div>
          <div class="score-label">Match Score</div>
        </div>
      </div>`;
    }

    function createStrengthBadge(strength) {
        const cls = strength === 'Strong' ? 'strength-strong' :
            strength === 'Moderate' ? 'strength-moderate' : 'strength-weak';
        return `<span class="strength-badge ${cls}">${strength}</span>`;
    }

    function createStrengthMeter(score) {
        const grad = score >= 75 ? 'var(--grad-strong)' :
            score >= 50 ? 'var(--grad-moderate)' : 'var(--grad-weak)';
        const label = score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : 'Weak';
        const color = score >= 75 ? 'var(--green-500)' :
            score >= 50 ? 'var(--amber-500)' : 'var(--red-500)';
        return `
      <div class="strength-meter">
        <div class="strength-meter-fill" style="width:0%;background:${grad}" data-target-width="${score}%"></div>
      </div>
      <div class="strength-meter-label" style="color:${color}">${label} Match</div>`;
    }

    function createSkillTags(matched, missing) {
        let html = '<div class="skill-tags">';
        matched.forEach(s => { html += `<span class="skill-tag matched">✓ ${s}</span>`; });
        missing.forEach(s => { html += `<span class="skill-tag missing">✗ ${s}</span>`; });
        html += '</div>';
        return html;
    }

    function createExplanationPanel(sectionInfluence) {
        let html = '<div class="score-explanation">';
        html += '<div class="card-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>Explainable AI Scoring</div>';
        for (const si of sectionInfluence) {
            html += `<div class="explanation-row">
        <span class="explanation-label">${si.section} (${Math.round(si.weight * 100)}%)</span>
        <div class="explanation-bar-wrap"><div class="explanation-bar" style="width:0%" data-target-width="${si.score}%"></div></div>
        <span class="explanation-value">${si.score}%</span>
      </div>`;
        }
        html += '</div>';
        return html;
    }

    function animateElements(container) {
        setTimeout(() => {
            container.querySelectorAll('.score-circle-fill').forEach(el => {
                const target = el.getAttribute('data-target-offset');
                if (target) el.style.strokeDashoffset = target;
            });
            container.querySelectorAll('[data-target-width]').forEach(el => {
                el.style.width = el.getAttribute('data-target-width');
            });
        }, 100);
    }

    return {
        createScoreCircle, createBigScoreCircle, createStrengthBadge,
        createStrengthMeter, createSkillTags, createExplanationPanel, animateElements
    };
})();
