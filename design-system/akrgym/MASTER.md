# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** AkrGym
**Generated:** 2026-08-06 22:55:46
**Category:** Fitness/Gym App
**Design Dials:** Variance 5/10 (Balanced / Modern) | Motion 4/10 (Standard) | Density 7/10 (Standard)

---

## Global Rules

### Color Palette

The generated palette was adapted to the existing AkrGym identity. Do not introduce a fixed orange or a second CTA color. The product uses a neutral black and off-white foundation, while the active theme supplies one brand accent for emphasis and semantic states keep their own meaning.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary brand | Active theme `--brand` | `--color-primary` |
| On primary | Active theme `--text-primary` | `--color-on-primary` |
| Accent | Active theme `--accent` | `--color-accent` |
| Background | Active theme `--bg-deep` | `--color-background` |
| Surface | Active theme `--bg-card` | `--color-surface` |
| Foreground | Active theme `--text-primary` | `--color-foreground` |
| Muted | Active theme `--text-secondary` | `--color-muted` |
| Border | Active theme `--border-subtle` | `--color-border` |
| Destructive | Semantic red | `--color-destructive` |
| Ring | Active theme `--brand-bright` | `--color-ring` |

**Color Notes:** black and off-white first; one theme accent per surface. Never use color as the only progress or state signal.

### Typography

- **Heading Font:** Barlow Condensed
- **Body Font:** Barlow
- **Mood:** sports, fitness, athletic, energetic, condensed, action
- **Google Fonts:** [Barlow Condensed + Barlow](https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 7/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #22C55E;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #F97316;
  border: 2px solid #F97316;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #1F2937;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #F97316;
  outline: none;
  box-shadow: 0 0 0 3px #F9731620;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Modern Dark (Cinema Mobile)

**Keywords:** dark mode, cinematic, ambient light, glassmorphism, deep black, indigo, glow, blur, atmospheric, reanimated, haptic, premium, layered, frosted glass, linear gradient

**Best For:** Developer tools, pro productivity apps, fintech/trading dashboards, media/streaming platforms, AI tool interfaces, high-end gaming companion apps

**Key Effects:** Expo.out Bezier(0.16,1,0.3,1) easing; spring modals (damping:20 stiffness:90); haptic-linked press (Impact Light/Medium); animated ambient light blobs (Reanimated translateX/Y slow oscillation); BlurView glassmorphism headers/nav (intensity 20); scale press 0.97 → 1.0; avoid pure #000000 (OLED smear)

### Page Pattern

**Pattern Name:** Daily Training Cockpit

- **Primary job:** Let a returning user understand today's state and start a workout in one tap.
- **CTA Placement:** First content block, inside the thumb-friendly content flow. Secondary actions belong in the bottom navigation or the relevant screen.
- **Section Order:** 1. Today's context, 2. Start action, 3. Rhythm and recent session, 4. Next useful step.
- **Mobile rule:** No horizontal scroll, 44px minimum touch targets, and enough bottom inset for the fixed navigation.

---

## Motion

**Loading / Skeleton** (Standard) — Trigger: on mount / async wait | Duration: 800-1200ms loop | Easing: `power1.inOut`

```js
gsap.timeline({ repeat: -1 }).to('.loader-dot', { y: -8, duration: 0.4, stagger: { each: 0.15, yoyo: true, repeat: 1 } });
```

**Framework notes:** Wrap the whole loop timeline in useGSAP with { revertOnUpdate: false } in React so it isn't rebuilt every render

- ✅ Cap total loop duration under ~1.5s so long waits don't feel like the UI froze on a single beat
- ❌ Don't use elaborate loaders for sub-300ms waits; they flash and feel worse than no indicator
- ⚡ Pause the timeline (tl.pause()) when the loading tab/view is not visible to save CPU on background tabs

---

## Anti-Patterns (Do NOT Use)

- ❌ Fixed orange and green accents competing with the theme
- ❌ Storytelling or scroll effects that delay a workout action
- ❌ Generic equal cards with no clear first action

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
