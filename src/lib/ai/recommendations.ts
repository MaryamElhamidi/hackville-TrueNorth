import { Company } from '../company/index.js';
import { MunicipalitySummary } from '../dashboard/filtering.js';
import { HeatmapDataPoint } from '../dashboard/heatmap.js';

// Dynamic import for AI functionality to avoid SSR issues
let genAI: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
let model: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

async function initializeAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Dynamic import for AI library
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    } catch (error) {
      console.warn('Failed to initialize Google AI:', error);
    }
  }
  return model !== null;
}

export interface PersonalizedRecommendations {
  summary: string;
  recommendations: Array<{
    title: string;
    description: string;
    urgency: 'Red' | 'Orange' | 'Green';
    justification: string;
    actions: string[];
    resources: string[];
  }>;
  impact_assessment: {
    business_impact: string;
    timeline: string;
    stakeholders: string[];
  };
}

/**
 * Generate comprehensive personalized recommendations for a company based on municipality data
 */
export async function generatePersonalizedRecommendations(
  municipality: MunicipalitySummary,
  company: Company,
  heatmapData?: HeatmapDataPoint
): Promise<PersonalizedRecommendations> {
  const prompt = createRecommendationsPrompt(municipality, company, heatmapData);

  // Try to initialize AI if not already done
  const aiAvailable = await initializeAI();

  if (!aiAvailable) {
    return generateFallbackRecommendations(municipality, company, heatmapData);
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return parseRecommendationsResponse(response.text().trim());
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return generateFallbackRecommendations(municipality, company, heatmapData);
  }
}

/**
 * Create the AI prompt for generating personalized recommendations
 */
function createRecommendationsPrompt(
  municipality: MunicipalitySummary,
  company: Company,
  heatmapData?: HeatmapDataPoint
): string {
  const severityInfo = heatmapData ? `
Service Gap Severity: ${heatmapData.severity}
Affected Population: ${heatmapData.affected_populations}
Service Gap Types: ${heatmapData.service_gap_types.join(', ')}
Accessibility Barriers: ${heatmapData.accessibility_barriers.join(', ')}
` : '';

  return `You are an expert accessibility consultant specializing in helping technology companies serve underserved communities. Your task is to provide highly personalized, actionable recommendations for ${company.companyName} based on accessibility data from ${municipality.municipality}.

COMPANY PROFILE:
- Name: ${company.companyName}
- Industry: ${company.industry}
- Stage: ${company.companyStage}
- Target Customers: ${company.servedCustomerTypes.join(', ')}
- Geographic Focus: ${company.geographicFocus.join(', ')}
- Current Reach: ${company.currentReach}
- Accessibility Commitment: ${company.accessibilityCommitment}
- Company Description: ${company.description}

MUNICIPALITY ACCESSIBILITY DATA:
- Municipality: ${municipality.municipality}
- Summary: ${municipality.summary}
- Issues Count: ${municipality.issues_count}
- Services Affected: ${municipality.top_services_affected.join(', ')}
- Locations: ${municipality.locations_mentioned.join(', ')}
${severityInfo}

CRITICAL REQUIREMENTS:

1. **Company-Specific Focus**: Every recommendation must be explicitly tailored to ${company.companyName}'s specific profile, industry, and customer base. Do not provide generic accessibility advice.

2. **Business Context Integration**: Connect every recommendation to how it impacts ${company.companyName}'s business goals, customer acquisition, market expansion, and competitive advantage.

3. **Practical Implementation**: Recommendations must be implementable by a ${company.companyStage} stage company with ${company.accessibilityCommitment} commitment level.

4. **Canadian Context**: All recommendations must consider Canadian regulations, cultural context, and market conditions.

5. **Urgency Classification**:
   - RED: Critical issues that directly impact ${company.companyName}'s ability to serve their target customers in this municipality
   - ORANGE: Important opportunities that would provide significant competitive advantage
   - GREEN: Beneficial but not urgent improvements

OUTPUT FORMAT REQUIREMENTS:

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence overview of how these accessibility issues impact ${company.companyName}",
  "recommendations": [
    {
      "title": "Actionable recommendation title",
      "description": "Detailed explanation of the recommendation and its business impact",
      "urgency": "Red|Orange|Green",
      "justification": "One sentence explaining the urgency classification tied to ${company.companyName}'s specific context",
      "actions": ["Specific, implementable action item 1", "Specific, implementable action item 2"],
      "resources": ["Canadian resource or tool 1", "Canadian resource or tool 2"]
    }
  ],
  "impact_assessment": {
    "business_impact": "How implementing these recommendations affects ${company.companyName}'s business metrics and goals",
    "timeline": "Realistic timeline for seeing results (3 months, 6 months, 1 year)",
    "stakeholders": ["Internal team members who need to be involved", "External partners or customers"]
  }
}

GUIDELINES:
- Focus on ${company.companyName}'s ${company.industry} industry context
- Consider their ${company.companyStage} stage and resource constraints
- Address their target customers: ${company.servedCustomerTypes.join(', ')}
- Leverage their geographic focus: ${company.geographicFocus.join(', ')}
- Build on their existing accessibility commitment level
- Provide Canadian-specific resources and examples
- Make recommendations financially viable for their stage`;
}

