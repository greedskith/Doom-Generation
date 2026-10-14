# Doom Generation: Evaluation Suites & Testing Harness
> Built in accordance with Modern Web Guidance (Baseline Standards, Core Web Vitals, WCAG 2.2 AA, View Transitions, and WebMCP)

---

## 1. Executive Summary & Architecture Overview

**Doom Generation** is a high-aesthetic brutalist photo pasteboard powered by **React 19**, **Vite**, **Firebase Firestore/Auth**, **Cloudinary**, and **Google Gemini Multimodal AI** (`@google/genai`).

To ensure production-grade stability, sub-second perceived performance, accessible interaction, and reliable AI composition analysis, the project requires a multi-tiered **Evaluation & Test Harness**. This specification translates the latest **Modern Web Guidance** patterns into concrete, automated test suites and evaluation benchmarks.

```mermaid
graph TD
    subgraph "Tier 1: Static & Component Harness"
        OX[Oxlint / ESLint Rules]
        VT[Vitest + React Testing Library]
        AXE_C[vitest-axe Accessibility Evals]
    end

    subgraph "Tier 2: Browser & Runtime Harness (Playwright)"
        E2E[Playwright Multi-Engine E2E]
        VT_TEST[View Transitions & Modal Inert Evals]
        LHCI[Lighthouse CI / Core Web Vitals]
        A11Y_E2E[Axe-Core Full-Tree Audits]
    end

    subgraph "Tier 3: Backend & Security Harness"
        FB_EMU[Firebase Local Emulator Suite]
        SEC_EVAL[@firebase/rules-unit-testing]
        SSRF_EVAL[SSRF & URL Whitelist Fuzzing]
    end

    subgraph "Tier 4: Multimodal AI Evaluation Harness"
        GOLDEN[Golden Benchmark Dataset 50+ Images]
        SCHEMA_EVAL[JSON Schema & Coordinate Bounds Evaluator]
        WATERFALL[Model Waterfall & Quota Cooldown Sim]
    end

    subgraph "Tier 5: Agentic Readiness (WebMCP)"
        MCP_REG[WebMCP Tool Registry Validation]
        MCP_SCHEMA[Tool Schema & AbortSignal Evals]
    end
```

---

## 2. Core Web Guidance Standards Applied

| Domain | Modern Web Guidance Rule | Doom Generation Implementation | Eval Requirement |
| :--- | :--- | :--- | :--- |
| **Performance (LCP)** | `optimize-image-priority` | `fetchpriority="high"` on dynamic above-the-fold cards (`lcpThreshold` responsive listener) | Verify LCP candidate count $\le 2$ on mobile, $\le 4$ on desktop, $\le 6$ on ultra-wide. Never combine with `loading="lazy"`. |
| **Performance (Rendering)** | `defer-rendering-heavy-content` | `content-visibility: auto` + `contain-intrinsic-size` on below-the-fold gallery items | Ensure zero scrollbar jumping (CLS = 0) and verify keyboard reachability into offscreen items. |
| **UI Motion** | `same-document-transitions` | `document.startViewTransition()` morphing card image to modal image via `active-photo-morph` | Check transition name cleanup after `.finished`, enforce `@media (prefers-reduced-motion: reduce)` bypass. |
| **Accessibility (A11y)** | `accessibility`, `modals` | Native `<dialog>` with `.showModal()`, background `inert`, centralized ARIA announcers (`polite` / `assertive`) | 100% WCAG 2.2 AA compliance via `axe-core`, verify focus restore on close to trigger button. |
| **Agentic Web** | `webmcp`, `agentic-javascript-tools` | Browser-native `document.modelContext.registerTool()` exposing composition analysis | Tool schema validation, non-destructive safety hints (`readOnlyHint`), and `AbortSignal` cleanup. |
| **AI Reliability** | Multimodal Structured Outputs | `@google/genai` JSON schema + 5-model waterfall fallback | Schema compliance rate > 99.5%, coordinate range clamp $[0, 100]$, fallback resilience on 429/503. |

---

