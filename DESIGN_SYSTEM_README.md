# Glassmorphic Design System

## Overview
Premium glassmorphic UI design system with translucent surfaces, gradient accents, and smooth animations.

## Design Principles

### Visual Style
- **Glassmorphism**: Translucent surfaces with backdrop blur effects
- **Gradients**: Subtle gradients for depth and visual interest
- **Depth**: Layered shadows and elevation for hierarchy
- **Motion**: Smooth transitions and micro-interactions
- **Typography**: Inter font family with consistent tracking and line-height

### Color Philosophy
- Deep blue primary (#0059FF) for brand identity
- Aqua accent (#00F5D4) for highlights and interactive elements
- Status colors with glow variants for feedback
- Translucent whites for glass surfaces
- Gradient backgrounds for ambient depth

## Core Design Tokens

### Colors (HSL Format)
```css
--brand: 210 100% 50%           /* Deep Blue */
--brand-glow: 210 100% 60%      /* Glowing Blue */
--accent: 172 100% 48%          /* Aqua Glow */
--accent-glow: 172 100% 60%     /* Bright Aqua */

/* Status Colors with Glow */
--success: 142 76% 42%
--success-glow: 142 76% 60%
--warning: 38 92% 55%
--warning-glow: 38 92% 65%
--danger: 0 84% 60%
--danger-glow: 0 84% 70%
```

### Glass Effects
```css
--glass-surface: rgba(255, 255, 255, 0.7)
--glass-border: rgba(210, 210, 255, 0.5)
--blur-sm: 8px
--blur-md: 12px
--blur-lg: 16px
```

### Shadows
```css
--shadow-glass: 0 8px 32px rgba(31, 38, 135, 0.15)
--shadow-glow: 0 0 20px rgba(0, 89, 255, 0.3)
--shadow-elevated: 0 12px 40px rgba(0, 0, 0, 0.12)
```

## UI Components

### Cards
**Glass Cards** - Primary container element
```tsx
<Card className="glass rounded-3xl">
  {/* Card content */}
</Card>
```

Features:
- `backdrop-filter: blur(12px)`
- Border: 1px solid rgba(255, 255, 255, 0.5)
- Shadow: 0 8px 32px rgba(31, 38, 135, 0.15)
- Hover: Elevated shadow on hover
- Radius: 1.5rem (24px)

### Buttons
**Gradient Primary**
```tsx
<Button variant="default">
  Primary Action
</Button>
```
- Gradient background from brand to accent
- Shadow glow on hover
- Scale transition (1.05 on hover, 0.95 on active)

**Glass Outline**
```tsx
<Button variant="outline">
  Secondary Action
</Button>
```
- Transparent with border
- Backdrop blur
- Subtle hover state

### Badges
**Status Indicators**
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Critical</Badge>
<Badge variant="brand">AI-Generated</Badge>
```

Features:
- Gradient backgrounds with transparency
- Border matching color theme
- Shadow glow for prominence

### Sidebar
**Glass Navigation**
- Translucent background with blur
- Gradient brand name
- Active state with gradient highlight
- Smooth staggered animation on mount
- Icon glow effects on active items

## Animations

### Keyframes
```css
fade-in          /* Fade in with slight upward movement */
fade-in-up       /* Fade in with upward slide */
scale-in         /* Scale from 95% to 100% */
glow-pulse       /* Pulsing glow effect for emphasis */
shimmer          /* Shimmer effect for loading states */
```

### Usage
```tsx
<div className="animate-fade-in">
  Fades in smoothly
</div>

<div 
  className="animate-fade-in"
  style={{ animationDelay: '100ms' }}
>
  Staggered animation
</div>
```

## Utility Classes

### Glass Effects
```css
.glass              /* Standard glass surface */
.glass-dark         /* Darker glass variant */
```

### Glow Effects
```css
.glow-brand         /* Brand color glow */
.glow-accent        /* Accent color glow */
```

### Gradients
```css
.gradient-brand     /* Brand to accent gradient */
.gradient-glow      /* Interactive gradient overlay */
```

## Layout Patterns

### App Layout
- Gradient background (top-left to bottom-right)
- Glass sidebar with border highlight
- Main content with subtle gradient overlay
- Floating effect for elevation

### Dashboard Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <Card className="hover:scale-105 transition-transform">
    {/* Stat card */}
  </Card>
</div>
```

### Content Sections
- Staggered fade-in animations
- Glass cards with consistent spacing
- Gradient borders for emphasis
- Hover states with shadow elevation

## Best Practices

### Do's ✅
- Use glass effect for all major containers
- Apply subtle gradients for visual interest
- Implement smooth transitions (300ms default)
- Use backdrop-blur for translucency
- Add hover states with scale and shadow
- Maintain consistent border radius (rounded-2xl to rounded-3xl)
- Use semantic color tokens from design system

### Don'ts ❌
- Don't use solid backgrounds (prefer glass/gradients)
- Avoid harsh borders (use translucent instead)
- Don't skip animations on interactive elements
- Avoid mixing different border radius sizes in same view
- Don't use raw color values (use CSS variables)
- Avoid flat shadows (layer and blur for depth)

## Responsive Design

### Breakpoints
- Mobile: < 768px (Single column, simplified animations)
- Tablet: 768px - 1024px (2 column grid)
- Desktop: > 1024px (4 column grid, full effects)

### Mobile Optimizations
- Reduce blur intensity on mobile for performance
- Simplify gradients
- Maintain touch targets (min 44px)
- Stack cards vertically

## Accessibility

### Color Contrast
- All text meets WCAG AA standards
- Status colors have sufficient contrast
- Glass surfaces maintain readable text

### Focus States
- Ring color uses brand color
- 2px ring offset for visibility
- Visible on all interactive elements

### Motion
- Respects `prefers-reduced-motion`
- Animations can be disabled globally
- No reliance on animation for functionality

## Dark Mode (Future)
Prepared for dark mode implementation:
- Invert glass colors
- Darker base background
- Adjust glow intensities
- Maintain contrast ratios

## Performance

### Optimization Tips
- Use `will-change` sparingly for animations
- Limit backdrop-filter to visible elements
- Cache gradient backgrounds where possible
- Use CSS transforms for animations (GPU-accelerated)
- Lazy load heavy visual effects

## Integration with Branding System

The design system integrates with the white-label branding system:
- Brand colors can be customized per organization
- Gradients adjust based on brand hue
- Glass effects maintain consistency
- Logo rendered with frosted overlay effect

### Custom Branding
See `BRANDING_README.md` for details on customizing:
- Primary/Secondary colors
- Accent colors
- Font families
- Logo and favicon

## Resources

### Design Inspiration
- Apple Vision Pro UI
- Linear.app
- Notion clarity and typography
- Modern medical/tech brands

### Tools
- [HSL Color Picker](https://hslpicker.com/)
- [Gradient Generator](https://cssgradient.io/)
- [Shadow Generator](https://shadows.brumm.af/)

## Support

For design system questions or custom implementations, refer to component documentation or contact the design team.
