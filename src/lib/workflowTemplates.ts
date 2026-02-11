import { Workflow } from './workflows';

export const workflowTemplates: Workflow[] = [
  {
    id: 'website-build',
    name: 'Website Build',
    description: 'Complete website development from design to deployment',
    steps: [
      {
        title: 'Website Design & Planning',
        description: 'Create wireframes, mockups, and design system. Define site structure, user flows, and technical requirements.',
        skillsRequired: ['UI/UX Design', 'Figma', 'Web Design', 'User Experience'],
        budgetPercentage: 20,
      },
      {
        title: 'Frontend Development',
        description: 'Build responsive frontend using modern frameworks. Implement designs with pixel-perfect accuracy and smooth interactions.',
        skillsRequired: ['React', 'TypeScript', 'CSS', 'Frontend Development', 'Responsive Design'],
        budgetPercentage: 30,
        dependsOn: 0,
      },
      {
        title: 'Backend Development',
        description: 'Develop API endpoints, database schema, authentication system, and server-side logic.',
        skillsRequired: ['Node.js', 'Database Design', 'API Development', 'Backend Development'],
        budgetPercentage: 30,
        dependsOn: 0,
      },
      {
        title: 'Testing & Quality Assurance',
        description: 'Comprehensive testing including unit tests, integration tests, performance testing, and cross-browser compatibility.',
        skillsRequired: ['Testing', 'Quality Assurance', 'Automation Testing', 'Performance Testing'],
        budgetPercentage: 10,
        dependsOn: 1,
      },
      {
        title: 'Deployment & Launch',
        description: 'Deploy to production, configure hosting, set up monitoring, and ensure everything is running smoothly.',
        skillsRequired: ['DevOps', 'Deployment', 'Cloud Services', 'Monitoring'],
        budgetPercentage: 10,
        dependsOn: 3,
      },
    ],
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis Pipeline',
    description: 'Complete data analysis from collection to actionable insights',
    steps: [
      {
        title: 'Data Collection & Gathering',
        description: 'Identify data sources, collect raw data, and establish data pipelines. Set up automated data ingestion processes.',
        skillsRequired: ['Data Engineering', 'ETL', 'Data Collection', 'APIs'],
        budgetPercentage: 15,
      },
      {
        title: 'Data Cleaning & Preprocessing',
        description: 'Clean, validate, and preprocess raw data. Handle missing values, outliers, and format inconsistencies.',
        skillsRequired: ['Python', 'Data Cleaning', 'Pandas', 'Data Processing'],
        budgetPercentage: 20,
        dependsOn: 0,
      },
      {
        title: 'Data Analysis & Modeling',
        description: 'Perform statistical analysis, build models, and extract insights. Apply machine learning techniques if needed.',
        skillsRequired: ['Data Analysis', 'Statistics', 'Machine Learning', 'Python', 'R'],
        budgetPercentage: 35,
        dependsOn: 1,
      },
      {
        title: 'Data Visualization',
        description: 'Create interactive charts, dashboards, and visual representations of findings. Make data accessible and understandable.',
        skillsRequired: ['Data Visualization', 'Tableau', 'D3.js', 'Chart.js', 'Dashboard Design'],
        budgetPercentage: 15,
        dependsOn: 2,
      },
      {
        title: 'Report & Recommendations',
        description: 'Compile comprehensive report with findings, insights, and actionable recommendations for stakeholders.',
        skillsRequired: ['Technical Writing', 'Business Analysis', 'Presentation', 'Report Writing'],
        budgetPercentage: 15,
        dependsOn: 3,
      },
    ],
  },
  {
    id: 'content-pipeline',
    name: 'Content Creation Pipeline',
    description: 'Professional content creation from research to publication',
    steps: [
      {
        title: 'Research & Content Strategy',
        description: 'Market research, audience analysis, keyword research, and content strategy development. Define content goals and KPIs.',
        skillsRequired: ['Content Strategy', 'Market Research', 'SEO Research', 'Content Planning'],
        budgetPercentage: 20,
      },
      {
        title: 'Content Writing & Creation',
        description: 'Write high-quality, engaging content based on strategy. Create original articles, blog posts, or marketing copy.',
        skillsRequired: ['Content Writing', 'Copywriting', 'SEO Writing', 'Creative Writing'],
        budgetPercentage: 30,
        dependsOn: 0,
      },
      {
        title: 'Editing & Proofreading',
        description: 'Professional editing for grammar, style, flow, and brand consistency. Ensure content meets quality standards.',
        skillsRequired: ['Editing', 'Proofreading', 'Copy Editing', 'Content Review'],
        budgetPercentage: 20,
        dependsOn: 1,
      },
      {
        title: 'Graphics & Visual Design',
        description: 'Create compelling visuals, infographics, featured images, and multimedia elements to enhance content.',
        skillsRequired: ['Graphic Design', 'Photoshop', 'Illustrator', 'Infographic Design', 'Visual Content'],
        budgetPercentage: 15,
        dependsOn: 1,
      },
      {
        title: 'Publishing & Distribution',
        description: 'Format for publication platforms, optimize for SEO, schedule posts, and execute distribution strategy.',
        skillsRequired: ['Content Management', 'SEO', 'Social Media', 'Content Distribution'],
        budgetPercentage: 15,
        dependsOn: 2,
      },
    ],
  },
  {
    id: 'smart-contract',
    name: 'Smart Contract Development',
    description: 'End-to-end smart contract development and deployment',
    steps: [
      {
        title: 'Requirements & Specification',
        description: 'Define contract requirements, write technical specification, design contract architecture and tokenomics.',
        skillsRequired: ['Smart Contracts', 'Technical Writing', 'Blockchain Architecture', 'Requirements Analysis'],
        budgetPercentage: 15,
      },
      {
        title: 'Smart Contract Development',
        description: 'Write, implement, and optimize smart contract code. Follow best practices for security and gas efficiency.',
        skillsRequired: ['Solidity', 'Smart Contract Development', 'Blockchain Development', 'ErgoScript'],
        budgetPercentage: 35,
        dependsOn: 0,
      },
      {
        title: 'Testing & Validation',
        description: 'Comprehensive testing including unit tests, integration tests, and edge case validation. Test on testnets.',
        skillsRequired: ['Smart Contract Testing', 'Unit Testing', 'Blockchain Testing', 'Test Automation'],
        budgetPercentage: 25,
        dependsOn: 1,
      },
      {
        title: 'Security Audit',
        description: 'Professional security audit to identify vulnerabilities, reentrancy attacks, and other security issues.',
        skillsRequired: ['Smart Contract Security', 'Security Audit', 'Penetration Testing', 'Code Review'],
        budgetPercentage: 15,
        dependsOn: 2,
      },
      {
        title: 'Deployment & Documentation',
        description: 'Deploy to mainnet, verify contracts, create user documentation, and provide deployment artifacts.',
        skillsRequired: ['Smart Contract Deployment', 'Technical Documentation', 'DevOps', 'Blockchain Infrastructure'],
        budgetPercentage: 10,
        dependsOn: 3,
      },
    ],
  },
  {
    id: 'mobile-app',
    name: 'Mobile App Development',
    description: 'Complete mobile application development for iOS and Android',
    steps: [
      {
        title: 'App Design & Prototyping',
        description: 'Create user interface designs, user experience flows, and interactive prototypes. Define app architecture.',
        skillsRequired: ['Mobile Design', 'UI/UX Design', 'Prototyping', 'Figma', 'User Experience'],
        budgetPercentage: 20,
      },
      {
        title: 'Frontend Development',
        description: 'Develop mobile app frontend using React Native, Flutter, or native technologies. Implement designs and user interactions.',
        skillsRequired: ['React Native', 'Flutter', 'Mobile Development', 'iOS', 'Android'],
        budgetPercentage: 35,
        dependsOn: 0,
      },
      {
        title: 'Backend Integration',
        description: 'Integrate with backend APIs, implement authentication, data synchronization, and offline functionality.',
        skillsRequired: ['API Integration', 'Mobile Backend', 'Authentication', 'Data Synchronization'],
        budgetPercentage: 20,
        dependsOn: 0,
      },
      {
        title: 'Testing & Quality Assurance',
        description: 'Test on multiple devices, perform usability testing, automated testing, and performance optimization.',
        skillsRequired: ['Mobile Testing', 'Quality Assurance', 'Performance Testing', 'Usability Testing'],
        budgetPercentage: 15,
        dependsOn: 1,
      },
      {
        title: 'App Store Deployment',
        description: 'Prepare app store listings, submit to App Store and Google Play, handle review process, and launch.',
        skillsRequired: ['App Store Optimization', 'Mobile Deployment', 'App Store Guidelines', 'Launch Strategy'],
        budgetPercentage: 10,
        dependsOn: 3,
      },
    ],
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Comprehensive marketing campaign from strategy to execution',
    steps: [
      {
        title: 'Market Research & Strategy',
        description: 'Analyze target market, competitive landscape, and develop comprehensive marketing strategy and campaign plan.',
        skillsRequired: ['Market Research', 'Marketing Strategy', 'Competitive Analysis', 'Campaign Planning'],
        budgetPercentage: 25,
      },
      {
        title: 'Creative Development',
        description: 'Develop campaign creative assets including copy, visuals, videos, and branded materials across all channels.',
        skillsRequired: ['Creative Direction', 'Graphic Design', 'Copywriting', 'Video Production', 'Brand Design'],
        budgetPercentage: 30,
        dependsOn: 0,
      },
      {
        title: 'Campaign Execution',
        description: 'Launch and manage campaigns across digital channels including social media, email, PPC, and content marketing.',
        skillsRequired: ['Digital Marketing', 'Social Media Marketing', 'PPC', 'Email Marketing', 'Campaign Management'],
        budgetPercentage: 30,
        dependsOn: 1,
      },
      {
        title: 'Analytics & Optimization',
        description: 'Track campaign performance, analyze metrics, optimize for better results, and provide detailed performance report.',
        skillsRequired: ['Marketing Analytics', 'Google Analytics', 'Performance Optimization', 'Data Analysis'],
        budgetPercentage: 15,
        dependsOn: 2,
      },
    ],
  },
];

export function getWorkflowTemplate(id: string): Workflow | undefined {
  return workflowTemplates.find(template => template.id === id);
}

export function getWorkflowTemplatesByCategory(): { [category: string]: Workflow[] } {
  return {
    'Development': [
      workflowTemplates.find(t => t.id === 'website-build')!,
      workflowTemplates.find(t => t.id === 'mobile-app')!,
      workflowTemplates.find(t => t.id === 'smart-contract')!,
    ],
    'Data & Analytics': [
      workflowTemplates.find(t => t.id === 'data-analysis')!,
    ],
    'Content & Marketing': [
      workflowTemplates.find(t => t.id === 'content-pipeline')!,
      workflowTemplates.find(t => t.id === 'marketing-campaign')!,
    ],
  };
}