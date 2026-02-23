# yhmv

Plex video app (movies & TV) built with Expo and React Native. iOS only.

## Stack

| | |
|-|-|
| Expo 54 / React Native 0.81 | React 19 |
| expo-router 6 | Zustand 5 |
| Reanimated 4 | Biome 2 / TypeScript 5.9 |
| Bun | expo-video (HLS playback) |

## Setup

Requires Bun, Xcode with iOS Simulator, and a Plex server with movie and TV libraries.

```bash
bun install   # install deps
bun start     # Metro + dev client
```

Auth is PIN-based or token-based. Sign in via **Settings > Account** (Sign in with Plex or enter token), then complete PIN at plex.tv/activate if using PIN.

## Scripts

| Command | What it does |
|---------|-------------|
| `bun start` | Metro + dev client |
| `bun b` | EAS build (iOS dev profile) |
| `bun kill` | Kill port 8081 |
| `bun clean` | Remove node_modules and .expo |
| `bun up` | Update deps + Expo version check |
| `bun check:all` | tsc + biome |

## Structure

```
app/                      # file-based routing (expo-router)
  (tabs)/
    (home)/               # home — continue watching, recently added
    (movies)/             # movies list, movie detail
    (shows)/              # shows list, show/season detail
    (settings)/           # account, appearance, developer
    search/               # search
  player/[id].tsx         # full-screen video player (movies & episodes)
components/               # UI (Main, Div, Text, cards, Player, DynamicItem, etc.)
hooks/                    # Zustand stores (video library, video player, offline), theme
utils/                    # Plex API client, auth, discovery, scrobble
constants/                # styles, colors, API config
types/                    # shared TypeScript types
```

## Playback

Video playback uses **expo-video** with HLS streams from the Plex API. The player supports movies and TV episodes, landscape orientation, and progress reporting (continue watching). Transcode URLs are resolved via the Plex client with optional token auth.

## License

Private and proprietary.
