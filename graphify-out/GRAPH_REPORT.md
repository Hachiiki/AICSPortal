# Graph Report - src  (2026-09-04)

## Corpus Check
- 82 files · ~50,089 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 433 nodes · 1121 edges · 16 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Faculty Portal Pages
- API Routes And Data Layer
- Shared UI And Profile
- Routing And App Shell
- Events And Tasks
- Auth And Certificates
- Schedule Display
- Academics Grades View
- Enrollment Flow
- Grade Write APIs
- Announcements Display
- Student ID Card
- Navigation Config
- Global Search
- App Layout

## God Nodes (most connected - your core abstractions)
1. `Student` - 48 edges
2. `View` - 37 edges
3. `Task` - 35 edges
4. `PortalEvent` - 32 edges
5. `Professor` - 31 edges
6. `cn()` - 20 edges
7. `Course` - 17 edges
8. `Announcement` - 16 edges
9. `getCollection()` - 16 edges
10. `getStudentByUsername()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `FacultySidebarProps` --references--> `View`  [EXTRACTED]
  components/faculty/FacultySidebar.tsx → lib/aics/types.ts
- `COEDocumentProps` --references--> `Student`  [EXTRACTED]
  components/portal/COEDocument.tsx → lib/aics/types.ts
- `COEModalProps` --references--> `Student`  [EXTRACTED]
  components/portal/COEModal.tsx → lib/aics/types.ts
- `DigitalIDCardLargeProps` --references--> `Student`  [EXTRACTED]
  components/portal/DigitalIDCardLarge.tsx → lib/aics/types.ts
- `GradesTableProps` --references--> `Student`  [EXTRACTED]
  components/portal/GradesTable.tsx → lib/aics/types.ts

## Import Cycles
- None detected.

## Communities (16 total, 0 thin omitted)

### Community 0 - "Faculty Portal Pages"
Cohesion: 0.12
Nodes (47): FacultyApiSubject, FacultyDashboard(), FacultyDashboardProps, FacultySubjectRow, badgeForRemarks(), FacultyGradeEncodingPage(), Props, previousRecords (+39 more)

### Community 1 - "API Routes And Data Layer"
Cohesion: 0.07
Nodes (44): GET(), POST(), GET(), GET(), GET(), GET(), GET(), GET() (+36 more)

### Community 2 - "Shared UI And Profile"
Cohesion: 0.07
Nodes (31): DigitalIDCardLarge(), DigitalIDCardLargeProps, ProfessorsPage(), StudentIdCard(), StudentIdCardProps, containerVariants, sectionVariants, StudentProfile() (+23 more)

### Community 3 - "Routing And App Shell"
Cohesion: 0.08
Nodes (30): AICSLoginPage(), StudentDataWrapper(), BranchRedirect(), BranchRedirectProps, STEPS, FacultyPreviousRecordsPage(), MobileWarning(), SettingsPage() (+22 more)

### Community 4 - "Events And Tasks"
Cohesion: 0.09
Nodes (29): EventsPage(), atMidnight(), buildCalendarGrid(), CalendarGrid(), DayDetailsPanel(), DayDetailsPanelProps, formatFullDate(), formatMonthDay() (+21 more)

### Community 5 - "Auth And Certificates"
Cohesion: 0.14
Nodes (17): CredentialsForm(), CredentialsFormProps, FaceIdPanel(), FaceIdPanelProps, DEV_CREDENTIALS, T, LoginView(), LoginViewProps (+9 more)

### Community 6 - "Schedule Display"
Cohesion: 0.19
Nodes (22): dateToDayIndexSafe(), emptySubscribe(), EventCard(), getClientToday(), getServerToday(), ScheduleGrid(), ScheduleGridProps, TodaysClasses() (+14 more)

### Community 7 - "Academics Grades View"
Cohesion: 0.17
Nodes (15): AcademicsPage(), computeGPA(), exportAllSubjectsPDF(), exportYearPDF(), groupByTerm(), TermGroup, GradesFooter(), GradesHeader() (+7 more)

### Community 8 - "Enrollment Flow"
Cohesion: 0.13
Nodes (12): AssessmentCard(), EnrollmentPage(), formatPeso(), PAYMENT_STYLES, STEP_STYLES, Assessment, Enrollment, EnrollmentStep (+4 more)

### Community 9 - "Grade Write APIs"
Cohesion: 0.20
Nodes (11): POST(), NOTE: Passwords are stored in plaintext for this demo., GET(), POST(), POST(), computedFinalINCasZero(), PATCH(), remarksFor() (+3 more)

### Community 10 - "Announcements Display"
Cohesion: 0.19
Nodes (12): AcademicHeader(), AcademicHeaderProps, AnnouncementsDeck(), AnnouncementsDeckProps, timeAgo(), AnnouncementsWidget(), AnnouncementsWidgetProps, timeAgo() (+4 more)

### Community 11 - "Student ID Card"
Cohesion: 0.16
Nodes (13): FitText(), FitTextProps, deriveIdAddress(), deriveIdBranch(), deriveIdCourse(), deriveIdName(), deriveIdNumber(), StudentIdFront() (+5 more)

### Community 12 - "Navigation Config"
Cohesion: 0.18
Nodes (12): FacultySidebarProps, Sidebar(), SidebarContent(), SidebarProps, FACULTY_PRIMARY_NAV, getPortalAria(), getPortalLabel(), getPrimaryNav() (+4 more)

### Community 13 - "Global Search"
Cohesion: 0.23
Nodes (11): buildIndex(), formatDate(), GlobalSearch(), GROUP_LABELS, GROUP_ORDER, MatchedItem, QUICK_LINKS, ResultType (+3 more)

### Community 14 - "App Layout"
Cohesion: 0.25
Nodes (6): geistMono, geistSans, metadata, roboto, robotoCondensed, Toaster()

## Knowledge Gaps
- **59 isolated node(s):** `geistSans`, `geistMono`, `robotoCondensed`, `roboto`, `metadata` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Student` connect `Faculty Portal Pages` to `API Routes And Data Layer`, `Shared UI And Profile`, `Routing And App Shell`, `Events And Tasks`, `Auth And Certificates`, `Academics Grades View`, `Enrollment Flow`, `Announcements Display`, `Student ID Card`, `Global Search`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `Task` connect `Faculty Portal Pages` to `API Routes And Data Layer`, `Shared UI And Profile`, `Routing And App Shell`, `Events And Tasks`, `Academics Grades View`, `Enrollment Flow`, `Global Search`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `getCollection()` connect `Grade Write APIs` to `API Routes And Data Layer`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `geistSans`, `geistMono`, `robotoCondensed` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Faculty Portal Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.12355769230769231 - nodes in this community are weakly interconnected._
- **Should `API Routes And Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.06641604010025062 - nodes in this community are weakly interconnected._
- **Should `Shared UI And Profile` be split into smaller, more focused modules?**
  _Cohesion score 0.07058823529411765 - nodes in this community are weakly interconnected._