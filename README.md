# Easy_Resume Frontend

Vue 3 frontend prototype for an ATS-friendly LaTeX resume builder.

## Stack

- Vue 3
- Vite
- TypeScript
- Tailwind CSS

## Current Scope

This is frontend-only for now. It includes:

- Login and sign-up screens using local mock auth
- Resume dashboard
- Create, edit, duplicate, and delete resume flows
- Structured resume builder
- Template selector: Classic, Modern, Compact
- LaTeX generation preview
- `.tex` download
- PDF download through backend TeX Live/Docker compilation
- ATS score and keyword analysis using local rules
- Responsive dark mode UI

Backend and PostgreSQL support has started. PDF compilation uses Docker + TeX Live.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
```

Start PostgreSQL:

```bash
docker compose up -d
```

The database is persistent. Docker stores PostgreSQL data in a named volume:

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
npm run db:migrate
npm run db:seed
```

Start the API:

```bash
npm run dev
```

API runs at `http://127.0.0.1:4000`.

PDF generation requires Docker Desktop to be running. The first PDF may take longer because Docker has to pull the TeX Live image.

Demo account:

```text
demo@easyresume.dev
password123
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
