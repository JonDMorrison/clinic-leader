

## Plan: Replace Hero Image with AI-Generated Illustration

The current hero uses a stock photo (`hero-leadership-meeting.jpg`). We'll replace it with an AI-generated illustration that matches the brand style — created at build time via an edge function, then saved to storage.

However, since AI image generation happens at runtime and we need a static asset for the landing page, the most practical approach is:

1. **Create an edge function** (`generate-hero-image`) that calls the Lovable AI image generation model (`google/gemini-3-pro-image-preview`) with a prompt describing a modern, brand-colored illustration of clinic leadership/data visualization
2. **Call it once**, download the resulting image, and **save it to Supabase storage** in a public bucket
3. **Update `HeroSection.tsx`** to reference the stored image URL instead of the local JPG import

**Alternatively** (simpler, faster): I can generate the image during implementation by calling the AI model, save the base64 result directly as a new static asset file in `src/assets/marketing/`, and update the import. This avoids any runtime generation.

### Recommended approach (static asset replacement)

1. **Generate the illustration** using the AI image model with a prompt like:
   > "Modern flat illustration of a diverse clinic leadership team reviewing data dashboards and metrics on screens, warm blue and teal color palette, clean minimal style, no text, professional healthcare operations theme, soft gradients"

2. **Save the generated image** as `src/assets/marketing/hero-clinic-illustration.png`

3. **Update `HeroSection.tsx`**:
   - Change the import from `hero-leadership-meeting.jpg` to the new illustration
   - Optionally adjust the image container styling (remove the photo-specific border/shadow treatment, or keep it)

### Files to modify
- `src/components/landing/HeroSection.tsx` — update image import and alt text
- New file: `src/assets/marketing/hero-clinic-illustration.png` — AI-generated illustration

