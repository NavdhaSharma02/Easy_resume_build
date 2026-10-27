# Easy_Resume

Easy_Resume is an ATS-friendly LaTeX resume builder with a Vue frontend, Express backend, PostgreSQL database, ATS analysis, LaTeX generation, and Docker-based PDF generation.

## Stack

- Frontend: Vue 3, Vite, TypeScript, Tailwind CSS
- Backend: Express.js, TypeScript, Zod
- Database: PostgreSQL with Prisma ORM
- Authentication: JWT and bcrypt
- PDF generation: TeX Live inside Docker

## Deployment

Deploy the Vite frontend to Vercel and the backend as a Docker service (for example, on Railway). The backend runs `pdflatex` locally inside its Docker image; it is not a Vercel serverless function.

### Vercel frontend

- Set the Vercel project root directory to the repository root (`.`), not `backend`.
- `vercel.json` configures the frontend build command (`npm run build`), static output directory (`dist`), and SPA fallback routing.
- Set `VITE_API_URL` to the public HTTPS URL of the deployed backend, without a trailing slash.

### Backend service

- Set the service root directory to `backend` so its Dockerfile is used.
- Configure `DATABASE_URL` with the managed PostgreSQL connection string and `JWT_SECRET` with a secret of at least 24 characters.
- Set `CLIENT_URL` to the Vercel frontend origin. Multiple allowed origins, such as a production domain and a preview domain, can be comma-separated.
- The backend Dockerfile installs TeX Live and sets `PDF_ENGINE=local`; do not use the default Docker-based PDF engine in a container platform that does not provide a Docker daemon.


