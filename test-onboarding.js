// Simple test script for the onboarding API
const testData = {
  companyName: "Test Company Inc.",
  companyStage: "Launched (Early)",
  industry: "Technology",
  description: "We provide innovative solutions for accessibility challenges.",
  audience: ["Individuals", "Small businesses", "Enterprises"],
  geographicFocus: ["Ontario", "British Columbia", "Nationwide"],
  currentReach: "Active users",
  accessibilityConsideration: "Yes, intentionally",
  languages: ["English", "French"],
  languagesOther: "Spanish"
};

async function testOnboardingAPI() {
  try {
    console.log('Testing onboarding API with data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:2121/api/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Test passed! Company saved with ID:', result.companyId);
    } else {
      console.log('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testOnboardingAPI();
