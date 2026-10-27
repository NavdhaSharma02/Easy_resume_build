# Easy_Resume

Easy_Resume is an ATS-friendly LaTeX resume builder with a Vue frontend, Express backend, PostgreSQL database, ATS analysis, LaTeX generation, and Docker-based PDF generation.

## Stack

- Frontend: Vue 3, Vite, TypeScript, Tailwind CSS
- Backend: Express.js, TypeScript, Zod
- Database: PostgreSQL with Prisma ORM
- Authentication: JWT and bcrypt
- PDF generation: TeX Live inside Docker

## Deployment

Deploy the Vite frontend to Vercel and the backend as a Docker service (for example, on Render or Railway). The backend runs `pdflatex` locally inside its Docker image; it is not a Vercel serverless function.

### Vercel frontend

- **Root Directory:** repository root (`.`), not `backend`. This is a Vercel project setting and must be selected in Project Settings → Build and Deployment.
- **Framework Preset:** Vite.
- **Build Command:** `npm run build`.
- **Output Directory:** `dist`.
- `vercel.json` explicitly configures the Vite build and serves `/` from the generated `dist/index.html`. The frontend has no client-side router, so no catch-all SPA rewrite is needed.
- Set `VITE_API_URL` in the Vercel project's Production (and Preview, if used) environment to the public HTTPS backend URL, without a trailing slash. Production builds do not fall back to localhost.

### Backend service

- Set the service root directory to `backend` so its Dockerfile is used. Do not select `backend` as the Vercel project root.
- Configure `DATABASE_URL` with the managed PostgreSQL connection string and `JWT_SECRET` with a secret of at least 24 characters.
- Set `CLIENT_URL` to the Vercel frontend origin. Multiple allowed origins, such as a production domain and a preview domain, can be comma-separated. It must match the browser's frontend origin.
- The backend Dockerfile installs TeX Live and sets `PDF_ENGINE=local`; do not use the default Docker-based PDF engine in a container platform that does not provide a Docker daemon.
- The frontend sends API and PDF requests directly to `VITE_API_URL`; the Vercel SPA routing does not replace backend API routes.

