# TaskFlow Claymorphism Design System

## 1. Design Philosophy
**Claymorphism (Soft 3D)**: Characterized by fluffy, inflated 3D elements that look like clay or marshmallows.
- **Key Traits**: Large rounded corners (16px-24px), double inner shadows for volume, soft outer drop shadows for depth, vibrant pastel colors.
- **Mood**: Playful, friendly, approachable, touchable.

## 2. Color Palette (CSS Variables)
Using a vibrant yet soft palette suitable for productivity with a fun twist.

```css
:root {
  /* Primary Brand (Rose/Pink) */
  --primary: #E11D48;
  --primary-light: #FB7185;
  --primary-bg: #FFF1F2;
  
  /* Secondary / Action (Blue) */
  --secondary: #2563EB;
  --secondary-light: #60A5FA;
  
  /* Success (Green) */
  --success: #10B981;
  --success-light: #34D399;
  
  /* Danger (Red/Orange) */
  --danger: #F43F5E;
  
  /* Neutral / Backgrounds */
  --bg-app: #F0F2F5; /* Slightly darker than pure white to make white clay pop */
  --bg-card: #FFFFFF;
  --text-main: #334155; /* Slate 700 - Softer than black */
  --text-muted: #64748B; /* Slate 500 */
  
  /* Clay Effects */
  --shadow-clay-card: 
    8px 8px 16px rgba(166, 171, 189, 0.4), 
    -8px -8px 16px rgba(255, 255, 255, 0.8),
    inset 4px 4px 8px rgba(166, 171, 189, 0.1),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);
    
  --shadow-clay-btn:
    6px 6px 12px rgba(166, 171, 189, 0.4),
    -6px -6px 12px rgba(255, 255, 255, 0.8),
    inset 2px 2px 4px rgba(255, 255, 255, 0.3);
    
  --shadow-clay-pressed:
    inset 6px 6px 10px rgba(166, 171, 189, 0.2),
    inset -6px -6px 10px rgba(255, 255, 255, 0.8);
    
  --radius-lg: 20px;
  --radius-md: 16px;
  --radius-sm: 12px;
}
```

## 3. Typography
**Font Family**: `Fredoka` (Rounded) for headings, `Nunito` or System Fonts for body.
Since we want to keep it lightweight, we'll stick to System Fonts but style them rounded.

- **Headings**: System UI, Weight 700
- **Body**: System UI, Weight 400/500

## 4. Component Specifications

### 4.1. Clay Card (Universal Container)
- **Background**: White (#FFFFFF)
- **Border Radius**: 20px (`--radius-lg`)
- **Padding**: 16px-24px
- **Shadow**: `--shadow-clay-card`
- **Transition**: `transform 0.2s ease, box-shadow 0.2s ease`
- **Hover**: Slight lift (`translateY(-4px)`)

### 4.2. Clay Button (Primary Action)
- **Background**: `--primary` (Rose)
- **Text Color**: White
- **Border Radius**: 16px (`--radius-md`)
- **Shadow**: `--shadow-clay-btn` (colored shadow ideally)
- **Active (Click)**: `--shadow-clay-pressed` + `scale(0.98)`

### 4.3. Inputs & Forms
- **Background**: Light Gray/White
- **Style**: Inner shadow (Inset) to look "pressed in"
- **Border Radius**: 12px (`--radius-sm`)
- **Focus**: Ring with `--primary-light`

### 4.4. Progress / Indicators
- **Style**: Thick, rounded caps
- **Container**: Inset shadow ("trench")
- **Bar**: Outset gradient ("liquid")

## 5. Interaction Guidelines
- **Hover**: Elements should feel light and buoyant.
- **Click**: Elements should feel squishy/tactile (inset shadows).
- **Motion**: 200ms-300ms ease-out curves.

## 6. Implementation Plan
1.  **Reset**: Normalize box-sizing.
2.  **Variables**: Define CSS variables in `:root`.
3.  **Layout**: Flexbox/Grid with generous gaps (16px+).
4.  **Components**: Re-style `.schedule-card`, `.btn-primary`, inputs.
