# Mono Theme — Customization Context

## File Structure

```
assets/          → CSS + JS files (one per section: section.{name}.css)
config/          → settings_schema.json (global settings)
layouts/         → theme.liquid (HTML shell)
sections/        → {name}.liquid (one file per section)
snippets/        → reusable partials (_config.liquid, misc.*, core.*)
templates/       → page type definitions (index.json, product.json, …)
locales/         → en.default.json, ar.json, fr.json
```

---

## How a Section Works

Every section file (`sections/{name}.liquid`) follows this pattern:

```liquid
{{ 'section.{name}.css' | asset_url | stylesheet_tag }}

{% if section.settings.custom_color %}
  {% style %}
    #youcan-section--{{ section.id }}:has([ui-section="{name}"]) {
      --brand-lightness: {{ section.settings.color.lightness | divided_by: 100 }};
      --brand-chroma: {{ section.settings.color.chroma }};
      --brand-hue: {{ section.settings.color.oklch_hue }};
    }
  {% endstyle %}
{% endif %}

<ui-{element}
  ui-section="{name}"
  {% if section.settings.custom_color %}data-custom-color data-theme="{{ section.settings.theme }}"{% endif %}
>
  {% for block in section.blocks %}
    <div {{ block.youcan_attributes }}>
      {{ block.settings.title }}
    </div>
  {% endfor %}
</ui-{element}>
```

**Key rules:**

- `section.settings.{id}` → accesses any setting
- `block.settings.{id}` → accesses block-level setting
- `block.youcan_attributes` → must always be on the block root element (enables editor selection)
- `#youcan-section--{{ section.id }}` → unique CSS scope per section instance
- Every section has its own CSS file in `assets/`

---

## Color System (OKLCH)

The theme uses OKLCH color engine. The brand color flows through three CSS variables:

```css
--brand-lightness   /* 0–1, from color.lightness / 100 */
--brand-chroma      /* 0–0.4, from color.chroma */
--brand-hue         /* 0–360, from color.oklch_hue */
```

These are set globally in `snippets/_config.liquid` and can be overridden per section.

**Semantic tokens available everywhere:**

```css
--color-primary              /* main brand color */
--color-on-primary           /* text/icon on brand bg */
--color-background           /* page background */
--color-on-background        /* text on page bg */
--color-surface-container    /* card/panel background */
--color-on-surface           /* text on surface */
--color-primary-container    /* tinted container */
--color-error / --color-success / --color-warning / --color-info
```

**Light vs Dark** is controlled by `data-theme="dark"` on the section element. Dark mode recalculates all tokens automatically — you never need to hardcode dark colors.

To customize a section's color, override the three brand vars on its scoped selector:

```css
#youcan-section--my-section:has([ui-section="slideshow"]) {
  --brand-lightness: 0.3;
  --brand-chroma: 0.2;
  --brand-hue: 260;
}
```

---

## Design Tokens

### Spacing

`--spacing-{n}` where n ∈ `0 2 4 6 8 10 12 14 16 24 32 48 64` (px values)

### Border Radius

```css
--radius-button    /* set by global border_radius setting */
--radius-section   /* set by global border_radius setting */
--radius-flat      /* 0px */
--radius-soft      /* 8px */
--radius-softer    /* 12px */
--radius-rounded   /* pill */
```

### Typography

```css
--font-display-lg / --font-display-md / --font-display-sm
--font-headline-lg / --font-headline-md / --font-headline-sm
--font-title-lg / --font-title-md / --font-title-sm
--font-body-lg / --font-body-md / --font-body-sm
--font-label-lg / --font-label-md / --font-label-sm
```

Usage: `font: var(--font-title-md)` (shorthand sets size, weight, line-height, family)

### Transitions

```css
--transition-expressive-fast-spatial    /* 350ms spring — for movement */
--transition-standard-default-effects  /* 200ms ease — for opacity/color */
```

---

## Custom HTML Elements

The theme uses Web Components (registered via `customElements.define`).

| Element          | File                 | Purpose                                         |
| ---------------- | -------------------- | ----------------------------------------------- |
| `<ui-carousel>`  | `misc.carousel.js`   | Slideshow, product slider, collections carousel |
| `<ui-product>`   | `section.product.js` | Product info, variant selection, add-to-cart    |
| `<ui-countdown>` | `misc.countdown.js`  | Live countdown timer                            |
| `<ui-toast>`     | `misc.toast.js`      | Notification toasts                             |

### `<ui-carousel>` API

