# 3mf-color-changer

Next.js 16 app for loading, customizing, and exporting printable 3MF cap models.

## Current features

- Load local `.3mf` files directly in the browser
- Open curated example cap models from `public/examples`
- Paint meshes or individual faces
- Project text and image overlays onto the cap surface
- Undo / redo design changes
- Export the edited model back to `.3mf`

## Stack

- Next.js 16 App Router
- React 19
- Material UI
- Three.js + React Three Fiber + Drei
- notistack for job/status notifications

## Development

```bash
git clone https://github.com/seasick/3mf-color-changer.git
cd 3mf-color-changer
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run start
```
