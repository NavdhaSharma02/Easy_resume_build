# Easy_Resume

Easy_Resume is an ATS-friendly LaTeX resume builder with a Vue frontend, Express backend, PostgreSQL database, rule-based ATS analysis, LaTeX generation, and Docker-based PDF compilation.

## Stack

- Frontend: Vue 3, Vite, TypeScript, Tailwind CSS
- Backend: Express.js, TypeScript, Zod
- Database: PostgreSQL with Prisma ORM
- Authentication: JWT and bcrypt
- PDF generation: TeX Live inside Docker

## Features

- Login and sign-up
- Resume dashboard
- Create, edit, duplicate, and delete resumes
- Structured resume builder
- Education GPA / CGPA field
- LaTeX preview
- PDF generation, preview, and download
- ATS score and keyword analysis
- Persistent PostgreSQL database
- Responsive dark mode UI

## Local Frontend Setup

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Local Backend Setup

Install backend dependencies:

```bash
cd backend
cp .env.example .env
npm install
```

Start PostgreSQL:

```bash
cd ..
docker compose up -d
```

The database is persistent. Docker stores PostgreSQL data in this named volume:

```text
easy_resume_postgres_data
```

This data survives:

```bash
docker compose stop
docker compose down
```

Do not run this unless you intentionally want to delete all local database data:

```bash
docker compose down -v
```

Run migrations and seed demo data:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

Start the backend:

```bash
npm run dev
```

API runs at:

```text
http://127.0.0.1:4000
```

Demo account:

```text
demo@easyresume.dev
password123
```

## PDF Generation

PDF generation requires Docker Desktop to be running.

The first PDF generation can take time because Docker may need to pull the TeX Live image:

```bash
docker pull texlive/texlive:latest
```

After the image is downloaded, PDF generation should be faster.

## Backend Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/resumes`
- `POST /api/resumes`
- `GET /api/resumes/:id`
- `PUT /api/resumes/:id`
- `DELETE /api/resumes/:id`
- `POST /api/resumes/:id/duplicate`
- `POST /api/resumes/:id/generate-latex`
- `POST /api/resumes/:id/generate-pdf`
- `POST /api/ats/analyze`
- `POST /api/pdf/generate`

## Deploying the Frontend on Vercel

Vercel is suitable for the Vue frontend.

The backend, PostgreSQL database, and Docker-based PDF generation should be deployed separately on a backend hosting platform such as Render, Railway, or Fly.io.

### Vercel Steps

1. Push this project to GitHub.

2. Go to Vercel and create a new project.

3. Import the GitHub repository.

4. Use these project settings:

```text
Framework Preset: Vite
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

5. Add frontend environment variables if the frontend is connected to a deployed backend:

```text
VITE_API_URL=https://your-backend-url.com
```

6. Deploy.

After deployment, every push to the connected GitHub branch can trigger a new Vercel deployment.

## Production Notes

- The frontend can be deployed to Vercel.
- The backend should be deployed separately.
- PostgreSQL should use a managed provider such as Neon, Supabase, Railway, or Render Postgres.
- Docker-based PDF generation may not work on all backend hosts.
- For production PDF generation, use a backend host that supports Docker or build a custom backend Docker image with TeX Live installed.
