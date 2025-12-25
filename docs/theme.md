# Theme System

This document describes the FTA App's theming system using "Palette F — Steel + Lime Accent".

## Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--primary` | Steel Gray `#1F2937` | Off-White `#F3F4F6` | Primary text, buttons |
| `--accent` | Lime `#A3E635` | Lime `#A3E635` | Focus rings, highlights |
| `--accent-soft` | Pale Lime `#ECFCCB` | Dark Lime `#365314` | Subtle backgrounds |
| `--success` | Green `#22C55E` | Green `#22C55E` | Verified, confirmed |
| `--warning` | Amber `#F59E0B` | Amber `#F59E0B` | Caution, hypothesis |
| `--destructive` | Red `#EF4444` | Red `#EF4444` | Errors, high risk |
| `--background` | `#FAFAFA` | `#0A0A0A` | Page background |
| `--card` | `#FFFFFF` | `#171717` | Card surfaces |
| `--muted` | `#F3F4F6` | `#262626` | Secondary surfaces |

## Dark Mode

The app uses `next-themes` for dark mode support:

- **Toggle Location**: Sidebar bottom section
- **Default**: System preference
- **Storage**: LocalStorage (`theme` key)

### Usage in Components

```tsx
import { useTheme } from 'next-themes'

const { theme, setTheme, resolvedTheme } = useTheme()
```

## CSS Variables

All colors are defined as HSL values in `app/globals.css`:

```css
:root {
  --primary: 220 26% 17%;
  --accent: 82 77% 55%;
  /* ... */
}

.dark {
  --primary: 220 14% 96%;
  --accent: 82 77% 55%;
  /* ... */
}
```

## Tailwind Classes

### Semantic Colors

| Class | Usage |
|-------|-------|
| `text-primary` | Main headings, important text |
| `bg-primary` | Primary buttons |
| `text-muted-foreground` | Secondary text |
| `bg-muted` | Subtle backgrounds |
| `text-destructive` | Error text |
| `bg-destructive` | Delete buttons |
| `text-success` | Success messages |
| `border-success` | Verified indicators |
| `text-warning` | Warning text |
| `border-warning` | Hypothesis indicators |
| `ring-accent` | Focus rings (lime) |
| `bg-accent-soft` | Highlighted areas |

### Status Classes (Canvas Nodes)

```css
.status-success   /* Low RPN: Green background */
.status-warning   /* Medium RPN: Amber background */
.status-danger    /* High RPN: Red background */
```

### Judgment Classes (Canvas Nodes)

```css
.judgment-1  /* Confirmed: Green left border */
.judgment-2  /* Uncertain: Amber left border */
.judgment-3  /* Ruled out: Gray left border */
.judgment-4  /* Critical: Red left border */
```

### AP (Action Priority) Classes

```css
.ap-high    /* High priority: Red badge */
.ap-medium  /* Medium priority: Amber badge */
.ap-low     /* Low priority: Green badge */
```

## Component Token Usage

### Buttons

```tsx
// Primary button
<Button>Save</Button>  // Uses bg-primary

// Destructive button
<Button variant="destructive">Delete</Button>

// Ghost button
<Button variant="ghost">Cancel</Button>  // Uses hover:bg-muted
```

### Cards

```tsx
<Card>  // Uses bg-card, border-border
  <CardHeader>
    <CardTitle className="text-card-foreground">Title</CardTitle>
  </CardHeader>
</Card>
```

### Inputs

```tsx
<Input />  // Uses bg-background, border-input, focus:ring-accent
```

### Badges

```tsx
<Badge>Default</Badge>  // Uses bg-primary
<Badge variant="secondary">Tag</Badge>  // Uses bg-secondary
<Badge variant="destructive">Error</Badge>  // Uses bg-destructive
<Badge variant="outline">Status</Badge>  // Uses border-border
```

### Canvas Nodes

```tsx
<div className="fta-node">  // Base node styling
  {/* Selected state uses accent border */}
  {/* RPN badges use status-* classes */}
</div>
```

## Accent Usage (Lime)

The lime accent is used sparingly for:

1. **Focus rings** — All focusable elements
2. **Selected canvas nodes** — Border highlight
3. **Main Cause badge** — Star indicator
4. **Collapse/Expand buttons** — When collapsed
5. **Gate type badges** — AND/OR indicators
6. **Low-medium RPN** — Subtle background

## Adding New Components

When creating new components:

1. **Never use hardcoded hex colors**
2. Use semantic classes: `text-primary`, `bg-card`, `border-border`
3. Use status colors for meaning: `text-success`, `bg-warning`
4. Use `ring-accent` for focus states
5. Test in both light and dark modes

### Example

```tsx
// Bad
<div className="bg-[#1F2937] text-white">

// Good
<div className="bg-primary text-primary-foreground">
```

## Chart Colors

For data visualizations:

```tsx
chart: {
  '1': 'hsl(var(--chart-1))',  // Primary blue
  '2': 'hsl(var(--chart-2))',  // Teal
  '3': 'hsl(var(--chart-3))',  // Amber
  '4': 'hsl(var(--chart-4))',  // Purple
  '5': 'hsl(var(--chart-5))',  // Rose
}
```
