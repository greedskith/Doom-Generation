# [ ANTIGRAVITY ]

A brutalist photography portfolio featuring generative AI composition analysis, dynamic SVG overlays, and fluid View Transitions.

## 🚀 Features

- **Brutalist Visual Design**: High-contrast dark palette (`#031211` Ink Black, `#E8E4D3` Warm Ivory, `#00AEBB` Electric Teal) with strict typographic labeling and raw aesthetic cues.
- **AI Composition Analyzer**: Analyzes photographic compositions using Google's `@google/genai` SDK (`gemini-3.8-flash`) against classic compositional guidelines (Rule of Thirds, Golden Triangle, Leading Lines, Frame-in-a-Frame, Dynamic Curves).
- **Geometric SVG Doodles**: Transforms structured AI coordinate data into mathematical SVG vector lines with glowing teal accents.
- **Native View Transitions**: Fluid image morphing between masonry cards and the full-screen lightbox modal using the Web View Transitions API.
- **Local Prototype Scaffolding**: Local upload support, mock guest authentication, and responsive grid architecture.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: Vanilla CSS, Modern CSS View Transitions
- **AI / Vision**: Google Gemini API (`@google/genai`)
- **Linting**: Oxlint

## ⚡ Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
