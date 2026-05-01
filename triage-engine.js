/* ============================================
   TriageIQ — Triage Engine (Rule-Based)
   ============================================ */

const ESCALATION_KEYWORDS = [
  'fraud', 'unauthorized', 'stolen', 'hack', 'hacked', 'compromised',
  'legal', 'lawsuit', 'attorney', 'lawyer', 'regulatory', 'compliance',
  'billing dispute', 'charge dispute', 'refund', 'overcharged',
  'cheat', 'cheating', 'plagiarism', 'misconduct', 'integrity violation',
  'account takeover', 'suspicious login', 'someone accessed',
  'data breach', 'privacy', 'gdpr', 'personal data', 'data leak',
  'suspended', 'banned', 'terminated', 'disabled account',
  'threaten', 'sue', 'complaint to regulato'
];

const INVALID_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /pretend\s+to\s+be/i,
  /forget\s+(all\s+)?your\s+(previous\s+)?instructions/i,
  /system\s*prompt/i,
  /disregard\s+(all\s+)?prior/i,
  /^[a-z]{1,3}\s*$/i,
  /^(.)\1{10,}$/,
  /asdf|qwer|zxcv|jkl;/i
];

const COMPANY_KEYWORDS = {
  HackerRank: ['hackerrank', 'hacker rank', 'coding test', 'coding challenge', 'assessment', 'codepair', 'test invite', 'proctoring'],
  Claude: ['claude', 'anthropic', 'api key', 'token limit', 'context window', 'claude pro', 'claude.ai', 'sonnet', 'opus', 'haiku'],
  Visa: ['visa', 'credit card', 'debit card', 'transaction', 'card number', 'cvv', 'merchant', 'cardholder', 'visa direct', 'payment']
};

const PRODUCT_AREA_KEYWORDS = {
  'Billing': ['billing', 'invoice', 'charge', 'payment', 'subscription', 'plan', 'pricing', 'refund', 'cost', 'fee'],
  'Account Access': ['login', 'password', 'sign in', 'locked out', 'reset', 'can\'t access', 'authentication', '2fa', 'mfa', 'email verification'],
  'Assessment': ['test', 'assessment', 'challenge', 'coding test', 'invite', 'score', 'result', 'proctoring', 'codepair', 'candidate'],
  'API': ['api', 'endpoint', 'rate limit', 'token', 'sdk', 'integration', 'webhook', 'rest', 'request'],
  'Card Services': ['card', 'transaction', 'atm', 'purchase', 'decline', 'limit', 'pin', 'chip', 'contactless', 'virtual card'],
  'Fraud': ['fraud', 'unauthorized', 'stolen', 'suspicious', 'scam', 'phishing', 'identity theft'],
  'Technical Issue': ['bug', 'error', 'crash', 'not working', 'broken', 'issue', 'problem', 'glitch', 'slow', 'timeout'],
  'Feature Request': ['feature', 'suggestion', 'would be nice', 'please add', 'wish', 'enhancement', 'improve', 'could you add'],
  'Data & Privacy': ['data', 'privacy', 'gdpr', 'delete my', 'export', 'personal information', 'data request']
};

function detectCompany(issue, subject, company) {
  if (company && company !== 'None') return company;
  const text = `${issue} ${subject}`.toLowerCase();
  let best = null, bestCount = 0;
  for (const [co, kws] of Object.entries(COMPANY_KEYWORDS)) {
    const count = kws.filter(k => text.includes(k)).length;
    if (count > bestCount) { best = co; bestCount = count; }
  }
  return best;
}

function isInvalidInput(issue, subject) {
  const text = `${issue} ${subject}`;
  if (text.trim().length < 8) return true;
  for (const pat of INVALID_PATTERNS) {
    if (pat.test(text)) return true;
  }
  return false;
}

function detectProductArea(issue, subject) {
  const text = `${issue} ${subject}`.toLowerCase();
  let best = 'General', bestCount = 0;
  for (const [area, kws] of Object.entries(PRODUCT_AREA_KEYWORDS)) {
    const count = kws.filter(k => text.includes(k)).length;
    if (count > bestCount) { best = area; bestCount = count; }
  }
  return best;
}