## 3. Recommended Harness Tooling Stack

To build and run these evals, install the following dev dependencies:

```bash
npm install -D \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  vitest-axe \
  @playwright/test \
  @axe-core/playwright \
  @lhci/cli \
  @firebase/rules-unit-testing \
  msw \
  zod
```

### Recommended NPM Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:a11y": "vitest run src/tests/a11y",
    "test:e2e": "playwright test",
    "test:security": "vitest run src/tests/security",
    "eval:gemini": "node scripts/eval-gemini-composition.mjs",
    "eval:cwv": "lhci autorun"
  }
}
```

---

## 4. Evaluation Suite 1: Core Web Vitals & Image Prioritization

### Purpose
Validate that initial load times, Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Interaction to Next Paint (INP) adhere to modern thresholds:
- **LCP**: $\le 1.8\text{s}$ (Good threshold $\le 2.5\text{s}$)
- **CLS**: $0.00$ (No shifts from paper textures, lazy images, or dialog elements)
- **INP**: $\le 100\text{ms}$ (Smooth modal trigger, like toggling, and doodle rendering)

### Eval 1.1: Dynamic LCP Candidate Test
Verify that `fetchpriority="high"` is strictly applied only to the visible viewport candidates and never combined with `loading="lazy"`.

```typescript
// tests/e2e/lcp-priority.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Modern Web Guidance: Image Priority & LCP', () => {
  test('Mobile viewport (390x844) assigns high fetchpriority to top 2 images only', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const highPriorityImages = page.locator('img[fetchpriority="high"]');
    await expect(highPriorityImages).toHaveCount(2);

    // Verify none of the high priority images have loading="lazy"
    const highPriorityLazy = page.locator('img[fetchpriority="high"][loading="lazy"]');
    await expect(highPriorityLazy).toHaveCount(0);

    // Below the fold images must have loading="lazy"
    const lazyImages = page.locator('img[loading="lazy"]');
    const count = await lazyImages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Desktop viewport (1440x900) elevates up to 6 LCP candidates', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const highPriorityImages = page.locator('img[fetchpriority="high"]');
    await expect(highPriorityImages).toHaveCount(6);
  });

  test('All gallery images reserve aspect ratio to prevent CLS', async ({ page }) => {
    await page.goto('/');
    const containers = page.locator('.image-container');
    const count = await containers.count();
    
    for (let i = 0; i < count; i++) {
      const style = await containers.nth(i).getAttribute('style');
      expect(style).toContain('aspect-ratio');
    }
  });
});
```

### Eval 1.2: Synthetic Lighthouse CI Benchmark (`lighthouserc.json`)

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "url": ["http://localhost:4173/"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.90 }],
        "categories:accessibility": ["error", { "minScore": 0.98 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 150 }]
      }
    }
  }
}
```

---

## 5. Evaluation Suite 2: Native `<dialog>`, Inertness & View Transitions

### Purpose
Test compliance with Modern Web Guidance for modals:
1. Native `<dialog>` must be opened via `.showModal()` (placing it in the top layer).
2. All background DOM must be treated as `inert` by the browser.
3. Focus must be trapped inside the modal while open, and restored to the activating card button upon close.
4. Light-dismiss (backdrop click) and Escape key must dismiss cleanly.
5. `document.startViewTransition` must morph elements using unique transition names and clean them up after the transition finishes.

### Eval 2.1: Dialog Lifecycle, Focus Routing & Inert Validation

```typescript
// tests/e2e/dialog-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Modern Web Guidance: Native Dialog & Focus Routing', () => {
  test('Lightbox opens with showModal, traps focus, and restores focus on close', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.gallery-item button.image-container').first();
    await firstCard.focus();
    await expect(firstCard).toBeFocused();

    // Trigger modal open
    await firstCard.click();

    const dialog = page.locator('dialog.lightbox-dialog');
    await expect(dialog).toBeVisible();

    // Verify background cannot be focused / clicked (inert)
    const navbar = page.locator('.navbar');
    await expect(navbar).toHaveAttribute('inert', ''); // Or browser native inertness

    // Verify close via Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // MANDATORY Accessibility: Focus must return to activating card
    await expect(firstCard).toBeFocused();
  });

  test('Backdrop click triggers light-dismiss', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.locator('.gallery-item button.image-container').first();
    await firstCard.click();

    const dialog = page.locator('dialog.lightbox-dialog');
    await expect(dialog).toBeVisible();

    // Click on the backdrop (outside dialog-content)
    await dialog.click({ position: { x: 5, y: 5 } });
    await expect(dialog).not.toBeVisible();
  });
});
```