/**
 * Parse the AI response into structured recommendations
 */
function parseRecommendationsResponse(response: string): PersonalizedRecommendations {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateRecommendations(parsed);
    }

    // Fallback: parse structured text response
    return parseTextResponse(response);
  } catch (error) {
    console.error('Error parsing recommendations response:', error);
    return generateFallbackRecommendations(null, null);
  }
}

/**
 * Validate and ensure the recommendations structure is correct
 */
function validateRecommendations(data: any): PersonalizedRecommendations {
  return {
    summary: data.summary || 'Accessibility insights for your business',
    recommendations: (data.recommendations || []).map((rec: any) => ({
      title: rec.title || 'Recommendation',
      description: rec.description || '',
      urgency: (['Red', 'Orange', 'Green'].includes(rec.urgency) ? rec.urgency : 'Green') as 'Red' | 'Orange' | 'Green',
      justification: rec.justification || '',
      actions: Array.isArray(rec.actions) ? rec.actions : [],
      resources: Array.isArray(rec.resources) ? rec.resources : []
    })),
    impact_assessment: {
      business_impact: data.impact_assessment?.business_impact || '',
      timeline: data.impact_assessment?.timeline || '',
      stakeholders: Array.isArray(data.impact_assessment?.stakeholders) ? data.impact_assessment.stakeholders : []
    }
  };
}

/**
 * Fallback parser for text-based responses
 */
function parseTextResponse(response: string): PersonalizedRecommendations {
  // Simple text parsing - in a real implementation, you'd use more sophisticated parsing
  const sections = response.split('\n\n');

  return {
    summary: sections[0] || 'Accessibility recommendations for your business',
    recommendations: [{
      title: 'Accessibility Improvement Initiative',
      description: sections[1] || 'Implement accessibility improvements to better serve your customers',
      urgency: 'Orange' as const,
      justification: 'Improves customer experience and market access',
      actions: ['Audit current accessibility practices', 'Implement recommended improvements'],
      resources: ['Canadian Accessibility Standards', 'Local accessibility consultants']
    }],
    impact_assessment: {
      business_impact: sections[2] || 'Enhanced customer satisfaction and market expansion',
      timeline: '3-6 months',
      stakeholders: ['Product team', 'Customer success', 'Legal']
    }
  };
}

/**
 * Generate fallback recommendations when AI is unavailable
 */
function generateFallbackRecommendations(
  municipality?: MunicipalitySummary | null,
  company?: Company | null,
  heatmapData?: HeatmapDataPoint | null
): PersonalizedRecommendations {
  const municipalityName = municipality?.municipality || 'this municipality';
  const companyName = company?.companyName || 'your company';
  const industry = company?.industry || 'technology';

  return {
    summary: `${municipalityName} presents accessibility challenges that ${companyName} can address through targeted ${industry} solutions. By implementing accessibility-first design principles, you can gain competitive advantage while expanding your market reach in underserved communities.`,

    recommendations: [
      {
        title: 'Digital Accessibility Audit & Enhancement',
        description: `Conduct a comprehensive accessibility audit of your ${industry} platform to identify barriers preventing customers in ${municipalityName} from accessing your services. Focus on WCAG 2.1 AA compliance and Canadian accessibility standards.`,
        urgency: 'Red' as const,
        justification: 'Directly impacts your ability to serve customers in this high-need municipality',
        actions: [
          'Perform automated accessibility testing using tools like axe-core or WAVE',
          'Conduct manual testing with assistive technologies (screen readers, keyboard navigation)',
          'Document accessibility issues with severity levels and user impact',
          'Create prioritized remediation roadmap aligned with your product development cycle'
        ],
        resources: [
          'Canadian Centre on Disability Studies - Accessibility Resources',
          'Government of Canada Web Accessibility Toolkit',
          'Ontario Ministry of Accessibility Resources',
          'Local accessibility consulting firms in your geographic focus areas'
        ]
      },
      {
        title: 'Community Partnership Development',
        description: `Establish partnerships with local disability advocacy organizations and accessibility experts in ${municipalityName}. These relationships will provide valuable insights and help validate your accessibility improvements.`,
        urgency: 'Orange' as const,
        justification: 'Builds credibility and provides market intelligence for expansion',
        actions: [
          'Research local disability advocacy organizations and accessibility experts',
          'Reach out to establish informational interviews and partnership discussions',
          'Offer beta access to your platform for feedback and testing',
          'Collaborate on accessibility awareness initiatives in the community'
        ],
        resources: [
          'Local chapters of disability advocacy organizations',
          'Canadian Disability Participation Project',
          'Accessibility Ontario',
          'Municipal accessibility advisory committees'
        ]
      },
      {
        title: 'Inclusive Design Training Program',
        description: `Implement organization-wide training on inclusive design principles and accessibility best practices. This ensures your entire ${company?.companyStage || 'growing'} team understands how to build accessible ${industry} solutions.`,
        urgency: 'Green' as const,
        justification: 'Foundation for long-term accessibility excellence and team capability building',
        actions: [
          'Select accessibility training program appropriate for your team size and stage',
          'Schedule regular accessibility-focused design reviews',
          'Create internal accessibility guidelines and checklists',
          'Establish accessibility champions within each product team'
        ],
        resources: [
          'Microsoft Inclusive Design Toolkit',
          'Google Material Design Accessibility Guidelines',
          'Deque University Accessibility Training',
          'Canadian accessibility certification programs'
        ]
      }
    ],

    impact_assessment: {
      business_impact: `Implementing these recommendations will enhance ${companyName}'s ability to serve the ${heatmapData?.affected_populations || 'growing'} accessibility-conscious market in ${municipalityName}, potentially increasing customer acquisition by 15-25% while improving customer satisfaction and retention metrics.`,
      timeline: company?.companyStage === 'early' ? '3-6 months for initial implementation, 12 months for full impact' : '6-12 months for comprehensive rollout',
      stakeholders: [
        'Product Management',
        'Engineering Teams',
        'UX/UI Designers',
        'Customer Success Team',
        'Legal/Compliance',
        'Marketing Team',
        ...(company?.industry === 'Technology' ? ['Accessibility Specialists'] : [])
      ]
    }
  };
}

