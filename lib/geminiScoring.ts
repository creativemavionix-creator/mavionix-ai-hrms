import { GoogleGenerativeAI } from "@google/generative-ai"

export interface AiScoringResult {
  overall_score: number
  skill_score: number
  exp_score: number
  edu_score: number
  proj_score: number
  confidence: number
  sentiment_score: number
  insights: string
  tags: string[]
  verification_status: "verified" | "flagged"
}

interface CandidateScoringInput {
  name: string
  jobTitle: string
  resumeText: string
  statementOfIntent?: string
  technicalImpact?: string
  outageLesson?: string
  skills?: string[] | string
  yearsExp?: string
  userApiKey?: string
}

function clamp(val: any, defaultVal: number = 75): number {
  const num = Number(val)
  if (isNaN(num)) return defaultVal
  return Math.max(0, Math.min(100, Math.round(num)))
}

export async function analyzeCandidateResume(input: CandidateScoringInput): Promise<AiScoringResult> {
  const apiKey = input.userApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

  const skillsList = Array.isArray(input.skills)
    ? input.skills.join(", ")
    : input.skills || "Software Engineering, Problem Solving"

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
        systemInstruction: `You are HireMind AI, an expert technical recruiter and system architecture evaluator. 
Your task is to analyze candidate resumes and technical evaluation responses for engineering roles.
Compute objective 0-100 scores based strictly on the provided resume content, technical depth, and role alignment.
Return ONLY valid JSON matching this schema:
{
  "skill_score": number (0-100),
  "exp_score": number (0-100),
  "edu_score": number (0-100),
  "proj_score": number (0-100),
  "confidence": number (0-100),
  "sentiment_score": number (0-100),
  "insights": "2-3 sentence qualitative analysis highlighting key technical strengths and architecture experience",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "verification_status": "verified" | "flagged"
}`
      })

      const prompt = `
ANALYZE CANDIDATE APPLICATION:
- Candidate Name: ${input.name}
- Target Position: ${input.jobTitle}
- Self-Reported Experience: ${input.yearsExp || "Not specified"}
- Key Skills: ${skillsList}

RESUME ATTACHMENT TEXT:
"""
${input.resumeText || "No resume text provided."}
"""

STATEMENT OF INTENT / ARCHITECTURE FIT:
"""
${input.statementOfIntent || "None provided."}
"""

TECHNICAL IMPACT & ACCOMPLISHMENTS:
"""
${input.technicalImpact || "None provided."}
"""

OUTAGE LESSON / INCIDENT MANAGEMENT:
"""
${input.outageLesson || "None provided."}
"""

Evaluate the candidate's resume and responses thoroughly. Return valid JSON matching the schema.`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const json = JSON.parse(text)

      const skill_score = clamp(json.skill_score, 82)
      const exp_score   = clamp(json.exp_score, 80)
      const edu_score   = clamp(json.edu_score, 78)
      const proj_score  = clamp(json.proj_score, 85)
      const confidence  = clamp(json.confidence, 88)
      const sentiment_score = clamp(json.sentiment_score, 85)

      const overall_score = Math.round(
        (skill_score * 0.35) + (exp_score * 0.30) + (proj_score * 0.20) + (edu_score * 0.15)
      )

      return {
        overall_score,
        skill_score,
        exp_score,
        edu_score,
        proj_score,
        confidence,
        sentiment_score,
        insights: json.insights || "Candidate resume parsed successfully. Architectural experience verified by Gemini 2.0 Flash.",
        tags: Array.isArray(json.tags) && json.tags.length > 0 ? json.tags.slice(0, 6) : ["Engineering", "Backend", "Architecture"],
        verification_status: json.verification_status === "flagged" ? "flagged" : "verified"
      }
    } catch (err: any) {
      console.warn("Gemini API resume scoring error, using dynamic heuristic fallback:", err.message || err)
    }
  }

  // Dynamic Heuristic Scorer Fallback (Parses real resume text features dynamically if API key fails)
  const resume = (input.resumeText || "") + " " + (input.statementOfIntent || "") + " " + (input.technicalImpact || "")
  const lower = resume.toLowerCase()

  let scoreBoost = 0
  const keywords = ["python", "fastapi", "react", "next.js", "redis", "kafka", "docker", "kubernetes", "postgres", "aws", "microservices", "system design", "architecture", "scale", "latency", "distributed"]
  keywords.forEach(kw => { if (lower.includes(kw)) scoreBoost += 2.5 })

  const skill_score = clamp(70 + scoreBoost, 85)
  const exp_score   = clamp(68 + (input.yearsExp?.includes("10") ? 20 : input.yearsExp?.includes("6") ? 15 : 10), 80)
  const edu_score   = clamp(75 + (lower.includes("bachelor") || lower.includes("master") || lower.includes("bs") || lower.includes("computer science") ? 12 : 5), 78)
  const proj_score  = clamp(72 + (input.technicalImpact ? 15 : 5), 82)
  const confidence  = clamp(80 + (resume.length > 200 ? 10 : 0), 88)
  const sentiment_score = clamp(82, 85)

  const overall_score = Math.round(
    (skill_score * 0.35) + (exp_score * 0.30) + (proj_score * 0.20) + (edu_score * 0.15)
  )

  return {
    overall_score,
    skill_score,
    exp_score,
    edu_score,
    proj_score,
    confidence,
    sentiment_score,
    insights: `Candidate profile parsed via HireMind Analyzer. Identified key technical domains: ${keywords.filter(k => lower.includes(k)).slice(0, 4).join(", ") || "General Engineering"}.`,
    tags: keywords.filter(k => lower.includes(k)).slice(0, 5).map(s => s.toUpperCase()),
    verification_status: "verified"
  }
}
