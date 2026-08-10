export interface Job {
  id: string
  title: string
  department: string
  status: "active" | "onhold" | "draft" | "closed"
  location: string
  postedDate: string
  applicants: number
  priority: "high" | "medium" | "low"
}

export interface Candidate {
  id: string
  name: string
  appliedRole: string
  skillsRaw: number // out of 100
  experienceRaw: number // out of 100
  educationRaw: number // out of 100
  projectsRaw: number // out of 100
  stage: "Applied" | "Screened" | "Interview" | "Offered" | "Hired" | "Rejected"
  appliedDate: string
  avatar: string
  email: string
  phone: string
  confidence: number // base confidence percentage
  flagged: boolean
  verificationStatus: "Verified" | "Pending" | "Unverified"
  tags: string[]
  sentimentScore: number // sentiment analysis index (e.g. 0.85)
  feedbackNotes: string
}

export interface Interview {
  id: string
  candidateId: string
  candidateName: string
  role: string
  interviewer: string
  time: string // datetime ISO
  type: "AI screening" | "technical" | "final"
  status: "Scheduled" | "Completed" | "No-Show" | "Cancelled"
  score?: number // actual interview score out of 100, if completed
}

export interface ActivityLog {
  id: string
  time: string
  candidateName: string
  action: string
  role: string
  type: "info" | "success" | "warning" | "error"
}

export interface Channel {
  id: string
  name: string
  deliveryRate: number
  status: "active" | "standby" | "warning" | "critical"
  sentCount: number
  type: string
}

export interface AIWeights {
  skills: number
  experience: number
  education: number
  projects: number
}

export const initialJobs: Job[] = [
  {
    id: "JOB-001",
    title: "Senior Backend Engineer",
    department: "Engineering",
    status: "active",
    location: "Bangalore",
    postedDate: "2026-07-06",
    applicants: 47,
    priority: "high",
  },
  {
    id: "JOB-002",
    title: "UX Designer",
    department: "Design",
    status: "onhold",
    location: "Remote (India)",
    postedDate: "2026-06-23",
    applicants: 32,
    priority: "medium",
  },
  {
    id: "JOB-003",
    title: "Data Analyst",
    department: "Analytics",
    status: "active",
    location: "Mumbai",
    postedDate: "2026-07-07",
    applicants: 15,
    priority: "high",
  },
  {
    id: "JOB-004",
    title: "DevOps Engineer",
    department: "Infrastructure",
    status: "closed",
    location: "Bangalore",
    postedDate: "2026-04-10",
    applicants: 28,
    priority: "low",
  },
  {
    id: "JOB-005",
    title: "Product Manager",
    department: "Product",
    status: "active",
    location: "Bangalore",
    postedDate: "2026-07-03",
    applicants: 41,
    priority: "medium",
  },
  {
    id: "JOB-006",
    title: "QA Engineer",
    department: "Quality Assurance",
    status: "draft",
    location: "Remote (India)",
    postedDate: "2026-07-08",
    applicants: 0,
    priority: "low",
  },
  {
    id: "JOB-007",
    title: "Frontend Developer",
    department: "Engineering",
    status: "active",
    location: "Remote (India)",
    postedDate: "2026-06-30",
    applicants: 55,
    priority: "high",
  },
  {
    id: "JOB-008",
    title: "ML Engineer",
    department: "AI/ML",
    status: "onhold",
    location: "Bangalore",
    postedDate: "2026-06-16",
    applicants: 38,
    priority: "medium",
  },
]