/**
 * Generate problem explanation with plain language and data sources
 */
export async function generateProblemExplanation(
  municipality: MunicipalitySummary,
  company: Company,
  heatmapData?: HeatmapDataPoint
): Promise<{
  plain_language_explanation: string;
  affected_groups: string[];
  evidence_sources: string[];
  accessibility_barriers: string[];
}> {
  const prompt = `Explain the accessibility issues in ${municipality.municipality} in plain, non-technical language that a business owner can understand.

Municipality Data:
- Summary: ${municipality.summary}
- Issues Count: ${municipality.issues_count}
- Services Affected: ${municipality.top_services_affected.join(', ')}
- Locations: ${municipality.locations_mentioned.join(', ')}

Company Context: ${company.companyName} is a ${company.industry} company serving ${company.servedCustomerTypes.join(', ')}.

Provide:
1. Plain language explanation of what the accessibility problems are
2. Who is affected and why it matters
3. Evidence and data sources supporting these findings
4. Accessibility barriers categorized by type

Keep it clear, concise, and focused on business impact.`;

  const aiAvailable = await initializeAI();

  if (!aiAvailable) {
    return {
      plain_language_explanation: `The municipality has ${municipality.issues_count} accessibility issues primarily affecting ${municipality.top_services_affected.join(' and ')} services. These issues create barriers for people with disabilities trying to access essential services and participate fully in community life.`,
      affected_groups: ['People with disabilities', 'Older adults', 'Families with children', 'Low-income residents'],
      evidence_sources: ['Municipality accessibility reports', 'Community feedback', 'Accessibility audits', 'Government accessibility standards'],
      accessibility_barriers: heatmapData?.accessibility_barriers || ['Digital barriers', 'Physical barriers', 'Communication barriers']
    };
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return parseExplanationResponse(response.text().trim());
  } catch (error) {
    console.error('Error generating explanation:', error);
    return {
      plain_language_explanation: municipality.summary,
      affected_groups: ['Community residents', 'People with disabilities'],
      evidence_sources: ['Municipality reports', 'Accessibility assessments'],
      accessibility_barriers: ['Digital accessibility', 'Physical accessibility', 'Communication accessibility']
    };
  }
}

/**
 * Parse explanation response
 */
function parseExplanationResponse(response: string): {
  plain_language_explanation: string;
  affected_groups: string[];
  evidence_sources: string[];
  accessibility_barriers: string[];
} {
  // Simple parsing - extract sections
  const sections = response.split('\n\n');

  return {
    plain_language_explanation: sections[0] || 'Accessibility issues affect community access to essential services.',
    affected_groups: sections[1]?.split('\n').filter(line => line.trim()) || ['People with disabilities'],
    evidence_sources: sections[2]?.split('\n').filter(line => line.trim()) || ['Municipality reports'],
    accessibility_barriers: sections[3]?.split('\n').filter(line => line.trim()) || ['Digital barriers']
  };
}
