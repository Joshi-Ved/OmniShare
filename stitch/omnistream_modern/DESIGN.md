# Design System Document: High-End Editorial Rental Experience

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Curated Exchange."** 

Unlike generic marketplaces that feel like cluttered databases, this system treats rental listings as editorial features. It rejects the "industrial" grid in favor of a sophisticated, layered environment that feels premium and authoritative. By utilizing a high-contrast typographic scale and a "No-Line" philosophy, we create a sense of trust through visual clarity and intentional breathing room rather than rigid structural borders.

The goal is to move from "searching for items" to "discovering possibilities." We achieve this through:
*   **Intentional Asymmetry:** Breaking the expected flow to highlight featured content.
*   **Atmospheric Depth:** Using tonal shifts rather than lines to define space.
*   **Editorial Authority:** Leading with bold, expressive headlines that command attention.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep, authoritative blues (`#0059bb`, `#1e293b`) paired with a sophisticated range of architectural grays.

### Surface Hierarchy & Nesting
We define depth through **Tonal Layering**. Instead of a flat white canvas, treat the UI as a series of stacked, physical layers.
*   **Base:** Use `surface` (`#f6fafe`) for the main canvas.
*   **Nesting:** Place primary content on `surface_container_lowest` (`#ffffff`) to make it "pop" forward. Use `surface_container_low` (`#f0f4f8`) for secondary information or sidebar zones.
*   **The "No-Line" Rule:** Explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. If a section ends, the background should transition from `surface` to `surface_container_low`.

### The Glass & Gradient Rule
To ensure the interface feels modern and "fluid," main CTAs and hero elements should utilize a subtle linear gradient transitioning from `primary` (`#005bc0`) to `primary_container` (`#0070ea`). For floating navigation or modal overlays, use **Glassmorphism**: 
*   **Background:** `surface_container_lowest` at 80% opacity.
*   **Effect:** `backdrop-filter: blur(12px)`.
*   **Result:** A "frosted glass" aesthetic that integrates the content with the environment.

---

## 3. Typography
Our typography is a strategic mix of technical precision and editorial flair.

*   **Display & Headlines (Space Grotesk):** This is our "Editorial Voice." It is wide, modern, and confident. Use `display-lg` (3.5rem) for hero statements and `headline-md` (1.75rem) for section headers.
*   **Titles & Navigation (Outfit/Inter):** For internal structural elements and listing names, use `title-md` (`inter`, 1.125rem).
*   **Body & Labels (Inter):** The "Workhorse." Inter provides maximum readability for item descriptions and transaction disclosures. Use `body-md` (0.875rem) for standard text and `label-sm` (0.6875rem) for fine-print disclosures.

**Typographic Hierarchy:** Always maintain high contrast between headline sizes and body text to create a clear "entry point" for the user's eye.

---

## 4. Elevation & Depth
We reject the standard "drop shadow." Depth is an atmospheric quality.

*   **Layering Principle:** Soft, natural lift is achieved by stacking `surface_container_lowest` cards on a `surface_container_low` background.
*   **Ambient Shadows:** When an element must float (e.g., a "Book Now" sticky bar), use a shadow with a blur radius of 40px and 4% opacity. The shadow color must be a tinted version of `on_surface` (`#171c1f`) rather than pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at 15% opacity. Never use 100% opaque borders.
*   **Depth through Motion:** When hovering over a listing card, do not just increase the shadow; shift the background color from `surface_container_lowest` to a slightly "brighter" `surface_bright` to mimic light hitting the object.

---

## 5. Components

### Cards & Listings
*   **Standard Card:** No borders. A soft transition from the image to a `surface_container_lowest` footer. Use `md` (0.75rem) corner radius.
*   **Sponsored Listing:** Differentiated by a subtle background shift to `secondary_container` and a `label-sm` "Featured" tag in the top right. Avoid garish "Ad" labels; maintain the editorial look.
*   **Spacing:** Use vertical white space (32px minimum) between cards rather than divider lines.

### Buttons (CTAs)
*   **Primary:** A soft gradient from `primary` to `primary_container`. High roundedness (`full`).
*   **Secondary:** `surface_container_high` background with `on_surface` text.
*   **Tertiary:** No background; `on_primary_fixed_variant` text with a `primary` underline that appears only on hover.

### Transaction & Fee Disclosures
*   **The "Non-Intrusive" Zone:** Place fee breakdowns in a dedicated `surface_container_low` box. Use `body-sm` typography. This area should feel like an organic part of the layout, not a warning.

### Form Inputs
*   Background: `surface_container_lowest`. 
*   Focus State: A `ghost border` (2px) using `primary` at 40% opacity. Avoid heavy solid focus rings.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts where one column is significantly wider than the other to create visual interest.
*   **Do** use `spaceGrotesk` for all major numbers (prices, dates) to give them a high-end, "designed" feel.
*   **Do** rely on generous padding (the "breathable" layout) to convey luxury.

### Don't
*   **Don't** use 1px solid lines to separate content sections.
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#171c1f) to maintain tonal softness.
*   **Don't** use standard "system" shadows. Every shadow must be diffused and tinted to the surface color.
*   **Don't** cram information. If a listing card feels "busy," remove a secondary label and move it to the detail page.

---

## 7. Token Reference Summary

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Primary** | `#0059bb` | Main Actions, Branding |
| **Surface** | `#f6fafe` | Global Background |
| **Surface Lowest** | `#ffffff` | High-Priority Cards, Form Fields |
| **Space Grotesk** | Font | Headlines, Price Display |
| **Inter** | Font | UI Labels, Body Copy |
| **Radius-MD** | `0.75rem` | Cards, Modal Containers |
| **Radius-Full** | `9999px` | Buttons, Selection Chips |