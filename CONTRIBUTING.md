# Contributing to Pensieve

Thank you for your interest in contributing to Pensieve! This document outlines the guidelines and processes for contributing to this project.

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Clerk account (for development and testing)

### Development Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd Pensieve
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

### Automated security CI
Every push/PR to `main` runs deterministic scanners in
`.github/workflows/ci.yml`:

| Job | Tool | What it gates |
|---|---|---|
| `npm-audit` | `npm audit` | High/critical dependency CVEs (allowlisted advisories documented in the workflow) |
| `secrets-scan` | [TruffleHog](https://github.com/trufflesecurity/trufflehog) | Verified secrets in git history / PR diff |
| `sast` | [Semgrep](https://github.com/semgrep/semgrep) | TypeScript/Node/React/OWASP insecure patterns under `server/src` + `client/src` |
| `vuln-scan` | [Trivy](https://github.com/aquasecurity/trivy) | CRITICAL filesystem vulns + CRITICAL/HIGH IaC (Dockerfiles, compose, `render.yaml`) |

PR security review (optional LLM): `.github/workflows/claude-security-review.yml`
uses Anthropic’s Claude Code Security Review. Set repo secret `CLAUDE_API_KEY`
(Claude API **and** Claude Code enabled). Without the secret the job skips.
Require approval for workflows from first-time external contributors.

Release / monthly red-team (manual, staging only): see
`.github/security/llm-redteam.md` (PyRIT + optional Nuclei).

## Documentation

- Update documentation (`README.md`, `CLAUDE.md`) for new features
- Maintain clear, concise documentation
- Document API endpoints and usage

## Repository Structure

```
Pensieve/
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
│   ├── workflows/            # CI/CD + Claude security review
│   └── security/             # Scan instructions + LLM red-team runbook
│
├── README.md                 # Project README
├── CONTRIBUTING.md           # Contribution guidelines
├── CLAUDE.md                 # Full dev context
├── ARCHITECTURE.md           # Verified current-state data flows
├── CHANGELOG.md              # History of all changes
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