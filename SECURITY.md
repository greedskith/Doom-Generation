# Security Policy

## Supported Versions

Doom Generation is a single-version web application. The latest deployment on Firebase Hosting is always the supported version.

| Version | Supported |
| ------- | --------- |
| Latest (main) | YES |
| Older commits | NO |

## Credential & Secret Handling

This project uses environment variables for all secrets. **No API keys or credentials should ever be committed to source code.**

- Firebase config is loaded via `VITE_FIREBASE_*` environment variables in `.env.local` (git-ignored)
- Gemini API key is loaded via `VITE_GEMINI_API_KEY` in `.env.local` (git-ignored)
- A `.env.example` file is provided with placeholder values for local setup

> **Note**: Firebase Web API keys are client-side application identifiers and are intentionally public-facing. Backend data access is protected by Firestore Security Rules and Firebase Authentication — not by the API key itself.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not open a public issue**.

Instead:
1. Go to [Security Advisories](https://github.com/greedskith/Doom-Generation/security/advisories/new) and open a private advisory.
2. Describe the vulnerability clearly — what it is, where it is, and how it could be exploited.
3. You can expect an acknowledgement within **48 hours** and a resolution update within **7 days**.

If you are reporting an exposed credential or secret that is currently active, please mention it explicitly so it can be rotated immediately.
