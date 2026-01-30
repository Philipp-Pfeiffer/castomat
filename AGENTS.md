# AGENTS.md

This file contains essential information for AI agents working on the Backslash codebase - a Linux command launcher built with Electron, React, and TypeScript.

## Build/Lint/Test Commands

### Development

- `npm run dev` - Start development server with hot reload
- `npm start` - Run production preview build

### Building

- `npm run build` - Build for production (includes typecheck)
- `npm run build:linux` - Build Linux package
- `npm run build:linux:publish` - Build and publish Linux package

### Code Quality

- `npm run lint` - Run ESLint with auto-fix (uses `eslint.config.js`)
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Typecheck both main and renderer processes
- `npm run typecheck:node` - Typecheck main process only
- `npm run typecheck:web` - Typecheck renderer process only

> **Important**: This project does NOT have test scripts. Focus on type checking and linting for verification.

### EditorConfig

- Indent: 2 spaces
- Line endings: LF
- Charset: UTF-8
- Trim trailing whitespace: true
- Insert final newline: true

### Running Individual Checks

After making changes, always run:

```bash
npm run lint && npm run typecheck
```

## Code Style Guidelines

### Imports

- Use single quotes for import paths
- Node imports use `import ... from 'node:path'` pattern (Electron-specific)
- Group imports: third-party modules first, then internal/relative imports
- Path aliases:
  - `@renderer/*` maps to `src/renderer/src/*`
  - `@/*` maps to `./src/*` (root src directory)
- Example:
  ```ts
  import { useState, useEffect } from 'react'
  import { Button } from '@renderer/elements/Button'
  import { cn } from '@renderer/lib/utils'
  ```

### Formatting (Prettier)

- Single quotes: `true`
- Semicolons: `false`
- Print width: `100`
- Trailing commas: `none`

### TypeScript

- Explicit function return types are NOT required (ESLint rule is off)
- Interface names: PascalCase
- Type aliases: PascalCase with 'T' suffix (e.g., `CommandT`, `PluginT`, `ApplicationT`, `ResultT`)
- Global types defined in `src/global.d.ts`
- Separate TypeScript configs:
  - `tsconfig.node.json` for main process
  - `tsconfig.web.json` for renderer process
- Files use `.tsx` extension for React components, `.ts` for utilities/main process code

### Naming Conventions

- Components: PascalCase (e.g., `Command`, `Button`, `Settings`)
- Functions: camelCase (e.g., `getCommands`, `openApplication`, `runPluginAction`)
- Hooks: camelCase with `use` prefix (e.g., `useScrollToTop`, `useFetchActions`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `BANGS`, `SHORTCUTS`, `DIRECTORIES`, `EXCLUDED_PATTERNS`)
- Type definitions: PascalCase with 'T' suffix

### React Patterns

- Use functional components exclusively
- Use `React.forwardRef` for component forwarding
- Extract custom hooks to `src/renderer/src/hooks/`
- Define component prop interfaces before the component
- Use `className` prop with `cn()` utility for conditional styling
- Prefer named exports over default exports for components
- Set `displayName` for forwardRef components

### Error Handling

- Use `console.warn()` for non-critical errors in async operations
- Use `throw new Error()` for critical failures
- Use try/catch blocks for async operations that may fail
- Use type guards when filtering arrays: `.filter((item): item is ItemType => item !== null)`
- Log errors with context when available

### File Organization

```
src/
├── main/              # Electron main process
│   ├── index.ts       # Entry point, window creation
│   ├── handlers.ts    # IPC handlers for renderer communication
│   └── autoUpdater.ts # Auto-update logic
├── preload/           # Preload scripts (contextBridge)
├── renderer/
│   ├── src/
│   │   ├── components/    # Feature components
│   │   ├── elements/      # Reusable UI elements (Button, Dialog, etc.)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and constants
│   │   └── App.tsx        # Main app component
global.d.ts              # Global type definitions
```

### Component Structure

Example component pattern:

```tsx
import * as React from 'react'
import { cn } from '@renderer/lib/utils'

interface ComponentProps {
  // prop definitions
}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    // component logic
    return <div ref={ref} className={cn('base-classes', className)} {...props} />
  }
)

Component.displayName = 'Component'
export { Component }
```

### Utility Functions

- Use `cn()` for merging Tailwind classes (combines clsx and tailwind-merge)
- Access Electron API via `window.electron` or `winElectron` utility
- Use `winElectron` check before calling Electron APIs for safety

### IPC Communication

- Main process: Use `ipcMain.handle()` for request/response, `ipcMain.on()` for events
- Renderer: Access via `window.electron` API (exposed in preload)
- Commands follow kebab-case naming (e.g., `get-commands`, `run-plugin-action`)

### Styling

- Use Tailwind CSS classes
- Zinc color scale for grayscale (e.g., `bg-zinc-800`, `text-zinc-300`)
- Use semantic color utilities: `bg-primary`, `text-muted-foreground`
- Responsive design not required (fixed window size: 600x450)

### Key Libraries

- **UI**: Radix UI primitives, cmdk for command palette
- **Styling**: Tailwind CSS, class-variance-authority, clsx, tailwind-merge
- **Icons**: Lucide React, Phosphor Icons (via `<i className="ph ph-icon-name" />`)
- **Main Process**: electron-store, electron-json-storage, cheerio, axios, js-yaml

### Important Notes

- Project uses Yarn (see `yarn.lock`)
- This is a Linux-only application
- Plugin system uses YAML manifests (`manifest.yml`)
- Commands are loaded dynamically from plugins directory
- No test framework is currently configured
