# Le Kit

A neutral starter theme for YouCan sellers. It has no specific visual identity: sellers bring their own through color schemes, fonts and composable blocks.

Le Kit is the first YouCan theme built on the new Liquid core: theme blocks, section groups, color schemes, font pickers, `image_url` / `image_tag` and the Section Rendering API.

## Structure

```
layouts/    theme.liquid (header and footer groups, cart drawer, quick add dialog, toast)
sections/   page sections + header-group.json / footer-group.json
blocks/     theme blocks (public) and private blocks (_name, used by one section or block)
snippets/   shared rendering helpers (image, icon, price, product card, cart, checkout forms)
assets/     base.css, commerce.css and plain JS (custom elements, no build step)
config/     settings_schema.json, settings_data.json (color schemes)
locales/    en / fr / ar, storefront and schema translations
templates/  JSON templates
```

## Design

Neutral and quiet by default. Controls (buttons, inputs, pills, quantity) share a 10px radius, a subtle shadow with an inner highlight and a 3px focus ring. Surfaces (drawers, dialogs, cards) are rounder (`--radius-surface`, 1.6× the button radius). Drawers float inset from the viewport edges on desktop. Dialogs sit slightly above center on desktop and become bottom sheets on mobile. Every radius and color comes from Theme settings.

Selects are enhanced by `assets/select.js`: a listbox popup on desktop and a bottom drawer on mobile. The native `<select>` stays in the DOM, so forms, validation and `change` listeners keep working. Add `data-native` to opt out.

Motion: drawers, dialogs, selects, search and dropdowns animate in and out; accordions animate their height; sections can reveal on scroll (Theme settings > Animations).

## Concepts

- **Sections are containers, blocks are content.** Most sections accept `@theme` blocks, so sellers compose pages from the same small set of blocks (heading, text, button, image, video, icon, group, accordion, ...). The generic `section` ships with presets (rich text, multicolumn, icons with text, FAQ, newsletter, video).
- **Layout panel.** Sections and the group block share the same layout settings (direction, alignment, gap), rendered by `snippets/layout-style.liquid` into the `.layout-panel` CSS variables.
- **Color schemes.** Every section picks a scheme. `snippets/theme-styles.liquid` outputs one `.color-{id}` class per scheme. Components only use the `--color-*` variables.
- **Product blocks** (`product-title`, `price`, `variant-picker`, `buy-buttons`, ...) read their product from `closest.product`. They work on the product page and in `featured-product`.
- **Cart** changes go through `youcanjs`. The cart drawer and cart page are then re-rendered server side with `?sections=` (see `assets/cart.js`).
- **Quick add** loads the product page's `main` section with `?section_id=main` into a dialog.

## Shopping flows

The flow set in Theme settings > Shopping flow (cart, express checkout or both) is applied by the `buy-buttons` block and product cards. Express checkout, phone validation, linked location fields, bundles, add-ons and the upsell / thank you pages reuse the logic of the other YouCan themes.

## Development

```bash
pnpm dev            # youcan theme:dev
pnpm zip le-kit     # from the repository root, builds dist/le-kit-v{version}.zip
```

Set `theme_id` in `youcan.theme.json` before pushing to a store.
