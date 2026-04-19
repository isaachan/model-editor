# model-editor

A web-based collaborative modeling diagram editor for the notation system from Martin Fowler's "Analysis Patterns" book.

## Features

- Full support for Martin Fowler / James Martin notation:
  - Type nodes with rectangular shape
  - Cardinality notation on relationship ends (crow's foot variant)
  - Type generalization with complete/incomplete partitions
  - Short semantic statements markers
  - Long semantic statements in folded note boxes
- Zoom & pan
- Undo/redo
- Auto-save to browser localStorage
- Export to SVG / PNG (coming soon)
- Real-time collaboration (coming soon)

## Tech Stack

- React 19 + TypeScript + Vite
- Canvas-based rendering
- Context API for state management

## Getting Started

```bash
npm install
npm run dev
# or
npm start
```

Open http://localhost:3000 in your browser.

## Build

```bash
npm run build
```

Output will be in `dist/` directory.

## Development

```bash
npm run lint
```

## License

MIT
