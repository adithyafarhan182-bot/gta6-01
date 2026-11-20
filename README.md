# SUNSET BAY — an open-world crime game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/adithyafarhan182-bot/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/adithyafarhan182-bot/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for make.fun's **gta6-01** ("Make GTA 6", $1,666, top 100). A sun-soaked coastal city to explore on foot and by car — with traffic, pedestrians, a wanted level and police who respond, six story missions, combat, a HUD with a minimap, a start screen and saves. Played with keyboard and mouse, entirely offline from static files.

## Play it

```sh
node serve.ts   # or: python3 -m http.server -d game
```

Then open http://localhost:8080 in desktop Chrome. No network request is made by the game.

## The city

**Sunset Bay** — Old Town, Downtown, the North Docks, the Marina, Palm Park and the Beachfront, drawn in golden-hour light. Riko Vale, driver-for-hire, takes six jobs from Mama June: a first fare, a repo job, a pier pickup against the Tide Kings, a getaway, an armored van, and the Sunset Job itself — a bank hit and a boat out at the pier.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Walk / drive |
| Mouse + click | Aim / shoot pistol |
| E | Enter, steal or exit a car |
| F | Punch |
| Shift | Run |
| M | Start the next job |
| N | Mute |
| Esc | Pause |

Stealing a car, running someone over or shooting raises your wanted level; Bay PD sends more cars the hotter you are. Lose them, or pay Lou's Pay 'n Spray $200 for clean plates. Progress saves in your browser (Continue on the start screen).

## Screenshots

Four real renders from the game itself (`?shot=cover|street|drive|mission`): the three-star police chase downtown, Riko on foot at a busy intersection, the sunset beach-road cruise, and the bank holdout with the Tide Kings closing in.

## Structure

```
game/
  index.html        page shell, HUD and menus
  css/style.css     interface styling
  src/
    main.js         state, game loop, menus, wiring
    config.js       tuning, palette, places
    city.js         city generation and collision
    input.js        keyboard + mouse
    audio.js        synthesized sound (WebAudio, no files)
    player.js       Riko on foot
    vehicles.js     driving, traffic AI, police AI
    pedestrians.js  the people of Sunset Bay
    combat.js       bullets and the wanted system
    missions.js     the six-job story arc
    render.js       camera and world drawing
    hud.js          health, cash, stars, objective, minimap
    save.js         localStorage saves
    shots.js        staged screenshot scenes (?shot=...)
main.ts             the entry program: copies game/ + screenshots/ to
                    /output and writes dossier.json
```

All art is drawn in code and all sound is synthesized — the city, characters, vehicles, names, story and music are original, with nothing from any commercial game.

Built for [make.fun](https://make.fun/bounty/gta6-01) — referral `mgwpv082`.
