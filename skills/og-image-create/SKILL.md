---
name: og-image-create
description: Create a social share card (og:image), 1200×630, that still reads when comment threads and message apps crop it to a square. Builds the card as HTML with real text, places the logo, headline, badges and art by zone, checks the zones in the page, renders a PNG under 300 KB, and wires the meta tags. Includes how to prompt an image model for the art. Use when making a share image for a page or a site, replacing a card that looks empty or gets cut off, producing cards per page or per language, or writing the image prompt for a card's artwork. For checking existing images use og-image-audit.
license: MIT
compatibility: Needs a browser that can open a local HTML file at 1200×630 and screenshot it. The bundled render script needs Node.js 18 or later and Playwright or Puppeteer already installed in the project. Image generation is optional and needs an image model.
metadata:
  domain: "design"
---

# Creating share cards

This skill makes the picture a link shows when it is shared. The card is built as an HTML page and screenshotted, so the words are real text in the project's own fonts and can be rebuilt when the copy changes. It does not review cards that already exist: that is `og-image-audit`.

A card is seen in two shapes. Feeds show all of it. Facebook comments, Messenger and iMessage show only the middle square. There is no meta tag for a second, square image, so one card has to work in both.

The square used here, x 285 to 915, is the middle 630 px of 1200, confirmed by seeing a Facebook comment cut a card there. It was not measured on every platform, which is why the must-read area is 30 px narrower on each side.

## Hard rules

1. **All lettering is HTML.** An image model draws art only. Generated text comes out misspelt and cannot be translated or updated.
2. **Three zones, three rules.**
   - *Must-read* (logo, headline, the one line of context): wholly inside x 315 to 885 and y 24 to 590.
   - *Extras* (stat badges, chips): wholly outside the square, ending at or before x 280 or starting at or after x 920. The square crop then drops them whole. A badge cut in half is the failure; a badge that is absent is fine. A badge may float over the empty part of a transparent drawing, never over a screenshot or photo, and never over must-read text.
   - *Art*: may cross any line and run off the bottom and the sides. Its main subject (a face, the product) stays inside the square.
3. **Every fact on the card comes from the page it is for.** No invented numbers, quotes, screens or claims.
4. **Real product pictures beat drawn ones.** Use a real screenshot. Do not invent a chat, a question or a screen inside a drawn phone: it looks weaker and tends to be wrong about the product.
5. **Under 300 KB**, because WhatsApp skips larger images.
6. **Never ship a square file as `og:image`.** Platforms crop its sides to 1.91:1.
7. **Ask before spending image-generation credits,** and say how many generations the request will take.
8. **Use the project's brand.** If the project has a design system, a brand art skill or a character sheet, read it first and take the colours, fonts, logo and art style from it.

## Workflow

### 1. Gather what the card is made of

For each page that gets a card, collect:

- **The headline:** from the page's own heading or title. One idea, and short enough for three lines at 46 px or more in a 570 px column.
- **The logo:** the real file, SVG where it exists. A logo that is a text wordmark is set as text in the brand's font.
- **Colours:** the values from the project's theme or token file. Copy them from the file into the card; do not type them from memory. Do not link the theme file itself, because its page rules fight the card's layout.
- **Fonts:** the project's own font files, loaded in the card with `@font-face` from a local path. A card in a fallback font is off-brand.
- **Up to four facts** for badges, taken from the page's copy: a number or a short word, and a label for it.
- **The context line:** may be condensed from the page's own sentences. It may not add a claim the page does not make.
- **The visual:** a real product screenshot, the article's own image, existing brand art, or art to be generated in step 3.
- **Languages:** one card per page and per language the site serves.

Where the project keeps page copy in modules, make the card read the same module, so a card cannot drift from its page.

For a screenshot as the visual, capture it for the card and not for a desk monitor:

- Use a narrow viewport, about 560 to 700 px wide at 2× scale, so the interface text is large enough to survive being shown at card size.
- Pick the region that shows the product working, and leave out the part that repeats the card's headline.
- Place it so its most telling part (the main control, the result) is inside the square.

**Done when:** each card has a headline, a logo, colours, fonts, a visual, and a source for every fact.

### 2. Choose a layout

Pick one per page type from [LAYOUTS.md](LAYOUTS.md), and vary them across a site: the same background and arrangement on every page reads as a template. Every layout there keeps the logo and headline centred at the top and lets the visual run off the bottom, because that arrangement survives the square crop.

Two things reviewers reject most often:

- **An empty card.** Fill the canvas: one large visual, and badges in the side zones.
- **A small, whole visual floating in space.** Let the canvas edge crop it, so it reads as part of something larger.

**Done when:** each card has a named layout.

### 3. Get the art (only if the card needs generated art)

Read [ART-PROMPT.md](ART-PROMPT.md) and write the prompt from its template. It covers what the composition must say for this layout, references, transparent backgrounds and cutting out, the negative prompt, and the colour check afterwards.

Skip this step when a real screenshot or existing art does the job.

