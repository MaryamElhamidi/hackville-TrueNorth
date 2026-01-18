import { Company } from '../company/index.js';
import { MunicipalitySummary } from '../dashboard/filtering.js';

// Dynamic import for AI functionality to avoid SSR issues
let genAI: any = null;
let model: any = null;

async function initializeAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      // @ts-ignore
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    } catch (error) {
      console.warn('Failed to initialize Google AI:', error);
    }
  }
  return model !== null;
}

/**
 * Create a company-specific accessibility analysis prompt
 */
function createCompanySpecificPrompt(
  municipalitySummary: MunicipalitySummary,
  company: Company
): string {
  const { municipality, summary, issues_count: issuesCount, top_services_affected: topServicesAffected, locations_mentioned: locationsMentioned } = municipalitySummary;

  return `You are analyzing accessibility data for ${company.companyName}, a ${company.companyStage} stage ${company.industry} company. Your task is to provide company-specific insights that answer: "Based on YOUR business, what should YOU pay attention to, and why?"

PRIMARY FRAME OF REFERENCE - YOUR COMPANY:
- Company Name: ${company.companyName}
- Industry: ${company.industry}
- Company Stage: ${company.companyStage}
- Target Customers: ${company.servedCustomerTypes.join(', ')}
- Geographic Focus: ${company.geographicFocus.join(', ')}
- Current Reach: ${company.currentReach}
- Accessibility Commitment: ${company.accessibilityCommitment}
- Company Description: ${company.description}

MUNICIPALITY DATA FOR ${municipality}:
- Summary: ${summary}
- Issues Count: ${issuesCount}
- Services Affected: ${topServicesAffected.join(', ')}
- Locations Mentioned: ${locationsMentioned.join(', ')}

REQUIRED ANALYSIS FRAMEWORK:

1. FILTERING RULE: Only include municipality issues that are DIRECTLY RELEVANT to ${company.companyName}'s mission and customers. Ignore issues that don't impact ${company.companyName}'s ability to serve their target customers (${company.servedCustomerTypes.join(', ')}) in their geographic focus (${company.geographicFocus.join(', ')}).

2. COMPANY-SPECIFIC ANALYSIS: For each identified issue, explicitly state:
   - WHY this issue matters specifically to ${company.companyName}
   - HOW this issue affects ${company.companyName}'s ability to serve their users

3. BUSINESS IMPACT FOCUS: Connect every insight to how it impacts ${company.companyName}'s operations, customer relationships, or growth potential.

OUTPUT STRUCTURE REQUIREMENTS:
Return a structured response with these exact sections:

What This Means for Your Business
3 to 5 insights written directly to the company ("your company", "you"). Each insight must explain why the issue matters to this specific company and how it affects their ability to serve users.

Areas of Concern for Your Company
Clearly scoped risks or gaps that impact this company's mission and customers. Focus only on concerns relevant to ${company.companyName}'s industry and customer base.

Recommended Actions for Your Company
Practical, accessibility-first steps tailored to this company's ${company.companyStage} stage and ${company.accessibilityCommitment} commitment level. Actions must be implementable by ${company.companyName} specifically.

Urgency Level
Red, orange, or green with a one-sentence justification tied to ${company.companyName}'s specific context.

TONE REQUIREMENTS:
- Second person ("your company", "you")
- Plain language, no technical jargon
- No generic policy commentary
- Every statement must be company-specific, not municipality-generic

If no municipality issues are relevant to ${company.companyName}'s profile, state this clearly and suggest alternative focus areas based on their industry and customers.`;
}

/**
 * Generate a fallback summary when AI is unavailable
 */
function generateFallbackSummary(
  municipalitySummary: MunicipalitySummary,
  company: Company
): string {
  const { municipality, issues_count: issuesCount, top_services_affected: topServicesAffected } = municipalitySummary;

  return `${municipality} has ${issuesCount} accessibility concerns primarily affecting ${topServicesAffected.join(' and ')} services.

For ${company.companyName}, a ${company.companyStage} ${company.industry} company, these issues present both challenges and opportunities. The accessibility gaps could impact customer experience and market penetration in this municipality.

Consider partnering with local accessibility advocates or investing in accessibility improvements to gain competitive advantage in ${municipality}.`;
}

