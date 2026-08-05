# Contributing to ContentAgent

Thank you for your interest in contributing to ContentAgent! This document outlines the guidelines and processes for contributing to this project.

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Clerk account (for development and testing)

### Development Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd ContentAgent
cd server && npm install
cd ../client && npm install
```

2. **Environment Setup**
```bash
# Env vars are split by side — there is no root-level .env.example
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your API keys and configuration
```

3. **Run the Application**
```bash
# Start backend server
cd server
npm run dev

# Start frontend client (in separate terminal)
cd client
npm run dev
```

4. **Run Tests**
```bash
cd server
npm run test
```

## Contribution Guidelines

### Code Quality

#### Commit Standards
- Use conventional commit messages:
  - `feat: add new feature`
  - `fix: resolve critical bug`
  - `docs: update README`

#### Code Style
- Follow TypeScript and ESLint rules
- Use 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line structures

### Pull Requests

1. **Branch Naming**
   - Feature branches: `feature/<feature-name>`
   - Bug fix branches: `fix/<bug-description>`
   - Hotfix branches: `hotfix/<issue-description>`

2. **Review Process**
   - Create pull requests from feature branches
   - Include clear description of changes
   - Request reviews from appropriate team members
   - Wait for all required approvals before merging

3. **Testing**
   - Ensure all existing tests pass
   - Add tests for new functionality
   - Run full test suite before submitting PR

## Security Guidelines

### Never Commit
- Environment files (`.env`, `.env.*`)
- Secrets, API keys, or tokens
- Credentials or passwords
- Private information

### Security Best Practices
- Validate all user inputs
- Use environment variables for configuration
- Implement proper authentication and authorization
- Follow the security guidelines outlined in [CLAUDE.md](CLAUDE.md)

## Documentation

- Update documentation (`README.md`, `CLAUDE.md`) for new features
- Maintain clear, concise documentation
- Document API endpoints and usage

## Repository Structure

```
ContentAgent/
├── server/                    # Backend application
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── lib/              # Libraries and utilities
│   │   ├── agents/           # AI agents
│   │   ├── middleware/       # Express middleware
│   │   └── ...              # Other source files
│   ├── tests/               # Test files
│   ├── Dockerfile            # Local-dev-only, used by docker-compose.yml
│   ├── .env.example           # Server-side env vars (validated by src/config.ts)
│   └── ...                  # Build and configuration files
│
├── client/                    # Frontend application
│   ├── src/
│   │   ├── pages/            # React pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   └── ...               # Other source files
│   ├── Dockerfile            # Local-dev-only, used by docker-compose.yml
│   ├── .env.example           # Client-side env vars (VITE_-prefixed only)
│   └── ...                  # Build and configuration files
│
├── .github/                  # GitHub configuration
│   └── workflows/            # CI/CD workflows
│
├── README.md                 # Project README
├── CONTRIBUTING.md           # Contribution guidelines
├── CLAUDE.md                 # Full dev context
├── ARCHITECTURE.md           # Verified current-state data flows
├── CHANGELOG.md              # History of all changes
├── REVIEW_FINDINGS.md         # Open findings from the most recent full-codebase review
├── UI_UX_DOCUMENTATION.md     # Design-system reference + brand differentiation analysis
├── render.yaml                # Render Blueprint for server deployment
├── docker-compose.yml         # Local-dev-only Postgres/Redis stand-ins (not part of production)
└── ...                       # Other project files
```

> **Note:** there is no root-level `.env.example` — env vars are split into
> `server/.env.example` and `client/.env.example` (see the Environment Setup
> step above).

## Code of Conduct

We strive to create an inclusive and welcoming environment for all contributors. Please treat everyone with respect and kindness, regardless of their background or experience level.

## Reporting Issues

If you encounter any issues or have questions:

1. Check existing issues and pull requests
2. Open a new issue with a clear title and description
3. Include relevant details such as:
   - Error messages
   - Steps to reproduce
   - Environment information
   - Expected vs. actual behavior

## License

This project is private — all rights reserved. By contributing, you agree that your contributions become part of the project under the same terms.