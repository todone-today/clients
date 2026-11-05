---
name: todone
description: Loud physical stickers on a night ground; drop one on a note and it does what it says.
colors:
  black: "#0b0b0b"
  cream: "#fff8ef"
  ink-2-night: "#c9c2b8"
  raise-night: "#171717"
  hair-night: "#2c2c2c"
  ink-2-day: "#4a4540"
  raise-day: "#f3eadb"
  hair-day: "#ddd2c0"
  lime: "#d4f04a"
  butter: "#f8dc85"
  pink: "#f2a7c6"
  peri: "#8fa2ff"
  cyan: "#46e0ee"
  orange: "#ff6a2b"
  hot: "#ff2e63"
  band-dark: "#111111"
typography:
  display:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "clamp(3.2rem, 7vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "clamp(2.8rem, 6vw, 5.5rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "clamp(2.2rem, 4vw, 3.4rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  none: "0px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  section: "6rem"
  stack: "1.5rem"
  inline: "0.75rem"
components:
  button-sticker:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.black}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  button-sticker-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.black}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  button-primary-on-lime:
    backgroundColor: "{colors.black}"
    textColor: "{colors.lime}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  button-soon:
    backgroundColor: "{colors.raise-night}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  button-ghost:
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.7rem"
  button-ghost-danger:
    textColor: "{colors.hot}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.7rem"
  board-note:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "1.1rem"
  board-note-lead:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "clamp(1.4rem, 3vw, 2.5rem)"
  sheet-sticker:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.85rem"
  plan-card:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "1.75rem"
  concept-tag:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.55rem"
  input-add:
    backgroundColor: "{colors.raise-night}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "0.85rem 1rem"
  list-item-active:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "0.55rem 0.7rem"
  chip-due:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "0.12rem 0.45rem"
  chip-late:
    backgroundColor: "{colors.hot}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "0.12rem 0.45rem"
---

# Design System: todone

## Overview

**Creative North Star: "The Sticker Stack"**

A todo list is a stack of loud, physical stickers you slap down and tick off. Every object is a flat block of colour with a black keyline and a hard offset shadow, set slightly askew, sitting on a near-black ground. The world is user-pinned to two neobrutalist references (zagged.com and two7square.com); the hard shadows, keylines and tilt are its native materials, not decoration to be trimmed.

Night is the default ground. Day swaps the ground to cream and the shadows to black; it applies when the visitor picks it on the Day/Night toggle, or when no choice is saved and the OS prefers light. Stickers keep their fills and black keylines in both themes. Display type is giant condensed uppercase; body type is a sturdy grotesk; mono is kept for text that is literally Markdown or a key to press.

The landing page (Persuade) carries the loud version: it opens as a working board of tilted notes with a sheet of stickers beside it, shows each feature as the note it makes, and closes on a lime band. The app (Operate) keeps the same materials but holds still: rows are untilted, colour marks state, and the only motion is the checkbox wobble and the progress fill.

The product name is a working name and will change. It is set only in `clients/apps/web/src/lib/brand.ts` and rendered as live display type; no surface may bake it into a raster, a CSS `content` string, or copy outside that constant.

**Key Characteristics:**
- Near-black ground, cream ink, whole-block accent fills.
- 2.5px black keyline on every sticker, chip and checkbox.
- Hard offset shadows with zero blur, cream on Night and black on Day.
- Small tilts (about -2deg to +1.5deg) on Persuade objects; none on Operate rows.
- Square corners everywhere.
- Condensed uppercase display at poster scale against a plain grotesk body.

## Colors

A neutral pair (near-black and cream) that trades places between themes, plus seven saturated sticker fills that never change.

### Primary
- **Tick Lime** (lime): the done colour and the primary action. Primary sticker buttons, checked boxes in the app, the active list, the progress fill, the funding meter fill, text selection, focus-adjacent field borders, the headline note that holds the page's primary action, the lead plan, and the close band.

### Secondary
- **Butter** (butter): the default sticker fill. Secondary buttons, board notes, the concept tag, due-date chips in the app.
- **Periwinkle** (peri), **Pink** (pink), **Cyan** (cyan): rotating sticker fills for board notes, the sticker sheet, feature notes, roadmap lanes, plans and the community cards.
- **Orange** (orange): one more sticker fill: the offline feature card on the landing, medium priority chips and a list colour in the app.

