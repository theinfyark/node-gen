# Changelog


## [1.1.4] - 2026-07-18

### Fixed

- Clarify that \`npm install\` does not scaffold; require interactive TTY for prompts
- Print clear next-step instructions when run without a TTY
- Keep CLI version in sync with package.json


## [1.1.3] - 2026-07-17

### Changed

- Aligned package, folder, and GitHub repository names to npm registry name `node-gen-kit`

## [Unreleased]

### Changed

- Renamed npm package from `node-gen-kit` to `node-gen` to match the GitHub repository and project folder names.


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-07-17

### Added

- Auth providers: Auth0, Okta, Keycloak (JWKS bearer verification via `jose`)
- Validation: Joi (alongside Zod)
- Logger: Winston (alongside Pino / structured-logger-kit)

### Changed

- `features.validation` is now `"none" | "zod" | "joi"` (was boolean)

## [1.1.1] - 2026-07-17

### Added

- Node.js version options: `v22.23.1`, `v24.18.0` (plus major `20` / `22`)

## [1.1.0] - 2026-07-17

### Added

- Koa framework support
- API docs choices: Swagger UI, Scalar, OpenAPI JSON
- Test runners: Vitest, Jest, Mocha + Chai

### Changed

- `features.apiDocs` / boolean `testing` replaced by `features.docs` and `features.testing` enums

## [1.0.0] - 2026-07-16

### Added

- Published as `node-gen` (CLI bin remains `node-gen`; npm rejected bare `node-gen` as too similar to `nodegen`)
- Interactive CLI to scaffold enterprise Node.js backends
- Frameworks: Express, Fastify, Hono
- TypeScript and JavaScript, ESM and CJS
- Optional JWT / Passport auth, Zod validation, Prisma / Drizzle / Mongoose
- Redis cache, Pino / structured-logger-kit logging
- OpenAPI docs, Docker, GitHub Actions, Dependabot, CodeQL
- Plugin registry for future extensions
- Programmatic `createProject` API
