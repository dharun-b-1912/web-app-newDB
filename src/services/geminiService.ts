import { GoogleGenAI } from '@google/genai';

// Retrieve Gemini API Key from environment variables (supports Vite client and AI Studio injected env)
const getApiKey = (): string | undefined => {
  const metaEnv = (import.meta as any).env;
  return (
    metaEnv?.VITE_GEMINI_API_KEY ||
    metaEnv?.GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined)
  );
};

let genAiInstance: GoogleGenAI | null = null;

const getGenAI = (): GoogleGenAI | null => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!genAiInstance) {
    try {
      genAiInstance = new GoogleGenAI({ apiKey });
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI instance:', err);
      return null;
    }
  }
  return genAiInstance;
};

export interface HRContext {
  companyName?: string;
  organizationName?: string;
  userRole?: string;
}

export async function askWorkForceCopilot(
  prompt: string,
  context?: HRContext
): Promise<string> {
  const genAI = getGenAI();

  const company = context?.companyName || 'WorkForceOS Enterprise';
  const org = context?.organizationName || 'Global Enterprise HRMS';

  if (!genAI) {
    // Fallback response generator when Gemini API Key is not set locally
    return generateFallbackResponse(prompt, company, org);
  }

  try {
    const systemInstruction = `You are WorkForceOS Copilot, an AI assistant for an enterprise HRMS platform.
Current Tenant Context:
- Active Company: ${company}
- Parent Organization: ${org}

Respond concisely, accurately, and professionally to HR, workforce analytics, policy, leave, compliance, and department questions. If asked about headcount, policies, or leave rules, provide clear enterprise guidance.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nUser Question: ${prompt}` }],
        },
      ],
    });

    if (response && response.text) {
      return response.text;
    }
    return generateFallbackResponse(prompt, company, org);
  } catch (error) {
    console.error('Gemini AI API Error:', error);
    return generateFallbackResponse(prompt, company, org);
  }
}

function generateFallbackResponse(prompt: string, company: string, org: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('headcount') || lower.includes('count') || lower.includes('employee')) {
    return `Active headcount for ${company} is 245 employees distributed as: Engineering (110), Sales & Marketing (45), HR & Admin (35), Finance (28), and Product (27).`;
  }

  if (lower.includes('leave') || lower.includes('policy') || lower.includes('vacation')) {
    return `Under standard HR Leave Policy for ${org}, full-time employees receive 18 Earned Leaves (EL), 12 Casual Leaves (CL), 12 Sick Leaves (SL), and 10 paid public holidays per calendar year.`;
  }

  if (lower.includes('rbac') || lower.includes('role') || lower.includes('permission')) {
    return `WorkForceOS RBAC enforces granular scopes (Global Admin, HR Manager, Department Head, Employee). Cross-tenant query boundaries are active for ${company}.`;
  }

  if (lower.includes('attendance') || lower.includes('shift') || lower.includes('time')) {
    return `Attendance monitoring for ${company} is active with biometric integration and GPS geo-fencing enabled for remote/field employees.`;
  }

  return `Based on configuration settings for ${company} within ${org}, enterprise RBAC policies restrict unauthorized modifications. (Tip: Set VITE_GEMINI_API_KEY in .env.local to enable live AI responses powered by Google Gemini 2.5).`;
}
