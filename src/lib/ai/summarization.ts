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
 * Create a prompt tailored to the company's profile and the municipality data
 */
function createCompanySpecificPrompt(
  municipalitySummary: MunicipalitySummary,
  company: Company
): string {
  const { municipality, summary, issues_count: issuesCount, top_services_affected: topServicesAffected, locations_mentioned: locationsMentioned } = municipalitySummary;

  return `You are an accessibility consultant providing insights to ${company.companyName}, a ${company.companyStage} stage ${company.industry} company.

Company Profile:
- Industry: ${company.industry}
- Geographic Focus: ${company.geographicFocus.join(', ')}
- Current Reach: ${company.currentReach}
- Accessibility Commitment: ${company.accessibilityCommitment}
- Description: ${company.description}

Municipality Data for ${municipality}:
- Summary: ${summary}
- Issues Count: ${issuesCount}
- Services Affected: ${topServicesAffected.join(', ')}
- Locations Mentioned: ${locationsMentioned.join(', ')}

Please provide a clear, non-technical summary in 2-3 paragraphs that includes:

1. **Key Accessibility Gaps**: What accessibility challenges does this municipality face that could impact ${company.companyName}?

2. **Company-Specific Risks**: What risks does this pose to a ${company.industry} company like ${company.companyName} at their ${company.companyStage} stage?

3. **Opportunities**: How could ${company.companyName} address these issues or benefit from improvements in this municipality?

4. **Recommendations**: Specific, actionable suggestions for ${company.companyName} based on their industry and commitment level.

Use plain language, focus on accessibility-first principles, and tailor insights to ${company.companyName}'s profile.`;
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
 * Generate fallback company insights when AI is unavailable
 */
function generateFallbackCompanyInsights(
  municipalitySummaries: MunicipalitySummary[],
  company: Company
): string {
  const totalIssues = municipalitySummaries.reduce((sum, m) => sum + m.issues_count, 0);
  const averageIssues = (totalIssues / municipalitySummaries.length).toFixed(1);

  return `Based on analysis of ${municipalitySummaries.length} municipalities, ${company.companyName} operates in an accessibility landscape with an average of ${averageIssues} issues per municipality.

As a ${company.companyStage} ${company.industry} company, focus on accessibility improvements in high-impact areas to differentiate your offerings and expand market reach. Consider accessibility as a core business strategy rather than a compliance requirement.`;
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
