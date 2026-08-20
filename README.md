# AICS Student Portal

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A modern, real-time web portal for students of the **Asian Institute of Computer Studies (AICS)**. Built as a capstone project to replace the school's paper-based processes with a fully digital student information system — accessible from anywhere, anytime.

---

## Overview

Despite being a computer science institution, AICS still relies heavily on paper for enrollment records, grade reports, schedules, and document requests. This portal digitizes all of that into a single, cohesive web application where students can view their grades, check their weekly schedule, track tasks, browse school events, view their digital ID card, and download a Certificate of Enrollment — all in real time.

The project follows an 11-phase roadmap documented in [`aics/AICS StudentFacultyAdmin Portal ROADMAP.txt`](./aics/AICS%20StudentFacultyAdmin%20Portal%20ROADMAP.txt). The first seven phases are complete (login design, login implementation, password auth, face recognition mock, branch detection, student dashboard, student profile). Future phases will introduce teacher and administrator portals, real face recognition via face-api.js, and production-grade authentication.

---

## Features

### Authentication
- **Credentials login** — username and password validated against MongoDB
- **Face ID login** — webcam-based biometric scan (currently a mock implementation; real face-api.js integration is planned)
- **Branch detection** — animated post-login overlay that identifies the student's campus branch

### Student Dashboard
- Current-term GPA, total units enrolled, and term information at a glance
- Grades table with midterm, finals, and final grade columns alongside remarks badges
- Weekly schedule grid (Monday–Saturday, 8 AM – 4 PM)
- "Today's Classes" sidebar widget

### Student Profile
- Personal information, enrollment status, and Dean's Lister status
- **Digital ID card** rendered on the official AICS ID template
- **Certificate of Enrollment** with one-click PDF download (generated client-side via jsPDF)
- Submitted documents checklist

### Academics
- Full grade history across all terms with PDF export
- **Tasks tab** — activities, quizzes, tests, and projects grouped by subject with live status computation (Graded, Pending, Missing, Needs Attention)
- In-app task submission with late-submission support

### Events
- Monthly calendar grid with school-wide events
- Four event categories: Academic, Deadline, Campus, Holiday
- Optional overlay of task due dates on the calendar
- Category filter chips and day-detail panel

### UX
- Desktop-first responsive design with mobile viewport warning
- Client-side routing via the History API (SPA-like experience)
- Loading skeleton screens for all data-fetching views
- Smooth animations powered by Framer Motion

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| UI Library | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + [tw-animate-css](https://github.com/Jerome176/tw-animate-css) |
| Components | [shadcn/ui](https://ui.shadcn.com/) (New York style, Radix UI primitives) |
| Icons | [Lucide React](https://lucide.dev/) |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) (native driver v7) |
| PDF Generation | [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| Notifications | [Sonner](https://sonner.emilkowal.dev/) |
| Analytics | [Vercel Analytics](https://vercel.com/analytics) + [Vercel Speed Insights](https://vercel.com/speed-insights) |
| Theming | [next-themes](https://github.com/pacocoursey/next-themes) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or a local MongoDB instance)

### 1. Clone the repository

```bash
git clone https://github.com/Hachiiki/loginAICSPortal.git
cd loginAICSPortal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
```

| Variable | Description | Default |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB connection string | *(required)* |
| `MONGODB_DB` | Database name | `aics_portal` |
| `NODE_ENV` | Environment mode (`development` enables demo login) | — |

### 4. Seed the database

The seed script populates the database with demo data for the **Commonwealth** branch — one student, courses, subjects, tasks, and events.

```bash
node --experimental-strip-types scripts/seed-mongodb.ts
```

**Demo credentials** (available in development mode):
- Username: `juan.santos`
- Password: `student123`

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
loginAICSPortal/
├── public/
│   ├── aics-campus.jpg              # Campus photo (login page background)
│   ├── aics-logo.svg                # AICS logo
│   └── assets/student-id/           # Digital ID card assets
├── scripts/
│   ├── seed-mongodb.ts              # Database seeder
│   └── verify-tasks.ts              # Task data verification script
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (fonts, metadata, Toaster, Analytics)
│   │   ├── page.tsx                 # SPA entry point
│   │   ├── globals.css              # Global styles and CSS variables
│   │   ├── portal/[...slug]/        # Catch-all route for SPA refresh support
│   │   └── api/                     # API routes (auth, student, tasks, events)
│   ├── components/
│   │   ├── auth/                    # Login, credentials form, Face ID panel, branch redirect
│   │   ├── portal/                  # Dashboard, profile, academics, events, sidebar, topbar
│   │   └── ui/                      # shadcn/ui primitives (button, dialog, dropdown, sonner)
│   └── lib/
│       ├── utils.ts                  # cn() utility
│       ├── schedule.ts              # Schedule types and grid constants
│       ├── aics/                     # Domain types, formatting, palette, ID card config
│       └── mongodb/                  # Connection singleton, document types, queries
├── aics/                             # Design documents and roadmap
├── Caddyfile                        # Caddy reverse proxy config
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## API Routes

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api` | GET | Health check — returns `"Hello, world!"` |
| `/api/auth/login` | POST | Authenticate with username and password |
| `/api/student?username=` | GET | Fetch student profile, subjects, courses, and sessions |
| `/api/tasks?username=` | GET | Fetch current-term tasks for a student |
| `/api/tasks/[taskId]/submit?username=` | PATCH | Mark a task as submitted |
| `/api/events?username=` | GET | Fetch branch-wide calendar events |

---

## Deployment

### Vercel

The project integrates Vercel Analytics and Speed Insights and can be deployed directly to [Vercel](https://vercel.com). Set the `MONGODB_URI` environment variable in your Vercel project settings.

### Self-Hosted (Caddy)

A `Caddyfile` is included for reverse-proxying the app behind [Caddy](https://caddyserver.com/) on port 81:

```
# Caddy automatically provisions HTTPS
caddy run
```

---

## Roadmap

The full 11-phase roadmap is in [`aics/AICS StudentFacultyAdmin Portal ROADMAP.txt`](./aics/AICS%20StudentFacultyAdmin%20Portal%20ROADMAP.txt).

**Completed (Phases 1–7):**
- Login page design and implementation
- Password-based authentication
- Face recognition (mock)
- Branch detection and redirect
- Student dashboard
- Student profile with digital ID and COE
- Academics page with grades and tasks

**Planned (Phases 8–11):**
- Teacher portal
- Administrator portal
- Real face recognition (face-api.js integration)
- Production-grade authentication (bcrypt + httpOnly cookies / JWT)
- Cloudinary image storage integration

---

## Acknowledgments

- **AICS IT Office** — project sponsor and institutional support
- **AICS Commonwealth Campus** — pilot branch
- Built with [Next.js](https://nextjs.org/), [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/), and [MongoDB](https://www.mongodb.com/)

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
