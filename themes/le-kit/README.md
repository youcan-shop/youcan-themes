# Le Kit

A neutral starter theme for YouCan sellers. It has no specific visual identity: sellers bring their own through color schemes, fonts and composable blocks.

Le Kit is the first YouCan theme built on the new Liquid core: theme blocks, section groups, color schemes, font pickers, `image_url` / `image_tag` and the Section Rendering API.

## Structure

```
layouts/    theme.liquid (header and footer groups, cart drawer, quick add dialog, toast)
sections/   page sections + header-group.json / footer-group.json
blocks/     theme blocks (public) and private blocks (_name, used by one section or block)
snippets/   shared rendering helpers (image, icon, price, product card, cart, checkout forms)
assets/     base.css, commerce.css and JavaScript modules (custom elements, no build step)
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

## JavaScript

Plain ES modules, no build step. `layouts/theme.liquid` prints an import map, so modules import each other as `@theme/<file>`:

```js
import { Component } from "@theme/component";
import { ThemeEvents, CartUpdateEvent } from "@theme/events";
import { translate, formatMoney } from "@theme/utilities";
```

Modules used on every page (cart, product, toast, select, dialogs, ...) load from the layout. The others load from the section or block that needs them, with `<script type="module" src="{{ 'marquee.js' | asset_url }}"></script>`. The browser runs a module only once, however many times the tag is printed.

**Components** are custom elements (`ui-*`) that extend `Component` (`assets/component.js`):

- Mark the elements a component needs with `ref`. Use `ref="name"` for one element and `ref="name[]"` for a list. They are available as `this.refs.name`. A ref belongs to the closest custom element around it, so nested components keep their own refs.
- Put the refs a component can't work without in `requiredRefs`. A missing one throws, with the component's name.
- Pass `{ signal: this.signal }` to `addEventListener`. The listeners are removed when the element disconnects.
- Refs are refreshed when the component's children change, for example when the theme editor re-renders a block.

```liquid
<ui-quantity quantity="1">
  <button type="button" ref="decrease">-</button>
  <span ref="value">1</span>
  <button type="button" ref="increase">+</button>
</ui-quantity>
```

**Events** are typed `CustomEvent`s dispatched on `document` (`assets/events.js`). `cart:update` (`CartUpdateEvent`) fires after any cart change. The cart drawer, cart page and cart bubbles listen for it. Dispatch it from new code instead of updating the cart UI directly.

**Strings and settings** that the JS needs live in `window.theme`, printed by the layout. Read strings with `translate("key", { name: value })`, which replaces `[name]`.

**Data attributes** carry state (`data-active`, `data-loading`, `data-open`) and, for behavior delegated on `document`, actions (`data-open-dialog`, `data-close-dialog`, `data-cart-remove`, `data-sort-select`). Inside a component, find elements with refs. The exception is markup a component shares with nested components, such as prices inside the sticky add to cart bar.

## Customer accounts

Templates for every customer page YouCan supports: login (with password recovery), register, account (profile + order history), order, addresses and reset password. They only show when customer accounts are enabled in the store settings. A 404 template (`404.json` + `main-404`) covers missing pages.

## Shopping flows

The flow set in Theme settings > Shopping flow (cart, express checkout or both) is applied by the `buy-buttons` block and product cards. Express checkout, phone validation, linked location fields, bundles, add-ons and the upsell / thank you pages reuse the logic of the other YouCan themes.

## Development

```bash
pnpm dev            # youcan theme:dev
pnpm zip le-kit     # from the repository root, builds dist/le-kit-v{version}.zip
```

Set `theme_id` in `youcan.theme.json` before pushing to a store.
