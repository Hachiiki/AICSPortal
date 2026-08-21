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
"[project]/src/app/api/student/update/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PATCH",
    ()=>PATCH
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mongodb/connection.ts [app-route] (ecmascript)");
;
;
async function PATCH(request) {
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
        const body = await request.json();
        // Whitelist editable fields only. Everything else is ignored.
        const allowedFields = [
            'phone',
            'email',
            'address',
            'emergencyContactName',
            'emergencyContactNumber',
            'photoUrl'
        ];
        const updateDoc = {};
        for (const field of allowedFields){
            if (typeof body[field] === 'string') {
                updateDoc[field] = body[field].trim();
            }
        }
        if (Object.keys(updateDoc).length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: false,
                error: 'No valid fields to update.'
            }, {
                status: 400
            });
        }
        const col = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2f$connection$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCollection"])('students');
        const result = await col.updateOne({
            username
        }, {
            $set: updateDoc
        });
        if (result.matchedCount === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: false,
                error: 'Student not found.'
            }, {
                status: 404
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            message: 'Profile updated successfully.'
        });
    } catch (err) {
        console.error('Profile update error:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: 'Failed to update profile.'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__91ba2b98._.js.map