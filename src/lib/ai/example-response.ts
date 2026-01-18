/**
 * Example response for Xatoms company analyzing London, Ontario accessibility data
 * This demonstrates the new company-specific analysis framework
 */

// Example municipality data for London, Ontario (synthetic based on water-related accessibility issues)
const londonOntarioExample = {
  municipality: "London",
  summary: "London, Ontario has several water-related accessibility concerns including public drinking fountains, pool facilities, water billing systems, and emergency water service notifications. Many of these services have digital barriers that prevent people with disabilities from accessing clean water information and services.",
  issues_count: 12,
  top_services_affected: ["Public Water Services", "Online Billing Systems", "Emergency Notifications", "Recreational Facilities"],
  locations_mentioned: ["London", "Ontario"]
};

// Xatoms company profile
const xatomsCompany = {
  companyId: "d59e8a3a-9643-4945-ade3-168874bcc7fd",
  companyName: "Xatoms",
  companyStage: "early",
  industry: "Technology",
  description: "Xatoms develops affordable water treatment solutions that help communities access clean drinking water. Our focus is on supporting municipalities and nonprofits serving underserved populations.",
  servedCustomerTypes: ["individuals", "non_profits", "government"],
  geographicFocus: ["Ontario"],
  currentReach: "pilot_users",
  accessibilityCommitment: "intentional",
  languagesSupported: ["English"],
  createdAt: "2026-01-18T00:35:13.049Z"
};

/**
 * Example AI response following the new company-specific framework
 * This shows how the analysis is filtered and focused on Xatoms' specific business needs
 */
export const xatomsLondonExampleResponse = `What This Means for Your Business

Your water treatment technology serves municipalities and nonprofits in Ontario that work with underserved communities. When London has accessibility barriers in water services, it directly affects how well your customers can provide clean water access to people who need it most.

As an early-stage company with pilot users, you depend on government and nonprofit partners to adopt your water treatment solutions. If these partners struggle with accessibility in their own water services, it makes it harder for them to serve the communities you're trying to help.

London's water billing system accessibility issues matter to you because your customers include government agencies that need to communicate water service information to residents. Barriers here could prevent proper communication about water quality or service changes that relate to your treatment solutions.

Emergency water service notifications are critical for your business since you provide water treatment technology. If people can't access emergency alerts about water quality or service disruptions, it affects how communities perceive and adopt water treatment solutions like yours.

Areas of Concern for Your Company

Your pilot program in Ontario could face adoption challenges if municipalities have accessibility barriers in their water service communications, making it harder to demonstrate the value of your technology to underserved communities.

Government partners in London may struggle to effectively communicate about water quality improvements or new treatment technologies if their notification systems aren't accessible, limiting your market expansion opportunities.

Recommended Actions for Your Company

Start by making your own pilot program materials and website fully accessible, then partner with local disability advocacy groups in London to understand specific water access challenges faced by underserved communities.

Conduct an accessibility audit of your technology demo process and modify it to work better with screen readers and other assistive technologies, since many of your early customers will be government agencies with accessibility requirements.

Reach out to London's water services department to offer your expertise in accessible water treatment solutions, positioning your company as a partner in improving community water access.

Urgency Level

Orange - Your early stage and intentional accessibility commitment mean you have an opportunity to build accessibility into your core business model, but current barriers in London could limit your pilot program success with underserved communities.`;

/**
 * This example demonstrates:
 * 1. Company as primary frame of reference
 * 2. Filtering to only water-related issues relevant to Xatoms' mission
 * 3. Explicit explanation of "why it matters" and "how it affects serving users"
 * 4. Second-person tone ("your company", "you")
 * 5. Required output structure with all four sections
 * 6. Business impact focus rather than generic municipality summaries
 */