export const initialCandidates: Candidate[] = [
  {
    id: "CAN-001",
    name: "Priya Sharma",
    appliedRole: "Senior Backend Engineer",
    skillsRaw: 92,
    experienceRaw: 88,
    educationRaw: 85,
    projectsRaw: 90,
    stage: "Interview",
    appliedDate: "2026-07-06",
    avatar: "PS",
    email: "priya.sharma@domain.com",
    phone: "+91 98765 43210",
    confidence: 94,
    flagged: false,
    verificationStatus: "Verified",
    tags: ["Go", "Kubernetes", "gRPC", "Postgres"],
    sentimentScore: 0.89,
    feedbackNotes: "Candidate exhibited highly clear and structured system design thinking. Strongly articulated trade-offs in distributed caching.",
  },
  {
    id: "CAN-002",
    name: "Arjun Mehta",
    appliedRole: "Senior Backend Engineer",
    skillsRaw: 88,
    experienceRaw: 92,
    educationRaw: 60,
    projectsRaw: 85,
    stage: "Offered",
    appliedDate: "2026-07-01",
    avatar: "AM",
    email: "arjun.mehta@techcorp.io",
    phone: "+91 91234 56789",
    confidence: 89,
    flagged: false,
    verificationStatus: "Verified",
    tags: ["Java", "Spring Boot", "Redis", "Kafka"],
    sentimentScore: 0.81,
    feedbackNotes: "Strong technical background in high-throughput backend services. Education is self-taught, but industry experience is outstanding.",
  },
  {
    id: "CAN-003",
    name: "Raj Kumar",
    appliedRole: "UX Designer",
    skillsRaw: 75,
    experienceRaw: 80,
    educationRaw: 80,
    projectsRaw: 82,
    stage: "Screened",
    appliedDate: "2026-06-25",
    avatar: "RK",
    email: "raj.ux@designstudio.in",
    phone: "+91 99887 76655",
    confidence: 78,
    flagged: false,
    verificationStatus: "Pending",
    tags: ["Figma", "UI Design", "User Research", "Wireframing"],
    sentimentScore: 0.76,
    feedbackNotes: "Solid presentation skills and clean UI portfolio. Need to verify exact role in the mobile design case study.",
  },
  {
    id: "CAN-004",
    name: "Aisha Patel",
    appliedRole: "ML Engineer",
    skillsRaw: 95,
    experienceRaw: 82,
    educationRaw: 95,
    projectsRaw: 92,
    stage: "Interview",
    appliedDate: "2026-06-18",
    avatar: "AP",
    email: "aisha.patel@ai-labs.org",
    phone: "+91 94444 33333",
    confidence: 96,
    flagged: false,
    verificationStatus: "Verified",
    tags: ["PyTorch", "Transformers", "NLP", "Python"],
    sentimentScore: 0.94,
    feedbackNotes: "Exceptional command of modern LLM architectures. Demonstrated direct mathematical understanding of self-attention mechanisms.",
  },
  {
    id: "CAN-005",
    name: "Neha Gupta",
    appliedRole: "Data Analyst",
    skillsRaw: 65,
    experienceRaw: 70,
    educationRaw: 75,
    projectsRaw: 60,
    stage: "Applied",
    appliedDate: "2026-07-07",
    avatar: "NG",
    email: "neha.gupta@analytics.co.in",
    phone: "+91 95555 66666",
    confidence: 68,
    flagged: false,
    verificationStatus: "Pending",
    tags: ["SQL", "Tableau", "Excel", "Python"],
    sentimentScore: 0.70,
    feedbackNotes: "Adequate SQL and reporting knowledge. Experiential depth is limited; projects are standard classroom templates.",
  },
  {
    id: "CAN-006",
    name: "Rohan Malhotra",
    appliedRole: "Frontend Developer",
    skillsRaw: 90,
    experienceRaw: 85,
    educationRaw: 70,
    projectsRaw: 88,
    stage: "Interview",
    appliedDate: "2026-07-02",
    avatar: "RM",
    email: "rohan.dev@github.com",
    phone: "+91 96666 77777",
    confidence: 91,
    flagged: false,
    verificationStatus: "Verified",
    tags: ["React", "Next.js", "TypeScript", "TailwindCSS"],
    sentimentScore: 0.88,
    feedbackNotes: "React performance patterns were explained elegantly. Great aesthetic understanding. Code challenges were clean and tested.",
  },
  {
    id: "CAN-007",
    name: "Ananya Sen",
    appliedRole: "Product Manager",
    skillsRaw: 82,
    experienceRaw: 90,
    educationRaw: 90,
    projectsRaw: 80,
    stage: "Screened",
    appliedDate: "2026-07-04",
    avatar: "AS",
    email: "ananya.sen@wharton.edu",
    phone: "+91 97777 88888",
    confidence: 87,
    flagged: false,
    verificationStatus: "Verified",
    tags: ["Agile", "Roadmapping", "A/B Testing", "Mixpanel"],
    sentimentScore: 0.84,
    feedbackNotes: "Strong strategic product sense. Answered metric drop questions with immediate, structured root-cause analysis framework.",
  },
  {
    id: "CAN-008",
    name: "Vikram Rao",
    appliedRole: "Senior Backend Engineer",
    skillsRaw: 40,
    experienceRaw: 95,
    educationRaw: 50,
    projectsRaw: 45,
    stage: "Rejected",
    appliedDate: "2026-07-05",
    avatar: "VR",
    email: "vikram.rao@legacy.com",
    phone: "+91 98888 99999",
    confidence: 52,
    flagged: true,
    verificationStatus: "Unverified",
    tags: ["COBOL", "C++", "Mainframe", "Oracle"],
    sentimentScore: 0.45,
    feedbackNotes: "Flagged: CV claims 10 years distributed systems but failed basic questions about HTTP states and caching. Match score is low for our modern stack.",
  },
]

