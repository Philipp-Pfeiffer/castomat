# Script Commands

Dieses Verzeichnis enthält Script Commands für Vicinae.

## Struktur

Script Commands sind einfache Shell-Scripts (oder andere ausführbare Dateien) mit Metadaten im Header:

```
scripts/
└── web-search/          # Beispiel: Web-Search Scripts
    ├── google.sh        # Google-Suche Script
    └── duckduckgo.sh   # DuckDuckGo-Suche Script
```

## Script-Format

Script Commands folgen dem Raycast-kompatiblen Format:

```bash
#!/usr/bin/env bash

# @raycast.title Search Google
# @raycast.description Search Google for your query
# @raycast.mode silent
# @raycast.argument1 {"type": "text", "placeholder": "Search query"}

query="$1"
url="https://www.google.com/search?q=$(echo "$query" | jq -sRr @uri)"
xdg-open "$url"
```

## Development-Workflow

1. Script erstellen: `vim scripts/my-script/my-command.sh`
2. Ausführbar machen: `chmod +x scripts/my-script/my-command.sh`
3. Custom Script Path in Vicinae konfigurieren: Settings → Script Commands → Custom directories → `/path/to/scripts`

## Verfügbare Scripts

- (Wird später hinzugefügt)
