# How to View the Website

## Option 1: Run Locally (Recommended for studying)

```bash
cd interview-prep
npm install
npm run dev
```

Then open in your browser: **http://localhost:5173**

The site includes:
- **Home** — overview, learning paths, curriculum stages
- **Modules** — 36 topics with theory, code, questions (sidebar navigation)
- **Flashcards** — flip cards to test yourself (`/flashcards`)
- **Mock Interview** — timed senior practice (`/mock-interview`)
- **Search** — find any topic or question (`/search`)

## Option 2: GitHub Pages (Online, after deploy)

After merging the PR, enable GitHub Pages:

1. Go to your repo **Settings → Pages**
2. Under **Build and deployment**, set Source to **GitHub Actions**
3. Push to `main` — the workflow deploys automatically

Your site will be live at:
**https://alby-tomy.github.io/software-engineering/**

## Option 3: Build and preview production version locally

```bash
cd interview-prep
npm install
npm run build
npm run preview
```

Open **http://localhost:4173**

## Quick navigation

| Page | URL |
|------|-----|
| Home | `/` |
| Python module | `/module/python` |
| System Design | `/module/system-design` |
| Flashcards | `/flashcards` |
| Mock Interview | `/mock-interview` |
| Dashboard | `/dashboard` |
| Daily Study Plan | `/daily-plan` |
| System Design Practice | `/system-design-practice` |
| Module Quiz | `/quiz/python` |
| Learning Paths | `/paths` |
| Search | `/search` |