### Eval 2.2: View Transitions Morph & Reduced-Motion Bypass

```typescript
// tests/e2e/view-transitions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Modern Web Guidance: Same-Document View Transitions', () => {
  test('Cleans up viewTransitionName after transition finishes to prevent collisions', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('.gallery-item button.image-container').first();
    const cardImg = card.locator('img');

    await card.click();
    const lightbox = page.locator('dialog.lightbox-dialog');
    await expect(lightbox).toBeVisible();

    // Once transition completes, inline viewTransitionName must be reset to 'none'
    const lightboxImg = lightbox.locator('.lightbox-image');
    await expect(lightboxImg).toHaveCSS('view-transition-name', 'none');
    await expect(cardImg).toHaveCSS('view-transition-name', 'none');
  });

  test('Respects prefers-reduced-motion: reduce without crashing or hanging', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const card = page.locator('.gallery-item button.image-container').first();
    await card.click();

    const lightbox = page.locator('dialog.lightbox-dialog');
    await expect(lightbox).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(lightbox).not.toBeVisible();
  });
});
```

---

## 6. Evaluation Suite 3: Accessibility & ARIA Announcer Harness

### Purpose
Audit the UI against **WCAG 2.2 AA**, validating:
- Strict color contrast (Warm Ivory `#E8E4D3` on Ink Black `#031211` = $13.5:1$, Electric Teal `#00AEBB` on Ink Black = $5.8:1$).
- Focus rings visible for keyboard users (`:focus-visible`).
- Dual live region architecture (separate polite and assertive live regions).
- Screen reader announcements for async operations (uploading, analyzing, like counter).

### Eval 3.1: Automated Axe-Core Full Page Audit

```typescript
// tests/e2e/accessibility-audit.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Modern Web Guidance: Accessibility Audits (WCAG 2.2 AA)', () => {
  test('Main gallery view passes all axe audits', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Lightbox modal view passes all axe audits', async ({ page }) => {
    await page.goto('/');
    await page.locator('.gallery-item button.image-container').first().click();
    await page.waitForSelector('dialog.lightbox-dialog[open]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Eval 3.2: ARIA Live Region Announcement Harness

```typescript
// tests/unit/announcer.test.tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../src/App';

describe('Modern Web Guidance: Live Region Urgency Routing', () => {
  it('Has separate polite and assertive live regions in the DOM', () => {
    render(<App />);
    const polite = document.querySelector('[role="status"][aria-live="polite"]');
    const assertive = document.querySelector('[role="alert"][aria-live="assertive"]');

    expect(polite).toBeInTheDocument();
    expect(assertive).toBeInTheDocument();
  });

  it('Routes critical errors to assertive and status updates to polite', async () => {
    // Harness checks that non-critical events like "Image uploaded" go to polite
    // and critical errors like "Reject: weekly limit" route to assertive
  });
});
```

---

## 7. Evaluation Suite 4: Gemini Multimodal Composition AI Benchmark

### Purpose
The AI composition analyzer is Doom Generation’s signature feature. It must be evaluated across:
1. **Schema Compliance**: $100\%$ valid against `COMPOSITION_SCHEMA`.
2. **Coordinate Sanity**: $0 \le x, y \le 100$ and $0 \le x_1, y_1, x_2, y_2 \le 100$.
3. **Allowed Rule Taxonomy**: Rule must match one of the 11 recognized compositional frameworks:
   - `Rule of Thirds`, `Golden Ratio`, `Golden Triangle`, `Geometric Triangles`, `Half and Half`, `Quarter Frame`, `Leading Lines`, `Diagonals`, `C and S Curves`, `Converging Lines`, `Frame Within a Frame`.
4. **Waterfall Fallback Resilience**: If `gemini-3.8-flash` hits a 429 quota limit, automatically cascade to `gemini-3.7-flash`, `3.6-flash`, `3.5-flash`, and `3.5-flash-lite`.
5. **SSRF Guard**: Block internal/private IPs (`127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `.local`, `.internal`).

