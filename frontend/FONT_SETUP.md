# Solstice Protocol Frontend - Font Setup

## Custom Fonts

This application uses two custom fonts:
- **Advercase**: Monospace font for body text and UI elements
- **Nighty**: Serif font for hero headings and section titles

## Installing Fonts

To use the custom fonts, you need to add the font files to the `/public/fonts` directory:

### Option 1: Download Fonts Manually

1. **Advercase Font**:
   - Download from your font provider or design files
   - Place files in `/public/fonts/`:
     - `Advercase.woff2`
     - `Advercase.woff`
     - `Advercase.ttf`

2. **Nighty Font**:
   - Download from your font provider or design files
   - Place files in `/public/fonts/`:
     - `Nighty.woff2`
     - `Nighty.woff`
     - `Nighty.ttf`

### Option 2: Use System Fallback Fonts

If you don't have the custom fonts yet, the application will automatically fall back to:
- **Advercase** → Courier New, Monaco, Consolas (monospace)
- **Nighty** → Georgia, Times New Roman (serif)

The UI will still look professional with these system fonts while you source the custom ones.

## Font Configuration

Font settings are defined in `/src/fonts.css`:
- Font-face declarations
- Fallback font stacks
- Letter spacing adjustments
- Font display optimization (swap for better performance)

## Usage in Components

Use the CSS classes:
- `.advercase-font` - For body text, buttons, navigation
- `.nighty-font` - For headings, hero text, section titles

Example:
```tsx
<h1 className="nighty-font">Heading Text</h1>
<p className="advercase-font">Body text</p>
```

## License Notes

Make sure you have proper licenses for both Advercase and Nighty fonts before deploying to production.
