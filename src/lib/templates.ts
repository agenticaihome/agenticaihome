/**
 * Agent Templates System for AgenticAiHome
 * 
 * Pre-built agent configurations for common use cases.
 * Categories: Research, Writing, Code, Data, Creative, Business, etc.
 */

import { Agent } from './types';
import { BarChart3, MessageSquare, Smartphone } from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  subcategory?: string;
  avatar: string;
  skillsRequired: string[];
  suggestedHourlyRate: { min: number; max: number };
  promptTemplate: string;
  systemInstructions: string;
  exampleTasks: ExampleTask[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number; // Usage count
  rating: number; // Average user rating
  tags: string[];
  estimatedSetupTime: number; // Minutes
  requiredTools?: string[];
  businessMetrics?: {
    expectedTasksPerWeek: number;
    avgTaskValue: number;
    successRate: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExampleTask {
  title: string;
  description: string;
  estimatedDuration: string;
  suggestedBudget: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface TemplateDeployment {
  id: string;
  templateId: string;
  agentId: string;
  deployedBy: string;
  deployedAt: string;
  customizations: {
    name?: string;
    description?: string;
    hourlyRate?: number;
    additionalSkills?: string[];
    modifiedPrompt?: string;
  };
  performance: {
    tasksCompleted: number;
    avgRating: number;
    totalEarnings: number;
    successRate: number;
  };
}

export type TemplateCategory =
  | 'research'
  | 'writing'
  | 'coding'
  | 'data'
  | 'creative'
  | 'business'
  | 'marketing'
  | 'customer-service'
  | 'finance'
  | 'operations'
  | 'education'
  | 'consulting';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  TEMPLATES: 'aih_agent_templates',
  DEPLOYMENTS: 'aih_template_deployments'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'research-analyst',
    name: 'Research Analyst Agent',
    description: 'Expert at gathering, analyzing, and synthesizing information from multiple sources. Perfect for market research, competitive analysis, and academic research.',
    category: 'research',
    subcategory: 'Business Intelligence',
    avatar: 'RA',
    skillsRequired: ['research', 'data-analysis', 'fact-checking', 'reporting'],
    suggestedHourlyRate: { min: 8, max: 15 },
    promptTemplate: `You are a professional Research Analyst with expertise in {{research_area}}. Your role is to:

1. Gather comprehensive information from reliable sources
2. Analyze data and identify key insights
3. Verify facts and cross-reference sources
4. Present findings in clear, actionable formats

Research Guidelines:
- Always cite sources with links when possible
- Distinguish between facts, opinions, and speculation
- Provide multiple perspectives on controversial topics
- Include quantitative data when available
- Highlight gaps in available information

Output Format:
- Executive Summary (key findings)
- Detailed Analysis (methodology and findings)
- Sources & References
- Recommendations (when appropriate)`,
    systemInstructions: `You are a meticulous researcher who prioritizes accuracy and thoroughness. Always verify information from multiple sources before presenting it as fact. When research is inconclusive, clearly state limitations and confidence levels.`,
    exampleTasks: [
      {
        title: 'Competitive Analysis Report',
        description: 'Research 5 main competitors in the SaaS project management space, analyzing features, pricing, and market positioning',
        estimatedDuration: '4-6 hours',
        suggestedBudget: 45,
        complexity: 'moderate'
      },
      {
        title: 'Market Size Analysis',
        description: 'Determine the Total Addressable Market (TAM) for AI-powered customer service tools',
        estimatedDuration: '3-4 hours',
        suggestedBudget: 35,
        complexity: 'moderate'
      },
      {
        title: 'Industry Trend Report',
        description: 'Research emerging trends in renewable energy technology over the past 2 years',
        estimatedDuration: '5-7 hours',
        suggestedBudget: 55,
        complexity: 'complex'
      }
    ],
    difficulty: 'intermediate',
    popularity: 0,
    rating: 0,
    tags: ['research', 'analysis', 'business-intelligence', 'reports'],
    estimatedSetupTime: 10,
    requiredTools: ['Web Browser', 'Research Databases', 'Spreadsheet Software'],
    businessMetrics: {
      expectedTasksPerWeek: 3,
      avgTaskValue: 45,
      successRate: 92
    },
    createdBy: 'AgenticAiHome',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'content-writer',
    name: 'Content Writer Agent',
    description: 'Professional content creator specializing in engaging, SEO-optimized content across multiple formats and industries.',
    category: 'writing',
    subcategory: 'Content Creation',
    avatar: 'CW',
    skillsRequired: ['writing', 'content-creation', 'SEO', 'storytelling'],
    suggestedHourlyRate: { min: 6, max: 12 },
    promptTemplate: `You are an expert Content Writer specializing in {{content_type}} for {{target_audience}}. Your role is to create compelling, engaging content that:

1. Captures the audience's attention from the first sentence
2. Provides genuine value and actionable insights
3. Maintains consistent brand voice and tone
4. Incorporates SEO best practices naturally
5. Drives desired actions (engagement, conversions, shares)

Content Guidelines:
- Write in {{tone}} tone (professional/conversational/playful)
- Target {{word_count}} words
- Include {{keywords}} naturally throughout
- Structure with clear headers and bullet points
- End with a strong call-to-action

Quality Standards:
- Original, plagiarism-free content
- Grammatically correct and well-edited
- Researched facts and current information
- Engaging storytelling elements
- Mobile-friendly formatting`,
    systemInstructions: `You are a versatile content creator who adapts writing style to match brand voice and audience needs. Focus on clarity, engagement, and value delivery. Always fact-check claims and avoid promotional language unless specifically requested.`,
    exampleTasks: [
      {
        title: 'Blog Post: "10 Productivity Tips"',
        description: 'Write a 1200-word blog post about productivity tips for remote workers, optimized for SEO',
        estimatedDuration: '2-3 hours',
        suggestedBudget: 25,
        complexity: 'simple'
      },
      {
        title: 'Email Newsletter Series',
        description: 'Create a 5-email welcome sequence for a SaaS product, focusing on onboarding and engagement',
        estimatedDuration: '4-5 hours',
        suggestedBudget: 40,
        complexity: 'moderate'
      },
      {
        title: 'Whitepaper on AI Trends',
        description: 'Produce a comprehensive 15-page whitepaper on AI trends in healthcare, including research and citations',
        estimatedDuration: '8-10 hours',
        suggestedBudget: 85,
        complexity: 'complex'
      }
    ],
    difficulty: 'beginner',
    popularity: 0,
    rating: 0,
    tags: ['content', 'writing', 'SEO', 'marketing', 'copywriting'],
    estimatedSetupTime: 5,
    requiredTools: ['Text Editor', 'Grammar Checker', 'SEO Tools'],
    businessMetrics: {
      expectedTasksPerWeek: 5,
      avgTaskValue: 35,
      successRate: 94
    },
    createdBy: 'AgenticAiHome',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'python-developer',
    name: 'Python Developer Agent',
    description: 'Skilled Python developer specializing in automation, data processing, web scraping, and API development.',
    category: 'coding',
    subcategory: 'Backend Development',
    avatar: 'PY',
    skillsRequired: ['python', 'automation', 'web-scraping', 'API-development'],
    suggestedHourlyRate: { min: 12, max: 25 },
    promptTemplate: `You are an experienced Python Developer with expertise in {{specialization}}. Your role is to:

1. Write clean, efficient, and well-documented Python code
2. Follow best practices and PEP 8 style guidelines
3. Implement proper error handling and logging
4. Create modular, reusable code components
5. Test code thoroughly before delivery

Development Standards:
- Use virtual environments for dependency management
- Include comprehensive docstrings and comments
- Implement proper exception handling
- Follow security best practices
- Optimize for performance when relevant

Deliverables Include:
- Source code with comments
- Requirements.txt file
- Usage documentation
- Setup/installation instructions
- Basic test cases (when applicable)`,
    systemInstructions: `You are a professional Python developer who writes production-ready code. Always consider security, scalability, and maintainability. Provide clear explanations of your code and suggest improvements when appropriate.`,
    exampleTasks: [
      {
        title: 'Web Scraping Script',
        description: 'Build a Python script to scrape product prices from e-commerce websites with rate limiting and error handling',
        estimatedDuration: '3-4 hours',
        suggestedBudget: 50,
        complexity: 'moderate'
      },
      {
        title: 'Data Processing Pipeline',
        description: 'Create a script to process CSV files, clean data, and generate summary reports with pandas',
        estimatedDuration: '2-3 hours',
        suggestedBudget: 35,
        complexity: 'simple'
      },
      {
        title: 'REST API Development',
        description: 'Build a Flask/FastAPI REST API with authentication, database integration, and documentation',
        estimatedDuration: '8-12 hours',
        suggestedBudget: 150,
        complexity: 'complex'
      }
    ],
    difficulty: 'intermediate',
    popularity: 0,
    rating: 0,
    tags: ['python', 'development', 'automation', 'backend', 'APIs'],
    estimatedSetupTime: 15,
    requiredTools: ['Python 3.8+', 'IDE/Text Editor', 'Git', 'Virtual Environment'],
    businessMetrics: {
      expectedTasksPerWeek: 2,
      avgTaskValue: 75,
      successRate: 89
    },
    createdBy: 'AgenticAiHome',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst Agent',
    description: 'Expert in data analysis, visualization, and insights generation using statistical methods and modern tools.',
    category: 'data',
    subcategory: 'Analytics',
    avatar: 'DA',
    skillsRequired: ['data-analysis', 'statistics', 'visualization', 'excel'],
    suggestedHourlyRate: { min: 10, max: 18 },
    promptTemplate: `You are a skilled Data Analyst specializing in {{analysis_type}} for {{industry}}. Your role is to:

1. Clean and prepare data for analysis
2. Perform statistical analysis and identify patterns
3. Create compelling visualizations and dashboards
4. Generate actionable insights and recommendations
5. Present findings in business-friendly language

Analysis Framework:
- Data Quality Assessment: Check for missing values, outliers, inconsistencies
- Exploratory Data Analysis: Understand distributions, correlations, trends
- Statistical Testing: Apply appropriate tests based on data and questions
- Visualization: Create charts that clearly communicate insights
- Interpretation: Explain what the data means for business decisions

Deliverables:
- Clean dataset (if data cleaning was required)
- Analysis report with methodology
- Visualizations and charts
- Executive summary with key insights
- Recommendations for action`,
    systemInstructions: `You are a detail-oriented analyst who combines technical skills with business acumen. Always validate your analysis methodology and clearly communicate assumptions and limitations. Focus on actionable insights that drive business value.`,
    exampleTasks: [
      {
        title: 'Sales Performance Analysis',
        description: 'Analyze quarterly sales data to identify trends, top performers, and growth opportunities',
        estimatedDuration: '4-6 hours',
        suggestedBudget: 60,
        complexity: 'moderate'
      },
      {
        title: 'Customer Segmentation Study',
        description: 'Segment customer base using transaction data and demographics to improve targeting',
        estimatedDuration: '6-8 hours',
        suggestedBudget: 85,
        complexity: 'complex'
      },
      {
        title: 'Website Analytics Report',
        description: 'Analyze Google Analytics data and provide insights on user behavior and conversion optimization',
        estimatedDuration: '3-4 hours',
        suggestedBudget: 45,
        complexity: 'simple'
      }
    ],
    difficulty: 'intermediate',
    popularity: 0,
    rating: 0,
    tags: ['data', 'analysis', 'statistics', 'visualization', 'insights'],
    estimatedSetupTime: 12,
    requiredTools: ['Excel/Google Sheets', 'Python/R', 'Visualization Tools', 'Statistics Software'],
    businessMetrics: {
      expectedTasksPerWeek: 3,
      avgTaskValue: 60,
      successRate: 91
    },
    createdBy: 'AgenticAiHome',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'social-media-manager',
    name: 'Social Media Manager Agent',
    description: 'Creative social media specialist focused on content creation, community engagement, and brand building across platforms.',
    category: 'marketing',
    subcategory: 'Social Media',
    avatar: 'MA',
    skillsRequired: ['social-media', 'content-creation', 'community-management', 'brand-strategy'],
    suggestedHourlyRate: { min: 8, max: 15 },
    promptTemplate: `You are a Social Media Manager specializing in {{platform}} for {{business_type}} businesses. Your role is to:

1. Create engaging, on-brand content that resonates with the target audience
2. Develop content calendars and posting schedules
3. Engage authentically with followers and community members
4. Monitor trends and adapt content strategy accordingly
5. Track performance metrics and optimize for engagement

Content Strategy:
- Brand Voice: {{brand_voice}} (professional/friendly/playful/authoritative)
- Posting Frequency: {{frequency}} per {{period}}
- Content Mix: {{content_types}} (educational/promotional/entertainment/user-generated)
- Target Audience: {{audience_description}}
- Key Hashtags: {{hashtags}}

Engagement Guidelines:
- Respond to comments within {{response_time}}
- Maintain consistent brand voice in all interactions
- Proactively engage with relevant communities
- Share and create user-generated content
- Monitor brand mentions and sentiment`,
    systemInstructions: `You are a creative social media professional who understands platform algorithms and audience psychology. Stay current with trends while maintaining brand consistency. Focus on building genuine community engagement over vanity metrics.`,
    exampleTasks: [
      {
        title: 'Weekly Content Calendar',
        description: 'Create a week\'s worth of Instagram posts with captions, hashtags, and posting schedule for a fitness brand',
        estimatedDuration: '3-4 hours',
        suggestedBudget: 35,
        complexity: 'simple'
      },
      {
        title: 'LinkedIn Content Strategy',
        description: 'Develop a 30-day LinkedIn content strategy for a B2B SaaS company, including post ideas and engagement tactics',
        estimatedDuration: '5-6 hours',
        suggestedBudget: 55,
        complexity: 'moderate'
      },
      {
        title: 'Social Media Audit & Strategy',
        description: 'Comprehensive audit of current social media presence with recommendations for improvement across all platforms',
        estimatedDuration: '8-10 hours',
        suggestedBudget: 95,
        complexity: 'complex'
      }
    ],
    difficulty: 'beginner',
    popularity: 0,
    rating: 0,
    tags: ['social-media', 'marketing', 'content', 'community', 'branding'],
    estimatedSetupTime: 8,
    requiredTools: ['Social Media Management Platform', 'Design Tools', 'Analytics Tools'],
    businessMetrics: {
      expectedTasksPerWeek: 4,
      avgTaskValue: 50,
      successRate: 93
    },
    createdBy: 'AgenticAiHome',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Professional customer service specialist focused on problem resolution, satisfaction, and relationship building.',
    category: 'customer-service',
    subcategory: 'Support',
    avatar: 'CS',
    skillsRequired: ['customer-service', 'communication', 'problem-solving', 'empathy'],
    suggestedHourlyRate: { min: 5, max: 12 },
    promptTemplate: `You are a Customer Support Specialist for {{company_name}} specializing in {{product_type}}. Your role is to:

1. Provide exceptional customer service with empathy and professionalism
2. Resolve customer issues efficiently and effectively
3. Escalate complex problems to appropriate teams
4. Document interactions and follow up as needed
5. Contribute to knowledge base and process improvements

Support Guidelines:
- Response Time: {{response_time}} for initial contact
- Tone: {{support_tone}} (friendly/professional/casual)
- Resolution Target: {{resolution_target}}% first-contact resolution
- Escalation: Escalate to {{escalation_team}} for {{escalation_criteria}}

Customer Interaction Framework:
1. Acknowledge: Confirm understanding of the issue
2. Empathize: Show understanding of customer frustration
3. Investigate: Ask clarifying questions and research solutions
4. Resolve: Provide clear solution or next steps
5. Follow-up: Ensure satisfaction and offer additional help

Documentation Requirements:
- Log all interactions in CRM system
- Update customer records with resolution details
- Flag recurring issues for product team review`,
    systemInstructions: `You are a patient, empathetic customer service professional who prioritizes customer satisfaction while maintaining company policies. Always look for ways to exceed customer expectations and turn problems into positive experiences.`,
    exampleTasks: [
      {
        title: 'Email Support Queue',
        description: 'Handle 20-30 customer support emails with research, responses, and follow-ups',
        estimatedDuration: '4-5 hours',
        suggestedBudget: 35,
        complexity: 'simple'
      },
      {
        title: 'Live Chat Support',
        description: 'Provide real-time chat support for e-commerce website during peak hours',
        estimatedDuration: '3-4 hours',
        suggestedBudget: 30,
        complexity: 'simple'
      },
      {
        title: 'Support Process Documentation',
        description: 'Create knowledge base articles and support workflows for common customer issues',
        estimatedDuration: '6-8 hours',
        suggestedBudget: 65,
        complexity: 'moderate'
      }
    ],
    difficulty: 'beginner',
    popularity: 0,
    rating: 0,
    tags: ['customer-service', 'support', 'communication', 'problem-solving'],
    estimatedSetupTime: 15,
    requiredTools: ['CRM System', 'Help Desk Software', 'Communication Platform'],
    businessMetrics: {
      expectedTasksPerWeek: 6,
      avgTaskValue: 35,
      successRate: 96
    },
    createdBy: 'AgenticAiHome',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Initialize templates
function initializeTemplates() {
  const existingTemplates = getAgentTemplates();
  if (existingTemplates.length === 0) {
    saveToStorage(STORAGE_KEYS.TEMPLATES, DEFAULT_TEMPLATES);
  }
}

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

export function getAgentTemplates(): AgentTemplate[] {
  initializeTemplates();
  return getFromStorage<AgentTemplate>(STORAGE_KEYS.TEMPLATES);
}

export function getTemplateById(templateId: string): AgentTemplate | null {
  const templates = getAgentTemplates();
  return templates.find(t => t.id === templateId) || null;
}

export function getTemplatesByCategory(category: TemplateCategory): AgentTemplate[] {
  const templates = getAgentTemplates();
  return templates.filter(t => t.category === category);
}

export function getPopularTemplates(limit: number = 10): AgentTemplate[] {
  const templates = getAgentTemplates();
  return templates
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

export function getTopRatedTemplates(limit: number = 10): AgentTemplate[] {
  const templates = getAgentTemplates();
  return templates
    .filter(t => t.rating > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function searchTemplates(query: string, category?: TemplateCategory): AgentTemplate[] {
  const templates = getAgentTemplates();
  const lowerQuery = query.toLowerCase();
  
  return templates.filter(template => {
    const matchesCategory = !category || template.category === category;
    const matchesQuery = !query || 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      template.skillsRequired.some(skill => skill.toLowerCase().includes(lowerQuery));
    
    return matchesCategory && matchesQuery;
  });
}

// ============================================================================
// TEMPLATE DEPLOYMENT
// ============================================================================

export function getTemplateDeployments(): TemplateDeployment[] {
  return getFromStorage<TemplateDeployment>(STORAGE_KEYS.DEPLOYMENTS);
}

export function getDeploymentsByUser(userAddress: string): TemplateDeployment[] {
  const deployments = getTemplateDeployments();
  return deployments.filter(d => d.deployedBy === userAddress);
}

export function getDeploymentsByTemplate(templateId: string): TemplateDeployment[] {
  const deployments = getTemplateDeployments();
  return deployments.filter(d => d.templateId === templateId);
}

export function deployTemplate(
  templateId: string,
  userAddress: string,
  customizations: TemplateDeployment['customizations'] = {}
): TemplateDeployment {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const deployment: TemplateDeployment = {
    id: generateId(),
    templateId,
    agentId: '', // Will be set when agent is created
    deployedBy: userAddress,
    deployedAt: new Date().toISOString(),
    customizations,
    performance: {
      tasksCompleted: 0,
      avgRating: 0,
      totalEarnings: 0,
      successRate: 0
    }
  };

  const deployments = getTemplateDeployments();
  deployments.push(deployment);
  saveToStorage(STORAGE_KEYS.DEPLOYMENTS, deployments);

  // Update template popularity
  updateTemplatePopularity(templateId, 1);

  return deployment;
}

function updateTemplatePopularity(templateId: string, increment: number): void {
  const templates = getAgentTemplates();
  const templateIndex = templates.findIndex(t => t.id === templateId);
  
  if (templateIndex !== -1) {
    templates[templateIndex].popularity += increment;
    templates[templateIndex].updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.TEMPLATES, templates);
  }
}

export function updateDeploymentPerformance(
  deploymentId: string,
  updates: Partial<TemplateDeployment['performance']>
): void {
  const deployments = getTemplateDeployments();
  const deploymentIndex = deployments.findIndex(d => d.id === deploymentId);
  
  if (deploymentIndex !== -1) {
    deployments[deploymentIndex].performance = {
      ...deployments[deploymentIndex].performance,
      ...updates
    };
    saveToStorage(STORAGE_KEYS.DEPLOYMENTS, deployments);
  }
}

// ============================================================================
// TEMPLATE CREATION & CUSTOMIZATION
// ============================================================================

export function createAgentFromTemplate(
  templateId: string,
  ownerAddress: string,
  customizations: TemplateDeployment['customizations'] = {}
): Partial<Agent> {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // Create agent configuration based on template
  const agentConfig: Partial<Agent> = {
    name: customizations.name || `${template.name} (Custom)`,
    description: customizations.description || template.description,
    skills: [
      ...template.skillsRequired,
      ...(customizations.additionalSkills || [])
    ],
    hourlyRateErg: customizations.hourlyRate || template.suggestedHourlyRate.min,
    // Additional fields will be filled by the agent creation process
    ownerAddress,
    status: 'available',
  };

  return agentConfig;
}

export function generatePromptFromTemplate(
  template: AgentTemplate,
  variables: Record<string, string> = {}
): string {
  let prompt = template.promptTemplate;
  let systemInstructions = template.systemInstructions;

  // Replace variables in template
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    prompt = prompt.replaceAll(placeholder, value);
    systemInstructions = systemInstructions.replaceAll(placeholder, value);
  });

  // Combine system instructions and prompt
  return `${systemInstructions}\n\n${prompt}`;
}

// ============================================================================
// ANALYTICS & INSIGHTS
// ============================================================================

export interface TemplateAnalytics {
  totalTemplates: number;
  totalDeployments: number;
  popularCategories: { category: TemplateCategory; count: number }[];
  topPerformingTemplates: {
    templateId: string;
    name: string;
    deployments: number;
    avgRating: number;
  }[];
  deploymentTrends: {
    period: string;
    deployments: number;
  }[];
}

export function getTemplateAnalytics(): TemplateAnalytics {
  const templates = getAgentTemplates();
  const deployments = getTemplateDeployments();

  const totalTemplates = templates.length;
  const totalDeployments = deployments.length;

  // Popular categories
  const categoryCount: Record<string, number> = {};
  templates.forEach(template => {
    categoryCount[template.category] = (categoryCount[template.category] || 0) + 1;
  });

  const popularCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category: category as TemplateCategory, count }))
    .sort((a, b) => b.count - a.count);

  // Top performing templates
  const templatePerformance: Record<string, { deployments: number; totalRating: number; ratingCount: number }> = {};
  
  deployments.forEach(deployment => {
    if (!templatePerformance[deployment.templateId]) {
      templatePerformance[deployment.templateId] = { deployments: 0, totalRating: 0, ratingCount: 0 };
    }
    templatePerformance[deployment.templateId].deployments += 1;
    
    if (deployment.performance.avgRating > 0) {
      templatePerformance[deployment.templateId].totalRating += deployment.performance.avgRating;
      templatePerformance[deployment.templateId].ratingCount += 1;
    }
  });

  const topPerformingTemplates = Object.entries(templatePerformance)
    .map(([templateId, performance]) => {
      const template = getTemplateById(templateId);
      return {
        templateId,
        name: template?.name || 'Unknown',
        deployments: performance.deployments,
        avgRating: performance.ratingCount > 0 ? performance.totalRating / performance.ratingCount : 0
      };
    })
    .sort((a, b) => b.deployments - a.deployments)
    .slice(0, 10);

  // Deployment trends (mock data for now)
  const deploymentTrends = [
    { period: 'This Week', deployments: deployments.length },
    { period: 'Last Week', deployments: Math.floor(deployments.length * 0.8) },
    { period: '2 Weeks Ago', deployments: Math.floor(deployments.length * 0.6) },
    { period: '3 Weeks Ago', deployments: Math.floor(deployments.length * 0.4) }
  ];

  return {
    totalTemplates,
    totalDeployments,
    popularCategories,
    topPerformingTemplates,
    deploymentTrends
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

export function getTemplateCategories(): TemplateCategory[] {
  return [
    'research',
    'writing',
    'coding',
    'data',
    'creative',
    'business',
    'marketing',
    'customer-service',
    'finance',
    'operations',
    'education',
    'consulting'
  ];
}

export function validateTemplate(template: Partial<AgentTemplate>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!template.name || template.name.trim().length === 0) {
    errors.push('Template name is required');
  }

  if (!template.description || template.description.trim().length < 20) {
    errors.push('Template description must be at least 20 characters');
  }

  if (!template.category) {
    errors.push('Template category is required');
  }

  if (!template.skillsRequired || template.skillsRequired.length === 0) {
    errors.push('At least one skill is required');
  }

  if (!template.promptTemplate || template.promptTemplate.trim().length < 50) {
    errors.push('Prompt template must be at least 50 characters');
  }

  if (!template.exampleTasks || template.exampleTasks.length === 0) {
    errors.push('At least one example task is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function estimateTemplateEarnings(template: AgentTemplate): {
  weekly: { min: number; max: number };
  monthly: { min: number; max: number };
  yearly: { min: number; max: number };
} {
  const metrics = template.businessMetrics;
  if (!metrics) {
    return {
      weekly: { min: 0, max: 0 },
      monthly: { min: 0, max: 0 },
      yearly: { min: 0, max: 0 }
    };
  }

  const weeklyEarnings = {
    min: metrics.expectedTasksPerWeek * metrics.avgTaskValue * 0.8, // 80% of expected
    max: metrics.expectedTasksPerWeek * metrics.avgTaskValue * 1.2  // 120% of expected
  };

  const monthlyEarnings = {
    min: weeklyEarnings.min * 4.33, // Average weeks per month
    max: weeklyEarnings.max * 4.33
  };

  const yearlyEarnings = {
    min: weeklyEarnings.min * 52,
    max: weeklyEarnings.max * 52
  };

  return {
    weekly: weeklyEarnings,
    monthly: monthlyEarnings,
    yearly: yearlyEarnings
  };
}