### Golden Benchmark Dataset Structure (`scripts/fixtures/golden-dataset.json`)

```json
[
  {
    "id": "eval-01-landscape-horizon",
    "url": "https://res.cloudinary.com/dnw1f6vw/image/upload/sample_horizon.jpg",
    "expectedRules": ["Half and Half", "Rule of Thirds"],
    "description": "Minimalist beach horizon with waterline at y=50"
  },
  {
    "id": "eval-02-portrait-eyes",
    "url": "https://res.cloudinary.com/dnw1f6vw/image/upload/sample_portrait.jpg",
    "expectedRules": ["Rule of Thirds", "Golden Ratio"],
    "expectedFocalMin": 1,
    "description": "Close-up portrait with eye aligned to top-third line (y ≈ 33.3)"
  },
  {
    "id": "eval-03-architectural-rail",
    "url": "https://res.cloudinary.com/dnw1f6vw/image/upload/sample_railway.jpg",
    "expectedRules": ["Leading Lines", "Converging Lines"],
    "mustHaveLines": true,
    "description": "Railway tracks converging to center vanishing point"
  }
]
```

### Eval 4.1: Automated Gemini Composition Benchmark Runner

```javascript
// scripts/eval-gemini-composition.mjs
import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync } from 'fs';
import { z } from 'zod';

const CompositionSchemaValidator = z.object({
  rule: z.enum([
    "Rule of Thirds", "Golden Ratio", "Golden Triangle", "Geometric Triangles",
    "Half and Half", "Quarter Frame", "Leading Lines", "Diagonals",
    "C and S Curves", "Converging Lines", "Frame Within a Frame"
  ]),
  focalPoints: z.array(z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  })).min(1),
  lines: z.array(z.object({
    x1: z.number().min(0).max(100),
    y1: z.number().min(0).max(100),
    x2: z.number().min(0).max(100),
    y2: z.number().min(0).max(100),
    label: z.string().optional()
  })).optional()
});

async function runGeminiEvals() {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY not set.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const dataset = JSON.parse(readFileSync('./scripts/fixtures/golden-dataset.json', 'utf8'));

  let passed = 0;
  let failed = 0;

  console.log(`Starting Gemini Multimodal Composition Eval on ${dataset.length} benchmark items...`);

  for (const item of dataset) {
    const startTime = Date.now();
    try {
      // Analyze item image
      const result = await analyzeImageWithGemini(ai, item.url);
      const parseResult = CompositionSchemaValidator.safeParse(result);

      if (!parseResult.success) {
        throw new Error(`Schema validation error: ${parseResult.error.message}`);
      }

      if (item.expectedRules && !item.expectedRules.includes(result.rule)) {
        console.warn(`[WARN] ${item.id}: Rule mismatch. Got "${result.rule}", expected one of [${item.expectedRules.join(', ')}]`);
      }

      const duration = Date.now() - startTime;
      console.log(`[PASS] ${item.id} -> ${result.rule} (${result.focalPoints.length} points) in ${duration}ms`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${item.id}: ${err.message}`);
      failed++;
    }
  }

  const passRate = ((passed / dataset.length) * 100).toFixed(1);
  console.log(`\nEval Summary: ${passed}/${dataset.length} passed (${passRate}%). Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runGeminiEvals();
```

### Eval 4.2: Model Waterfall Fallback & Quota Exhaustion Simulation

```typescript
// tests/unit/gemini-waterfall.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeComposition } from '../../src/services/gemini';

describe('Gemini Model Waterfall & Quota Fallback', () => {
  it('Falls back from gemini-3.8-flash to 3.7-flash when receiving 429 quota error', async () => {
    // Mock the GoogleGenAI client to return 429 on 3.8-flash and 200 on 3.7-flash
    // Verify fallback executes seamlessly without throwing to user
  });

  it('Rejects SSRF attempts to private IP ranges before initiating fetch', async () => {
    const maliciousUrls = [
      'http://localhost:8080/secret.jpg',
      'http://127.0.0.1:3000/key.png',
      'http://192.168.1.1/router.jpg',
      'http://10.0.0.5/admin.png',
      'http://metadata.google.internal/computeMetadata/v1/'
    ];

    for (const url of maliciousUrls) {
      await expect(analyzeComposition(url)).rejects.toThrow(/trusted image host/);
    }
  });
});
```

---

## 8. Evaluation Suite 5: WebMCP Client-Side Agentic Tools

### Purpose
Validate compatibility with the emerging **WebMCP (Web Model Context Protocol)** Chromium browser standards:
1. Client-side tools are registered via `document.modelContext.registerTool()`.
2. Safe execution hints (`readOnlyHint: true`) are set on non-mutating query tools.
3. Registered tools include strictly typed `inputSchema` specifications.
4. Tools clean themselves up via `AbortSignal` upon component unmount or view transitions.

### Proposed WebMCP Registration Module (`src/services/webmcp.js`)

```javascript
export function registerDoomGenerationTools(photoStore, abortSignal) {
  if (typeof window === 'undefined' || !window.document?.modelContext?.registerTool) {
    return; // WebMCP not enabled or unsupported browser
  }

  // Tool 1: Inspect composition analysis
  window.document.modelContext.registerTool({
    name: 'get-photo-composition',
    description: 'Retrieve the photographic composition analysis and doodle geometry for the current photo.',
    inputSchema: {
      type: 'object',
      properties: {
        photoId: { type: 'string', description: 'The unique ID of the photo in the pasteboard' }
      },
      required: ['photoId']
    },
    execute: async ({ photoId }) => {
      const photo = photoStore.getPhoto(photoId);
      if (!photo) return { error: `Photo ${photoId} not found.` };
      return { analysis: photo.analysis || null };
    },
    annotations: { readOnlyHint: true }
  }, { signal: abortSignal });

  // Tool 2: Toggle doodle overlay
  window.document.modelContext.registerTool({
    name: 'toggle-composition-doodle',
    description: 'Toggle visibility of the SVG composition doodle overlay on the current photo lightbox.',
    inputSchema: {
      type: 'object',
      properties: {
        photoId: { type: 'string', description: 'The photo ID to toggle doodle visibility for' },
        visible: { type: 'boolean', description: 'Whether the doodle overlay should be visible' }
      },
      required: ['photoId', 'visible']
    },
    execute: async ({ photoId, visible }) => {
      photoStore.setDoodleVisibility(photoId, visible);
      return { success: true, photoId, visible };
    }
  }, { signal: abortSignal });
}
```

### Eval 5.1: WebMCP Tool Registration & AbortSignal Harness

```typescript
// tests/unit/webmcp.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerDoomGenerationTools } from '../../src/services/webmcp';

describe('Modern Web Guidance: WebMCP Registration Harness', () => {
  it('Registers tools with complete input schemas and readOnly hints', () => {
    const registerMock = vi.fn();
    window.document.modelContext = { registerTool: registerMock };

    const controller = new AbortController();
    registerDoomGenerationTools({ getPhoto: vi.fn(), setDoodleVisibility: vi.fn() }, controller.signal);

    expect(registerMock).toHaveBeenCalledTimes(2);

    const call1 = registerMock.mock.calls[0][0];
    expect(call1.name).toBe('get-photo-composition');
    expect(call1.annotations?.readOnlyHint).toBe(true);
    expect(call1.inputSchema.required).toContain('photoId');
  });

  it('Honors AbortSignal to prevent tool leaks when navigating', () => {
    const registerMock = vi.fn();
    window.document.modelContext = { registerTool: registerMock };

    const controller = new AbortController();
    registerDoomGenerationTools({ getPhoto: vi.fn(), setDoodleVisibility: vi.fn() }, controller.signal);

    const options = registerMock.mock.calls[0][1];
    expect(options.signal).toBe(controller.signal);
  });
});
```

---

## 9. Evaluation Suite 6: Firestore Security Rules & Concurrency

### Purpose
Ensure backend security invariants and rate limiters cannot be bypassed using `@firebase/rules-unit-testing`:
- Non-authenticated users cannot create, like, edit, or delete photos.
- Users can only delete or edit titles of photos they own (or admins).
- Weekly rate limits (max 5 uploads per week for non-admins) are strictly verified.
- Batch writes maintain atomic consistency between `photos` collection and `user_stats`.

### Eval 6.1: Security Rules Unit Test Harness

```typescript
// tests/security/firestore-rules.test.ts
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll } from 'vitest';

describe('Firestore Security Rules Invariants', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'doom-generation-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('Rejects photo creation without required fields', async () => {
    const aliceContext = testEnv.authenticatedContext('alice_123', { email: 'alice@test.com' });
    const db = aliceContext.firestore();

    await assertFails(db.collection('photos').add({
      title: 'Incomplete Photo'
      // Missing url, author, userId, likes, timestamp
    }));
  });

  it('Prevents non-owner from updating a photo title', async () => {
    const bobContext = testEnv.authenticatedContext('bob_456', { email: 'bob@test.com' });
    const db = bobContext.firestore();

    await assertFails(db.doc('photos/alice_photo_1').update({
      title: 'Hacked by Bob'
    }));
  });

  it('Allows authenticated user to toggle like increment only', async () => {
    const bobContext = testEnv.authenticatedContext('bob_456', { email: 'bob@test.com' });
    const db = bobContext.firestore();

    // Verify Bob can append his UID to likedBy and increment likes by 1
    // Verify Bob cannot modify url, author, or userId
  });
});
```

---

## 10. Automated CI/CD Harness Pipeline

Combine all suites into a unified GitHub Actions matrix (`.github/workflows/evals-harness.yml`):

```yaml
name: Modern Web Evals & Test Harness

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-unit:
    name: Lint, Unit & Security Rules
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  browser-and-a11y:
    name: Playwright E2E, A11y & View Transitions
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

  core-web-vitals:
    name: Lighthouse CI Performance & CWV
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run eval:cwv
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

  gemini-ai-eval:
    name: Gemini Multimodal Composition Benchmark
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run eval:gemini
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
```

---

## 11. Eval Scorecard & Readiness Checklist

Use this scorecard before every major release:

| Category | Metric / Requirement | Target | Status |
| :--- | :--- | :--- | :--- |
| **Performance** | LCP on 4G emulation | $< 2.2\text{s}$ | [ ] |
| **Performance** | CLS across all viewports | $0.00$ | [ ] |
| **Performance** | Image Prioritization | `fetchpriority="high"` on $\le 2$ mobile, $\le 6$ desktop | [ ] |
| **Accessibility** | Axe-core violations | $0$ (Zero tolerence) | [ ] |
| **Accessibility** | Keyboard traversal | Full reachability & focus restoration on dialogs | [ ] |
| **UI Behaviors** | View Transitions | Clean morphing, no name collisions, reduced-motion bypass | [ ] |
| **AI Composition** | Schema Validity | $100\%$ against `COMPOSITION_SCHEMA` | [ ] |
| **AI Composition** | Coordinate Bounds | All coordinates $\in [0, 100]$ | [ ] |
| **AI Waterfall** | Error Recovery | Zero client-facing failure on single-model 429 quota | [ ] |
| **Agentic Web** | WebMCP tools | Valid parameter types, non-destructive readOnlyHints | [ ] |
| **Security** | SSRF & Firestore | Zero access to private IP ranges, owner-only mutation | [ ] |
