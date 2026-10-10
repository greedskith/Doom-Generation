# DOOM GENERATION

Doom Generation is a brutalist photography portfolio. It uses artificial intelligence (AI) for composition analysis. It includes dynamic Scalable Vector Graphics (SVG) overlays and fluid view transitions.

## FEATURES

- **Brutalist Visual Design**: The user interface has a high-contrast dark color palette. It uses Ink Black (#031211), Warm Ivory (#E8E4D3), and Electric Teal (#00AEBB). It has strict typography.
- **AI Composition Analyzer**: The application analyzes the composition of photographs. It uses the Google Gemini 3.8 Flash model. It examines the image for standard composition rules. These rules include the Rule of Thirds, the Golden Triangle, and Leading Lines.
- **Geometric SVG Graphics**: The application converts coordinate data from the AI into mathematical SVG lines. These lines have a glowing teal color.
- **Native View Transitions**: The application moves smoothly between the grid view and the full-screen view. It uses the standard Web View Transitions Application Programming Interface (API).
- **Cloud Architecture**: The application uses Firebase for authentication and database services. It uses Cloudinary to optimize and store images.

## TECHNICAL SPECIFICATIONS

- **Frontend**: React 19, Vite
- **Style**: Cascading Style Sheets (CSS), Container Queries
- **Artificial Intelligence**: Google Gemini API (@google/genai)
- **Database and Authentication**: Firebase
- **Image Storage**: Cloudinary

## INSTALLATION INSTRUCTIONS

1. Install the dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory. Add your Gemini API key to the file:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
