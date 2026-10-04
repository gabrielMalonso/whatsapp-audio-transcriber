# Changelog

Notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- ESLint with type-aware TypeScript rules and official React Hooks validation;
- Lint checks in continuous integration;
- Links to the Chrome Web Store and repository in the popup;
- Localized Portuguese and English metadata for the Chrome Web Store;
- WhatsApp onboarding to create and configure a Groq API key before audio capture.

### Fixed

- Immediate cancellation during audio capture and assembly;
- Captured file validation and isolation of the channel triggered by the page;
- Timeouts, ownership validation, and cleanup of incomplete jobs;
- Result display even when cache persistence fails;
- Asynchronous failure handling in the popup and early cache eviction.

## 0.2.0 - 2026-08-04

### Added

- Manifest V3 extension for transcribing WhatsApp Web voice messages;
- Silent OGG/Opus audio capture in the page context;
- Transcription with Whisper Large v3 Turbo through Groq;
- Conservative formatting with GPT-OSS 20B and structured output;
- Serial queue, cancellation, progress, and error handling;
- Local transcript cache and API key management;
- Settings popup and widgets isolated with Shadow DOM;
- Tests for the protocol, provider, and voice message identification;
- Manual distribution package for Chrome on macOS and Windows.
