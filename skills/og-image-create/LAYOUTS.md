# Layouts

Every layout shares one skeleton, because it is the arrangement that survives the square crop:

- **Top, centred, inside the must-read area:** the logo, then the headline, then at most one line of context.
- **Below it:** one large visual that runs off the bottom edge, and often the sides.
- **In the side zones, beside the headline:** up to four badges, two per side.

Sizes that worked on a 1200×630 canvas: logo about 42 px high; headline starting at 54 px and never under 46 px, line height about 1.06, at most three lines, with `text-wrap: balance`; context line 22 px; badge number 30 px with a 16 px label, badge at most 200 px wide. Weight, badge style and background follow the brand.

## The layouts

| Layout | What it is | Use it for | Watch for |
| --- | --- | --- | --- |
| **Band** | Neutral background, headline on top, a wide drawing or scene across the lower half | General pages, articles | Art pushed too low by a long headline |
| **Poster** | The whole card in the brand colour, light text, art below. For a brand that is neutral with one accent, use the brand's dark or light ground and the accent on key words | The home page, a campaign | The art must not use the background colour |
| **Screen** | A real product screenshot, cut off by the bottom edge. A thin border and rounded top corners are frame enough | Product and feature pages | Use a real screenshot; avoid heavy or outdated device frames |
| **Number** | One enormous number or name (about 104 px) above the headline, which may then be 36 px | Pricing, results, a named thing | The number must come from the page |
| **Bubble** | The headline inside a speech bubble, spoken by a character below | Brands with a mascot | The character's face stays inside the square |
| **Object** | One striking object as the hero, lit like a product photograph, rising from the bottom. On a dark brand it is shot on black and blended in | The home page, a product with no screen to show, anything abstract (a service, a library, an idea) | One object, not a scene. It must stand for what the page does, or it is decoration |

Use two to four of these across a site, chosen per page type. Vary the background between neutral and brand colour.

## When the card is correct but boring

A card can pass every check and still look like a template: text, four boxes, a flat panel. When the user says it is plain or boring, add in this order and stop when it is enough. Each step costs more than the one before.

1. **The brand's own background.** Look at the brand's existing art (covers, the site's hero) and reuse its layers: a glow, a faint grid, arcs, grain. A flat background is the most common cause of "plain".
2. **The real mark** beside the wordmark, from the logo file.
3. **A drawing made in code** that shows what the page does: a diagram, a wireframe, a flow, in the brand's line style. It costs nothing and rebuilds when the page changes.
4. **One generated object as the hero** (the Object layout). See "An object as the hero" in ART-PROMPT.md.
5. **Out of the screen.** Make the object break a frame, as described below.

Offer step 4 or 5 when the user asks for something more creative. Do not jump to generated art for a card that only needed step 1.

### Out of the screen

Depth comes from two things together:

- **The shot:** forced perspective, with the object reaching toward the viewer and the part nearest the camera sharp and large.
- **A frame it crosses:** draw a framed panel in the lower part of the card. Below the panel's top edge the object is inside the panel, clipped by its sides. Above the edge the object is in front of the frame. Lay the same picture twice, each copy clipped to its side of that edge. The template has the markup.

- **Where the edge goes:** through the object, below anything that must stay whole (a logo placed in the art, a face). A frame the object does not cross gives no depth.
- **How wide:** the panel may be narrower than the art, which clips the object's sides inside it, or wider than the art (a negative inset), which fills the lower corners of the card. With a wider panel the inside copy needs no side clipping.
- **Blended art lets the frame show through it.** With `screen` blending, the frame's line and fill are visible through the object, which kills the effect. Hide the frame behind the object with a mask made from the picture: opaque where the picture is empty, transparent where the object is.

  ```bash
  # white where the picture is empty, black on the object; fill a hollow (a glass ball) by drawing it in
  magick object.jpg -colorspace gray -blur 0x1.2 -threshold 7% -morphology Close Disk:7 -negate mask-gray.png
  magick mask-gray.png \( +clone -fill black -colorize 100 \) +swap -alpha off -compose CopyOpacity -composite PNG32:object-mask.png
  ```

  Set it on the frame with `mask-image`, sized and offset so it lines up with the picture. Look at the render zoomed in where the frame meets the object.
- **The real mark goes in one place:** beside the wordmark, or inside the object, not both.

## Patterns that work for other kinds of card

- **Blog post:** headline, then the author's photo and name as the context line, then the article's own image as the visual. A real photo or image from the article does as well as a custom illustration per post.
- **Minimal brand card:** product name, a tagline that says what the product does, logo. It survives every crop, and fails when the tagline says nothing about the product.
- **Split, text left and visual right:** common, and it loses its headline in the square crop because the headline sits left of the square. Use it only when square previews do not matter for this page.

## What reviewers say about weak cards

- "Make everything bigger": the text was too small to read in a feed.
- "Doesn't say what it is about": a logo or picture with no words.
- "A lot of info in a tiny square, less is more": the name and one line are enough. The URL does not need to be on the image.
- Clashing gradients and outdated device frames are noticed and disliked.
- One brand colour plus neutrals is the pattern in cards people praise.
