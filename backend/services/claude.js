const Anthropic = require('@anthropic-ai/sdk');
const { HttpsProxyAgent } = require('https-proxy-agent');

const rawKey = process.env.ANTHROPIC_API_KEY || '';
const USE_CLAUDE = rawKey.startsWith('sk-ant-') && rawKey.length > 40;

function createClient() {
  if (!USE_CLAUDE) return null;
  const opts = { apiKey: rawKey };
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    console.log('🔗 使用代理:', proxyUrl);
    opts.httpAgent = new HttpsProxyAgent(proxyUrl);
  }
  return new Anthropic(opts);
}

const anthropic = createClient();

function generateDemo(resumeText, jobDescription, preview) {
  const jdKeywords = (jobDescription.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g) || [])
    .filter(w => w.length > 3 && !['This','That','With','From','Your','About','What','They'].includes(w))
    .slice(0, 5);
  const nameMatch = resumeText.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/m);
  const name = nameMatch ? nameMatch[1] : '[Your Name]';
  const skills = jdKeywords.length ? jdKeywords.join(', ') : 'relevant technical skills';

  const header = `# ${name}\n\n**📍 Location** | **📧 email@example.com** | **🔗 linkedin.com/in/profile**\n\n---\n\n## Professional Summary\n\nResults-driven professional with proven expertise in **${skills}**. Demonstrated track record of delivering high-impact solutions in fast-paced environments.\n\n---\n\n## Skills\n\n| Category | Technologies |\n|----------|-------------|\n| **Core** | ${skills} |\n| **Tools** | Git, JIRA, VS Code, CI/CD |\n| **Languages** | JavaScript / TypeScript, Python, SQL |`;

  if (preview) {
    return { text: header + `\n\n*[Preview — pay to unlock full resume]*`, usage: null };
  }
  return {
    text: header + `\n\n## Work Experience\n\n### Senior Developer — Tech Company Inc.\n*2022 — Present*\n\n- Spearheaded development using **${skills}**, improving throughput by 40%\n- Led team of 5 engineers, Agile/Scrum\n\n### Developer — StartupXYZ\n*2020 — 2022*\n\n- Built RESTful APIs serving 100K+ daily requests\n- Mentored 3 junior developers\n\n## Education\n\n**BS Computer Science** — University of Technology (2016–2020)\n\n---\n\n*Tailored by AI Resume Tailor*`,
    usage: null,
  };
}

async function tailorResume(resumeText, jobDescription, preview = false) {
  if (!USE_CLAUDE) {
    console.log('⚠️  Demo 模式');
    return generateDemo(resumeText, jobDescription, preview);
  }

  const systemPrompt = `You are an expert resume writer and ATS optimization specialist. Your job: rewrite resumes to match specific job descriptions.

CORE RULES:
1. **Language**: Output in the SAME language as the original resume. If resume is in English → output English. If Chinese → output Chinese. Never mix languages.
2. **Truthfulness**: NEVER add fake skills, experiences, companies, degrees, or numbers. Only rephrase and reorder what exists in the original resume.
3. **ATS Keywords**: Naturally weave keywords from the job description into the rewritten resume. Place the most important ones in the summary and first bullet of each section.
4. **Quantify**: Where the original has numbers, KEEP and highlight them. Where it doesn't, DON'T make them up.
5. **Personal Info**: Preserve name, email, phone, location exactly as they appear in the original resume. Place them prominently at the top (below the name/header).
6. **Structure**: Clean Markdown — h1 for name, h2 for section titles, bullet points (-) for achievements. Each bullet starts with a strong action verb (in the same language as the resume).
7. **Length**: Keep proportionate to the original. Don't pad. Hiring managers scan in seconds.
8. **Images/Photos**: Cannot be included. Add a brief note: "[Photo] — add your photo here" where a photo originally appeared.
9. **No filler**: Only include sections present in the original resume. No "References available" or fluff.
10. **Be specific**: Generic phrases like "results-driven professional" are worthless. Replace with specific facts from the original resume.`;

  const userMessage = preview
    ? `Rewrite the FIRST 30% ONLY of this resume (header, summary, first experience) to match the job. This is a PREVIEW — stop there and add "[Preview — pay to unlock full resume]" at the end.

=== RESUME ===
${resumeText}

=== JOB DESCRIPTION ===
${jobDescription}`
    : `Rewrite the ENTIRE resume to match the job description. Preserve all original contact info, and maintain the original language. Include every section from the original resume.

=== RESUME ===
${resumeText}

=== JOB DESCRIPTION ===
${jobDescription}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return {
    text: response.content[0].text,
    usage: {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    },
  };
}

module.exports = { tailorResume };