function detectRequestType(issue, subject, productArea) {
  const text = `${issue} ${subject}`.toLowerCase();
  if (productArea === 'Feature Request') return 'feature_request';
  const featureWords = ['feature', 'suggestion', 'please add', 'would be nice', 'enhancement', 'wish list'];
  if (featureWords.some(w => text.includes(w))) return 'feature_request';
  const bugWords = ['bug', 'error', 'crash', 'broken', 'glitch', 'not working', 'fails', '500', '404'];
  if (bugWords.some(w => text.includes(w))) return 'bug';
  return 'product_issue';
}

function shouldEscalate(issue, subject, productArea) {
  const text = `${issue} ${subject}`.toLowerCase();
  if (['Fraud', 'Data & Privacy'].includes(productArea)) return true;
  return ESCALATION_KEYWORDS.some(k => text.includes(k));
}

function generateResponse(status, company, productArea, requestType, context, issue) {
  if (status === 'escalated') {
    return `Thank you for reaching out to ${company || 'our'} support. We understand the urgency of your concern regarding ${productArea.toLowerCase()}. Your case has been flagged as high-priority and routed to a specialized support agent who will review it promptly. You can expect a follow-up within 24 hours.`;
  }
  if (context && context.trim().length > 20) {
    const firstSentences = context.split(/[.!?]/).slice(0, 3).join('. ').trim();
    return `Thank you for contacting ${company || 'our'} support. Based on our documentation: ${firstSentences}. If you need further assistance, please don't hesitate to reply to this message.`;
  }
  return `Thank you for contacting ${company || 'our'} support regarding ${productArea.toLowerCase()}. We've reviewed your request and have forwarded it to the appropriate team. A support specialist will follow up with you shortly.`;
}

function generateJustification(status, company, productArea, requestType, issue, context) {
  const parts = [];
  parts.push(`Company identified as ${company || 'unknown'}.`);
  parts.push(`Product area classified as "${productArea}" based on keyword analysis.`);
  if (status === 'escalated') {
    parts.push('Escalated due to detection of sensitive/high-risk keywords matching escalation policy.');
  } else if (context && context.trim().length > 20) {
    parts.push('Replied using grounded information from the provided support context.');
  } else {
    parts.push('Acknowledged receipt; insufficient context for a detailed grounded answer.');
  }
  return parts.join(' ');
}

function triageTicket({ issue, subject, company, context }) {
  // 1. Invalid check
  if (isInvalidInput(issue, subject)) {
    return {
      status: 'escalated',
      product_area: 'General',
      response: 'Thank you for reaching out. Unfortunately, we were unable to process your request as submitted. If you have a support question, please provide additional details and we will be happy to assist.',
      justification: 'Input detected as invalid — possible prompt injection, gibberish, or insufficient content.',
      request_type: 'invalid'
    };
  }

  // 2. Detect company
  const detectedCompany = detectCompany(issue, subject, company);
  if (!detectedCompany) {
    return {
      status: 'escalated',
      product_area: 'General',
      response: 'Thank you for contacting support. We were unable to determine which product your request relates to. Could you please clarify whether this is regarding HackerRank, Claude, or Visa? This will help us route your ticket to the right team.',
      justification: 'Company could not be inferred from ticket content. Escalated as out-of-scope until clarified.',
      request_type: 'product_issue'
    };
  }

  // 3. Classify
  const productArea = detectProductArea(issue, subject);
  const requestType = detectRequestType(issue, subject, productArea);

  // 4. Escalate check
  const escalate = shouldEscalate(issue, subject, productArea);
  const noContext = !context || context.trim().length < 20;
  const status = (escalate || noContext) ? 'escalated' : 'replied';

  // 5. Build output
  const response = generateResponse(status, detectedCompany, productArea, requestType, context, issue);
  const justification = generateJustification(status, detectedCompany, productArea, requestType, issue, context);

  return { status, product_area: productArea, response, justification, request_type: requestType };
}

// Expose globally
window.triageTicket = triageTicket;
