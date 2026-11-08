---
name: Devout Utilitarian
colors:
  surface: '#e7fff2'
  surface-dim: '#c8dfd3'
  surface-bright: '#e7fff2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e1f9ec'
  surface-container: '#dcf3e7'
  surface-container-high: '#d6eee1'
  surface-container-highest: '#d0e8db'
  on-surface: '#0b1f18'
  on-surface-variant: '#3f4943'
  inverse-surface: '#20342c'
  inverse-on-surface: '#dff6e9'
  outline: '#6f7a72'
  outline-variant: '#bec9c1'
  surface-tint: '#156b4a'
  primary: '#005136'
  on-primary: '#ffffff'
  primary-container: '#146b4a'
  on-primary-container: '#98e9bf'
  inverse-primary: '#87d7ae'
  secondary: '#2d694e'
  on-secondary: '#ffffff'
  secondary-container: '#aeedcb'
  on-secondary-container: '#326e52'
  tertiary: '#6e3900'
  on-tertiary: '#ffffff'
  tertiary-container: '#8e4e0c'
  on-tertiary-container: '#ffcfab'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f3c9'
  primary-fixed-dim: '#87d7ae'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#b1f0ce'
  secondary-fixed-dim: '#96d4b3'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#0f5138'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#e7fff2'
  on-background: '#0b1f18'
  surface-variant: '#d0e8db'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a calm, purposeful, and highly dependable utility for locating congregational prayers (Jama’at) and mosques. The product's core mandate is operational speed, immediate clarity under direct outdoor light, and utmost reverence through dignified restraint.

The aesthetic fuses modern Swiss-inspired utilitarianism with serene Islamic architectural cues—relying on rich forest emerald tones, crisp dividers, quiet geometry, and generous white space rather than ornamental motifs. Every interaction prioritizes rapid orientation, unambiguous prayer schedules, and accessible legibility under real-world time pressure.

### Core Principles
- **Clarity Under Duress:** Users check prayer timings while in transit, walking, or parking. Information hierarchy is immediate and unambiguous.
- **Utilitarian Dignity:** Avoid decorative noise or faux-gilded religious tropes. Trust is built through functional precision, crisp typography, and serene pacing.
- **High-Contrast Legibility:** High ambient contrast ensures screens remain effortless to parse in bright daylight outside a venue.

## Colors

The palette is anchored by deep emerald green, balanced against crisp tinted neutrals and functional semantic accents.

### Color Tokens & Assignments
- **Primary (`#146B4A`):** The definitive emerald accent. Used for core interactive buttons, primary prayer time badges, verified checkmarks, and active navigation indicators.
- **Primary Pressed / Hover (`#0E5037`):** Darker forest shade applied to hover, pressed, and focus states for primary actions.
- **Tint Background (`#E8F3ED`):** Soft, desaturated tint for current prayer highlight cards, active pill filters, and contextual callouts.
- **Canvas / Background (`#F7FAF8`):** Off-white base canvas with a subtle cool moss undertone that reduces glare outdoors.
- **Surface / Elevation (`#FFFFFF`):** Pure white container surfaces for cards, bottom sheets, and dialog overlays.
- **Primary Text (`#172B23`):** Deep pine-slate neutral for maximum contrast ratio (exceeding WCAG AAA on white) for headings and vital times.
- **Supporting Text (`#52635B`):** Muted slate-green for labels, addresses, distance indicators, and metadata.
- **Subtle Border (`#E1E8E4`):** Crisp structural line tone for card dividers, table borders, and input strokes.
- **Status Amber / Under Review (`#8A4B08`):** Deep amber-brown warning tone for unverified timings, pending changes, or imminent Iqamah countdown warnings.
- **Status Error / Canceled (`#B42318`):** High-contrast accessible crimson for canceled prayers, closed facilities, or validation alerts.

## Typography

The type system prioritizes rapid scanning of numeric prayer schedules, geographic markers, and status indicators.

- **Latin Font:** `Inter` handles all Latin script typography, chosen for its neutral legibility, tall x-height, and tabular figure support for timetables.
- **Urdu & Arabic Script:** For bilingual listings and Qur'anic terms, use `Noto Sans Arabic` with dynamic optical baseline correction (`dir="rtl"`).
- **Tabular Numerals:** All prayer schedules, countdown clocks, and distance badges must enforce `font-feature-settings: "tnum" 1` to prevent layout shift during countdowns.
- **Hierarchy:** Primary headings are strictly structured to fit narrow phone screens without awkward hyphenation. Secondary metadata labels use tight, uppercase or medium-weight styling for rapid glanceability.

## Layout & Spacing

A mobile-first, single-column utility layout is the default foundation. On mobile, content stretches fluidly with fixed `1rem` (16px) outer edge margins. 

### Breakpoints & Grid Structure
- **Mobile (< 768px):** 1-column fluid layout. Edge margin: `1rem` (16px). Content blocks stack vertically, anchored by sticky top search/filter headers and bottom navigation sheets.
- **Tablet (768px – 1023px):** 6-column fluid grid. Gutter: `1rem` (16px). Edge margin: `1.5rem` (24px). Split view options (list + compact map).
- **Desktop (≥ 1024px):** 12-column fixed-max layout with a centered container capped at `1200px`. Gutter: `1.5rem` (24px), outer margins: `2rem` (32px). Two-column layout: 5 columns for persistent scrollable mosque listings, 7 columns for map view and schedule details.

