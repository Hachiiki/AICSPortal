# Graph Report - .  (2026-08-19)

## Corpus Check
- Large corpus: 115 files ? ~706,151 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 210 nodes · 149 edges · 96 communities (9 shown, 87 thin omitted)
- Extraction: 81% EXTRACTED · 19% INFERRED · 1% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Portal Design & Branding
- Admin Portal Features
- Graphify Knowledge Graph Skill
- Superdesign UI Skill
- Development Roadmap Phases
- Multi-Portal Architecture
- Data Structures Course Content
- Student Portal Features
- AICS Visual Identity Assets
- Campus Photography
- OpenAI Agent Config
- Auth Login API
- Events API
- Professors API
- Health Check API
- Student Data API
- Tasks API
- Task Submission API
- Root Layout
- Portal Catch-All Route
- Branch Redirect Component
- Mobile Warning Component
- Academic Header Component
- Academics Page
- COE Modal Component
- Digital ID Card Component
- Calendar Utilities
- Calendar Grid Builder
- Date Formatting (Full)
- Date Formatting (Month/Day)
- FitText Component
- Grades Row Components
- Grades Header
- Grades Row Component
- Grades Table Component
- Remarks Badge Component
- Student Dashboard Component
- Student ID Card Component
- Tasks Tab Component
- Todays Classes Widget
- Topbar Component
- Event Category Type
- Portal Event Type
- Initials Formatter
- ID Card Field Config
- Professor Type
- Task Submit Logic
- Task View Logic
- Task Status Computation
- Task Type Definition
- Task Status Type
- Task Type Enum
- Task Variant Type
- Auth Mode Type
- Face State Type
- Schedule Entry Type
- Student Type
- Student Document Type
- Subject Type
- View Type
- Portal Route Type
- Portal Route Hook
- Auth Hook
- Student Data Hook
- MongoDB Collection Accessor
- Get Courses Query
- Get Events Query
- Get Professors Query
- Get Sessions Query
- Auth by Credentials Query
- Auth by Username Query
- Get Subjects Query
- Get Tasks Query
- Submit Task Mutation
- Branch Type
- Mongo Event Category
- Mongo Course Type
- Mongo Event Type
- Mongo Professor Type
- Mongo Session Type
- Mongo Student Type
- Mongo Subject Type
- Mongo Task Type
- Mongo Task Type Enum
- Course Schedule Type
- Course Color Utility
- Date to Day Index
- Hour Label Formatter
- Time Range Formatter
- Week Range Formatter
- Get Course Helper
- Get Monday Helper
- Sessions for Day Helper
- Get Weekdays Helper
- Session Type
- CN Utility

## God Nodes (most connected - your core abstractions)
1. `AICS Student Portal` - 24 edges
2. `Administrator Portal (Branch-Scoped)` - 19 edges
3. `AICS Portal 11-Phase Roadmap` - 13 edges
4. `Graphify Skill` - 13 edges
5. `AICS Portal Design System` - 10 edges
6. `Superdesign Skill` - 9 edges
7. `Superdesign Main SOP Reference` - 8 edges
8. `Sorting` - 7 edges
9. `Superdesign Resume Reference` - 6 edges
10. `Student Portal` - 6 edges

## Surprising Connections (you probably didn't know these)
- `AICS official circular seal/logo: lavender-blue circular badge with text 'Asian Institute of Computer Studies' around the perimeter, central heraldic shield featuring the AICS wordmark with blue chevrons, a satellite dish, cross, pen, computer, open book, year '1996', and ribbon reading 'Excellence'` --semantically_similar_to--> `SVG version of the AICS branding logo; large vector file representing the Asian Institute of Computer Studies visual identity, likely the circular seal or wordmark used across the portal UI`  [INFERRED] [semantically similar]
  aics/cropped_circle_image.png → public/aics-logo.svg
- `UI Design Canvas Workflow` --semantically_similar_to--> `Knowledge Graph`  [AMBIGUOUS] [semantically similar]
  .agents/skills/superdesign/SKILL.md → .agents/skills/graphify/SKILL.md
- `CONTRIBUTING — AICS Student Portal` --references--> `AICS Student Portal`  [EXTRACTED]
  CONTRIBUTING.md → README.md
- `AICS Student Portal` --references--> `AICS Portal 11-Phase Roadmap`  [EXTRACTED]
  README.md → aics/AICS StudentFacultyAdmin Portal ROADMAP.txt
- `AICS Portal Design System` --references--> `Tailwind CSS 4`  [EXTRACTED]
  .superdesign/design-system.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Pipeline Steps** — _agents_skills_graphify_skill, _agents_skills_graphify_references_extraction_spec, _agents_skills_graphify_references_exports, _agents_skills_graphify_references_update, _agents_skills_graphify_references_query, _agents_skills_graphify_references_transcribe, _agents_skills_graphify_references_github_and_merge, _agents_skills_graphify_references_hooks, _agents_skills_graphify_references_add_watch [INFERRED 0.95]
- **Superdesign SOP Documents** — _agents_skills_superdesign_skill, _agents_skills_superdesign_references_superdesign, _agents_skills_superdesign_references_init, _agents_skills_superdesign_references_resume, _agents_skills_superdesign_references_components, _agents_skills_superdesign_references_graphic, _agents_skills_superdesign_references_website, _agents_skills_superdesign_references_design_with_your_model [INFERRED 0.95]

