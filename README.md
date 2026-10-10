# DOOM GENERATION

Doom Generation is an Image Pasteboard. Creative people post their images here. AI analyzes the composition of each image.

## Features

- **Image posting**: Users post their images to the pasteboard.
- **AI composition analyzer**: Google Gemini 3.8 Flash examines each image for all standard composition rules, such as the Rule of Thirds, the Golden Triangle, and Leading Lines.
- **SVG overlays**: The app converts AI coordinate data into glowing teal SVG lines.

## Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: CSS, Container Queries
- **AI**: Google Gemini API (`@google/genai`)
- **Database and authentication**: Firebase
- **Image storage**: Cloudinary

## Installation

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory. Add your Gemini API key:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```