# Game assets (bundled locally)

Baby Touch nursery art (`game/baby-touch/nursery.png`, `cover.png`) is a kawaii crib painting generated to match the Super Dad poster mockup (chubby toddler in a mint onesie, wooden crib, teddy, star rattle). UI chrome (cloud title, tip bar, mode pills) is HTML/CSS so it can be localized.

The in-game doll is a **layered puppet** over that painting: masked copies of `nursery.png` (head/hair, cheeks, torso, hands, rattle, feet) plus an SVG face overlay (lids, blush, mouth, tongue). Touch reactions move only those parts — the crib and room stay still.

| File | Role |
|------|------|
| eagle-mascot.jpg | Positive target (+10) |
| hawk-fly.jpg | Positive target (+15) |
| eagle-rocket.jpg | Positive target (+20) |
| hawk-dance.gif | Positive target (+30) |
| hawk-reward.jpg | Positive target (+35) + good-score end panel |
| rare-hawk-token.png | Rare positive target (+60) |
| rare-super-hawk.png | Rarer positive target (+80) |
| keep-trying.png | Ghost / low-score 「再接再厲」 overlay |

Ghost mole is an inline SVG (not from attachments).

Spawn weights (relative): mascot 28, fly 22, rocket 16, dance 12, reward 8, rareToken 8, rareSuper 4, ghost 14 (total 112).