```html
<ui-carousel autoplay interval="3000">
  <ul ui-carousel="wrapper" ui-slot="carousel">
    <li ui-carousel="item" ui-slot="carousel-item">…</li>
  </ul>
  <button ui-carousel="arrow-previous">←</button>
  <button ui-carousel="arrow-next">→</button>
  <div ui-slot="carousel">
    <button ui-carousel="marker"></button>
    <!-- one per slide -->
  </div>
</ui-carousel>
```

- `autoplay` attribute → enables auto-advance
- `interval="3000"` → ms between slides (default 3000)
- Per-page count is controlled by CSS: `--per-page: 2`

### `<ui-product>` API

```html
<ui-product ui-section="product-information" product-id="{{ product.id }}"></ui-product>
```

Handles variant selection, price updates, and add-to-cart automatically.

---

## Section CSS Pattern

Each `section.{name}.css` scopes styles with the `[ui-section=name]` attribute selector:

```css
[ui-section="product-grid"] {
  display: flex;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-section);
  box-shadow: 3px 3px 0 var(--color-primary);
}

[ui-section="product-grid"] .list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-12);
  padding: var(--spacing-12);
}
```

**The 3px offset shadow** (`box-shadow: 3px 3px 0 var(--color-primary)`) is the theme's signature card style — used consistently across sections.

**Aspect ratios** are data-attribute driven:

```css
[data-aspect-ratio="square"] {
  aspect-ratio: 1/1;
}
[data-aspect-ratio="portrait"] {
  aspect-ratio: 3/4;
}
[data-aspect-ratio="landscape"] {
  aspect-ratio: 1/0.5;
}
```

---

## Global Layout (`layouts/theme.liquid`)

```html
<body data-theme="{{ settings.theme }}">
  <main id="main">
    {% section 'header' %}
    <div id="app">{{ content_for_layout }}</div>
    {% section 'footer' %}
  </main>
</body>
```

- `data-theme` on body sets global light/dark
- `#app` contains all template sections
- `--section-spacing` CSS var controls gap between sections (from `settings.section_spacing`)

---

## Global Settings (config/settings_schema.json)

Accessed in Liquid via `settings.{id}`:

| ID                 | Type                   | Effect                                        |
| ------------------ | ---------------------- | --------------------------------------------- |
| `brand_color`      | color                  | Sets `--brand-lightness/chroma/hue` globally  |
| `theme`            | `light`/`dark`         | Sets `data-theme` on body                     |
| `section_spacing`  | range 0–64px           | Sets `--section-spacing`                      |
| `border_radius`    | `flat`/`soft`/`softer` | Sets `--radius-button` and `--radius-section` |
| `heading_font`     | select                 | Sets `--font-heading-family`                  |
| `body_font`        | select                 | Sets `--font-family`                          |
| `shopping_flow`    | `cart`/`direct`/`both` | Controls CTA button behavior                  |
| `background_image` | image                  | Sets body background                          |

---

## Snippets Reference

Partials called with `{% render 'name', param: value %}`:

| Snippet                | Purpose                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `misc.icon`            | `{% render 'misc.icon', name: 'hgi-arrow-left-01' %}` — renders HugeIcons stroke icon |
| `misc.image-fallback`  | Placeholder when no image set. `type: 'product'/'collection'`, `icon_size: 40`        |
| `misc.product-badge`   | Product badge overlay (discount %, low stock, custom text)                            |
| `misc.inventory-badge` | "X left in stock" urgency text                                                        |
| `misc.empty`           | Empty state UI. `type: 'cart'/'search'/'collection'`                                  |
| `misc.pagination`      | Paginator for collections/search                                                      |
| `misc.sort`            | Sort dropdown for collection/search pages                                             |
| `core.shop-button`     | Add-to-cart / Buy-now button. Respects `settings.shopping_flow`                       |
| `core.variants`        | Variant selector UI                                                                   |
| `core.quantity`        | Quantity stepper input                                                                |

---

## Icon System

Icons come from **HugeIcons** (loaded from CDN):

```
https://cdn.hugeicons.com/font/hgi-stroke-rounded.css
```

Usage: `<i class="hgi-stroke hgi-{icon-name}"></i>`  
Or via snippet: `{% render 'misc.icon', name: 'hgi-arrow-left-01' %}`

Common icons used in theme: `hgi-arrow-left-01`, `hgi-arrow-right-01`, `hgi-shopping-cart-01`, `hgi-search-01`, `hgi-menu-01`, `hgi-star`, `hgi-location-01`

---

## RTL Support

