# AquaLoop design plan

**Subject:** daily operations of a small drinks delivery business: water refills, sparkling and flavoured water, fresh milk in glass, and the containers that go round in a loop.
**Who:** households who order by chat; the owner who checks what the assistant isn't sure of; the driver on the van.
**Core action:** a message becomes an order (customer/owner), and a stop gets marked delivered with empties collected (driver).
**Moment of use:** a quick one-handed check between other things: on the sofa sending "make it 3 this week", at the van door counting empties.

## Directions considered
1. *Sky & mascot* (picked: it is the user's chosen picture): very light sky page, white cards, sky-blue pills, the round water-drop mascot carrying the product on every hero.
2. *Navy dispatch board*: dark navy with turquoise data, mono numerals. Lost: the user picked a light, friendly look.
3. *Glass & ripple editorial*: big serif headlines over full-bleed water photography. Lost: less operational, harder to scan.

## Palette (tokens in src/global.css, same in light and dark: the picture is a light app)
- Sky blue `#1E8BE6`: accent, buttons, links, active tab
- Navy `#0E1E3A`: foreground, headings
- Mist `#F3F8FD`: page background; Pale sky `#E4F1FC`: icon circles, chips
- Lagoon green `#22C3A0`: confirmed, delivered, return rate
- AI violet `#7B4DFF` on `#EFE9FF`: "AquaLoop understood" cards, parser badges
- Amber `#FF8A3D`: owner checks, low stock, near use-by; Red `#E5484D` only for errors/expired

## Type
System SF Pro. Titles 24pt bold navy, section headings 17pt semibold, row titles 13–14pt semibold, secondary 11–12pt grey. Big bold numerals on stat tiles (22pt).

## Imagery
The blue water-drop mascot cut from the chosen pictures, one pose per tab hero. Products: soft 3D renders on white, light blue caps, one consistent "app illustration" shoot.

## Shell
```
┌ Title ─────────────── [💧 On track] ┐
│ subtitle                              │
│ ╭ hero card: eyebrow/headline/CTA  🫧╮│
│ tiles / sections scroll under bar     │
└ (Home)(Catalogue)(Deliveries)(Containers) liquid glass ┘
```
Pushed screens (Chat, Review queue, Order book, Stop, Settings, Test Lab…) draw their own back chevron + title.

## Screens
Home: hero "Chat & Order" → two tiles (Repeat order, Empty containers) → [owner: Review queue card] → Repeat Orders rows → Empty Containers pickup card → Recent Activity → Tools.
(Alternative first screen drawn: chat thread first. Kept the picture's hero + orders, it is what they picked.)
Catalogue: search+filter → category chips → hero → Popular for You carousel → Bundles → Returnable containers.
Deliveries: run segmented → active run hero with progress → 4 tool tiles → Next stop → timeline → van capacity bars.
Containers: hero → 4 stat tiles → Your Containers steppers → Container activity.

## Signature moment
**Delivered ripple.** On a stop, tapping *Delivered* sends three concentric sky rings out from a green check that stamps in, with a success haptic; the timeline dot turns green. In Chat, an auto-confirmed order gets the same ripple behind its green "Confirmed" chip. Finishing every stop on a run fires a one-time "Run complete" celebration.

## Check
Would every delivery app get this? No: the mascot carrying the actual product on each hero, the loop of containers as a first-class tab, and the violet "what we understood" cards belong to AquaLoop. Changed from the first sketch: dropped a stat-tile home in favour of the picture's hero.
