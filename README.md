# AI Resume Analyser API

A backend REST API that parses resumes and uses Google's Gemini API to generate ATS-compatibility scores, skill-gap analysis, and actionable feedback.

## Features

-  JWT authentication (access + refresh tokens) with role-based access control
-  PDF resume upload and text extraction
-  AI-powered analysis — ATS score, tone, structure, and skills scoring via Gemini
-  Ownership-based authorisation — users only access their own resumes
-  PostgreSQL + Sequelise with versioned migrations

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, Express |
| Database | PostgreSQL, Sequelise |
| Auth | JWT (access + refresh) |
| Files | Multer, pdf-parse |
| AI | Google Gemini API |
| Validation | Joi |

## Project Structure

```
src/
├── config/ Environment, JWT, AI config
├── controllers/ auth · resume · user
├── db/ migrations, models (User, Resume, ResumeFeedback)
├── middlewares/ auth, validation, uploads, errors
├── routes/v1/ API route definitions
├── services/ Business logic + Gemini integration
├── validations/ Joi schemas
└── app.js / index.js
```


## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/v1/auth/register` | Register |
| POST | `/v1/auth/login` | Login |
| POST | `/v1/auth/forgot-password` | Forgot password |
| POST | `/v1/auth/reset-password` | Reset password |
| POST | `/v1/resumes` | Upload resume (PDF) |
| GET | `/v1/resumes` | List your resumes |
| GET | `/v1/resumes/:id` | Get one resume + feedback |
| DELETE | `/v1/resumes/:id` | Delete a resume |
| POST | `/v1/resumes/:id/analyse` | Run AI analysis |
| GET | `/v1/users` | List users |
| GET / PATCH / DELETE | `/v1/users/:id` | Manage a user |

*Resume routes require authentication.*

## Testing

Jest + Supertest coverage across auth flows and resume endpoints. Testing surfaced and fixed a real bug —> a `error.status` vs `error.statusCode` mismatch in the JWT error handler that would've caused incorrect error responses in production.

## Getting Started

```bash
git clone <repo-url>
cd ai-resume-analyser-api
npm install
```

Copy `.env.example` → `.env`, set your DB credentials, JWT secret, and `GEMINI_API_KEY`.

```bash
node_modules/.bin/sequelise db:migrate
npm run dev
```

Swagger docs: `http://localhost:3000/v1/docs`

## About This Project

Built on top of the open-source by japananh, which provided initial auth + RBAC scaffolding. I designed and built on top of it:

- `resume` / `resume_feedback` schema and migrations
- Resume upload (Multer) + text extraction (pdf-parse)
- Gemini API integration for AI-powered analysis
- All resume-related services, controllers, routes, validation
- Ownership-based authorisation
- Jest/Supertest test coverage

## Roadmap

- [ ] React frontend
- [ ] Resume-to-job-description matching
- [ ] Downloadable ATS report (PDF)
- [ ] Docker — for consistent dev/deployment environments
- [ ] Cloud deployment

## License

It is based on the Node Express PostgreSQL Boilerplate by japananh and has been extended with project-specific functionality for AI-powered resume analysis.