export const initialInterviews: Interview[] = [
  {
    id: "INT-001",
    candidateId: "CAN-001",
    candidateName: "Priya Sharma",
    role: "Senior Backend Engineer",
    interviewer: "Suresh Pillai (Staff Engineer)",
    time: "2026-07-08T17:30",
    type: "technical",
    status: "Scheduled",
  },
  {
    id: "INT-002",
    candidateId: "CAN-004",
    candidateName: "Aisha Patel",
    role: "ML Engineer",
    interviewer: "Dr. Kavita Murthy (Director of AI)",
    time: "2026-07-08T19:00",
    type: "final",
    status: "Scheduled",
  },
  {
    id: "INT-003",
    candidateId: "CAN-006",
    candidateName: "Rohan Malhotra",
    role: "Frontend Developer",
    interviewer: "HireMind AI Screening Agent",
    time: "2026-07-08T11:00",
    type: "AI screening",
    status: "Completed",
    score: 91,
  },
  {
    id: "INT-004",
    candidateId: "CAN-003",
    candidateName: "Raj Kumar",
    role: "UX Designer",
    interviewer: "Meera Nair (Lead Designer)",
    time: "2026-07-09T14:00",
    type: "technical",
    status: "Scheduled",
  },
  {
    id: "INT-005",
    candidateId: "CAN-005",
    candidateName: "Neha Gupta",
    role: "Data Analyst",
    interviewer: "HireMind AI Screening Agent",
    time: "2026-07-07T10:00",
    type: "AI screening",
    status: "Completed",
    score: 68,
  },
  {
    id: "INT-006",
    candidateId: "CAN-008",
    candidateName: "Vikram Rao",
    role: "Senior Backend Engineer",
    interviewer: "Suresh Pillai (Staff Engineer)",
    time: "2026-07-06T15:00",
    type: "technical",
    status: "No-Show",
  },
]

export const initialChannels: Channel[] = [
  {
    id: "CHN-001",
    name: "Email Candidate Updates",
    deliveryRate: 99.4,
    status: "active",
    sentCount: 1482,
    type: "Email",
  },
  {
    id: "CHN-002",
    name: "Interview Reminders",
    deliveryRate: 98.7,
    status: "active",
    sentCount: 3845,
    type: "SMS & Email",
  },
  {
    id: "CHN-003",
    name: "Offer Letter Notifications",
    deliveryRate: 100.0,
    status: "active",
    sentCount: 184,
    type: "Secure Email + DocuSign",
  },
  {
    id: "CHN-004",
    name: "SMS Notifications",
    deliveryRate: 92.1,
    status: "warning",
    sentCount: 5211,
    type: "SMS Gateway",
  },
  {
    id: "CHN-005",
    name: "Rejection Templates",
    deliveryRate: 99.1,
    status: "standby",
    sentCount: 894,
    type: "Email",
  },
]

export const initialActivityLogs: ActivityLog[] = [
  {
    id: "LOG-001",
    time: "2026-07-08T16:29:12",
    candidateName: "Priya Sharma",
    action: "assigned to Suresh Pillai for system design review in",
    role: "Senior Backend Engineer role",
    type: "info",
  },
  {
    id: "LOG-002",
    time: "2026-07-08T14:12:05",
    candidateName: "Rohan Malhotra",
    action: "completed AI screening interview scoring 90% for",
    role: "Frontend Developer application",
    type: "success",
  },
  {
    id: "LOG-003",
    time: "2026-07-08T11:45:00",
    candidateName: "Vikram Rao",
    action: "flagged as high discrepancy by AI parser in",
    role: "Senior Backend Engineer application",
    type: "error",
  },
  {
    id: "LOG-004",
    time: "2026-07-08T09:30:15",
    candidateName: "Arjun Mehta",
    action: "approved for offer letter generation in",
    role: "Senior Backend Engineer role",
    type: "success",
  },
  {
    id: "LOG-005",
    time: "2026-07-07T18:15:33",
    candidateName: "Neha Gupta",
    action: "applied from LinkedIn and resume parsed for",
    role: "Data Analyst role",
    type: "info",
  },
]

export function getCalculatedScore(candidate: Candidate, weights: AIWeights): number {
  const { skills, experience, education, projects } = weights
  const totalWeight = skills + experience + education + projects
  if (totalWeight === 0) return 0
  const score = (
    candidate.skillsRaw * skills +
    candidate.experienceRaw * experience +
    candidate.educationRaw * education +
    candidate.projectsRaw * projects
  ) / totalWeight
  return Math.round(score)
}

export function getMatchQuality(score: number): "Excellent" | "Strong" | "Good" | "Fair" | "Low" {
  if (score >= 90) return "Excellent"
  if (score >= 80) return "Strong"
  if (score >= 70) return "Good"
  if (score >= 50) return "Fair"
  return "Low"
}
