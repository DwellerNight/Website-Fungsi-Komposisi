---
name: Luminous Logic
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424754'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#6d4e8f'
  on-tertiary: '#ffffff'
  tertiary-container: '#8766aa'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#efdbff'
  tertiary-fixed-dim: '#dbb8ff'
  on-tertiary-fixed: '#29074a'
  on-tertiary-fixed-variant: '#573878'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-desktop: 80px
  container-padding-mobile: 20px
  gutter: 24px
  glass-padding: 32px
---

## Brand & Style
The design system is centered on **Glassmorphism**, reflecting the clarity and layered nature of mathematical composite functions. The brand personality is professional yet ethereal, aimed at reducing the cognitive load of complex algebra through visual depth and "breathable" interfaces. 

By utilizing translucent layers and background blurs, the UI mimics physical glass overlays—suggesting that one function is layered upon another ($f \circ g$). The target audience (students and educators) should feel a sense of calm and precision. The aesthetic combines a **Modern Corporate** structure with **Glassmorphic** flourishes to ensure the platform feels like a high-end educational tool rather than a toy.

## Colors
The palette is dominated by **Soft Blue** (Primary) to promote focus and **Purple** (Secondary) to highlight interactive mathematical transformations. 

- **Primary Blue:** Used for core navigation and "active" states in function mapping.
- **Secondary Purple:** Represents the "inner function" in composite equations.
- **Surface Strategy:** Backgrounds should utilize subtle linear gradients (e.g., Soft Blue to White) to allow the glass components to "float" effectively.
- **Dark Mode:** Transitions to a deep Slate base, where glass elements become more translucent with higher blur values to maintain legibility.

## Typography
This design system employs a tiered sans-serif approach. **Hanken Grotesk** provides a sharp, contemporary feel for major headings. **Manrope** is used for body text to ensure maximum readability during long study sessions. **Geist** is introduced for labels and mathematical notations, providing a monospaced, technical precision necessary for displaying equations like $f(g(x))$.

Use `label-mono` for all variable inputs and function definitions to distinguish them clearly from instructional prose.

## Layout & Spacing
The layout follows a **Fluid Grid** model with generous margins to accommodate floating decorative background shapes (circles and polygons representing function sets). 

- **Grid:** 12-column system for desktop, 4-column for mobile.
- **Rhythm:** An 8px base unit governs all padding and margins. 
- **Containment:** Glass cards should have a minimum internal padding of `glass-padding` (32px) to ensure mathematical formulas do not feel cramped against the translucent borders.

## Elevation & Depth
Depth is achieved through **Backdrop Blurs** rather than heavy shadows. 

1.  **Level 1 (Base):** Subtle background gradients with floating, low-opacity geometric shapes.
2.  **Level 2 (Cards):** Glassmorphism surfaces with a 1px solid white border at 40% opacity. A very soft, large-radius ambient shadow (Blue-tinted, 5% opacity) helps lift the card.
3.  **Level 3 (Pop-overs/Modals):** Increased backdrop blur (20px) and a slightly thicker border to indicate high-priority interaction.

Transitions between levels should use a 300ms cubic-bezier curve for a "smooth-as-glass" feel.

## Shapes
The design system utilizes **Rounded (Level 2)** settings for primary containers to balance professionalism with approachability. 

- **Cards:** Use `rounded-lg` (16px) for the main glass panels.
- **Buttons & Inputs:** Use `rounded-xl` (24px) or full pill-shapes to create a friendly, tactile feel that invites clicking.
- **Decorative Elements:** Background "blobs" should be perfectly circular or organically rounded to contrast the structured, linear nature of mathematical graphs.

## Components
- **Glass Cards:** The primary container. Must feature `backdrop-filter: blur(12px)` and a thin internal glow/border.
- **Interactive Inputs:** Translucent backgrounds that become more opaque on focus. Text should be in `label-mono`.
- **Elegant Buttons:** Primary buttons use a vibrant Blue-to-Purple gradient. On hover, the button should "glow" using a drop-shadow of its own color.
- **Function Chips:** Small, pill-shaped indicators (e.g., "$f(x)$") used to categorize different parts of a composite function.
- **Floating Shapes:** Non-interactive background elements that move slightly on scroll (parallax) to enhance the sense of depth.
- **Progress Trackers:** Thin, glowing lines that represent the student's journey through a lesson module.