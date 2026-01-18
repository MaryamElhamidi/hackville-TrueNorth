import { config } from 'dotenv';
import { Company } from '../company/index.js';
import { MunicipalitySummary } from '../dashboard/filtering.js';

// Load environment variables
config();

// Dynamic import for AI functionality to avoid SSR issues
let genAI: any = null;
let geminiModel: any = null;
let openaiClient: any = null;

type AIProvider = 'gemini' | 'openai' | 'auto';

async function initializeAI() {
  const provider = (process.env.AI_PROVIDER || 'auto') as AIProvider;

  // Try Gemini first if enabled
  if ((provider === 'gemini' || provider === 'auto') && process.env.GEMINI_API_KEY && !genAI) {
    try {
      // @ts-ignore
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
      console.log('Gemini AI initialized successfully');
      return { provider: 'gemini', available: true };
    } catch (error) {
      console.warn('Failed to initialize Google Gemini AI:', error);
    }
  }

  // Try OpenAI if Gemini failed or if OpenAI is preferred
  if ((provider === 'openai' || provider === 'auto') && process.env.OPENAI_API_KEY && !openaiClient) {
    try {
      // @ts-ignore
      const OpenAI = (await import('openai')).default;
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('OpenAI initialized successfully');
      return { provider: 'openai', available: true };
    } catch (error) {
      console.warn('Failed to initialize OpenAI:', error);
    }
  }

  console.warn('No AI provider available. Using fallback responses.');
  return { provider: null, available: false };
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
  const { provider, available } = await initializeAI();

  if (!available) {
    return generateFallbackSummary(municipalitySummary, company);
  }

  try {
    if (provider === 'gemini') {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } else if (provider === 'openai') {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      });
      return completion.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // Fallback to basic summary
    return generateFallbackSummary(municipalitySummary, company);
  }

  // Fallback if no provider matched
  return generateFallbackSummary(municipalitySummary, company);
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

  // Generate company-specific insights based on company profile
  const getIndustrySpecificInsights = (company: Company) => {
    switch (company.industry) {
      case 'Technology':
        return {
          businessImpact: `Digital accessibility barriers in ${company.geographicFocus.join(' and ')} directly impact your ability to reach and serve customers who rely on technology solutions. Many potential users may struggle to access your digital platforms and services.`,
          concerns: `Customers with disabilities may face barriers when trying to learn about, purchase, or use your technology products and services.`,
          actions: `Audit your website, mobile apps, and digital platforms for accessibility compliance, then develop training programs for your team on inclusive design practices.`
        };
      case 'Clean Technology':
      case 'Water Treatment':
        return {
          businessImpact: `Accessibility barriers in ${company.geographicFocus.join(' and ')} affect your ability to work with municipalities and nonprofits that serve communities needing your water treatment solutions. When these organizations have accessibility challenges, it impacts their ability to effectively serve the communities you aim to help.`,
          concerns: `Government and nonprofit partners may struggle with accessibility when trying to learn about or implement your water treatment technologies.`,
          actions: `Audit your own materials and platforms for accessibility, then partner with local disability advocacy groups to understand specific accessibility challenges in water access.`
        };
      case 'Education':
        return {
          businessImpact: `Educational accessibility barriers directly impact your ability to serve students and educational institutions that need your services and programs.`,
          concerns: `Students with disabilities may face barriers when accessing your educational content, platforms, or services.`,
          actions: `Ensure your educational materials, online platforms, and communication channels meet accessibility standards, and develop partnerships with disability services offices.`
        };
      case 'Food & Beverage':
        return {
          businessImpact: `Accessibility barriers affect your ability to serve customers who want to purchase and enjoy your food and beverage products. Many potential customers may be unable to access your locations or online ordering systems.`,
          concerns: `Customers with mobility or digital accessibility needs may struggle to access your products and services.`,
          actions: `Audit your physical locations for accessibility compliance, ensure your website and ordering systems are accessible, and train staff on serving customers with disabilities.`
        };
      default:
        return {
          businessImpact: `Accessibility barriers in your target markets directly impact your ability to serve your customers effectively. When organizations and individuals face accessibility challenges, it affects their ability to engage with businesses like yours.`,
          concerns: `Your customers may face barriers when trying to access your products, services, or information.`,
          actions: `Conduct an accessibility audit of your current operations and develop an accessibility improvement plan based on your ${company.accessibilityCommitment} commitment level.`
        };
    }
  };

  const insights = getIndustrySpecificInsights(company);

  const urgencyLevel = company.accessibilityCommitment === 'intentional' ? 'Orange' :
                      company.companyStage === 'early' ? 'Orange' : 'Green';

  return `What This Means for Your Business

${insights.businessImpact}

As a ${company.companyStage} stage ${company.industry} company serving ${company.servedCustomerTypes.join(' and ')}, accessibility issues in your geographic focus areas present both challenges and opportunities for growth.

Areas of Concern for Your Company

${insights.concerns} These barriers could limit your market reach and customer satisfaction.

Recommended Actions for Your Company

${insights.actions} Focus on accessibility improvements that align with your ${company.accessibilityCommitment} commitment level.

Urgency Level

${urgencyLevel} - As a ${company.companyStage} company, addressing accessibility now will help you build inclusive practices from the ground up and better serve your target customers.`;
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
  const { provider, available } = await initializeAI();

  if (!available) {
    return generateFallbackCompanyInsights(municipalitySummaries, company);
  }

  try {
    if (provider === 'gemini') {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } else if (provider === 'openai') {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
      });
      return completion.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error('Error generating company insights:', error);
    return generateFallbackCompanyInsights(municipalitySummaries, company);
  }

  // Fallback if no provider matched
  return generateFallbackCompanyInsights(municipalitySummaries, company);
}
