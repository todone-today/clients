---
name: todone
description: Loud physical stickers on a night ground; the web list and the terminal Markdown are the same list seen twice.
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
  hot: "#ff2e63"
  terminal: "#111111"
  terminal-ink: "#e8e2d8"
typography:
  display:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "clamp(3.4rem, 7.6vw, 8.5rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "clamp(3rem, 7vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "clamp(2.2rem, 4vw, 3.5rem)"
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
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.2
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
  command-chip:
    backgroundColor: "{colors.raise-night}"
    textColor: "{colors.cream}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
    padding: "0.8rem 1rem"
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

Night is the default ground. Day swaps the ground to cream and the shadows to black; it applies when the visitor picks it on the Day/Night toggle, or when no choice is saved and the OS prefers light. Stickers keep their fills and black keylines in both themes. Display type is giant condensed uppercase; body type is a sturdy grotesk; anything that is literally a command or Markdown is mono, shown in a dark terminal pane, because the terminal is the same list seen a second time.

The landing page (Persuade) carries the loud version: tilted stickers, a slap-in entrance, a lime close band. The app (Operate) keeps the same materials but holds still: rows are untilted, colour marks state, and the only motion is the checkbox wobble and the progress fill.

The product name is a working name and will change. It is set only in `clients/apps/web/src/lib/brand.ts` and rendered as live display type; no surface may bake it into a raster, a CSS `content` string, or copy outside that constant.

**Key Characteristics:**
- Near-black ground, cream ink, whole-block accent fills.
- 2.5px black keyline on every sticker, chip and checkbox.
- Hard offset shadows with zero blur, cream on Night and black on Day.
- Small tilts (about -2deg to +1.5deg) on Persuade objects; none on Operate rows.
- Square corners everywhere.
- Condensed uppercase display at poster scale against a plain grotesk body.

## Colors

A neutral pair (near-black and cream) that trades places between themes, plus six saturated sticker fills that never change.

### Primary
- **Tick Lime** (lime): the done colour and the primary action. Primary sticker buttons, checked boxes, the active list, the progress fill, text selection, focus-adjacent field borders, the close band, and the emphasised line of each display headline.

### Secondary
- **Butter** (butter): the default sticker fill. Secondary buttons, the hero demo card, due-date chips in the app.
- **Periwinkle** (peri), **Pink** (pink), **Cyan** (cyan): rotating sticker fills for the numbered steps and the open-source cards; periwinkle is also the hard shadow under the hero terminal pane. Pink marks the due chip inside the hero demo.

### Tertiary
- **Hot Pink** (hot): reserved for danger and lateness. Delete actions, error text, late chips, invalid inputs.

### Neutral
- **Ink Black** (black): Night ground, every keyline, text on every sticker fill, Day ink.
- **Cream** (cream): Night ink, Day ground, Night shadow colour, and the paper inside stickers (checkbox faces, chips, the capture field).
- **Warm Grey** (ink-2-night / ink-2-day): secondary text, ledes, inactive toggle options.
- **Raise** (raise-night / raise-day): one step off the ground for panels: the terminal section band, command chip, add-task field, task editor.
- **Hairline** (hair-night / hair-day): 2px structural rules (nav bottom, sidebar edge, row dividers, ghost-button borders).
- **Terminal** (terminal, terminal-ink): the dark pane that shows Markdown and commands; dark in both themes.

### Named Rules
**The Lime Means Done Rule.** Lime marks completion, the current list, and the primary action. Do not spend it on decoration that has no state.

**The Day Highlighter Rule.** Lime text only works on Night. On Day the same emphasis becomes a lime marker block behind ink-coloured text, cloned across line breaks.

**The Hot Is Trouble Rule.** Hot pink appears only for delete, late, invalid and error.

## Typography

**Display Font:** Big Shoulders 800/900 (with Arial Narrow)
**Body Font:** Schibsted Grotesk (with system-ui)
**Label/Mono Font:** JetBrains Mono (with ui-monospace), for commands and Markdown only

**Character:** Poster-scale condensed capitals shout the headline; a plain, slightly heavy grotesk does the talking underneath.

### Hierarchy
- **Display** (900, clamp(3.4rem, 7.6vw, 8.5rem), 0.86): the hero headline, stacked lines, no wrapping; the close band runs larger (up to 10rem).
- **Headline** (900, clamp(3rem, 7vw, 6rem), 0.86): section headings; the app list title uses clamp(3rem, 7vw, 5.5rem).
- **Title** (900, clamp(2.2rem, 4vw, 3.5rem), 0.86): step and card titles; the wordmark at about 2rem; large numerals (step numbers, the timer) in tabular figures.
- **Body** (400, 1.0625rem, 1.55): running copy, ledes capped near 34rem. Copy set on a sticker fill goes to 600.
- **Label** (700, 0.875rem): buttons, nav links, toggle, chips (0.78-0.8rem, tabular figures).
- **Mono** (500, 0.78-0.9rem): install command, terminal pane, Markdown proof.

### Named Rules
**The All-Caps Display Rule.** Display type is always uppercase, 900, line-height 0.86, tracking -0.01em. Body and labels are never uppercase.

**The Mono Is Literal Rule.** Mono is for text a user could paste into a terminal or find in their Markdown file, nothing else.

## Layout

Full-bleed sections with a fluid side gutter (clamp(16px, 4vw, 56px)) and about 6rem of vertical padding. Content bands cap at 72rem; the hero is an asymmetric two-column grid (roughly 1.15fr / 1fr) that fills the first viewport, and the terminal section mirrors it (1fr / 1.2fr) on a raised band.

The app is a two-column shell: a 17rem sidebar of lists and a main column capped at 56rem, under a top bar.

Breakpoints are content-driven: at 1000px the landing collapses to one column and nav links hide; at 900px the hero demo straightens and stretches; at 760px the app sidebar becomes a horizontal scrolling strip above the list; at 560px type and padding tighten for phones.

**The Overlap Rule.** Stickers may overlap each other (the hero terminal pane tucks under the demo card), but text never sits on top of another sticker's text.

## Elevation & Depth

Depth is entirely hard offset shadow: a solid copy of the object pushed down-right with zero blur. There are no soft shadows, gradients-as-depth or blur. In Night the shadow is cream, so stickers look cut out of the dark; in Day it is black.

### Shadow Vocabulary
- **Lift** (`box-shadow: 6px 6px 0 var(--shadow)`): resting stickers (cards).
- **Lift small** (`box-shadow: 3px 3px 0 var(--shadow)`): buttons and the active list item at rest.
- **Hover lift** (`box-shadow: 5px 5px 0 var(--shadow)` with `translate(-2px, -2px)`): buttons on hover.
- **Pressed** (`box-shadow: 0 0 0` with `translate(3px, 3px)`): buttons on press.
- **Coloured lift** (`6px 6px 0 var(--peri)`, `10px 10px 0 var(--lime)`, `4px 4px 0 var(--lime)`): a dark pane or focused field takes an accent shadow instead of the ground shadow.

### Named Rules
**The Press-Down Rule.** Buttons rise slightly on hover and press flat into their shadow on click.

**The Lift Redefinition Rule.** `--lift` and `--lift-sm` resolve at `:root`. Any section that changes `--shadow` (such as the lime close band setting it to black) must redefine `--lift` and `--lift-sm` too, or its buttons keep the root shadow colour.

## Shapes

Square corners throughout: no radius on stickers, buttons, chips, fields or panels. The only round shapes are the three window dots in the terminal bar, which belong to the terminal motif. Borders are heavy: 2.5px black keylines on stickers, 2-3px on chips, checkboxes and fields. Tilt is part of the form language: Persuade objects sit between about -2deg and +1.5deg, small chips up to -3deg, and the close band's black slab under lettering at -1.5deg.

**The Square Sticker Rule.** If it has a keyline, it has square corners.

**The Still App Rule.** Tilt belongs to the landing page. In the app, rows, fields and panels stay straight; only a checkbox wobbles (-6deg) on hover.

## Components

### Buttons
- **Shape:** square (0px), 2.5px black keyline.
- **Sticker (default):** butter fill, black label text at 700, padding 0.85em 1.4em, lift small. Fill is set per instance through `--fill`.
- **Sticker primary:** same with lime fill; used for "Open the app".
- **Hover / Focus:** hover lift and press-down per Elevation; focus is a 3px cyan outline offset 3px (global). Disabled drops to 45% opacity.
- **Ghost (app):** no fill, 2px hairline border that turns ink on hover; label 0.875rem 700. Danger variant uses hot pink text and border.

### Chips
- **Style:** small square tags with a 2px border and tabular figures. In stickers they are cream paper with black keylines; in the app they sit on a hairline border, due in butter, late in hot pink, both with black text and keyline.

### Cards / Containers
- **Corner Style:** square.
- **Background:** a sticker fill from the accent set; text is always black.
- **Shadow Strategy:** lift (see Elevation); the numbered steps carry keyline and tilt without a shadow.
- **Border:** 2.5px black keyline.
- **Internal Padding:** about 1.25-2.25rem.

### Inputs / Fields
- **Style:** square, raise or ground fill, 2-2.5px border in ink or hairline.
- **Focus:** border turns lime; the add-task field also gains a 4px lime hard shadow. Inline rename uses a bare field with a 3px lime underline.
- **Error / Disabled:** invalid fields take a hot pink border; errors are 0.8rem 600 hot pink text.

### Navigation
- **Style:** sticky top bar on the ground colour with a 2px hairline beneath; display-type wordmark on the left; 0.9rem 700 links that underline in lime on hover; Day/Night toggle and a sticker button on the right. Links hide below 1000px.
- **Theme toggle:** two text options split by a slash; the active one is ink with a 3px lime underline.

### Command Chip
Mono install line on the raise colour with a 2px hairline border and a lime prompt (ink-2 on Day); the border turns lime on hover. Click copies.

### Terminal Pane
Dark pane (terminal, terminal-ink) with a keyline, a title bar with three grey dots, and mono Markdown. Ticked markers light up lime and the changed line flashes lime once. Stays dark in both themes.

### Checkbox
Square box with a 2.5px keyline; cream (landing) or ground (app) at rest, lime when checked, wobbles -6deg and scales 1.08 on hover. The checked title takes a 2-2.5px strike-through.

## Do's and Don'ts

### Do:
- **Do** give every sticker, chip and checkbox a black keyline (2.5px on stickers) and square corners.
- **Do** use hard offset shadows with zero blur, cream on Night and black on Day.
- **Do** redefine `--lift` and `--lift-sm` wherever a section changes `--shadow`.
- **Do** turn lime emphasis text into a lime marker block behind ink text on Day.
- **Do** read the product name from `clients/apps/web/src/lib/brand.ts` and render it as live text.
- **Do** keep text on sticker fills black, whatever the fill.

### Don't:
- **Don't** round corners on stickers, buttons, chips, fields or panels.
- **Don't** use blurred or ambient shadows, or gradients as depth.
- **Don't** set lime text on the Day ground.
- **Don't** tilt rows, fields or panels in the app.
- **Don't** use hot pink for anything but delete, late, invalid and error.
- **Don't** hardcode the product name in copy, CSS or images.
