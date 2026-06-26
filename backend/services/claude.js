const Anthropic = require('@anthropic-ai/sdk');
const { HttpsProxyAgent } = require('https-proxy-agent');

// 只有填了真实的 API key 才走真 AI（排除占位符）
const rawKey = process.env.ANTHROPIC_API_KEY || '';
const USE_CLAUDE = rawKey.startsWith('sk-ant-') && rawKey.length > 40;

function createClient() {
  if (!USE_CLAUDE) return null;

  const opts = { apiKey: rawKey };

  // 配置代理（国内访问 Anthropic API 需要）
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    console.log('🔗 使用代理:', proxyUrl);
    opts.httpAgent = new HttpsProxyAgent(proxyUrl);
  }

  return new Anthropic(opts);
}

const anthropic = createClient();

/**
 * Demo 模式 — 生成模拟的改写简历
 */
function generateDemo(resumeText, jobDescription, preview) {
  // 从 JD 中提取几个关键词做效果展示
  const jdKeywords = (jobDescription.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g) || [])
    .filter(w => w.length > 3 && !['This', 'That', 'With', 'From', 'Your', 'About', 'What', 'They'].includes(w))
    .slice(0, 5);

  // 从简历中提取姓名（简单匹配）
  const nameMatch = resumeText.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/m);
  const name = nameMatch ? nameMatch[1] : '[Your Name]';

  const skills = jdKeywords.length
    ? jdKeywords.join(', ')
    : 'relevant technical skills';

  const header = `# ${name}

**📍 Location** | **📧 email@example.com** | **🔗 linkedin.com/in/profile**

---

## Professional Summary

Results-driven professional with proven expertise in **${skills}**. Demonstrated track record of delivering high-impact solutions in fast-paced environments. Experienced in collaborating with cross-functional teams to drive business objectives and exceed performance targets.

---

## Skills

| Category | Technologies |
|----------|-------------|
| **Core** | ${skills} |
| **Tools** | Git, JIRA, VS Code, CI/CD |
| **Languages** | JavaScript / TypeScript, Python, SQL |
| **Soft Skills** | Team Leadership, Cross-functional Collaboration, Agile/Scrum |
`;

  if (preview) {
    return header + `\n\n---\n\n*[Preview — pay to unlock full resume with detailed work experience, education, and projects tailored to your job description]*`;
  }

  return (
    header +
    `
## Work Experience

### Senior Developer — Tech Company Inc.
*2022 — Present*

- Spearheaded development of scalable microservices using **${skills}**, improving system throughput by 40%
- Led a team of 5 engineers to deliver 12+ features on time, practicing Agile/Scrum methodology
- Collaborated with product and design teams to translate business requirements into technical solutions
- Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes

### Developer — StartupXYZ
*2020 — 2022*

- Built and maintained RESTful APIs serving 100K+ daily requests with 99.9% uptime
- Optimized database queries resulting in 60% faster page load times
- Mentored 3 junior developers through code reviews and pair programming sessions

---

## Education

**Bachelor of Science in Computer Science**
University of Technology — 2016–2020

---

## Certifications

- AWS Solutions Architect Associate
- Professional Scrum Master (PSM I)

---

*Tailored by AI Resume Tailor — purpose-built for this job description*
`
  );
}

/**
 * 用 Claude 将简历按职位描述改写
 * @param {string} resumeText - 原始简历文本
 * @param {string} jobDescription - 职位描述
 * @param {boolean} preview - 是否只返回预览（前 30%）
 */
async function tailorResume(resumeText, jobDescription, preview = false) {
  // Demo 模式：没配置 API key 时返回演示内容
  if (!USE_CLAUDE) {
    console.log('⚠️  Demo 模式 — 未配置 ANTHROPIC_API_KEY，返回模拟结果');
    return generateDemo(resumeText, jobDescription, preview);
  }

  const systemPrompt = `You are a professional resume writer and ATS (Applicant Tracking System) optimization expert.

Your task: Rewrite the candidate's resume to match the job description, making it ATS-friendly while keeping ALL claims truthful.

Rules:
1. NEVER invent skills, experiences, or achievements not in the original resume
2. Use keywords from the job description naturally - don't keyword-stuff
3. Match the job's tone and level (junior/senior/executive)
4. Quantify achievements where the original resume provides numbers
5. Keep the same person's name and contact info
6. Format in clean Markdown for easy reading
7. Each bullet point should start with a strong action verb
8. Keep it concise - hiring managers scan in 6 seconds`;

  const userMessage = preview
    ? `Here is my resume and a job description. Please rewrite the FIRST 30% of the resume only (header, summary, and first section) to match the job. This is a preview.

=== MY RESUME ===
${resumeText}

=== JOB DESCRIPTION ===
${jobDescription}

Return ONLY the rewritten first 30% of the resume, with a note at the bottom: "[Preview - pay to unlock full resume]"`
    : `Here is my resume and a job description. Please rewrite the ENTIRE resume to match the job.

=== MY RESUME ===
${resumeText}

=== JOB DESCRIPTION ===
${jobDescription}

Return the complete rewritten resume in clean Markdown format.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content[0].text;
}

module.exports = { tailorResume };
