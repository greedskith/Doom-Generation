# Workspace Engineering & Design Guardrails

## 1. Token Economy & Tool Execution Efficiency
Every tool call and file inspection costs latency and tokens. Follow these execution invariants:

- **Component Overwrite vs. Micro-Patching (The 300-Line Rule)**:
  - For focused component files under ~300 lines (e.g., `src/components/*.jsx`), use `write_to_file` with `Overwrite: true` instead of `replace_file_content` or `multi_replace_file_content`.
  - Writing the complete file takes 1 tool step and eliminates multi-step `view_file` slice reads to calculate shifting line numbers.
  - Reserve `replace_file_content` / `multi_replace_file_content` for large files (e.g., `src/App.jsx`, `src/index.css`) where rewriting the entire file is wasteful.
- **Eliminate Speculative Inspection Loops**:
  - Do NOT re-read files repeatedly. Read once during plan formulation, lock in necessary lines, and execute directly.
  - When editing large files, verify line numbers in a single contiguous view call rather than multiple small slice reads.
- **Single-Pass Mechanical Execution Planning (MEP)**:
  - When asked for a `/plan`, do NOT generate open-ended discussion essays or multi-pass exploratory plans.
  - Produce a structured **Mechanical Execution Plan (MEP)** on the first pass with pre-computed tool payloads, exact files, and zero in-flight decisions.

## 2. Calm Editorial Aesthetics & Artwork Integrity
This project is an archival exhibition space, not a tech demo. Avoid all generic "AI website" clichés:

- **Artwork & Photo Integrity (Invariant)**:
  - NEVER alter, scale, zoom (`scale(1.03)`), brighten (`filter: brightness()`), or physically lift (`translateY(-4px)`) photographs on card hover.
  - Hover states on gallery items must be quiet, non-distorting container cues only (e.g., a subtle 1px border shift to `var(--border-color)` or quiet caption adjustment).
- **Motion Discipline**:
  - Motion must ONLY explain functional state changes (e.g., card-to-lightbox view transition, dialog entry, immediate `:active` button feedback).
  - FORBID decorative motion: no continuous shimmer loaders, no scroll-reveal animations, no pulsing heartbeats, no scanning lasers, and no staggered text entrance reveals.
  - Always respect `prefers-reduced-motion`.
- **Surfaces & Matte Integrity (No Glassmorphism)**:
  - FORBID heavy `backdrop-filter: blur(...)` and saturation boosts on sticky rails, headers, and modal backdrops. Glass blur triggers severe GPU compositor recalculations during scrolling and creates an artificial appearance.
  - Use opaque or near-opaque matte surfaces (e.g., `var(--bg-color)` or `rgba(2, 10, 9, 0.92)`).
- **Static Placeholders over Perpetual Shimmer**:
  - Reserve intrinsic aspect-ratio boxes with static neutral placeholders (`var(--surface-color)`) during image loading to prevent CLS without infinite animation loops.

## 3. Quiet Curatorial Reading (Composition & AI Mode)
- **Zero Distraction by Default**:
  - Photographs must open 100% clean and pristine. Machine analysis must NEVER auto-display on image load for visitors, even if persisted in the database.
- **Curatorial Tone over Cyber HUD**:
  - Label analysis features as "Composition notes" or "Reading the frame", never "AI Annotation" or "Model Output".
  - Analysis must live in a quiet, docked editorial side panel—never rendered as a HUD or surveillance overlay across the photo.
- **Hairline Restraint**:
  - Visual structural pointers must be opt-in via a quiet checkbox ("Overlay structural hairlines").
  - Render at most 1–2 hairline marks: ultra-thin (`0.3px` to `0.5px` dashed), low contrast (`45%` opacity).
  - NEVER paint text plaques, rule labels, or vector coordinate stamps directly on the photo canvas.
- **AI Schema Hardening & Human Language**:
  - AI analysis responses must provide a concise, human-readable `observation` field explaining compositional balance and eye movement. Coordinates are secondary evidence.
  - Always sanitize model output: clamp coordinates strictly to `[0, 100]`, cap lines and anchors to a maximum of 2, and discard malformed geometry before rendering.

## 4. API Limits, Client Secrets & Security Rules
- **Gemini Free Tier Constraints**:
  - When operating on Google AI Studio Free Tier keys, NEVER call `gemini-3.1-pro`, `gemini-3-pro-image`, or `gemini-3.1-flash-image` (quota is 0, causing immediate `429 RESOURCE_EXHAUSTED` errors).
  - ALWAYS default to `gemini-3.8-flash` or `gemini-3.5-flash-lite` for multimodal and structured reasoning.
  - In Google GenAI SDK, remember that `response.text()` is a method call, not a property.
- **Client Secrets & Cloudinary**:
  - Never put private API keys in client-side code or `VITE_` prefixed environment variables.
  - Use unsigned Cloudinary presets strictly with restricted allowed formats and size limits.
- **Firestore Security Rules**:
  - The Firebase `apiKey` is visible in client bundles; therefore, Firestore Security Rules are the only access boundary.
  - NEVER allow unconstrained updates (`allow update: if request.auth != null;`). Photo edits and deletions must enforce owner ID checks (`request.auth.uid == resource.data.userId`).

## 5. Image Delivery, Accessibility & Dialog Patterns
- **Cloudinary Image Optimization**:
  - Never request raw unoptimized image URLs. Always use `getOptimizedUrl` with `f_auto,q_auto,w_<width>` and provide responsive `srcSet`.
  - Do NOT hardcode square dimensions (`width="800" height="800"`) on non-square gallery photos.
- **Native `<dialog>` & Focus Accessibility**:
  - Detect backdrop clicks accurately (`e.target === dialogRef.current`).
  - Always reset transient editing states (`isEditingTitle`, error banners) when a dialog closes via backdrop click or Escape.
  - NEVER use `outline: none` without a matching `:focus-visible` accessible outline.

## 6. Google Jules Tooling & Credential Safety
- **No Unofficial IDE Extensions (Strict Invariant)**:
  - Google does NOT publish an official VS Code / IDE marketplace extension for Jules.
  - NEVER recommend, install, or instruct users to install third-party "Jules" marketplace extensions (e.g., community wrappers).
  - NEVER instruct users to enter Google session cookies, personal tokens, or API keys into third-party extensions.
- **Official Google Jules Interfaces Only**:
  - Limit all Jules recommendations strictly to Google's verified channels:
    - **Web Console**: [jules.google.com](https://jules.google.com)
    - **Official CLI**: `@google/jules` via npm (`npm install -g @google/jules` / `jules login`)
    - **GitHub App**: Direct repository integration via `github.com/apps/jules`
    - **Cloud API**: `https://jules.googleapis.com`
- **Workspace Sync Awareness**:
  - Jules works remotely on GitHub branches. Remind users that approving or merging a Jules PR on GitHub does not automatically update their local disk files.
  - Always run `git pull origin <branch>` to sync the local workspace after a Jules pull request merges.