### Tertiary
- **Hot Pink** (hot): reserved for danger and lateness. Delete actions, error text, late chips, invalid inputs.

### Neutral
- **Ink Black** (black): Night ground, every keyline, text on every sticker fill, the checked box on a sticker note, the primary button on the lime note, Day ink.
- **Cream** (cream): Night ink, Day ground, Night shadow colour, and the paper inside stickers (checkbox faces, chips, the capture field, the Free plan).
- **Warm Grey** (ink-2-night / ink-2-day): secondary text, ledes, hints, inactive toggle options, dashed holder borders.
- **Raise** (raise-night / raise-day): one step off the ground for panels: the why band, the sticker sheet, the funding panel, empty image slots, the add-task field, the task editor.
- **Hairline** (hair-night / hair-day): 2px structural rules (nav bottom, feature tops, sidebar edge, row dividers, ghost-button borders).
- **Dark Band** (band-dark): the hardware band's ground; dark in both themes, with cream and night warm-grey text.

### Named Rules
**The Lime Means Done Rule.** Lime marks completion, the current list, and the primary action. Do not spend it on decoration that has no state.

**The Lime On Black Rule.** Lime text only ever sits on black: the primary button on the lime note, the slab in the close band. It never sits on the ground, so it holds up on Day.

**The Hot Is Trouble Rule.** Hot pink appears only for delete, late, invalid and error.

## Typography

**Display Font:** Big Shoulders 800/900 (with Arial Narrow)
**Body Font:** Schibsted Grotesk (with system-ui)
**Label/Mono Font:** JetBrains Mono (with ui-monospace), for Markdown and keys only

**Character:** Poster-scale condensed capitals shout the headline; a plain, slightly heavy grotesk does the talking underneath.

### Hierarchy
- **Display** (900, clamp(3.2rem, 7vw, 6rem), 0.86): the hero headline on the lead note, stacked lines (3rem on phones); the close band runs larger (clamp(3.4rem, 10vw, 10rem)).
- **Headline** (900, clamp(2.8rem, 6vw, 5.5rem), 0.86): section headings, balanced; the app list title uses clamp(3rem, 7vw, 5.5rem).
- **Title** (900, clamp(2.2rem, 4vw, 3.4rem), 0.86): feature headings, lane and plan names (2.4-3rem), the wordmark at about 2rem; large numerals (prices, the funding total, the timer) in tabular figures.
- **Body** (400, 1.0625rem, 1.55): running copy, ledes capped near 34-44rem. Copy set on a sticker fill goes to 600.
- **Label** (700, 0.875rem): buttons, nav links, toggle, chips (0.78-0.8rem, tabular figures). Sheet stickers run 800 at 0.95rem.
- **Mono** (500, 0.75-0.9rem): Markdown import and export, keyboard keys, image-slot placeholder labels.

### Named Rules
**The All-Caps Display Rule.** Display type is always uppercase, 900, line-height 0.86, tracking -0.01em. Body and labels are never uppercase.

**The Mono Is Literal Rule.** Mono is for text a user could type, paste or find in their Markdown file, nothing else.

## Layout

Full-bleed sections with a fluid side gutter (clamp(16px, 4vw, 56px)) and about 6-7rem of vertical padding. The hero is a board, not a headline over cards: a two-part grid of the board and an 11rem sticker sheet. Inside the board the headline note spans the left two-thirds (2fr) and four task notes stack in the right third (1fr), each at its own height; the sheet sits sticky at the far right. Features sit on a 12-column grid, each feature taking 5, 6, 7 or 12 columns so no two rows repeat. The why band, the funding panel and the hardware devices are asymmetric two-column splits (about 0.8/1.2 and 1.3/1).

The app is a two-column shell: a 17rem sidebar of lists and a main column capped at 56rem, under a top bar.

Breakpoints are content-driven: at 1100px the landing nav links hide, features go full width and the community cards go to two columns; at 900px the hero stacks, the board goes to two columns under a full-width headline note, the sticker sheet follows the notes as a sticky horizontal strip with the hint "Tap a sticker, then a note.", and the why, funding, devices, lanes and plans go to one column; at 760px the app sidebar becomes a horizontal scrolling strip above the list; at 560px the board goes to one column and type and padding tighten for phones.

