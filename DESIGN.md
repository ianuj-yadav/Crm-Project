# Design System: AURA CRM Lucid Operations Console
**Project ID:** Local vanilla implementation
**Device:** AGNOSTIC

## 1. Visual Theme & Atmosphere

AURA is a compact agency operations console with lucid depth: frosted editorial surfaces, human-scale spacing, and crisp neo-brutalist controls. It is intentionally a hybrid, not a collage: glassmorphism is reserved for workspace surfaces, neoclassical contrast comes from type and proportion, while pixel and brutalist influences appear in state markers, borders, and tactile actions.

## 2. Color Palette & Roles

- **AURA Ink** (`#162036`) - primary actions, key values, and high-attention data.
- **Luminous Teal** (`#0B8A83`) - active state, focus treatment, and campaign progress.
- **Porcelain Glass** (`rgba(255,255,255,.70)`) - frosted content surfaces.
- **Fog Canvas** (`#E8EEF0`) - page canvas and separated work zones.
- **Slate Metadata** (`#596579`) - timestamps, labels, and secondary context.
- **Signal Gold** (`#C88B2C`) - selective budget and attention accents.
- **Signal Rose** (`#D95D76`) - review and exception signal.

## 3. Typography Rules

**Primary Font:** Space Grotesk for operational text; DM Serif Display for high-value headings; DM Mono for numerical and state details.

- **Display (H1):** 700 weight, 15-18px in the application shell.
- **Section (H2):** DM Serif Display, 400 weight, 25-30px in workspace pages.
- **Body:** 400 weight, 13-14px, 1.5-1.6 line height.
- **Labels/Captions:** 600-700 weight, 10-12px, uppercase with restrained tracking.

## 4. Component Stylings

- **Buttons:** 2px radius, one strong ink primary action per decision zone, secondary actions as frosted outlined controls; offset shadow and one-pixel lift create a restrained neo-brutalist tactile response.
- **Cards/Containers:** 8px radius, frosted light surface, translucent cool-gray border, restrained layered shadow; cards never nest inside one another.
- **Inputs/Forms:** white fill, 1px outline, 7-8px radius, teal focus ring, explicit labels.
- **Status/Intent:** text labels paired with color; green, gold, blue, red, and neutral signals have distinct semantic meanings.

## 5. Layout Principles

- Desktop uses a sticky 372px inbox with a flowing detail workspace; mobile collapses into a single page flow.
- 4px spacing rhythm, 16-24px workspace padding, and 44px mobile target sizes.
- Tables remain dense and readable; user decisions stay close to their evidence and timeline.

## 6. Design System Notes for Stitch Generation

When creating new screens:

- **Atmosphere:** "Lucid high-density agency operations console: frosted editorial surfaces, modular typography, and restrained neo-brutalist tactility."
- **Colors:** AURA Ink (`#162036`), Luminous Teal (`#0B8A83`), Fog Canvas (`#E8EEF0`), Signal Gold (`#C88B2C`).
- **Shape:** 2px controls, 8px surfaces, thin translucent borders, and only purposeful glass.
- **Spacing:** compact 4px rhythm with clear separation between unrelated work areas.
- **Font:** Inter, semibold labels and headings, regular readable body copy.