## Communities (96 total, 87 thin omitted)

### Community 0 - "Portal Design & Branding"
Cohesion: 0.09
Nodes (25): Branch Detection Concept, AICS School Color Palette, Phase 2 — Login Page Static Implementation, Academics Page, AICS Student Portal, Authentication (Credentials + Face ID), Branch Detection, Caddyfile (+17 more)

### Community 1 - "Admin Portal Features"
Cohesion: 0.09
Nodes (24): Admin Dashboard, Administrator Portal (Branch-Scoped), Attendance Management, Audit Logs, Branch Settings, Classroom/Section Management, Curriculum Management, Document Management (+16 more)

### Community 2 - "Graphify Knowledge Graph Skill"
Cohesion: 0.17
Nodes (15): AST Extraction, Community Detection, GraphRAG, Knowledge Graph, Semantic Extraction, Graphify Add Watch Reference, Graphify Exports Reference, Graphify Extraction Spec Reference (+7 more)

### Community 3 - "Superdesign UI Skill"
Cohesion: 0.27
Nodes (13): Design System, Petite-Vue Template, resume.json Durable State, Superdesign INIT (Compatibility Forwarder), Superdesign Components Reference, Superdesign Design With Your Model Reference, Superdesign Graphic Reference, Superdesign Init Reference (+5 more)

### Community 4 - "Development Roadmap Phases"
Cohesion: 0.17
Nodes (13): Phase 1 — Login Page Design, Phase 10 — Admin Dashboard (Core Views), Phase 11 — Polish & Defense Prep, Phase 3 — User Schema & Password Auth, Phase 4 — Face Recognition Login (Real), Phase 5 — Branch Detection & Routing, Phase 8 — Teacher Dashboard (Core Views), Phase 9 — Teacher Grade Management (+5 more)

### Community 5 - "Multi-Portal Architecture"
Cohesion: 0.20
Nodes (10): Administrator Portal Concept, AICS Portal Project Rationale, Student Portal Concept, Teacher/Faculty Portal Concept, Phase 6 — Student Dashboard (Core Views), Phase 7 — Student Profile Panel, Certificate of Enrollment PDF, jsPDF (+2 more)

### Community 6 - "Data Structures Course Content"
Cohesion: 0.20
Nodes (10): Bubble Sort, Hashing, Insertion Sort, Merge Sort, CC214 Data Structures & Algorithms — Module 7, Quick Sort, Searching, Selection Sort (+2 more)

### Community 7 - "Student Portal Features"
Cohesion: 0.33
Nodes (6): Digital ID, Enrolled Subjects, Grades Table, Student Dashboard, Student Portal, Weekly Schedule

### Community 8 - "AICS Visual Identity Assets"
Cohesion: 0.47
Nodes (6): AICS student ID card front template (filled sample): displays institution name 'Asian Institute of Computer Studies', tagline 'Go Beyond Learning', sample student name 'Juan Miguel D. Santos', student number '123456', course 'Bachelor of Science In', branch 'Commonwealth Branch', address, silhouette photo placeholder, and AICS seal; blue and white color scheme with gold accent text on dark blue header, AICS official circular seal/logo: lavender-blue circular badge with text 'Asian Institute of Computer Studies' around the perimeter, central heraldic shield featuring the AICS wordmark with blue chevrons, a satellite dish, cross, pen, computer, open book, year '1996', and ribbon reading 'Excellence', SVG version of the AICS official circular seal/logo; vector graphic equivalent of the PNG circular badge depicting the Asian Institute of Computer Studies emblem, SVG version of the AICS branding logo; large vector file representing the Asian Institute of Computer Studies visual identity, likely the circular seal or wordmark used across the portal UI, AICS student ID card front blank template: same layout as the filled sample — AICS seal at top, institution name and tagline, dark-blue name banner (empty), blue body area with blank white photo box on left and 'Student Number' label with blank field on right, dark blue footer strip; ready for dynamic data population, SVG photo placeholder graphic: white rectangle background with a grey bust silhouette (circular head and rounded shoulder/body shape) representing a generic person; used as default student photo on the ID card template

## Ambiguous Edges - Review These
- `Knowledge Graph` → `UI Design Canvas Workflow`  [AMBIGUOUS]
  .agents/skills/superdesign/SKILL.md · relation: semantically_similar_to

## Knowledge Gaps
- **158 isolated node(s):** `POST`, `GET`, `GET`, `GET`, `GET` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **87 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Knowledge Graph` and `UI Design Canvas Workflow`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `AICS Student Portal` connect `Portal Design & Branding` to `Development Roadmap Phases`, `Multi-Portal Architecture`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `AICS Portal 11-Phase Roadmap` connect `Development Roadmap Phases` to `Portal Design & Branding`, `Multi-Portal Architecture`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Graphify Skill` (e.g. with `AST Extraction` and `Community Detection`) actually correct?**
  _`Graphify Skill` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `POST`, `GET`, `GET` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Portal Design & Branding` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._
- **Should `Admin Portal Features` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._