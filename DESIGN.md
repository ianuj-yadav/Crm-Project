# Design System: AURA CRM Operations Console
**Project ID:** Local vanilla implementation
**Device:** AGNOSTIC

## 1. Visual Theme & Atmosphere

AURA is a compact agency operations console: calm enough for repeated inbox work, but with enough contrast to make campaign decisions and exceptions feel immediate. The interface is information-first, precise, and quietly editorial rather than illustrative or overtly "AI" branded.

## 2. Color Palette & Roles

- **AURA Ink** (`#0F172A`) - primary actions, key values, and high-attention data.
- **Operational Teal** (`#0F766E`) - active state, focus treatment, and campaign progress.
- **Paper Surface** (`#FFFFFF`) - content surfaces and form controls.
- **Cloud Background** (`#F6F7F9`) - page canvas and separated work zones.
- **Slate Metadata** (`#64748B`) - timestamps, labels, and secondary context.
- **Signal Gold** (`#B7791F`) - selective budget and attention accents.

## 3. Typography Rules

**Primary Font:** Inter - direct, compact, and readable at dashboard density.

- **Display (H1):** 700 weight, 14-18px in the application shell.
- **Section (H2):** 700 weight, 20-24px in workspace pages.
- **Body:** 400 weight, 13-14px, 1.5-1.6 line height.
- **Labels/Captions:** 600-700 weight, 10-12px, uppercase with restrained tracking.

## 4. Component Stylings

- **Buttons:** 7px radius, one strong ink primary action per decision zone, secondary actions as white outlined controls; hover lift is one pixel only.
- **Cards/Containers:** 8px radius, white surface, thin cool-gray border, restrained layered shadow; cards never nest inside one another.
- **Inputs/Forms:** white fill, 1px outline, 7-8px radius, teal focus ring, explicit labels.
- **Status/Intent:** text labels paired with color; green, gold, blue, red, and neutral signals have distinct semantic meanings.

## 5. Layout Principles

- Desktop uses a sticky 372px inbox with a flowing detail workspace; mobile collapses into a single page flow.
- 4px spacing rhythm, 16-24px workspace padding, and 44px mobile target sizes.
- Tables remain dense and readable; user decisions stay close to their evidence and timeline.

## 6. Design System Notes for Stitch Generation

When creating new screens:

- **Atmosphere:** "High-density agency operations console with calm editorial restraint."
- **Colors:** AURA Ink (`#0F172A`), Operational Teal (`#0F766E`), Cloud Background (`#F6F7F9`), Signal Gold (`#B7791F`).
- **Shape:** subtly rounded 7-8px controls and surfaces; never oversized pills or decorative glass.
- **Spacing:** compact 4px rhythm with clear separation between unrelated work areas.
- **Font:** Inter, semibold labels and headings, regular readable body copy.
