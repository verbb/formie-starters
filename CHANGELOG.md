# Changelog

## Unreleased

### Added

- Added coordinated local and hosted build commands for the React, Vue, Web Components, Next.js, and Nuxt starters.
- Added a Forge deployment workflow with environment, routing, seed import, acceptance, and rollback guidance.
- Added independent npm lockfiles and documented setup commands for every frontend starter.

### Changed

- Updated all frontend starters to Formie 1.0.14 and the current client-form bootstrap, transport, event, and web-component APIs.
- Updated browser requests and copyable examples to declare the public cross-origin request profile and current GraphQL contract version.
- Refreshed the Craft fixture, project config, dependencies, and clean seed for the current Formie 4 beta schema.
- Updated the local Verbb workspace override and deterministic development ports for the nested repository layout.

### Fixed

- Fixed client-rendered examples failing to render fields from the current Formie response metadata.
- Fixed Vue component examples reporting invalid required error-summary props.
- Fixed hosted Next.js navigation and direct frontend route deployment support.
- Fixed local hosted frontend routes returning 404 when opened directly.
