# Solstice Protocol Landing Page

## Overview

A full-page scroll landing page inspired by modern security platforms, showcasing Solstice Protocol's zero-knowledge identity verification system on Solana.

## Design Features

### Layout Architecture
- **6 Full-Page Sections**: Hero, Problem, Solution, Technology, Use Cases, Metrics
- **Scroll-Snap Navigation**: Smooth transitions between sections with wheel/keyboard controls
- **Position Indicator**: Visual dots on right side showing current section
- **Fixed Header**: Always accessible navigation with "Launch App" CTA

### Visual Design
- **Dark Theme**: Black background with purple/blue gradients
- **Border-Based UI**: Minimal design with subtle purple borders (no rounded corners)
- **Animated Backgrounds**: Gradient overlays and radial effects
- **Custom Fonts**: 
  - Advercase (monospace) for body text and UI
  - Nighty (serif) for hero headings and section titles

### Typography System
```
Headings: Nighty font, light weight, tracking-tight
Body Text: Advercase font, uppercase with wide tracking
Code/Stats: Monospace with gradient colors
```

### Color Palette
- Primary: Purple (#8B5CF6)
- Secondary: Blue (#3B82F6)
- Accent: Pink (#EC4899)
- Alerts: Red (#EF4444), Orange (#F97316), Yellow (#EAB308)
- Background: Black (#000000)
- Text: White (#FFFFFF) / Gray shades

## Sections Breakdown

### 1. Hero Section
- Large hero text: "Zero-Knowledge Identity Verification On Solana"
- Subtitle explaining core value proposition
- Two CTAs: "Get Started" (primary) and "Learn More" (secondary)
- Animated gradient background
- Scroll indicator (bouncing chevron)

### 2. Problem Section
Three problem cards:
- **Privacy Violations**: 147M+ records exposed
- **Sybil Attacks**: $100-1000 per identity on-chain
- **KYC Paradox**: 73% DeFi needs compliance

### 3. Solution Section
- Three technology pillars (Aadhaar, Groth16 SNARKs, Light Protocol)
- "How It Works" 4-step flow visualization
- Numbered steps with visual progression

### 4. Technology Section
- ZK Circuits breakdown (Age, Nationality, Uniqueness proofs)
- Performance metrics (256 bytes, 2-5 sec, <1ms)
- Security guarantees (Zero-Knowledge, Soundness, Completeness, Non-Malleability)
- Visual circuit constraint information

### 5. Use Cases Section
Four application scenarios:
- DeFi Compliance (KYC/AML)
- Sybil-Resistant Airdrops
- Democratic Governance
- Age-Gated Content

### 6. Metrics Section
- Animated counters (triggered on scroll into view):
  - 1.4B potential users
  - 100K+ DeFi protocols
  - 5000x cost reduction
- Final CTA with "Launch App" and "View Docs" buttons
- Footer with copyright and technology stack

## Interactive Features

### Scroll Navigation
- **Wheel Scroll**: Accumulator-based scroll detection (50px threshold)
- **Keyboard**: Arrow keys and PageUp/PageDown support
- **Position Dots**: Click to jump to any section
- **Scroll Lock**: Prevents rapid section changes (1.5s cooldown)

### Animations
- **Number Counters**: Animate from 0 to target value on scroll into view
- **Fade-In**: Hero section fades in on mount
- **Hover Effects**: Border color transitions on cards
- **Icon Animations**: Arrow translation on button hover

### Performance Optimizations
- Intersection Observer for metrics animation (runs once)
- Scroll throttling with accumulator pattern
- Font-display: swap for faster initial render
- Minimal re-renders with proper useEffect dependencies

## Routing

```
/ → Landing Page (Home.tsx)
/app → Dashboard (Wallet-connected App)
```

## Component Structure

```
Home.tsx (1000+ lines)
├── Header (Fixed navigation)
├── Position Indicator (Sidebar dots)
├── Section 1: Hero
├── Section 2: Problem
├── Section 3: Solution
├── Section 4: Technology
├── Section 5: Use Cases
├── Section 6: Metrics
└── Footer
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Customization

### Adding Fonts
See `FONT_SETUP.md` for instructions on adding Advercase and Nighty fonts.

### Changing Colors
Update gradient values in Tailwind classes:
- `from-purple-600` → your color
- `to-blue-500` → your color
- Border colors: `border-purple-500/20`

### Modifying Sections
Each section is a `<section>` with:
- `id={section-name}` for navigation
- `snap-section` class for consistent styling
- Full viewport height (`min-height: 100vh`)

### Adding New Sections
1. Add section ID to `sections` array
2. Create new `<section>` element with matching ID
3. Update position indicator to include new section
4. Section will automatically integrate with scroll navigation

## Browser Support

- Modern browsers with ES6+ support
- CSS Grid and Flexbox
- Intersection Observer API
- Smooth scroll behavior
- Font-display: swap

## Accessibility

- Keyboard navigation (arrow keys, PageUp/PageDown)
- Semantic HTML structure
- ARIA-friendly (can be enhanced further)
- Focus indicators on interactive elements
- Reduced motion support (can be added with prefers-reduced-motion)

## Performance Considerations

- Font loading with swap strategy
- Minimal JavaScript bundle (React + Lucide icons)
- CSS-based animations (hardware accelerated)
- Lazy animation triggers (Intersection Observer)
- Optimized scroll handlers with throttling

## Future Enhancements

- [ ] Add video background option (like Overlook)
- [ ] Terminal-style proof generation animation
- [ ] Live stats from blockchain
- [ ] Dark/light theme toggle
- [ ] Mobile-optimized scroll behavior
- [ ] Accessibility improvements (ARIA labels, motion reduction)
- [ ] SEO optimization (meta tags, Open Graph)
- [ ] Analytics integration
