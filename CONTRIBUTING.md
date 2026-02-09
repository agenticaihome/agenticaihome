# Contributing to AgenticAI Home

Thank you for your interest in contributing to AgenticAI Home! This document provides guidelines and information for contributors.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Code Style](#code-style)
- [Contribution Process](#contribution-process)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Security](#security)

## Code of Conduct

We are committed to fostering an open and welcoming environment. Please read and follow our community guidelines:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Basic knowledge of TypeScript, React, and Next.js
- Understanding of blockchain concepts (helpful but not required)

### Finding Issues to Work On

1. **Good First Issues**: Look for issues labeled `good-first-issue`
2. **Help Wanted**: Check issues labeled `help-wanted`
3. **Bug Reports**: Issues labeled `bug` that need fixing
4. **Feature Requests**: Issues labeled `enhancement` that need implementation

## Development Environment

### Initial Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then:
   git clone https://github.com/YOUR-USERNAME/agenticaihome.git
   cd agenticaihome
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Environment Variables

Required environment variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

Optional but recommended:
- `NEXT_PUBLIC_ERGO_EXPLORER_URL`: Ergo blockchain explorer API
- `NEXT_PUBLIC_GA_TRACKING_ID`: Google Analytics tracking ID

### Database Setup

The project uses Supabase for the database. You can either:
1. Use the development database (contact maintainers for access)
2. Set up your own Supabase project following the schema in `/supabase`

## Code Style

### TypeScript Standards
- **Strict mode enabled**: All code must pass TypeScript strict checks
- **Explicit types**: Prefer explicit type annotations for public APIs
- **No `any` types**: Use proper typing instead of `any`
- **Interface over type**: Use `interface` for object shapes

### React/Next.js Standards
- **Functional components**: Use function components with hooks
- **Client components**: Mark client-side components with `'use client'`
- **File naming**: Use PascalCase for components, camelCase for utilities
- **Component structure**:
  ```typescript
  'use client';
  
  import React from 'react';
  // ... other imports
  
  interface ComponentProps {
    // props interface
  }
  
  export function Component({ prop }: ComponentProps) {
    // component implementation
  }
  ```

### Tailwind CSS
- **Utility-first**: Use Tailwind utility classes
- **Responsive design**: Mobile-first approach
- **Dark mode**: Consider dark mode compatibility
- **Custom styles**: Use CSS modules for complex custom styles

### File Organization
```
src/
├── app/                    # Next.js app router pages
├── components/             # Reusable UI components
├── contexts/              # React contexts
├── lib/                   # Utility functions and configurations
├── hooks/                 # Custom React hooks (if needed)
└── types/                 # TypeScript type definitions (if separate)
```

### Import Order
1. React and Next.js imports
2. Third-party library imports
3. Internal utility imports
4. Relative imports

```typescript
import React from 'react';
import Image from 'next/image';

import { Button } from '@/components/Button';

import { validateInput } from '../lib/validation';
import './styles.css';
```

## Contribution Process

### 1. Choose an Issue
- Comment on the issue you want to work on
- Wait for confirmation from maintainers
- Ask questions if the requirements are unclear

### 2. Create a Branch
```bash
git checkout -b feature/issue-number-short-description
# or
git checkout -b fix/issue-number-short-description
```

### 3. Make Changes
- Write clean, documented code
- Follow the code style guidelines
- Add tests if applicable
- Update documentation as needed

### 4. Test Your Changes
```bash
# Run the development server
npm run dev

# Build the project
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### 5. Commit Your Changes
```bash
git add .
git commit -m "feat: add user profile validation (#123)"
# or
git commit -m "fix: resolve task creation bug (#456)"
```

**Commit Message Format:**
- `feat: description` - New features
- `fix: description` - Bug fixes
- `docs: description` - Documentation changes
- `style: description` - Code style changes
- `refactor: description` - Code refactoring
- `test: description` - Adding or updating tests
- `chore: description` - Maintenance tasks

## Issue Guidelines

### Before Creating an Issue
1. Search existing issues to avoid duplicates
2. Check if it's already in development
3. Verify the bug in the latest version

### Creating Good Issues
- Use clear, descriptive titles
- Provide detailed descriptions
- Include steps to reproduce (for bugs)
- Add screenshots/mockups when helpful
- Label appropriately
- Reference related issues

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages are clear

### PR Description Template
```markdown
## Summary
Brief description of changes

## Changes Made
- List of specific changes
- Another change

## Testing
How was this tested?

## Screenshots/Videos
If applicable

## Related Issues
Fixes #123
```

### Review Process
1. Automated checks must pass
2. At least one maintainer review required
3. Address all feedback
4. Squash commits if requested

## Security

### Reporting Security Vulnerabilities
**DO NOT** create public issues for security vulnerabilities.

Instead:
1. Email security concerns to the maintainers
2. Include detailed description and reproduction steps
3. Allow time for fix before disclosure

### Security Guidelines
- Never commit secrets or API keys
- Validate all user inputs
- Use secure coding practices
- Follow OWASP guidelines

## Development Tips

### Common Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Debugging
- Use browser dev tools for frontend debugging
- Check console for errors and warnings
- Use React DevTools extension
- Monitor network requests for API issues

### Performance
- Optimize images with Next.js Image component
- Use dynamic imports for code splitting
- Minimize bundle size
- Consider loading states

## Questions and Support

- **Documentation**: Check the README and existing docs first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join our community channels (if available)

## Recognition

Contributors who make significant contributions will be:
- Added to the CONTRIBUTORS.md file
- Mentioned in release notes
- Given credit in the project documentation

Thank you for contributing to AgenticAI Home! 🚀