The theme auto-detects Arabic locale and sets `dir="rtl"` on `<html>`. For custom CSS:

```css
[dir="rtl"] .my-element {
  transform: rotate(180deg);
}
```

For icons that should flip: add `data-flip-icon-in-rtl` attribute on the element.

---

## Adding a New Section — Checklist

1. Create `sections/my-section.liquid`
2. Create `assets/section.my-section.css`
3. Add `{% schema %}` block at the bottom of the liquid file
4. Use `[ui-section=my-section]` as CSS root selector
5. Scope color override with `#youcan-section--{{ section.id }}:has([ui-section="my-section"])`
6. Include `{{ block.youcan_attributes }}` on every block root element
7. Load CSS at top: `{{ 'section.my-section.css' | asset_url | stylesheet_tag }}`
8. Register in a template JSON file if needed

**Minimal section skeleton:**

```liquid
{{ 'section.my-section.css' | asset_url | stylesheet_tag }}

{% if section.settings.custom_color %}
  {% style %}
    #youcan-section--{{ section.id }}:has([ui-section="my-section"]) {
      --brand-lightness: {{ section.settings.color.lightness | divided_by: 100 }};
      --brand-chroma: {{ section.settings.color.chroma }};
      --brand-hue: {{ section.settings.color.oklch_hue }};
    }
  {% endstyle %}
{% endif %}

<div
  ui-section="my-section"
  {% if section.settings.custom_color %}
    data-custom-color
    data-theme="{{ section.settings.theme }}"
  {% endif %}
>
  <h2>{{ section.settings.heading }}</h2>
  {% for block in section.blocks %}
    <div {{ block.youcan_attributes }}>
      {{ block.settings.title }}
    </div>
  {% endfor %}
</div>

{% schema %}
{
  "label": "My Section",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "My Section" },
    { "type": "checkbox", "id": "custom_color", "label": "Custom color", "default": false },
    { "type": "color", "id": "color", "label": "Color", "default": "#121212" },
    { "type": "select", "id": "theme", "label": "Theme", "options": [{"label":"Light","value":"light"},{"label":"Dark","value":"dark"}], "default": "light" }
  ],
  "blocks": [
    {
      "type": "item",
      "label": "Item",
      "settings": [
        { "type": "text", "id": "title", "label": "Title", "default": "Item title" }
      ]
    }
  ]
}
{% endschema %}
```

---

## Common Customization Patterns

### Change product grid to 3 columns

In `assets/section.product-grid.css`:

```css
[ui-section="product-grid"] .list {
  grid-template-columns: repeat(3, 1fr);
}
```

### Make slideshow autoplay

In `sections/slideshow.liquid`, add `autoplay interval="4000"` to `<ui-carousel>`:

```liquid
<ui-carousel ui-section="slideshow" autoplay interval="4000" …>
```

### Change card border style

```css
[ui-section="product-grid"] {
  box-shadow: none;
  border: 2px dashed var(--color-primary);
}
```

### Add a new field to an existing block

In the section's `{% schema %}`, add to the block's `settings` array:

```json
{ "type": "textarea", "id": "subtitle", "label": "Subtitle" }
```

Then render it in Liquid: `{{ block.settings.subtitle }}`

### Override section spacing for one section

```css
.youcan-section:has([ui-section="banner"]) {
  margin-block: 0;
}
```

### Custom font for one section heading

```css
[ui-section="slideshow"] .heading {
  font-family: "Georgia", serif;
  font-size: 2rem;
}
```

---

## JS Events (PubSub)

The theme uses a simple publish/subscribe system (`_pubsub.js`):

```js
// Subscribe
subscribe("cart/update", (data) => {
  /* handle cart change */
});

// Publish
publish("cart/update", { cart });
```

**Available events:** `cart/update`, `cart/error`, `coupon/update`

---

## Translation System

The theme has two separate locale file types with completely different purposes.

### The Two File Types

| File                             | Purpose                                               | Used in                    |
| -------------------------------- | ----------------------------------------------------- | -------------------------- | ----- |
| `locales/en.default.json`        | **Storefront strings** — text shown to shoppers       | Liquid via `{{ 'key'       | t }}` |
| `locales/en.schema.default.json` | **Editor labels** — text shown in the theme editor UI | Schema via `t:path.to.key` |

Parallel files exist for Arabic (`ar.json` + `ar.schema.json`) and French (`fr.json` + `fr.schema.json`).

---

### Storefront Strings (`en.default.json`)

These are customer-facing UI strings rendered at runtime. Used in Liquid with the `t` filter:

```liquid
{{ 'general.add_to_cart' | t }}         → "Add to cart"
{{ 'cart.coupon.apply' | t }}           → "Apply"
{{ 'empty.cart.heading' | t }}          → "Whoops, your cart is empty"
{{ 'inventory_badge.low_stock' | t, count: 3 }}  → "Only 3 left, selling fast"
```

**Key groups in `en.default.json`:**

```
general.*          → shared action labels (add, submit, cancel, sold_out…)
header.*           → nav drawer, search, cart drawer labels
search.*           → results count, sort options
product_information.* → breadcrumb (Home, Collections), Details, Variants
reviews.*          → review form fields and labels
cart.*             → cart title, coupon, summary, checkout
order_summary.*    → thank-you page (status, payment method, totals, WhatsApp share)
special_offer.*    → upsell drawer actions
contact.*          → contact form fields and messages
empty.*            → empty state headings and CTAs (cart, search, collection…)
product_badge.*    → "Save X%" and "Only [count] left!" badge text
inventory_badge.*  → sold_out / last_item / low_stock / high_stock messages
metadata.pages.*   → browser tab titles per page
```

**Interpolation:** Some strings use `[count]`, `[term]`, `[store]` as placeholders replaced at runtime:

```
"low_stock": "Only [count] left, selling fast"
"search": "Search: [count] results found for [term]"
```

**To add a new storefront string:**

1. Add the key to `en.default.json`, `ar.json`, and `fr.json`
2. Use it in Liquid: `{{ 'your.key' | t }}`

---

### Schema Strings (`en.schema.default.json`)

These are theme editor labels — what merchants see in the customizer sidebar, not shoppers. They are referenced in `{% schema %}` blocks using the `t:` prefix instead of hardcoded strings.

```json
// In schema JSON — reference with t: prefix
{ "label": "t:common.header.heading" }
{ "content": "t:common.headers.appearance" }
{ "label": "t:sections.slideshow.label" }
```

```json
// In en.schema.default.json — the actual resolved value
{
  "common": {
    "header": { "heading": "Heading" },
    "headers": { "appearance": "Appearance" }
  },
  "sections": {
    "slideshow": { "label": "Slideshow" }
  }
}
```

**Key groups in `en.schema.default.json`:**

```
common.headers.*       → section group headers (Appearance, Content, Media, Link…)
common.header.*        → shared setting labels (Heading, Description, Logo, Show arrows…)
common.custom_color.*  → Custom color, Color, Theme (Light/Dark) labels
common.custom_badge.*  → Badge type/style/position option labels
common.aspect_ratio.*  → Square/Landscape/Portrait/Vertical option labels
common.link.*          → URL, Show link, Open link in (Same tab/New tab)
common.inventory.*     → Inventory tracking, Threshold labels
sections.{name}.*      → per-section labels, option labels, and default values
globals.*              → global settings labels (branding, typography, social, shopping flow)
```

**Default values in schema strings:** The `default` sub-keys inside `sections.*` set what appears pre-filled in the editor for new sections:

```json
"sections": {
  "slideshow": {
    "default": { "heading": "Heading" },
    "blocks": {
      "slide": { "default": { "heading": "Slide heading" } }
    }
  }
}
```

These map to `"default": "t:sections.slideshow.default.heading"` in the schema JSON.

**To add a new schema string:**

1. Add the key to `en.schema.default.json`, `ar.schema.json`, and `fr.schema.json`
2. Reference it in the section schema: `"label": "t:your.new.key"`

---

### When to Use Which

| Situation                                   | File                     | Syntax                                                      |
| ------------------------------------------- | ------------------------ | ----------------------------------------------------------- | --------------- |
| Text a shopper sees on the page             | `en.default.json`        | `{{ 'key'                                                   | t }}` in Liquid |
| Label for a setting in the editor sidebar   | `en.schema.default.json` | `"label": "t:key"` in schema JSON                           |
| Default value pre-filled in an editor field | `en.schema.default.json` | `"default": "t:sections.name.default.field"` in schema JSON |
| Adding a new language                       | Both file types          | Create `{lang}.json` + `{lang}.schema.json`                 |

---

### Adding a New Language

1. Create `locales/{lang}.json` — translate all keys from `en.default.json`
2. Create `locales/{lang}.schema.json` — translate all keys from `en.schema.default.json`
3. The platform picks the right file automatically based on `store.store_locale.iso_code`

RTL languages (Arabic): `dir="rtl"` is already handled in `layouts/theme.liquid` — no extra work needed.

---