### Spacing Scale
Built rigorously on an 8px base unit with a half-step (4px):
- `space-xs` (4px): Micro gaps between icons and labels, badge internal padding.
- `space-sm` (8px): Form input inner vertical padding, chip spacing, prayer card row gap.
- `space-md` (16px): Standard container padding, card interior spacing, field row margins.
- `space-lg` (24px): Inter-card stack distance, section separations.
- `space-xl` (32px): Primary section landmarks, modal view clearance.
- **Touch Target Rule:** All tap targets (buttons, list item chevron triggers, prayer time toggles) strictly enforce a minimum height and width of `48px`.

## Elevation & Depth

To remain utilitarian and preserve extreme readability in bright outdoor sunlight, this design system limits diffuse visual blur and leans on structural surface separation via borders and minimal ambient shadows.

### Elevation Levels
- **Level 0 (Flat Canvas):** `#F7FAF8` background. No shadow.
- **Level 1 (Cards & Schedule Modules):** `#FFFFFF` surface bounded by a continuous 1px `#E1E8E4` border. Shadow: `0px 1px 3px rgba(23, 43, 35, 0.05)`.
- **Level 2 (Active/Selected Card & Filter Bars):** `#FFFFFF` surface with `#146B4A` 1.5px border or drop shadow `0px 4px 12px rgba(20, 107, 74, 0.08)`.
- **Level 3 (Sticky Headers & Floating Action Buttons):** `#FFFFFF` surface, border-bottom 1px `#E1E8E4`, drop shadow `0px 4px 16px rgba(23, 43, 35, 0.08)`.
- **Level 4 (Bottom Sheets & Modals):** `#FFFFFF` surface with elevated drop shadow `0px -8px 24px rgba(23, 43, 35, 0.12)`.

## Shapes

The design uses disciplined, architectural geometry:

- **Cards & Sheets (`12px`):** Used on mosque detail cards, prayer schedule containers, bottom-sheet corners, and modal surfaces. This provides approachable warmth without feeling toy-like.
- **Controls & Form Elements (`8px`):** Used for buttons, search inputs, dropdown menus, and select triggers. Delivers an intentional, organized tool feel.
- **Micro Pills & Tags (`9999px` / Full Pill):** Applied strictly to dynamic status pills (e.g., "Next: Maghrib in 14m", "Verified Today", "Wheelchair Accessible") and quick-toggle horizontal filters.

## Components

### Buttons
- **Primary:** Solid `#146B4A` fill, `#FFFFFF` text, `8px` border radius, min-height `48px`, font weight 600. Pressed state transitions immediately to `#0E5037`.
- **Secondary / Outline:** `#FFFFFF` fill, 1px `#E1E8E4` border, `#172B23` text. Hover shifts to `#F7FAF8`.
- **Utility / Quick Action:** Tinted `#E8F3ED` background with `#146B4A` text and icons for "Directions", "Share", and "Add to Calendar".

### Chips & Filter Pills
- Unselected chips feature a `#FFFFFF` fill, 1px `#E1E8E4` border, `#52635B` text, and `8px` or pill radius.
- Active filters switch to `#E8F3ED` fill, 1px `#146B4A` border, and `#146B4A` bold text.
- Horizontal scroll lists on mobile must include a safe fading edge mask to communicate horizontal overflow.

### Input Fields & Search Bars
- Search bars have a min-height of `48px`, `#FFFFFF` background, 1px `#E1E8E4` border, and `8px` corner radius.
- Left-aligned utility icons (e.g., location marker, search glass) colored `#52635B`.
- Focus state switches the border to `#146B4A` with an outer ring of `0 0 0 3px rgba(20, 107, 74, 0.15)`.

### Cards & Prayer Timetables
- **Mosque Card:** Surface `#FFFFFF`, border 1px `#E1E8E4`, radius `12px`, padding `16px`. Displays Mosque name (`headline-md`), distance indicator, next prayer countdown badge, and quick directional triggers.
- **Jama’at Matrix Table:** A structured grid inside the card detailing Fajr, Dhuhr, Asr, Maghrib, and Isha. The imminent/active prayer column is highlighted with `#E8F3ED` background, `#146B4A` border accent, and tabular bold text.

### Verification & Status Indicators
- **Verified Jama’at:** `#146B4A` badge icon with secondary text "Verified today by community".
- **Pending / Unconfirmed:** `#8A4B08` icon with background `#FDF4E7` ("Under review / estimated").
- **Closed / Cancelled:** `#B42318` pill with background `#FEE4E2` ("Cancelled").

### Bottom Sheets (Mobile Focus)
- Used for single-mosque inspection while keeping the map partially visible.
- Surface `#FFFFFF`, top corners rounded to `16px`, drag handle of `36px × 4px` in `#E1E8E4`.