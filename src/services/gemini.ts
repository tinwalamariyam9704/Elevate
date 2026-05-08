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