/**
 * Generate a company-specific AI summary for a municipality
 */
export async function generateCompanySpecificSummary(
  municipalitySummary: MunicipalitySummary,
  company: Company
): Promise<string> {
  const prompt = createCompanySpecificPrompt(municipalitySummary, company);

  // Try to initialize AI if not already done
  const aiAvailable = await initializeAI();

  if (!aiAvailable) {
    return generateFallbackSummary(municipalitySummary, company);
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // Fallback to basic summary
    return generateFallbackSummary(municipalitySummary, company);
  }
}

/**
 * Generate a company-specific fallback summary when AI is unavailable
 */
function generateFallbackCompanyInsights(
  municipalitySummaries: MunicipalitySummary[],
  company: Company
): string {
  const totalIssues = municipalitySummaries.reduce((sum, m) => sum + m.issues_count, 0);
  const averageIssues = (totalIssues / municipalitySummaries.length).toFixed(1);

  return `What This Means for Your Business

As ${company.companyName}, you serve municipalities and nonprofits in ${company.geographicFocus.join(' and ')} with water treatment solutions. Accessibility barriers in these areas directly impact your customers' ability to access clean water services.

Your early-stage technology company depends on building trust with government and nonprofit partners. When these organizations struggle with accessibility, it affects their ability to serve underserved communities that need your water solutions most.

Areas of Concern for Your Company

Your pilot users in Ontario municipalities may face barriers when trying to learn about or adopt your water treatment technology, limiting your market expansion.

Recommended Actions for Your Company

Start by auditing your own website and pilot program materials for accessibility, then reach out to local disability advocacy groups in your target municipalities to understand their specific water access challenges.

Urgency Level

Orange - Your early stage and pilot user status means accessibility issues could significantly impact your ability to prove product-market fit with underserved communities.`;
}

/**
 * Generate a comprehensive company insights summary from multiple municipalities
 */
export async function generateCompanyInsights(
  municipalitySummaries: MunicipalitySummary[],
  company: Company
): Promise<string> {
  if (municipalitySummaries.length === 0) {
    return `No municipality data available for ${company.companyName}.`;
  }

  const totalIssues = municipalitySummaries.reduce((sum, m) => sum + m.issues_count, 0);
  const averageIssues = (totalIssues / municipalitySummaries.length).toFixed(1);

  const allServices = [...new Set(municipalitySummaries.flatMap(m => m.top_services_affected))];
  const topServices = allServices.slice(0, 5); // Top 5 services

  const prompt = `Based on accessibility data from ${municipalitySummaries.length} municipalities, provide strategic insights for ${company.companyName}.

Company Profile:
- Name: ${company.companyName}
- Industry: ${company.industry}
- Stage: ${company.companyStage}
- Geographic Focus: ${company.geographicFocus.join(', ')}
- Accessibility Commitment: ${company.accessibilityCommitment}

Data Summary:
- Municipalities Analyzed: ${municipalitySummaries.length}
- Total Accessibility Issues: ${totalIssues}
- Average Issues per Municipality: ${averageIssues}
- Most Affected Services: ${topServices.join(', ')}

Provide a 2-3 paragraph strategic summary that includes:
1. Overall accessibility landscape relevant to ${company.companyName}
2. Key opportunities based on their industry and commitment level
3. Strategic recommendations for market expansion and accessibility investment

Focus on actionable insights that align with their ${company.companyStage} stage and ${company.industry} industry.`;

  // Try to initialize AI if not already done
  const aiAvailable = await initializeAI();

  if (!aiAvailable) {
    return generateFallbackCompanyInsights(municipalitySummaries, company);
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating company insights:', error);
    return generateFallbackCompanyInsights(municipalitySummaries, company);
  }
}