**The Overlap Rule.** Stickers may overlap each other, but text never sits on top of another sticker's text.

## Elevation & Depth

Depth is entirely hard offset shadow: a solid copy of the object pushed down-right with zero blur. There are no soft shadows, gradients-as-depth or blur. In Night the shadow is cream, so stickers look cut out of the dark; in Day it is black. The only gradient on any surface is the diagonal hatch of an empty image slot, which is a texture, not depth.

### Shadow Vocabulary
- **Lift** (`box-shadow: 6px 6px 0 var(--shadow)`): resting stickers (notes, lanes, plans, feature notes).
- **Lift small** (`box-shadow: 3px 3px 0 var(--shadow)`): buttons, sheet stickers, community cards, tool chips and the active list item at rest.
- **Hover lift** (`box-shadow: 5px 5px 0 var(--shadow)` with `translate(-2px, -2px)`): buttons on hover.
- **Pressed** (`box-shadow: 0 0 0` with `translate(3px, 3px)`): buttons on press.
- **Coloured lift** (`10px 10px 0 var(--lime)`, `4px 4px 0 var(--lime)`): the board screenshot frame and a focused field take a lime shadow instead of the ground shadow.

### Named Rules
**The Press-Down Rule.** Buttons rise slightly on hover and press flat into their shadow on click.

**The Lift Redefinition Rule.** `--lift` and `--lift-sm` resolve at `:root`. Any section that changes `--shadow` (such as the lime close band setting it to black) must redefine `--lift` and `--lift-sm` too, or its buttons keep the root shadow colour.

## Shapes

Square corners throughout: no radius on stickers, buttons, chips, fields or panels. Borders are heavy: 2.5px black keylines on stickers, 2-3px on chips, checkboxes and fields. Tilt is part of the form language: Persuade objects sit between about -2deg and +1.5deg (board notes alternate -1.2deg and +1deg, the headline note -0.6deg, sheet stickers -2deg and +1.5deg, plans and lanes about ±0.8deg), and the close band's black slab under lettering sits at -1.5deg. Inside a sticker, a 2px dashed rule in 35% black separates a title from its list.

**The Square Sticker Rule.** If it has a keyline, it has square corners.

**The Dashed Holder Rule.** A dashed border marks a place things go, not a thing: the sticker sheet, an empty image slot, the funding and founding panels, and in the app the calendar tray and the drop slot. Stickers themselves are always solid-keylined.

**The Still App Rule.** Tilt belongs to the landing page. In the app, rows, fields and panels stay straight; only a checkbox wobbles (-6deg) on hover.

## Components

### Buttons
- **Shape:** square (0px), 2.5px black keyline.
- **Sticker (default):** butter fill, black label text at 700, padding 0.85em 1.4em, lift small. Fill is set per instance through `--fill`.
- **Sticker primary:** same with lime fill; used for payment and support buttons and the lead plan.
- **Primary on lime:** where the primary action sits on a lime sticker (the headline note), the button inverts to a black fill with lime text so it can't be missed. Buttons on a sticker fill take a black shadow.
- **Opening soon:** a payment button that is not live yet says so: raise fill, ink text, warm-grey keyline, no shadow, 60% opacity, no hover lift, `aria-disabled`.
- **Hover / Focus:** hover lift and press-down per Elevation; focus is a 3px cyan outline offset 3px (global). On the landing board and community cards, where cyan fills would swallow it, focus is a 3px ink outline offset 4px. Disabled drops to 45% opacity.
- **Ghost (app):** no fill, 2px hairline border that turns ink on hover; label 0.875rem 700. Danger variant uses hot pink text and border.

### Chips
- **Style:** small square tags with a 2px border and tabular figures. In stickers they are cream paper with black keylines; in the app they sit on a hairline border, due in butter, late in hot pink, both with black text and keyline.

### Cards / Containers
- **Corner Style:** square.
- **Background:** a sticker fill from the accent set; text is always black.
- **Shadow Strategy:** lift (see Elevation).
- **Border:** 2.5px black keyline.
- **Internal Padding:** about 1.1-2.5rem.

