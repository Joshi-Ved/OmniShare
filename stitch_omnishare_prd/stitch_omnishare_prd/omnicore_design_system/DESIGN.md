# Design System Specification: The Architectural Curator

## 1. Overview & Creative North Star
The "Architectural Curator" is the creative North Star of this design system. It moves away from the "boxed-in" feel of traditional marketplaces and administrative tools, opting instead for a high-end editorial aesthetic. We achieve "Trust" not through heavy borders and blue gradients, but through **intentional whitespace, sophisticated tonal layering, and authoritative typography.**

This system treats every interface—from a consumer product listing to a complex ERP data table—as a curated gallery. We break the "template" look by using asymmetric layouts, overlapping "glass" elements, and a hierarchy driven by background shifts rather than structural lines. The result is an experience that feels engineered yet breathable; professional yet bespoke.

---

## 2. Colors & Surface Philosophy
We utilize a Deep Emerald (`primary: #005144`) as our anchor of reliability. It is paired with a sophisticated "Cool Gray" scale that leans into the blue-tinted `surface` tokens to maintain a sterile, high-end feel.

### The "No-Line" Rule
**Strict Mandate:** Traditional 1px solid borders for sectioning are prohibited. 
Structure must be defined through:
1.  **Background Color Shifts:** Use `surface-container-low` sections sitting on a `surface` background.
2.  **Tonal Transitions:** Define zones by moving from `surface-container-lowest` to `surface-container-highest`.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Base:** `surface` (#f7f9ff).
*   **Secondary Zones:** `surface-container-low` (#f1f4fa).
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) to create a subtle "lift" against the background.
*   **Admin/Utility Drawers:** `surface-container-high` (#e5e8ee).

### The "Glass & Gradient" Rule
To elevate the system above generic SaaS tools:
*   **Glassmorphism:** Use `surface` colors at 70% opacity with a `backdrop-blur` of 12px-20px for floating navigation bars or modal overlays.
*   **Signature Textures:** Main CTAs should not be flat. Use a subtle linear gradient from `primary` (#005144) to `primary-container` (#006b5b) at a 135-degree angle to provide "visual soul."

---

## 3. Typography: The Editorial Voice
We employ a dual-font strategy to balance marketing elegance with administrative precision.

*   **Display & Headlines (Manrope):** Our "Authoritative" voice. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero sections. Headlines should feel oversized to create an editorial, "magazine" impact.
*   **Body & Labels (Inter):** Our "Functional" voice. Inter’s high x-height ensures that dense data in ERP tables remains legible at `body-sm` (0.75rem).
*   **Hierarchy as Brand:** Use `title-lg` (Inter, 1.375rem) in semi-bold for product names to convey stability. Use `label-sm` (Inter, 0.6875rem) in all-caps with 0.05em tracking for secondary metadata to create a "technical" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "dirty." This system relies on ambient light simulation.

*   **The Layering Principle:** Depth is achieved by stacking. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural edge.
*   **Ambient Shadows:** If a card must "float" (e.g., a hover state), use a shadow with a blur of `24px`, an offset of `y: 8px`, and a color of `on-surface` at 4% opacity. 
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., in Dark Mode), use `outline-variant` (#bec9c4) at **15% opacity**. Never use 100% opaque borders.
*   **Glassmorphism Depth:** For administrative widgets, use a `surface-variant` background at 40% opacity with a heavy blur. This softens the edges of complex data, making the ERP feel integrated and modern.

---

## 5. Components & Primitive Styling

### Buttons
*   **Primary:** Gradient from `primary` to `primary-container`. `radius-md` (0.375rem). Padding: `spacing-4` (0.9rem) x `spacing-8` (1.75rem).
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **Tertiary/Ghost:** `on-primary-fixed-variant` text. High-contrast hover state using `primary-fixed` at 20% opacity.

### Cards & Marketplace Listings
*   **Rule:** Forbid divider lines.
*   **Structure:** Use `spacing-5` (1.1rem) of vertical whitespace to separate header from content. Use a `surface-container-lowest` background to distinguish the card from the `surface` background.
*   **Image Handling:** Product images must use `radius-lg` (0.5rem) to soften the "tech" vibe.

### Input Fields & Forms
*   **Styling:** Fill-only style. Use `surface-container-high` as the background. On focus, transition to `surface-container-lowest` with a "Ghost Border" of `primary` at 30% opacity.
*   **Labels:** Always use `label-md` positioned above the field, never placeholder-only.

### ERP Dashboard Widgets
*   **Metric Widgets:** Use `display-sm` for the primary number. Use `tertiary` (#892000) for negative trends and `primary` for positive, but keep the icons (arrows) subtle and small.
*   **Data Tables:** Striping is forbidden. Use `surface-container-low` on hover to highlight rows.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use intentional asymmetry. Place a headline on the left with 2/3 width, and let the content breathe with a wide right margin.
*   **Do** use "Optical Centering." Items inside cards should have more bottom padding than top padding to account for visual gravity.
*   **Do** utilize `spacing-16` and `spacing-24` for section breaks to create a premium, un-crowded feel.

### Don't:
*   **Don't** use 1px solid black or gray borders to separate content. Use background tonal shifts instead.
*   **Don't** use pure black for text. Use `on-surface` (#181c20) to maintain a soft, professional contrast.
*   **Don't** use standard "drop shadows." If it looks like a shadow, it’s too dark. It should look like a "glow" of depth.
*   **Don't** crowd the ERP. Even in data-heavy views, use the Spacing Scale (`spacing-3` minimum) between table cells.

---

## 7. Spacing & Grid System
We do not use a rigid 12-column grid for everything. 
*   **Marketing/Consumer:** Use a "Leaning Grid"—8 columns centered with wide 2-column gutters for a boutique feel.
*   **Admin/CRM:** Use a "Functional Edge" grid—Full width with `spacing-10` (2.25rem) margins to maximize data real estate while maintaining the system's "breathable" signature.