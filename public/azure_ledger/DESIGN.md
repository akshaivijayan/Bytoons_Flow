# Design System Specification: Bytoons Flow

## 1. Overview & Creative North Star
This design system is built to transform complex IT asset management from a spreadsheet-heavy chore into a high-end "Command Center" experience. The **Creative North Star** for this system is **"Bytoons Flow."** 

We are moving away from the "Generic Dashboard" aesthetic (white boxes with gray outlines) and toward a sophisticated, layered editorial style. By utilizing intentional asymmetry, deep tonal layering, and glassmorphism, we create a sense of immense data power that remains breathable and corporate-appropriate. This system prioritizes visual hierarchy through color-shift elevation rather than structural lines, resulting in a UI that feels "carved" rather than "pasted."

---

## 2. Colors & Surface Philosophy
The palette utilizes deep, authoritative blues and grays, punctuated by high-energy electric teals. 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or containers. Boundaries must be defined solely through background color shifts. 
*   **Example:** A main content area using `surface` might contain a sidebar using `surface_container_low`. 
*   **The Result:** A seamless, modern flow that reduces visual noise and eye fatigue during long data-entry sessions.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. Use the `surface_container` tiers to create "nested" depth:
*   **Base Layer:** `background` (#f7f9fb).
*   **Section Layer:** `surface_container_low` (#f2f4f6).
*   **Active Component/Card:** `surface_container_lowest` (#ffffff).
By nesting a "Lowest" white card inside a "Low" gray section, we achieve a soft, natural lift that communicates importance without requiring a single border.

### The Glass & Gradient Rule
To achieve a premium "Signature" look:
*   **Floating Elements:** Modals and popovers must use **Glassmorphism**. Combine `surface_container_lowest` at 85% opacity with a `20px` backdrop-blur.
*   **Signature Textures:** For primary actions and hero-state cards, use a subtle linear gradient (135°) transitioning from `primary` (#004596) to `primary_container` (#005cc3). This adds "soul" to the corporate blue.

---

## 3. Typography: Editorial Data
We use a dual-font strategy to balance character with extreme readability.

*   **The Headlines (Manrope):** All `display` and `headline` roles use **Manrope**. Its geometric construction feels architectural and modern. Use `headline-lg` for dashboard summaries to give the data a "Big Tech" editorial feel.
*   **The Data (Inter):** All `title`, `body`, and `label` roles use **Inter**. Inter’s tall x-height is specifically designed for high-density tables. 
*   **Visual Contrast:** Create hierarchy by pairing a `display-sm` (Manrope, 2.25rem) number with a `label-md` (Inter, 0.75rem, uppercase) description. The contrast in scale conveys authority.

---

## 4. Elevation & Depth
In this design system, shadows are light, and structure is tonal.

*   **The Layering Principle:** Depth is achieved by stacking surface tokens. A `surface_container_highest` header sitting atop a `surface_container` body creates a natural shelf.
*   **Ambient Shadows:** For elements that truly "float" (like a dropdown), use a highly diffused shadow:
    *   `X: 0, Y: 12, Blur: 32, Spread: -4`
    *   **Color:** `on_surface` (#191c1e) at **6% opacity**. 
    *   *Never use pure black or high-opacity shadows.*
*   **The Ghost Border Fallback:** If a border is required for accessibility in data-heavy tables, use a "Ghost Border": the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Asset Patterns

### Buttons
*   **Primary:** A gradient fill (`primary` to `primary_container`) with `on_primary` text. No border. Roundedness: `md` (0.375rem).
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. 
*   **Tertiary (Accent):** Use `tertiary` (#004f61) with a soft glow effect on hover.

### Status Badges (Inventory States)
Badges use the "Fixed" color tokens to ensure they stand out against neutral surfaces:
*   **Available:** `tertiary_fixed` background / `on_tertiary_fixed` text. (The Teal Accent).
*   **In Use:** `primary_fixed` background / `on_primary_fixed` text. (The Professional Blue).
*   **Maintenance:** `secondary_fixed_dim` background / `on_secondary_fixed` text. (The Muted Neutral).

### Data Cards & Tables
*   **Forbid Dividers:** Do not use lines to separate rows. Use a vertical spacing of `spacing.4` (0.9rem) and a subtle hover state shift to `surface_container_high`.
*   **The "Micro-Dashboard" Card:** Use `surface_container_lowest` with a `lg` (0.5rem) corner radius. Use `spacing.5` padding for internal content to allow the data to breathe.

### Navigation Tabs
Instead of an underline, the active tab should be a "Pill" using `secondary_container` with a `full` roundedness. This makes the navigation feel like a tactile switch rather than a web link.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `spacing.10` and `spacing.12` to separate major content blocks. Wide margins signal premium quality.
*   **Do** use `tertiary_fixed_dim` for icons related to action or growth.
*   **Do** ensure all text on `primary` backgrounds uses the `on_primary` token for AAA accessibility.

### Don’t:
*   **Don’t** use the `DEFAULT` roundedness for everything. Use `xl` for large containers and `sm` for small input fields to create visual variety.
*   **Don’t** use 100% opaque `outline` tokens. They create "grid-lock" where the eye gets stuck on lines instead of data.
*   **Don’t** use traditional "Drop Shadows" on cards. Use tonal background shifts instead.