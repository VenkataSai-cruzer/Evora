# Contributing to Jamming

## Welcome

Thank you for your interest in contributing to Jamming! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#1-code-of-conduct)
2. [Getting Started](#2-getting-started)
3. [Development Environment](#3-development-environment)
4. [Project Structure](#4-project-structure)
5. [Development Workflow](#5-development-workflow)
6. [Pull Request Guidelines](#6-pull-request-guidelines)
7. [Coding Standards](#7-coding-standards)
8. [Testing](#8-testing)
9. [Documentation](#9-documentation)
10. [Questions & Support](#10-questions--support)

---

## 1. Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone.

**Our Pledge:**
- Be respectful and inclusive
- Use welcoming and inclusive language
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

**Unacceptable behavior:**
- Harassment, intimidation, or discrimination
- Trolling, insulting, or derogatory comments
- Publishing others' private information
- Other unprofessional conduct

---

## 2. Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18.x LTS or 20.x LTS |
| npm | Latest |
| PostgreSQL | 15+ |
| Git | Latest |

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/jamming.git
cd jamming

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your local configuration

# 4. Set up the database
npx prisma migrate dev
npx prisma db seed

# 5. Start the development server
npm run dev

# 6. Open http://localhost:3000
```

### Environment Variables

See `.env.example` for all required environment variables. Key ones:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/jamming"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
QR_SECRET_KEY="your-qr-secret"
```

---

## 3. Development Environment

### Recommended Tools

- **Editor:** VS Code with ESLint + Prettier extensions
- **Database GUI:** TablePlus, DBeaver, or pgAdmin
- **API Testing:** Postman, Insomnia, or Bruno
- **Git GUI:** GitKraken, SourceTree (optional)

### VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "github.vscode-github-actions"
  ]
}
```

### Git Hooks

We use Husky for pre-commit hooks:

```bash
# Hooks run automatically on commit
# - Lint staged files
# - Type check
# - Run unit tests for changed files
```

---

## 4. Project Structure

```
jamming/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (public)/     # Public routes
│   │   ├── (auth)/       # Auth routes
│   │   ├── (dashboard)/  # Dashboard routes
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── ui/           # Shared UI components
│   │   ├── events/       # Event components
│   │   ├── tickets/      # Ticket components
│   │   ├── scanner/      # Scanner components
│   │   ├── dashboard/    # Dashboard components
│   │   └── layout/       # Layout components
│   ├── lib/              # Core utilities
│   │   ├── services/     # Business logic services
│   │   ├── validations/  # Zod schemas
│   │   ├── utils/        # Helper functions
│   │   └── constants.ts  # App constants
│   ├── hooks/            # Custom React hooks
│   └── providers/        # React context providers
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts           # Seed data
├── docs/                 # Project documentation (30 documents)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── public/               # Static assets
```

---

## 5. Development Workflow

### Branching

```bash
# Create a feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### Making Changes

```bash
# Stage and commit with conventional commit message
git add <files>
git commit -m "feat(scope): description of changes"

# Keep your branch updated
git fetch origin
git rebase origin/develop
# OR: git merge origin/develop
```

### Before Pushing

```bash
# Run the full test suite
npm run lint
npm run typecheck
npm test

# Build to verify no errors
npm run build
```

---

## 6. Pull Request Guidelines

### Creating a PR

1. Push your branch: `git push origin feature/my-feature`
2. Create a PR against `develop` using the template
3. Fill out the PR template completely
4. Add screenshots for UI changes
5. Request review from the team

### PR Checklist

- [ ] Code follows [Coding Standards](./28-Coding-Standards.md)
- [ ] Tests pass and new tests added
- [ ] Lint and typecheck pass
- [ ] No console.log statements
- [ ] Error handling is complete
- [ ] Accessibility basics covered
- [ ] Mobile responsive verified
- [ ] Documentation updated (if applicable)

### Review Process

1. At least 1 approval required for `develop` PRs
2. At least 2 approvals required for `main` PRs
3. Address all reviewer comments
4. Re-request review after addressing feedback
5. Squash and merge (preferred) or merge commit

---

## 7. Coding Standards

See [28-Coding-Standards.md](./28-Coding-Standards.md) for full details.

### Quick Reference

- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS with custom design tokens
- **Components:** Functional components with explicit props
- **State:** React Query (server), Zustand (global), useState (local)
- **Forms:** React Hook Form + Zod validation

### Naming

| Entity | Convention |
|--------|-----------|
| Components | `PascalCase.tsx` |
| Utilities | `kebab-case.ts` |
| Functions | `camelCase` |
| Types | `PascalCase` |
| Constants | `UPPER_SNAKE_CASE` |

---

## 8. Testing

See [27-Testing-Strategy.md](./27-Testing-Strategy.md) for full details.

### Running Tests

```bash
npm test                    # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e            # End-to-end tests
npm run test:coverage       # With coverage report
```

### Testing Philosophy

- **80%+** overall coverage target
- **90%+** for service/business logic
- Test behavior, not implementation
- Write tests before or alongside code (TDD when possible)

---

## 9. Documentation

All documentation is in Markdown in the `/docs` folder. The 30 documents cover:

| Category | Documents |
|----------|-----------|
| Product | Vision, PRD, Scope, Personas, Stories |
| Requirements | Functional, NonFunctional, Metrics |
| Design | User Flows, Sitemap, IA, Wireframes, Design System, Components |
| Technical | Architecture, Database, Auth, API, Payments, Tickets |
| Security | Blockchain, QR, Security, Logging |
| Operations | Roadmap, Deployment, Testing, Coding, Git, Contributing |

### Documentation Guidelines

- Keep documentation up to date with code changes
- Include documentation changes in the same PR as code changes
- Use clear, accessible language
- Include code examples where helpful

---

## 10. Questions & Support

### Communication Channels

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Bug reports, feature requests |
| Pull Requests | Code review and discussion |
| Internal Chat (Slack/Discord) | Quick questions |

### Filing a Bug

When filing a bug report, please include:
1. Description of the issue
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots (if applicable)
5. Browser/device information

### Feature Requests

When suggesting a feature:
1. Describe the problem you're solving
2. Propose a solution
3. Consider alternatives
4. Explain the benefit to users

---

## Thank You

Every contribution, whether code, documentation, design, or feedback, makes Jamming better for our music community. Thank you for your time and effort! 🎵
