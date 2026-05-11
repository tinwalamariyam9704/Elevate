import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const MODELS = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-3.1-pro-preview",
  LITE: "gemini-3.1-flash-lite-preview",
};

export class GeminiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleGeminiResponse(fn: () => Promise<any>, retries = 1) {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("QUOTA");
    
    if (isQuotaError && retries > 0) {
      await sleep(2000); // Wait 2 seconds before retry
      return handleGeminiResponse(fn, retries - 1);
    }

    if (isQuotaError) {
      throw new GeminiError("AI quota reached. Please wait a moment and try again.", 429);
    }
    throw error;
  }
}

export async function getCareerSuggestions(assessmentData: any) {
  return handleGeminiResponse(async () => {
    const response = await ai.models.generateContent({
      model: MODELS.FLASH, // Switched from PRO to FLASH
      contents: `Analyze the following user assessment data and suggest 3-5 mainstream, well-known industry career paths. Use exact professional titles found in recruitment (e.g., "AI/ML Engineer", "Data Scientist", "Software Engineer", "Operations Manager", "Supply Chain Analyst", "Financial Analyst", "Marketing Strategist", "Human Resources Manager", "Clinical Research Coordinator").
      
      Requirements:
      1. Prioritize roles with standard, common names found on LinkedIn/Indeed.
      2. Include both high-tech and essential non-tech roles based on user strengths.
      3. For each path, provide: 
         - name: Professional title.
         - description: Brief overview.
         - futureProofScore: 0-100 score.
         - aiImpactAnalysis: Brief analysis.
         - averageSalary: Estimated annual range in Indian Rupees (e.g., "₹8L - ₹15L LPA").
         - marketDemand: Current hiring trend in the Indian/Global market (e.g., "High", "Growing", "Stable").
         - growthPotential: Expected career growth over 5 years (e.g., "Very High").
         - workLifeBalance: Brief mention (e.g., "Flexible", "Demanding").
      
      User Data: ${JSON.stringify(assessmentData)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              futureProofScore: { type: Type.NUMBER },
              aiImpactAnalysis: { type: Type.STRING },
              averageSalary: { type: Type.STRING },
              marketDemand: { type: Type.STRING },
              growthPotential: { type: Type.STRING },
              workLifeBalance: { type: Type.STRING },
              requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "description", "futureProofScore", "aiImpactAnalysis", "averageSalary", "marketDemand", "growthPotential", "workLifeBalance"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  });
}

export async function getDetailedRoadmap(careerName: string, userContext: any) {
  return handleGeminiResponse(async () => {
    const response = await ai.models.generateContent({
      model: MODELS.FLASH, // Switched from PRO to FLASH
      contents: `Create a professional step-by-step career roadmap for the industry role: "${careerName}".
      User context (industry status, goals, skills): ${JSON.stringify(userContext)}
      
      Requirements:
      1. Define 5-7 clear milestones tailored to their industry experience.
      2. Identify high-value industry certifications (e.g., PMP for Management, CFA for Finance, CPC for Medical Coding, etc.).
      3. For "Portfolio Projects", suggest real-world case studies, audit reports, or specific field contributions if the role is non-technical (e.g., for Sales: "A territory growth analysis and strategy report").
      4. Ensure all skills mentioned are industry-specific.
      
      Return the response in valid JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  skillsToAcquire: { type: Type.ARRAY, items: { type: Type.STRING } },
                  duration: { type: Type.STRING }
                }
              }
            },
            projectIdeas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  outcome: { type: Type.STRING }
                }
              }
            },
            certifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  provider: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              }
            }
          },
          required: ["milestones", "projectIdeas", "certifications"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
}

export async function analyzeResume(resumeText: string, targetRole: string) {
  return handleGeminiResponse(async () => {
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `Analyze this resume text for the target role: "${targetRole}".
      
      Resume Text:
      ${resumeText}
      
      Provide a comprehensive audit including:
      1. Formatting score (0-100).
      2. Content impact score (0-100).
      3. Critical missing keywords for the target role.
      4. Skill gaps (skills the user lacks but are vital for the role).
      5. 3 specific, actionable improvements for their bullet points.
      6. A summary of how "AI-Resilient" their experience appears.
      
      Return valid JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: {
                formatting: { type: Type.NUMBER },
                content: { type: Type.NUMBER },
                overall: { type: Type.NUMBER }
              }
            },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiResilienceCheck: { type: Type.STRING }
          },
          required: ["scores", "missingKeywords", "skillGaps", "improvements", "aiResilienceCheck"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
}

export async function getInterviewSession(role: string, level: string = "mid-level") {
  return handleGeminiResponse(async () => {
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `Generate 5 challenging, unique, and industry-standard interview questions for a ${level} "${role}" position. 
      Include 2 technical/domain-specific and 3 behavioral questions.
      
      Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              question: { type: Type.STRING },
              intent: { type: Type.STRING },
              category: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  });
}

export async function getInterviewFeedback(question: string, answer: string, role: string) {
  return handleGeminiResponse(async () => {
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `As an elite hiring manager for a ${role} position, evaluate this interview response.
      
      Question: "${question}"
      Answer: "${answer}"
      
      Provide:
      1. Score (0-10)
      2. Strengths of the answer.
      3. Weaknesses/Gaps.
      4. A "Refined Response" sample that they should aim for.
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            refinedAnswer: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
}

export async function getJobRecommendations(profile: any, currentPath: string) {
  return handleGeminiResponse(async () => {
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `Suggest 4-5 specific job titles or niche opportunities for a user interested in "${currentPath}".
      User Profile: ${JSON.stringify(profile)}
      
      For each, include:
      - title: Job Title
      - companyType: Type of companies hiring (e.g., "SaaS Startups", "Fortune 500", "NGOs")
      - salaryRange: Expected pay
      - whyMatch: Why this fits their profile.
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              companyType: { type: Type.STRING },
              salaryRange: { type: Type.STRING },
              whyMatch: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  });
}

export async function chatWithCareerCoach(messages: any[], context?: any) {
  return handleGeminiResponse(async () => {
    const userContextStr = context ? `\nUser Context: ${JSON.stringify(context)}` : "";
    
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: messages,
      config: {
        systemInstruction: `You are Elevate, a premium startup-level career strategist platform. Your goal is to provide elite, data-driven career advice across all industries including Tech, Finance, Healthcare, Creative Arts, and Skilled Trades.
        
        Be sharp, professional, and strategic. Help users navigate career pivots, salary negotiations, and skill acquisition.
        
        You have access to the user's profile and roadmap context. Refer to their specific milestones and suggested paths to make advice hyper-personalized.${userContextStr}`,
      }
    });

    return response.text;
  });
}