**Done when:** the art is a file with a transparent background, checked on a contrasting colour, in the brand's style and colours.

### 4. Build the card

Copy [assets/card-template.html](assets/card-template.html) and fill it in. It is a 1200×630 page with the zones already placed, and three kinds of marked element:

| Attribute | For | Checked against |
| --- | --- | --- |
| `data-og="must"` | logo, headline, context line | the must-read area |
| `data-og="side"` | badges | the extras area |
| `data-og="art"` | the main visual | its main subject on the canvas and inside the square, when `data-subject` says where that subject is. Add `data-opaque` for a rectangular screenshot or photo, and the check also fails any badge that covers it |

Set the colours and fonts in the `:root` block, replace the text and image paths, and delete the markup and the CSS a layout does not use.

The template's look is a neutral placeholder. Restyle it to the brand: font weights, badge shape and border, corner radius, background. What must stay is where things sit: the must-read column, the badge positions outside the square, and the `data-og` marks. If the theme switches on `prefers-color-scheme`, copy the wanted scheme's values into the card, or render with `--scheme=dark`. The page shrinks the headline from its starting size until it fits in three lines, and stops at 46 px: a headline that still does not fit must be shortened, not shrunk further. The one exception is a headline under a much larger hero line (the Number layout), which may be 36 px.

Mark where the art's main subject is with `data-subject`, as fractions of the artwork (`"0.35,0.05,0.65,0.6"` is a box in the upper middle). Tall text pushes the art down, and this is how the check notices that a face or the product has left the canvas. Without it the check prints a note and the square crop must be judged by eye.

For many cards, generate the HTML from a data file with one entry per card, and keep the template as the single place the zones are defined.

**Done when:** the page opens at 1200×630 and shows the card.

### 5. Check and render

The template defines `window.ogCheck()`, which measures every marked element and returns the list of failures. Run it one of two ways:

- **With the bundled script:** [scripts/render.mjs](scripts/render.mjs), resolved from this skill's folder, run from the project folder so it finds the project's Playwright or Puppeteer.

  ```bash
  node <skill-folder>/scripts/render.mjs card.html public/og/home.png
  ```

  It prints each failure and the final headline size, writes the image, and exits 1 on any failure or a file over 300 KB. Beside the image it writes `home.square.png` (the square crop) and `home.small.png` (400 px wide): look at both, then delete them. A `.jpg` output path renders a JPEG. `--scheme=dark` or `--scheme=light` sets the colour scheme. Set `OG_BROWSER_PATH` to a Chrome or Chromium binary if the library has no browser of its own. If the card's folder has no Playwright, run the command from any folder that has it and pass absolute paths.
- **With any browser tool:** open the HTML at a 1200×630 viewport, run `await window.ogCheck()` in the page, fix what it returns, then screenshot the viewport. Open the page with `?zones` added to the address to see the zones drawn over the card.

Then look at the result, because the check cannot see inside the art:

1. **The square crop:** can the brand and the headline be read in full, and is the main subject of the art still in the picture?
2. **The card at about 400 px wide:** can the headline be read without zooming?
3. **The whole card:** does it say what the page is about, and is the canvas full?

If the PNG is over 300 KB, save it as a 256-colour palette PNG (`pngquant 256`, or the `palette` option in sharp) when one of those is available: flat art drops to roughly 80 to 100 KB with no visible change. Otherwise, and for photographic cards, render to a `.jpg` path.

**Done when:** `ogCheck` returns no failures, the file is 1200×630 and under 300 KB, and the three looks pass.

### 6. Wire the meta tags

Each page needs, with an absolute URL:

```html
<meta property="og:image" content="https://example.com/og/home.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://example.com/og/home.png">
```

- **Where the file lives:** a public, static path such as `public/og/<page>.png`, one file per page and language.
- **Replace, do not duplicate:** if the page already has `twitter:card` set to `summary`, change it; two `twitter:card` tags give an undefined result.
- **Next.js:** set them through `metadata` (`openGraph.images` with `url`, `width`, `height`; `twitter.card` and `twitter.images`), with `metadataBase` set so the URLs come out absolute. A page's `openGraph` metadata replaces the parent's and does not merge with it. A page that sets `openGraph` without `images` ships no image. Set `images` wherever `openGraph` is set.
- **When the site's code cannot be edited:** hand the user the tags and the file, and say where each goes.
- **Test:** where the project has end-to-end tests, add one that asserts `og:image` and `twitter:image` on every page. This is the check that catches the Next.js case.
- **Old links keep their old picture.** Platforms cache per URL. Tell the user to refresh important links with Facebook's Sharing Debugger ("Scrape Again") or LinkedIn's Post Inspector.

**Done when:** every page serves the tags and the image URL answers 200. If `og-image-audit` is installed, run it on the pages as the final check.

## Output format

Report to the user:

1. The files written, with size in KB, and the layout used for each.
2. The result of `ogCheck` and of the three looks, per card.
3. The meta tags added and where.
4. Anything not done: art not generated because credits were not approved, a page with no usable visual, a headline that had to be shortened and how.
