# Extensions

Dieses Verzeichnis enthält Vicinae-Extensions, die für diesen Fork entwickelt werden.

## Struktur

Jede Extension ist ein eigenes Unterverzeichnis mit folgender Struktur:

```
extensions/
└── web-search/          # Beispiel: Web-Search Extension
    ├── package.json     # Extension-Manifest
    ├── tsconfig.json    # TypeScript-Config
    ├── assets/          # Icons und Assets
    │   └── icon.png
    └── src/             # Source-Code
        └── *.tsx        # Command-Implementierungen
```

## Development-Workflow

1. Extension erstellen: `mkdir extensions/my-extension && cd extensions/my-extension`
2. Symlink für Development: `ln -s $(pwd) ~/.local/share/vicinae/extensions/my-extension`
3. Development: `npm run dev` (Hot-Reload)
4. Build: `npm run build`

## Verfügbare Extensions

- `web-search/` - Web-Suche Commands (Google, DuckDuckGo, Arch Wiki, etc.)
