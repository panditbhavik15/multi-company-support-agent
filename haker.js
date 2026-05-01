/* ============================================
   TriageIQ — App Controller
   ============================================ */

const SAMPLES = [
    {
        company: 'HackerRank',
        subject: 'Cannot access coding test',
        issue: 'I received an invitation link for a HackerRank coding assessment from my potential employer, but when I click the link it says "Test expired." The deadline was supposed to be tomorrow. I need to take this test urgently for my job application.',
        context: 'HackerRank test invitations include an expiration date set by the employer. If a candidate sees "Test expired," they should contact the employer or recruiter directly to request a new invitation link. HackerRank support cannot extend or reissue test invitations on behalf of employers. Candidates can verify their test status by logging into their HackerRank account and checking the "Tests" section.'
    },
    {
        company: 'Claude',
        subject: 'API rate limit errors',
        issue: 'I\'m getting 429 rate limit errors on the Claude API when making batch requests. I\'m on the Scale plan and making about 50 requests per minute. My application processes customer feedback and this is blocking our production pipeline.',
        context: 'Claude API rate limits vary by plan tier. Scale plan users have higher rate limits but may still encounter 429 errors during peak usage. Recommended mitigations: implement exponential backoff with jitter, use request batching via the Messages Batches API for non-time-sensitive workloads, and monitor usage via the Anthropic Console. If limits are consistently insufficient, users can request a rate limit increase through the Anthropic Console under Settings > Limits.'
    },
    {
        company: 'Visa',
        subject: 'Unauthorized charge on my card',
        issue: 'I noticed a charge of $487.32 on my Visa card statement from a merchant I don\'t recognize called "DIGI*MARKETPLACE." I did not authorize this transaction and I\'m worried my card has been compromised. Please help me dispute this charge immediately.',
        context: 'If a cardholder identifies an unauthorized transaction, they should immediately contact their card-issuing bank to report the charge and request a temporary card block. Visa\'s Zero Liability Policy protects cardholders from unauthorized transactions. The issuing bank will initiate a dispute process through Visa\'s chargeback system. Cardholders should also review recent transactions for other suspicious activity.'
    }
];

// DOM refs
const form = document.getElementById('ticket-form');
const companySelect = document.getElementById('company-select');
const subjectInput = document.getElementById('subject-input');
const issueInput = document.getElementById('issue-input');
const contextInput = document.getElementById('context-input');
const btnTriage = document.getElementById('btn-triage');
const btnSample = document.getElementById('btn-load-sample');
const btnReset = document.getElementById('btn-reset');
const emptyState = document.getElementById('empty-state');
const processingState = document.getElementById('processing-state');
const resultState = document.getElementById('result-state');
const processingSteps = document.getElementById('processing-steps');
const processingText = document.getElementById('processing-text');
const statusBadge = document.getElementById('status-badge');
const resultSummary = document.getElementById('result-summary');
const resultResponseText = document.getElementById('result-response-text');
const resultJustificationText = document.getElementById('result-justification-text');
const resultJson = document.getElementById('result-json');

let sampleIndex = 0;

// Load sample
btnSample.addEventListener('click', () => {
    const s = SAMPLES[sampleIndex % SAMPLES.length];
    companySelect.value = s.company;
    subjectInput.value = s.subject;
    issueInput.value = s.issue;
    contextInput.value = s.context;
    sampleIndex++;
    // Animate fields
    [companySelect, subjectInput, issueInput, contextInput].forEach((el, i) => {
        el.style.transition = 'none';
        el.style.boxShadow = '0 0 0 2px rgba(129,140,248,0.3)';
        setTimeout(() => {
            el.style.transition = 'box-shadow 0.6s ease';
            el.style.boxShadow = 'none';
        }, 100 + i * 80);
    });
});

// Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const issue = issueInput.value.trim();
    const subject = subjectInput.value.trim();
    const company = companySelect.value || 'None';
    const context = contextInput.value.trim();
    if (!issue) return;

    showProcessing();

    const steps = [
        'Validating input…',
        'Detecting company…',
        'Classifying product area…',
        'Assessing urgency…',
        'Generating response…'
    ];

    for (let i = 0; i < steps.length; i++) {
        await delay(400 + Math.random() * 300);
        addStep(steps[i], i);
    }

    await delay(500);
    const result = window.triageTicket({ issue, subject, company, context });
    showResult(result);
});

// Reset
btnReset.addEventListener('click', () => {
    form.reset();
    showEmpty();
});

function showEmpty() {
    emptyState.style.display = 'flex';
    processingState.style.display = 'none';
    resultState.style.display = 'none';
    statusBadge.style.display = 'none';
    processingSteps.innerHTML = '';
}

function showProcessing() {
    emptyState.style.display = 'none';
    processingState.style.display = 'flex';
    resultState.style.display = 'none';
    statusBadge.style.display = 'none';
    processingSteps.innerHTML = '';
    processingText.textContent = 'Analyzing ticket…';
}

function addStep(text, index) {
    const div = document.createElement('div');
    div.className = 'step-item done';
    div.style.animationDelay = `${index * 0.08}s`;
    div.innerHTML = `<span class="step-check"></span><span>${text}</span>`;
    processingSteps.appendChild(div);
}

function showResult(result) {
    processingState.style.display = 'none';
    resultState.style.display = 'block';

    // Status badge
    statusBadge.style.display = 'inline-block';
    statusBadge.textContent = result.status.toUpperCase();
    statusBadge.className = `status-badge ${result.status}`;

    // Summary cards
    const isEscalated = result.status === 'escalated';
    resultSummary.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Status</span>
      <span class="summary-value">
        <span class="status-dot ${result.status}"></span>
        ${isEscalated ? 'Escalated to Agent' : 'Auto-Replied'}
      </span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Request Type</span>
      <span class="summary-value">${formatType(result.request_type)}</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Product Area</span>
      <span class="summary-value">${result.product_area}</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Priority</span>
      <span class="summary-value">${isEscalated ? '🔴 High' : '🟢 Normal'}</span>
    </div>
  `;

    // Response + Justification
    resultResponseText.textContent = result.response;
    resultJustificationText.textContent = result.justification;

    // JSON
    resultJson.textContent = JSON.stringify(result, null, 2);
}

function formatType(t) {
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}
