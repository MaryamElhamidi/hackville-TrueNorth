# Hackville TrueNorth

This project is a fork of the [Flowbite Astro Admin Dashboard template](https://astro.build/themes/details/flowbite/), customized for the Hackville TrueNorth accessibility dashboard application with a focus of the sponsor 'Simple Ventures'.

## Template Usage

The Flowbite Astro Admin Dashboard template was used as the starting point for the following UI components and layouts:

- **Navigation Components**: NavBarDashboard, NavBarSidebar, NavBarStacked - used for main application navigation
- **Layout Components**: LayoutApp, LayoutCommon, LayoutSidebar, LayoutStacked - used for page structure and responsive design
- **Sidebar Components**: SideBar - used for dashboard navigation menu
- **Authentication Components**: AuthCard - used for sign-in and registration forms
- **UI Components**: ColorModeSwitcher, CopyrightNotice, GitHubButton, ToggleSwitch - used for theme switching and common UI elements
- **Form Components**: SearchInput, PictureUploader - used for user input and file uploads
- **Card Components**: Various card layouts with consistent styling, borders, shadows, and responsive grids
- **Styling Framework**: Tailwind CSS with Flowbite components for consistent design system

## Additions

Started coding at 1 PM on January 17, 2026 (commit: dae49b969bd2e4ba338da99bc1ffaac3a4b99a23).

### Backend Processing System (Our Code)
- **Web Scraper** (`src/backend/scraper.js`): Automated scraping of municipal government documents and accessibility reports
- **Document Analyzer** (`src/backend/analyzer.js`): AI-powered analysis of scraped documents for accessibility issues
- **Text Chunker** (`src/backend/chunker.js`): Intelligent text segmentation for processing large documents
- **Data Extractor** (`src/backend/extractor.js`): Structured data extraction from raw municipal documents
- **Processing Pipeline** (`src/backend/pipeline.js`): Orchestration of the entire document processing workflow
- **Discoverer** (`src/backend/discoverer.js`): URL discovery and crawling for municipal websites

### AI Integration (Our Code)
- **Summarization Engine** (`src/lib/ai/summarization.ts`): Generates concise summaries of municipal accessibility reports
- **Recommendations System** (`src/lib/ai/recommendations.ts`): Provides AI-driven suggestions for accessibility improvements
- **Example Response Handling** (`src/lib/ai/example-response.ts`): Standardized response formats for AI operations

### Dashboard and Data Visualization (Our Code)
- **Custom Dashboard Module** (`src/modules/DashBoard.astro`): Company-specific accessibility overview with statistics, insights, and municipality breakdowns
- **Heatmap Visualization** (`src/modules/ServiceGapHeatmap.client.ts`, `src/modules/DashBoard-heatmap.client.ts`): Interactive map showing service gaps across Canadian municipalities
- **Impact Charts** (`src/components/charts/ImpactChart.client.ts`): Data visualization components for accessibility metrics
- **Dashboard Data Processing** (`src/lib/dashboard/index.ts`): Business logic for aggregating and filtering dashboard data
- **Heatmap Data Transformation** (`src/lib/dashboard/heatmap.ts`): Converts municipal data into heatmap-compatible format
- **Dashboard Filtering** (`src/lib/dashboard/filtering.ts`): Advanced filtering capabilities for municipality and company data

### Authentication and User Management (Our Code)
- **Auth Service** (`src/services/auth.ts`): User authentication, registration, and session management
- **User Service** (`src/services/users.ts`): User profile and data management
- **Company Onboarding** (`src/pages/company-onboarding.astro`): Multi-step company registration process
- **Sign-in/Sign-up Pages**: Customized authentication flows with form validation

### Municipality Data System (Our Code)
- **Municipality Pages** (`src/pages/municipality/[municipality].astro`): Individual municipality detail pages
- **Data Storage**: JSON files for municipalities, companies, and processed documents
- **Ontario Municipalities Data** (`src/backend/ontario_municipalities.json`): Geographic and administrative data for Ontario municipalities

### Configuration and Build Changes (From the template)
- **Astro Configuration** (`astro.config.mjs`): Custom build settings for the dashboard application
- **Tailwind Configuration** (`tailwind.config.cjs`): Extended theme with custom colors and components
- **ESLint Configuration** (`eslintrc.cjs`): Code quality rules for TypeScript and Astro
- **Prettier Configuration** (`prettierrc.cjs`): Consistent code formatting

### Additional Features (From the template)
- **Demo Mode**: Playground pages for testing components and layouts
- **Error Handling**: Custom error pages for 404, 500, and maintenance scenarios
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark Mode Support**: Complete theme switching functionality
- **Company Management**: Multi-company support with cookie-based company selection

All our code integrated w/ the Flowbite template's design while adding  functionality for our project's scope --- municipal accessibility analysis and dashboard management.