### Inputs / Fields
- **Style:** square, raise or ground fill, 2-2.5px border in ink or hairline.
- **Focus:** border turns lime; the add-task field also gains a 4px lime hard shadow. Inline rename uses a bare field with a 3px lime underline.
- **Error / Disabled:** invalid fields take a hot pink border; errors are 0.8rem 600 hot pink text.

### Navigation
- **Style:** sticky top bar on the ground colour with a 2px hairline beneath; the logo on the left; 0.9rem 700 links that underline 3px in lime on hover; GitHub, the Day/Night toggle and a sticker button on the right. Links hide below 1100px on the landing.
- **Theme toggle:** two text options split by a slash; the active one is ink with a 3px lime underline.

### Board Note
The landing's working note: a sticker (fill per note, lift, alternating tilt) with a cream keyline checkbox, a bold 1.15rem title and cream chips for what has been stuck on. It is a drop target: on hover or while a sticker is over it, it straightens and rises 3px, and an over-target note gains a 3px dashed black outline offset 5px. When a sticker lands, the note pops once (scale 1.06, -2deg, 0.6s). A done note fills its box black and strikes its title 2.5px. The headline note is the biggest note: lime, spanning all four rows, carrying the h1, the lede and the actions.

### Sticker Sheet
A dashed raise-coloured backing sheet holding the app's own stickers (Tomorrow, 1 hr, High, Weekly): 800 0.95rem labels on their fills, keyline, lift small, tilted -2deg and +1.5deg. Drag one onto a note, or press one (it gains a 3px ink outline and scales 1.05) and then click a note. A small warm-grey hint sits above the stickers.

### Image Slot
A figure that keeps its aspect ratio whether or not the picture exists. Empty, it shows a diagonal hatch of raise and ground in 14px bands, a 2.5px dashed warm-grey border, and a mono label on a ground chip saying what belongs there. A picture of something that does not exist yet carries the concept tag, a butter chip with a 2px keyline reading "Concept, not a product", pinned to the top-left corner.

### Plan Card
Each plan is a sticker: its own fill (cream, lime for the lead plan, cyan), keyline, lift and a ±0.7deg tilt that straightens below 900px. Name in display at 2.4rem, price in display at 3.4rem tabular with the term in 75% black beneath, a note, a checked list, and the button at the foot.

### Funding Meter
A dashed raise panel: the cost broken into hairline-ruled rows with tabular amounts on one side; on the other a display-sized total ("$0 of $124", the target at 0.45em in warm grey), a 1.4rem ground bar with an ink keyline and a lime fill at the real proportion, a short warm-grey note and the support button. It reports only real progress and steps aside once the target is reached.

### Dark Band
A full-bleed band on band-dark, keylined top and bottom, that stays dark in both themes. Its text is cream with night warm-grey captions; its empty image slots use a darker hatch with a muted border.

### Checkbox
Square box with a 2.5px keyline; cream (landing) or ground (app) at rest. In the app it turns lime when checked and wobbles -6deg and scales 1.08 on hover; on a sticker fill, which may itself be lime, it turns black. The checked title takes a 2-2.5px strike-through.

## Do's and Don'ts

### Do:
- **Do** give every sticker, chip and checkbox a black keyline (2.5px on stickers) and square corners.
- **Do** use hard offset shadows with zero blur, cream on Night and black on Day.
- **Do** redefine `--lift` and `--lift-sm` wherever a section changes `--shadow`.
- **Do** put lime text only on black.
- **Do** read the product name from `clients/apps/web/src/lib/brand.ts` and render it as live text.
- **Do** keep text on sticker fills black, whatever the fill.
- **Do** give every image an image slot of its final aspect ratio, and tag pictures of unbuilt things "Concept, not a product".
- **Do** show a payment button that is not live as "Opening soon" rather than a link to nowhere.

### Don't:
- **Don't** round corners on stickers, buttons, chips, fields or panels.
- **Don't** use blurred or ambient shadows, or gradients as depth.
- **Don't** set lime text on the Day ground.
- **Don't** tilt rows, fields or panels in the app.
- **Don't** use hot pink for anything but delete, late, invalid and error.
- **Don't** hardcode the product name in copy, CSS or images.
- **Don't** dash the border of a sticker; dashes are for holders.
