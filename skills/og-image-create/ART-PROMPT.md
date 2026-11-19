# Prompting an image model for card art

The model draws the picture. It does not draw the card. Every word, the logo and the badges are HTML placed on top afterwards.

## Before prompting

1. **Ask the user before spending credits,** and say how many generations this will take.
2. **Load the brand.** If the project has a brand art skill, a character sheet or a style guide, read it and use its style prompt and negative prompt. Do not write your own version of the brand's style.
3. **Collect references.** Pass the real brand or character art as image references. Never pass an earlier generation as the reference: errors compound.

## What the prompt must say

Write each of these parts, in this order:

1. **What it is for and its shape.** "Artwork for the lower half of a wide share card. Wide band, about 2:1."
2. **The composition for the layout.** "The main subject is in the middle third. Props spread into the left and right thirds. The bottom may be cut off. Keep the top sixth empty."
3. **The subject, counted.** "Exactly one" of the character. The whole face visible. Every limb attached to the body.
4. **Every prop, named, with where it sits and how many.** "Two books at the far left, one pencil at the right." Unnamed props are invented by the model.
5. **The style,** taken from the brand's own style description.
6. **The background.** See the next section.
7. **Colours to avoid.** On a card whose background is the brand colour, forbid that colour in the art, or the art disappears into it.
8. **The negative prompt.** "No text, no letters, no digits, no logos, no watermark." Then the styles to avoid for this brand.

Template:

```text
Artwork for the lower half of a wide social share card, a wide band about 2:1.
Composition: <main subject> in the middle third, <props> spread into the left and right thirds.
The bottom may be cut off. Keep the top sixth of the image empty.
Subject: exactly one <character or object>, whole face visible, every limb attached.
Props: <count> <prop> at <position>; <count> <prop> at <position>.
Style: <the brand's style description, copied from its guide>.
Background: <transparent | one flat colour, hex, used nowhere else in the image>.
Do not use <colour> anywhere in the art.
No text, no letters, no digits, no logos, no watermark. Avoid: <styles this brand does not use>.
```

## Background and cutting out

- **Ask the model for a transparent background when it has that option.** That gives the cleanest edge.
- **Otherwise ask for one flat, pure colour that appears nowhere in the art** (a strong green or magenta), and remove it afterwards with ImageMagick or ffmpeg.
- **Never key out white.** Highlights, eyes and paper inside the art are white too, and they go transparent with the background.
- **Check the cut-out on a hostile colour:** place it on a strong contrasting colour and look for a halo or holes.
- **Do not change the art style to make cutting out easier.** Adding an outline so the edge is easy to find changes the brand's look and costs a regeneration.

## An object as the hero

For a page with nothing to screenshot, one object can carry the card.

- **Choose the object as a metaphor for what the page does,** and say why in one line to the user before generating: a loupe for an audit, an astrolabe for research, a hand offering a crystal ball for a library of abilities. If the reason takes more than a line, pick another object.
- **One object per page, one material for the whole site.** Take the material from the brand's palette (aged brass for a gold accent on black, glazed ceramic for a soft pastel brand), so five cards look like one set.
- **Count everything a model miscounts:** "exactly one hand", "exactly five fingers", which fingers touch what.
- **For depth, describe the camera:** "forced perspective, wide-angle lens, low camera, reaching toward the viewer, the nearest part razor sharp, the rest falling out of focus".
- **Ask for up to four variants of one prompt** and choose. Finger positions and counts differ between them.

### On a dark card, shoot on black and blend

When the card's background is near-black, ask for "a seamless pure black background, completely empty" and do not cut the object out:

- Place the picture with `mix-blend-mode: screen`. Black adds nothing, so the background disappears and reflections and glow stay.
- Put the blend on the outermost positioned element of the art. An element with a transform or z-index isolates its children, and a blend set only on a child inside it leaves a black box.
- Darken the picture's blacks first if a faint rectangle shows (`magick art.png -level 5%,100% art.jpg`). To see whether one does, view a crop of the render with its levels pushed up (`-level 0%,25%`).
- This works only on a dark card. On a light card, cut the object out as described above.

### A logo or symbol inside the art

Never ask the model to draw the logo, on a sign, a screen or inside glass. Ask for that spot to be empty ("the inside of the sphere is empty and its centre is not covered"), then place the real logo file on top of the picture at that spot, with a soft glow so it sits in the light of the scene. Measure where the spot is as a fraction of the picture, so the logo stays in place when the art is resized: read the spot's box off the picture in pixels (`magick art.png -crop` a region and view it, or trim a thresholded copy) and divide by the picture's size. The same numbers give `data-subject`. If the subject is off the picture's centre, shift the art sideways by the difference so the subject sits on the card's centre line.

### A card with a photograph is a JPEG

A rendered card with photographic art is 350 to 450 KB as a PNG. Render it to a `.jpg` path, which comes to about 80 to 100 KB, and use that file name in the meta tags.

## Several drawings in one generation

Ask for a numbered 2×2 grid with wide gutters between the cells, one drawing per cell, and crop the cells apart afterwards. State what goes in cell 1, 2, 3 and 4.

## After generating

1. **Count.** One character, the named props in the named places, nothing extra, no stray text.
2. **Check the colour against the brand.** Measure the dominant colour of the character or main object and compare it with the brand's value. Models drift (too orange, too saturated). Correct it in post-production when it is off; do not accept it.
3. **Check the subject sits where the layout needs it:** in the middle third, with the top sixth empty.
4. **Regenerate with a corrected prompt** when a count or position is wrong. Fix the sentence that allowed it; do not add a general warning.
