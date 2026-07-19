# Git Workflow — Jamming Events Platform

## 1. Branch Strategy

### Main Branches

```
main (production)
  └── develop (integration branch)
        ├── feature/event-creation
        ├── feature/qr-scanner
        └── fix/double-rsvp-bug
```

| Branch | Purpose | Protection |
|--------|---------|-----------|
| `main` | Production-ready code | Protected, requires PR review |
| `develop` | Integration branch for features | Protected, requires PR review |

### Supporting Branches

| Branch Prefix | Purpose | Branch From | Merge Into |
|---------------|---------|-------------|------------|
| `feature/*` | New features | `develop` | `develop` |
| `fix/*` | Bug fixes | `develop` | `develop` |
| `hotfix/*` | Urgent production fixes | `main` | `main` + `develop` |
| `release/*` | Release preparation | `develop` | `main` + `develop` |
| `chore/*` | Tooling, dependencies | `develop` | `develop` |

### Branch Naming

```
feature/<short-description>
fix/<issue-id>-<short-description>
hotfix/<issue-id>-<short-description>
release/v<version>

Examples:
feature/create-event-form
fix/42-double-rsvp-bug
hotfix/45-production-crash
release/v1.0.0
```

---

## 2. Workflow

### Feature Development

```bash
# 1. Create branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/create-event-form

# 2. Make changes, commit regularly
git add .
git commit -m "feat(events): add event creation form validation"

# 3. Keep branch updated with develop
git fetch origin
git rebase origin/develop
# OR: git merge origin/develop

# 4. Push and create PR
git push origin feature/create-event-form
# Create PR: feature/create-event-form → develop

# 5. After PR approval and merge, delete branch
git branch -d feature/create-event-form
git push origin --delete feature/create-event-form
```

### Hotfix Workflow

```bash
# 1. Create from main
git checkout main
git pull origin main
git checkout -b hotfix/45-production-crash

# 2. Fix and commit
git add .
git commit -m "fix(scanner): null pointer on empty scan result"

# 3. PR to main (urgent, expedited review)
git push origin hotfix/45-production-crash
# PR: hotfix/45-production-crash → main

# 4. After merge, also merge to develop
git checkout develop
git merge main
git push origin develop
```

### Release Workflow

```bash
# 1. Create release branch
git checkout develop
git checkout -b release/v1.0.0

# 2. Bump version, update changelog
# (edit package.json version)

# 3. Final testing and bug fixes on release branch

# 4. Merge to main (with tag)
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags

# 5. Merge back to develop
git checkout develop
git merge release/v1.0.0
git push origin develop

# 6. Delete release branch
git branch -d release/v1.0.0
```

---

## 3. Pull Request Process

### PR Template

```markdown
## Description
Brief description of the changes.

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Test

## Related Issues
Closes #123

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] No console.log or debug code
- [ ] Error handling added
- [ ] Accessibility considered
- [ ] Mobile responsive

## Screenshots (if UI changes)
```

### PR Guidelines

1. **Small PRs preferred** — Max 400 lines changed (exceptions for generated files)
2. **One feature per PR** — Don't mix concerns
3. **Descriptive title** — e.g., "feat(events): add create event form"
4. **Self-review first** — Review your own diff before requesting reviews
5. **Respond to feedback** — Address all comments

### Review Requirements

| Branch | Required Reviewers | Approval Rule |
|--------|-------------------|---------------|
| `develop` | 1 | Single approval |
| `main` | 2 | Both approvals required |
| `hotfix/*` | 1 | Single approval (expedited) |

---

## 4. Commit Guidelines

### Commit Style

```
<type>(<scope>): <imperative description>

<detailed explanation if needed>

<issue reference>
```

### Good Examples

```
feat(events): add create event form with validation
fix(tickets): prevent duplicate RSVP for same event
test(checkin): add integration tests for QR scan flow
docs(api): document rate limiting in API spec
refactor(scanner): extract barcode parsing into utility
```

### Bad Examples

```
fix stuff
WIP
asdf
update
```

---

## 5. Versioning

### Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)

Examples:
v1.0.0 - Initial release
v1.1.0 - Added payment integration
v1.1.1 - Fixed QR scan crash
v2.0.0 - New blockchain verification system
```

### Version Location

- `package.json` — `version` field
- Git tags — `v1.0.0`, `v1.1.0`, etc.
- CHANGELOG.md — Release notes

---

## 6. Changelog

```markdown
# Changelog

## [1.1.0] - 2026-05-15

### Added
- Payment integration with Stripe
- Email notifications for ticket confirmations
- Waitlist management for full events

### Fixed
- Race condition in ticket creation
- QR scanner crash on low-light conditions
- Mobile layout issues on event detail page

### Changed
- Upgraded Prisma to v5.10
- Optimized database queries for event listing
```

---

## 7. CI/CD Integration

### Branch Protection Rules (main)

- [ ] Require pull request reviews (2 approvals)
- [ ] Dismiss stale reviews when new commits pushed
- [ ] Require status checks (lint, typecheck, tests)
- [ ] Require branches to be up to date
- [ ] Include administrators
- [ ] Require linear history (no merge commits)

### Branch Protection Rules (develop)

- [ ] Require pull request reviews (1 approval)
- [ ] Require status checks (lint, typecheck, tests)
- [ ] Require branches to be up to date

---

## 8. Git Config

```bash
# Recommended global config
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global pull.rebase true
git config --global init.defaultBranch main
git config --global core.autocrlf input  # Windows: true
```
