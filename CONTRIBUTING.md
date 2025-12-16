# Contributing to Distributed AI Cluster

Thank you for your interest in contributing! 🎉

## Development Setup

```bash
# Clone repository
git clone https://github.com/Gzeu/distributed-ai-cluster.git
cd distributed-ai-cluster

# Run setup script
chmod +x scripts/*.sh
./scripts/setup-dev.sh

# Start development
npm run dev:controller  # Terminal 1
npm run dev:worker      # Terminal 2
```

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Write tests for new features
- Use meaningful commit messages

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Add tests
- `chore:` - Maintenance

Examples:
```
feat: add streaming support for inference
fix: resolve worker registration timeout
docs: update Kubernetes deployment guide
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit changes: `git commit -m "feat: add my feature"`
7. Push to fork: `git push origin feat/my-feature`
8. Open a Pull Request

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- load-balancer.test.ts
```

## Adding New Features

### New Load Balancing Strategy

1. Add method to `src/controller/load-balancer.ts`
2. Add tests in `src/controller/__tests__/load-balancer.test.ts`
3. Update `docs/CONFIGURATION.md`
4. Update README.md

### New Model Engine

1. Implement in `src/worker/model-engine.ts`
2. Add configuration in `.env.example`
3. Add tests
4. Update documentation

## Documentation

- Keep README.md up to date
- Document new features in `docs/`
- Add JSDoc comments for public APIs
- Include examples in `docs/EXAMPLES.md`

## Questions?

Open an issue or discussion on GitHub!
