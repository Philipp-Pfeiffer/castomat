# Git Repository Setup

Um das gesamte Repository (inkl. `extensions/` und `scripts/`) zu tracken, führe folgende Befehle im Root-Verzeichnis aus:

```bash
cd /home/p-pfeiffer/Documents/Castomat

# Git Repository initialisieren
git init

# Alle Dateien hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "Initial commit: Vicinae fork with extensions and scripts directories"
```

## Optional: Remote Repository verbinden

Wenn du ein Remote-Repository hast (z.B. auf GitHub):

```bash
git remote add origin https://github.com/Philipp-Pfeiffer/castomat.git
git branch -M main
git push -u origin main
```

## Hinweis

Die `.gitignore` ignoriert `castomat/.git/`, falls `castomat/` ein eigenes Git-Repository ist. 
Das Root-Repository trackt dann alles, inklusive der `extensions/` und `scripts/` Verzeichnisse.
