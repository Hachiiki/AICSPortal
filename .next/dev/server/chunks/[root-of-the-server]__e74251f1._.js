module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/mongodb/connection.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCollection",
    ()=>getCollection
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongodb$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs, [project]/node_modules/mongodb)");
;
// ============================================================
//  MongoDB connection layer
// ============================================================
//
//  Connection string and database name are read from environment
//  variables (.env.local):
//
//    MONGODB_URI=mongodb+srv://...
//    MONGODB_DB=aics_portal
//
//  Branch-based organization:
//  Every document (student, subject, session, document, etc.)
//  carries a `branch` field (e.g. "commonwealth"). When a student
//  logs in, their branch is detected from their record and all
//  subsequent queries are scoped to that branch via a filter:
//
//    db.collection('students').findOne({ username, branch })
//
//  This gives us logical separation per branch without the overhead
//  of separate databases, while still allowing cross-branch queries
//  for admin views later.
// ============================================================
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'aics_portal';
// NOTE: We do NOT throw at module load time — that would crash the
// dev server on every hot reload if the env var is missing. Instead
// we throw lazily when getDb() is actually called.
let client = null;
async function getCollection(name) {
    if (!client) {
        if (!uri) {
            throw new Error('MONGODB_URI is not set. Add it to .env.local');
        }
        client = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongodb$29$__["MongoClient"](uri);
        await client.connect();
    }
    // Our schema interfaces (MongoStudent, MongoTask, etc.) don't extend
    // mongodb's Document type, so we cast the collection to any and let
    // the caller's <T> generic drive the return type.
    return client.db(dbName).collection(name);
}
}),
"[project]/src/lib/mongodb/queries.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAnnouncements",
    ()=>getAnnouncements,
    "getCourses",
    ()=>getCourses,
    "getEnrollment",
    ()=>getEnrollment,
    "getEvents",
    ()=>getEvents,
    "getProfessors",
    ()=>getProfessors,
    "getSessions",
    ()=>getSessions,
    "getStudentByCredentials",
    ()=>getStudentByCredentials,
    "getStudentByUsername",
    ()=>getStudentByUsername,
    "getSubjectsForStudent",
    ()=>getSubjectsForStudent,
    "getTasksForStudentCurrentTerm",
    ()=>getTasksForStudentCurrentTerm,
    "submitTask",
    ()=>submitTask
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongodb$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs, [project]/node_modules/mongodb)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mongodb/connection.ts [app-route] (ecmascript)");
;
;
async function getStudentByCredentials(username, password) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('students');
    return col.findOne({
        username,
        password
    });
}
async function getStudentByUsername(username) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('students');
    return col.findOne({
        username
    });
}
async function getSubjectsForStudent(studentUsername, branch) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('subjects');
    return col.find({
        studentUsername,
        branch
    }).toArray();
}
async function getCourses(branch) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('courses');
    return col.find({
        branch
    }).toArray();
}
async function getSessions(branch) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('sessions');
    return col.find({
        branch
    }).toArray();
}
async function getTasksForStudentCurrentTerm(studentUsername, branch, currentTerm) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('tasks');
    return col.find({
        studentUsername,
        branch,
        'term.academicYear': currentTerm.academicYear,
        'term.semester': currentTerm.semester
    }).toArray();
}
async function submitTask(taskId, studentUsername) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('tasks');
    let idFilter;
    try {
        idFilter = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongodb$29$__["ObjectId"](taskId);
    } catch  {
        return {
            ok: false,
            reason: 'not_found'
        };
    }
    // Atomic guard: only update if NOT closed and NOT already submitted.
    const result = await col.updateOne({
        _id: idFilter,
        studentUsername,
        submitted: false,
        submissionsClosed: {
            $ne: true
        }
    }, {
        $set: {
            submitted: true,
            submittedAt: new Date()
        }
    });
    if (result.modifiedCount > 0) return {
        ok: true
    };
    // Distinguish "closed" from "not found" so the route can return 403 vs 404.
    const task = await col.findOne({
        _id: idFilter,
        studentUsername
    });
    if (!task) return {
        ok: false,
        reason: 'not_found'
    };
    return {
        ok: false,
        reason: 'closed'
    };
}
async function getEvents(branch) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('events');
    return col.find({
        branch
    }).sort({
        date: 1
    }).toArray();
}
async function getProfessors(branch) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('professors');
    return col.find({
        branch
    }).toArray();
}
async function getEnrollment(studentUsername, branch, currentTerm) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('enrollments');
    return col.findOne({
        studentUsername,
        branch,
        academicYear: currentTerm.academicYear,
        semester: currentTerm.semester
    });
}
async function getAnnouncements(branch) {
    const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('announcements');
    const now = new Date();
    return col.find({
        branch,
        $or: [
            {
                expiryDate: null
            },
            {
                expiryDate: {
                    $gte: now
                }
            }
        ]
    }).sort({
        postedDate: -1
    }).toArray();
}
}),
"[project]/src/app/api/faculty/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mongodb/queries.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mongodb/connection.ts [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    try {
        const username = request.nextUrl.searchParams.get('username');
        if (!username) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: false,
                error: 'Username is required.'
            }, {
                status: 400
            });
        }
        const faculty = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getStudentByUsername"])(username);
        if (!faculty) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: false,
                error: 'Faculty member not found.'
            }, {
                status: 404
            });
        }
        // Subjects are student-scoped (one doc per student per subject).
        // Faculty teaches ALL subjects where `professor === faculty.fullName`.
        // We query the collection directly instead of going through
        // `getSubjectsForStudent` (which is filtered by studentUsername).
        const subjectsCol = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('subjects');
        const taughtSubjects = await subjectsCol.find({
            branch: faculty.branch,
            professor: faculty.fullName
        }).toArray();
        // Courses + sessions are branch-scoped (used for the schedule grid).
        const [courses, sessions] = await Promise.all([
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCourses"])(faculty.branch),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessions"])(faculty.branch)
        ]);
        // Unique students enrolled in this faculty's subjects — we look them
        // up from the `students` collection by username so the dashboard can
        // show a roster (full name, student number, program, year, section).
        const studentUsernames = Array.from(new Set(taughtSubjects.map((s)=>s.studentUsername)));
        const studentsCol = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('students');
        const students = studentUsernames.length ? await studentsCol.find({
            branch: faculty.branch,
            username: {
                $in: studentUsernames
            }
        }, {
            projection: {
                username: 1,
                fullName: 1,
                studentNumber: 1,
                program: 1,
                yearLevel: 1,
                section: 1
            }
        }).toArray() : [];
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            faculty: {
                username: faculty.username,
                fullName: faculty.fullName,
                firstName: faculty.firstName,
                lastName: faculty.lastName,
                email: faculty.email,
                phone: faculty.phone,
                branch: faculty.branch,
                semester: faculty.semester,
                academicYear: faculty.academicYear,
                role: faculty.role
            },
            subjects: taughtSubjects.map((s)=>({
                    code: s.code,
                    title: s.title,
                    units: s.units,
                    studentUsername: s.studentUsername,
                    professor: s.professor,
                    professorEmail: s.professorEmail,
                    schedule: s.schedule,
                    room: s.room,
                    midterm: s.midterm,
                    finals: s.finals,
                    finalGrade: s.finalGrade,
                    remarks: s.remarks,
                    academicYear: s.academicYear,
                    semester: s.semester,
                    yearLevel: s.yearLevel,
                    status: s.status,
                    gradeStatus: s.gradeStatus || 'released'
                })),
            students: students.map((s)=>({
                    username: s.username,
                    fullName: s.fullName,
                    studentNumber: s.studentNumber,
                    program: s.program,
                    yearLevel: s.yearLevel,
                    section: s.section
                })),
            courses,
            sessions
        });
    } catch (err) {
        console.error('Faculty API error:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: 'Failed to fetch faculty data.'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e74251f1._.js.map