# Easy_Resume

Easy_Resume is an ATS-friendly LaTeX resume builder with a Vue frontend, Express backend, PostgreSQL database, ATS analysis, LaTeX generation, and Docker-based PDF generation.

## Stack

- Frontend: Vue 3, Vite, TypeScript, Tailwind CSS
- Backend: Express.js, TypeScript, Zod
- Database: PostgreSQL with Prisma ORM
- Authentication: JWT and bcrypt
- PDF generation: TeX Live inside Docker

## Local Frontend Setup

Install dependencies:

```bash
npm install
```

Create a frontend environment file:

```bash
cp .env.example .env.local
```

For local development:

```text
VITE_API_URL="http://127.0.0.1:4000"
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

## Deployment

The frontend can be deployed on Vercel, Netlify, Render, or Railway.

The backend and database should be deployed separately unless using a platform that supports multiple services, such as Railway, Render, or Fly.io.

For deployed frontend builds, set:

```text
VITE_API_URL=https://your-backend-url.com
```

## Vercel Frontend Deployment

Use these Vercel settings:

```text
Framework Preset: Vite
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Add this environment variable in Vercel:

```text
VITE_API_URL=https://your-backend-url.com
```

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
