(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/aics/use-portal-route.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "usePortalRoute",
    ()=>usePortalRoute
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
/** Parse a URL pathname into a PortalRoute. */ function parsePath(path) {
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    if (parts[0] !== 'portal') return {
        view: 'login'
    };
    if (parts[1] === 'login') return {
        view: 'login'
    };
    // Role segment: parts[2] is 'student' or 'faculty'
    const roleSegment = parts[2];
    if ((roleSegment === 'student' || roleSegment === 'faculty') && parts[3]) {
        const branch = decodeURIComponent(parts[1]);
        const username = decodeURIComponent(parts[3]);
        const role = roleSegment;
        if (parts[4] === 'profile') {
            return {
                view: 'profile',
                branch,
                username,
                role
            };
        }
        if (parts[4] === 'academics') {
            return {
                view: 'academics',
                branch,
                username,
                role
            };
        }
        if (parts[4] === 'events') {
            return {
                view: 'events',
                branch,
                username,
                role
            };
        }
        if (parts[4] === 'professors') {
            return {
                view: 'professors',
                branch,
                username,
                role
            };
        }
        if (parts[4] === 'enrollment') {
            return {
                view: 'enrollment',
                branch,
                username,
                role
            };
        }
        if (parts[4] === 'settings') {
            return {
                view: 'settings',
                branch,
                username,
                role
            };
        }
        return {
            view: 'dashboard',
            branch,
            username,
            role
        };
    }
    return {
        view: 'login'
    };
}
/** Convert a PortalRoute into a URL pathname. */ function routeToPath(route) {
    switch(route.view){
        case 'login':
            return '/portal/login';
        case 'dashboard':
            return `/portal/${encodeURIComponent(route.branch)}/${route.role}/${encodeURIComponent(route.username)}`;
        case 'profile':
            return `/portal/${encodeURIComponent(route.branch)}/${route.role}/${encodeURIComponent(route.username)}/profile`;
        case 'academics':
            return `/portal/${encodeURIComponent(route.branch)}/${route.role}/${encodeURIComponent(route.username)}/academics`;
        case 'events':
            return `/portal/${encodeURIComponent(route.branch)}/${route.role}/${encodeURIComponent(route.username)}/events`;
        case 'professors':
            return `/portal/${encodeURIComponent(route.branch)}/${route.role}/${encodeURIComponent(route.username)}/professors`;
        case 'enrollment':
            return `/portal/${encodeURIComponent(route.branch)}/${route.role}/${encodeURIComponent(route.username)}/enrollment`;
        case 'settings':
            return `/portal/${encodeURIComponent(route.branch)}/${route.role}/${encodeURIComponent(route.username)}/settings`;
    }
}
// ------------------------------------------------------------
//  useSyncExternalStore plumbing
// ------------------------------------------------------------
let cachedPath = null;
let cachedPathKey = '';
function getSnapshot() {
    const path = window.location.pathname;
    if (path !== cachedPathKey) {
        cachedPath = path;
        cachedPathKey = path;
    }
    return cachedPath;
}
function getServerSnapshot() {
    return '/';
}
function subscribe(callback) {
    window.addEventListener('popstate', callback);
    window.addEventListener('pushstate', callback);
    return ()=>{
        window.removeEventListener('popstate', callback);
        window.removeEventListener('pushstate', callback);
    };
}
function usePortalRoute() {
    _s();
    const path = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, getSnapshot, getServerSnapshot);
    // If the app loaded at bare `/`, replace the URL with `/portal/login`.
    // The auth guard in page.tsx will redirect to the dashboard if the
    // user is already logged in.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "usePortalRoute.useEffect": ()=>{
            if (window.location.pathname === '/') {
                window.history.replaceState({
                    view: 'login'
                }, '', '/portal/login');
                window.dispatchEvent(new Event('pushstate'));
            }
        }
    }["usePortalRoute.useEffect"], []);
    const route = parsePath(path);
    const navigate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePortalRoute.useCallback[navigate]": (newRoute)=>{
            const newPath = routeToPath(newRoute);
            window.history.pushState(newRoute, '', newPath);
            window.dispatchEvent(new Event('pushstate'));
        }
    }["usePortalRoute.useCallback[navigate]"], []);
    return {
        route,
        navigate
    };
}
_s(usePortalRoute, "zXuwXjByAnIU576QIN4njEx8ttM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/aics/use-student-data.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAuth",
    ()=>useAuth,
    "useStudentData",
    ()=>useStudentData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
function useStudentData(username) {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        student: null,
        courses: [],
        sessions: [],
        loading: true,
        error: null
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useStudentData.useEffect": ()=>{
            if (!username) {
                setState({
                    student: null,
                    courses: [],
                    sessions: [],
                    loading: false,
                    error: null
                });
                return;
            }
            let cancelled = false;
            async function fetchStudent() {
                try {
                    setState({
                        "useStudentData.useEffect.fetchStudent": (s)=>({
                                ...s,
                                loading: true,
                                error: null
                            })
                    }["useStudentData.useEffect.fetchStudent"]);
                    const res = await fetch(`/api/student?username=${encodeURIComponent(username)}`);
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Failed to fetch student data');
                    }
                    const data = await res.json();
                    if (cancelled) return;
                    setState({
                        student: data.student,
                        courses: data.courses,
                        sessions: data.sessions,
                        loading: false,
                        error: null
                    });
                } catch (err) {
                    if (cancelled) return;
                    setState({
                        student: null,
                        courses: [],
                        sessions: [],
                        loading: false,
                        error: err instanceof Error ? err.message : 'An error occurred'
                    });
                }
            }
            fetchStudent();
            return ({
                "useStudentData.useEffect": ()=>{
                    cancelled = true;
                }
            })["useStudentData.useEffect"];
        }
    }["useStudentData.useEffect"], [
        username
    ]);
    return state;
}
_s(useStudentData, "Rn5PUKouz3QDp6kAqtNW1q0ySz4=");
// ============================================================
//  useAuth — manages the logged-in username + branch in
//  localStorage. Uses useSyncExternalStore so the first client
//  render matches the server (both null), then React updates
//  to the real value after hydration. This prevents hydration
//  mismatches that would break the page.
// ============================================================
// --- useSyncExternalStore for localStorage ---
// A custom event dispatched whenever login/logout writes to localStorage
const AUTH_EVENT = 'aics-auth-change';
function dispatchAuthChange() {
    window.dispatchEvent(new Event(AUTH_EVENT));
}
function authSubscribe(callback) {
    window.addEventListener(AUTH_EVENT, callback);
    window.addEventListener('storage', callback);
    return ()=>{
        window.removeEventListener(AUTH_EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}
// Client snapshot: reads from localStorage
function getClientUsername() {
    return localStorage.getItem('aics_username');
}
function getClientBranch() {
    return localStorage.getItem('aics_branch');
}
function getClientRole() {
    return localStorage.getItem('aics_role');
}
// Server snapshot: always null (no localStorage on server)
function getServerValue() {
    return null;
}
function useAuth() {
    _s1();
    // useSyncExternalStore ensures:
    // 1. Server render: username = null, branch = null (getServerValue)
    // 2. Client first render (hydration): username = null, branch = null (getServerValue)
    //    → matches server, no hydration mismatch
    // 3. After hydration: React re-renders with getClientUsername/getClientBranch
    //    → reads real values from localStorage
    const username = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(authSubscribe, getClientUsername, getServerValue);
    const branch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(authSubscribe, getClientBranch, getServerValue);
    const role = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(authSubscribe, getClientRole, getServerValue);
    // loading is true on the server and first client render (hydration),
    // then becomes false after mount. This prevents hydration mismatch
    // because both server and client first render see loading=true → null.
    // After mount, the effect updates loading to false, which triggers
    // a re-render with the real auth state from useSyncExternalStore.
    const loading = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])({
        "useAuth.useSyncExternalStore[loading]": ()=>({
                "useAuth.useSyncExternalStore[loading]": ()=>{}
            })["useAuth.useSyncExternalStore[loading]"]
    }["useAuth.useSyncExternalStore[loading]"], {
        "useAuth.useSyncExternalStore[loading]": ()=>false
    }["useAuth.useSyncExternalStore[loading]"], {
        "useAuth.useSyncExternalStore[loading]": ()=>true // server: loading (no localStorage)
    }["useAuth.useSyncExternalStore[loading]"]);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAuth.useCallback[login]": async (user, pass)=>{
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: user,
                        password: pass
                    })
                });
                const data = await res.json();
                if (!data.ok) {
                    return {
                        ok: false,
                        error: data.error
                    };
                }
                localStorage.setItem('aics_username', data.username);
                localStorage.setItem('aics_branch', data.branch);
                localStorage.setItem('aics_role', data.role || 'student');
                dispatchAuthChange();
                return {
                    ok: true,
                    branch: data.branch,
                    username: data.username,
                    role: data.role || 'student'
                };
            } catch  {
                return {
                    ok: false,
                    error: 'Network error. Please try again.'
                };
            }
        }
    }["useAuth.useCallback[login]"], []);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAuth.useCallback[logout]": ()=>{
            localStorage.removeItem('aics_username');
            localStorage.removeItem('aics_branch');
            localStorage.removeItem('aics_role');
            dispatchAuthChange();
        }
    }["useAuth.useCallback[logout]"], []);
    return {
        username,
        branch,
        role,
        loading,
        login,
        logout
    };
}
_s1(useAuth, "fTELlXkUf6qbaIzOccq4rElSkJU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/aics/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Formatting helpers for the AICS portal.
/**
 * Returns the initials of a full name (first letter of first and last word).
 * Example: "Juan Dela Cruz Santos" -> "JS"
 */ __turbopack_context__.s([
    "getInitials",
    ()=>getInitials
]);
function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/aics/events.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Client-side Event type for the school calendar.
// Mirrors the server MongoEvent but uses ISO date strings
// (safe for JSON transport + client-side Date parsing).
__turbopack_context__.s([
    "CATEGORY_COLORS",
    ()=>CATEGORY_COLORS,
    "CATEGORY_LABELS",
    ()=>CATEGORY_LABELS,
    "CATEGORY_PILL_STYLES",
    ()=>CATEGORY_PILL_STYLES,
    "TASK_DUE_COLOR",
    ()=>TASK_DUE_COLOR
]);
const CATEGORY_COLORS = {
    academic: 'bg-blue-500',
    deadline: 'bg-red-500',
    campus: 'bg-violet-500',
    holiday: 'bg-green-500'
};
const CATEGORY_PILL_STYLES = {
    academic: 'bg-blue-50 text-blue-700 border-blue-200',
    deadline: 'bg-red-50 text-red-700 border-red-200',
    campus: 'bg-violet-50 text-violet-700 border-violet-200',
    holiday: 'bg-green-50 text-green-700 border-green-200'
};
const CATEGORY_LABELS = {
    academic: 'Academic',
    deadline: 'Deadline',
    campus: 'Campus',
    holiday: 'Holiday'
};
const TASK_DUE_COLOR = 'bg-amber-500';
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/schedule.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ============================================================
//  Schedule — types, color tokens, grid constants, and helpers
//  for the weekly calendar and the "Today's Classes" sidebar.
//
//  All schedule DATA now comes from MongoDB (courses + sessions
//  collections, fetched via /api/student). This module only
//  provides: types, color styles, grid geometry, and pure
//  date/time formatting helpers. There are NO hardcoded course
//  or session arrays here anymore.
// ============================================================
__turbopack_context__.s([
    "COLOR_STYLES",
    ()=>COLOR_STYLES,
    "DAY_FULL",
    ()=>DAY_FULL,
    "DAY_SHORT",
    ()=>DAY_SHORT,
    "HOURS",
    ()=>HOURS,
    "HOUR_HEIGHT",
    ()=>HOUR_HEIGHT,
    "START_HOUR",
    ()=>START_HOUR,
    "dateToDayIndex",
    ()=>dateToDayIndex,
    "formatHourLabel",
    ()=>formatHourLabel,
    "formatRangeTime",
    ()=>formatRangeTime,
    "formatWeekRange",
    ()=>formatWeekRange,
    "getCourse",
    ()=>getCourse,
    "getMonday",
    ()=>getMonday,
    "getSessionsForDay",
    ()=>getSessionsForDay,
    "getWeekDays",
    ()=>getWeekDays
]);
const COLOR_STYLES = {
    blue: {
        dot: 'bg-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        code: 'text-blue-700'
    },
    green: {
        dot: 'bg-green-600',
        bg: 'bg-green-50',
        border: 'border-green-600',
        code: 'text-green-700'
    },
    amber: {
        dot: 'bg-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        code: 'text-amber-700'
    },
    violet: {
        dot: 'bg-violet-600',
        bg: 'bg-violet-50',
        border: 'border-violet-500',
        code: 'text-violet-700'
    },
    red: {
        dot: 'bg-red-500',
        bg: 'bg-red-50',
        border: 'border-red-400',
        code: 'text-red-700'
    }
};
const START_HOUR = 8 // first row = 8:00 AM
;
const HOURS = 8 // rows: 8 AM, 9 AM, 10 AM, 11 AM, 12 PM, 1 PM, 2 PM, 3 PM
;
const HOUR_HEIGHT = 64 // px per hour row — tall enough for readable event cards
;
const DAY_SHORT = [
    'MON',
    'TUE',
    'WED',
    'THU',
    'FRI',
    'SAT'
];
const DAY_FULL = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];
function getCourse(code, courses) {
    return courses.find((c)=>c.code === code) ?? {
        code,
        title: code,
        shortTitle: code,
        color: 'blue'
    };
}
function getSessionsForDay(day, sessions) {
    return sessions.filter((s)=>s.day === day).sort((a, b)=>a.start - b.start);
}
function getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay() // 0 = Sun, 1 = Mon … 6 = Sat
    ;
    const diff = day === 0 ? -6 : 1 - day // shift to Monday
    ;
    d.setDate(d.getDate() + diff);
    return d;
}
function getWeekDays(anchor) {
    const days = [];
    for(let i = 0; i < 6; i++){
        const d = new Date(anchor);
        d.setDate(anchor.getDate() + i);
        days.push(d);
    }
    return days;
}
const MONTH_ABBR = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];
function formatWeekRange(days) {
    const start = days[0];
    const end = days[days.length - 1];
    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();
    const startStr = `${MONTH_ABBR[start.getMonth()]} ${start.getDate()}`;
    const endStr = sameMonth ? `${MONTH_ABBR[end.getMonth()]} ${end.getDate()}` : `${MONTH_ABBR[end.getMonth()]} ${end.getDate()}`;
    const year = sameYear ? end.getFullYear() : `${start.getFullYear()} – ${end.getFullYear()}`;
    return `${startStr} – ${endStr}, ${year}`;
}
/** Convert a decimal hour to a 12-hour clock string.  8 → "8:00 AM", 13.5 → "1:30 PM" */ function hourTo12(h) {
    const hour = Math.floor(h);
    const min = Math.round((h - hour) * 60);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${min.toString().padStart(2, '0')} ${period}`;
}
function formatRangeTime(start, end) {
    const s = hourTo12(start);
    const e = hourTo12(end);
    // If both share the same AM/PM suffix, drop it from the start portion.
    if (s.endsWith('AM') && e.endsWith('AM')) return `${s.replace(' AM', '')} – ${e}`;
    if (s.endsWith('PM') && e.endsWith('PM')) return `${s.replace(' PM', '')} – ${e}`;
    return `${s} – ${e}`;
}
function formatHourLabel(hour) {
    return hourTo12(hour);
}
function dateToDayIndex(date) {
    const dow = date.getDay() // 0=Sun … 6=Sat
    ;
    return dow === 0 ? -1 : dow - 1;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/aics/palette.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// AICS brand color palette
// Used consistently across all portal components.
__turbopack_context__.s([
    "PALETTE",
    ()=>PALETTE
]);
const PALETTE = {
    white: '#FFFFFF',
    mist: '#D2D2D3',
    sky: '#64BFE9',
    azure: '#4EA4D7',
    ocean: '#287CBB',
    navy: '#153357'
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/aics/id-card-config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ============================================================
//  ID Card Configuration — single source of truth
// ============================================================
//  All coordinates are percentages of the template image's
//  width (x, w) and height (y, h). Typography uses container
//  query width (cqw) units so text scales with the card width.
// ============================================================
/** Aspect ratio of the template PNG (1024:1536 = 2:3) */ __turbopack_context__.s([
    "ASPECT",
    ()=>ASPECT,
    "CALIBRATE",
    ()=>CALIBRATE,
    "CARD_RADIUS",
    ()=>CARD_RADIUS,
    "FIELD_BOXES",
    ()=>FIELD_BOXES,
    "ID_FONTS",
    ()=>ID_FONTS
]);
const ASPECT = '2 / 3';
const CALIBRATE = false;
const CARD_RADIUS = 'rounded-lg';
/** Colors used by overlay text (internal — referenced by FIELD_BOXES below) */ const ID_COLORS = {
    yellow: '#FFD400',
    ink: '#1F2937',
    white: '#FFFFFF'
};
const ID_FONTS = {
    display: 'font-id-display',
    body: 'font-id-body'
};
const FIELD_BOXES = {
    // Name — on the navy bar at y=46–53%, full width
    name: {
        x: 6,
        y: 45.5,
        w: 88,
        h: 7.5,
        align: 'left',
        font: 'display',
        sizeCqw: 6.0,
        minCqw: 4.0,
        color: ID_COLORS.white,
        lines: 1,
        nowrap: true,
        uppercase: true,
        vCenter: true
    },
    // Photo — white frame on left side of blue section
    photo: {
        x: 6,
        y: 54,
        w: 38,
        h: 31.5,
        align: 'left',
        font: 'display',
        sizeCqw: 0,
        minCqw: 0,
        color: '',
        lines: 0
    },
    // Student Number — right of photo, below yellow label
    number: {
        x: 48,
        y: 60,
        w: 50,
        h: 7.0,
        align: 'left',
        font: 'display',
        sizeCqw: 7.5,
        minCqw: 5.0,
        color: ID_COLORS.white,
        lines: 1,
        nowrap: true,
        vCenter: true
    },
    // Course/Program — right of photo, below student number
    course: {
        x: 48.7,
        y: 70.5,
        w: 47.3,
        h: 9.0,
        align: 'left',
        font: 'display',
        sizeCqw: 4.8,
        minCqw: 3.2,
        color: ID_COLORS.white,
        lines: 3,
        multiline: true,
        uppercase: true,
        vCenter: true
    },
    // Branch — on the bottom navy bar
    branch: {
        x: 5,
        y: 87.5,
        w: 90,
        h: 4.9,
        align: 'center',
        font: 'display',
        sizeCqw: 4.6,
        minCqw: 3.4,
        color: ID_COLORS.yellow,
        lines: 1,
        nowrap: true,
        uppercase: true,
        vCenter: true
    },
    // Address — white footer area
    address: {
        x: 8,
        y: 93.2,
        w: 84,
        h: 6.4,
        align: 'center',
        font: 'body',
        sizeCqw: 3.2,
        minCqw: 2.4,
        color: ID_COLORS.ink,
        lines: 3,
        multiline: true,
        vCenter: true
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/aics/tasks.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Client-side Task type and status computation
__turbopack_context__.s([
    "STATUS_ICON_COLORS",
    ()=>STATUS_ICON_COLORS,
    "STATUS_LABELS",
    ()=>STATUS_LABELS,
    "TYPE_COLORS",
    ()=>TYPE_COLORS,
    "VARIANT_COLORS",
    ()=>VARIANT_COLORS,
    "canSubmit",
    ()=>canSubmit,
    "canViewDetails",
    ()=>canViewDetails,
    "computeStatus",
    ()=>computeStatus
]);
function computeStatus(task) {
    if (task.score !== null) {
        return {
            status: 'GRADED',
            variant: 'GRADED',
            sub: `${task.score} / ${task.maxScore}`
        };
    }
    if (task.submitted) {
        return {
            status: 'PENDING',
            variant: 'PENDING',
            sub: 'Awaiting grade'
        };
    }
    // Not submitted
    if (task.submissionsClosed) {
        return {
            status: 'MISSING',
            variant: 'MISSING_CLOSED',
            sub: 'Missing'
        };
    }
    const now = new Date();
    const due = new Date(task.dueDate);
    if (due < now) {
        return {
            status: 'MISSING',
            variant: 'MISSING_OPEN',
            sub: 'Overdue'
        };
    }
    return {
        status: 'NEEDS_ATTENTION',
        variant: 'NEEDS_ATTENTION',
        sub: `Due ${due.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })}`
    };
}
const TYPE_COLORS = {
    Activity: 'bg-blue-50 text-blue-700 border-blue-200',
    Quiz: 'bg-violet-50 text-violet-700 border-violet-200',
    Test: 'bg-orange-50 text-orange-700 border-orange-200',
    Project: 'bg-teal-50 text-teal-700 border-teal-200'
};
const VARIANT_COLORS = {
    GRADED: 'bg-green-50 text-green-700 border-green-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    MISSING_CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
    MISSING_OPEN: 'bg-red-50 text-red-700 border-red-200',
    NEEDS_ATTENTION: 'bg-blue-50 text-blue-700 border-blue-200'
};
const STATUS_LABELS = {
    GRADED: 'Graded',
    PENDING: 'Pending',
    MISSING: 'Missing',
    NEEDS_ATTENTION: 'Needs attention'
};
const STATUS_ICON_COLORS = {
    GRADED: 'bg-green-100 text-green-600',
    PENDING: 'bg-amber-100 text-amber-600',
    MISSING_CLOSED: 'bg-slate-100 text-slate-500',
    MISSING_OPEN: 'bg-red-100 text-red-600',
    NEEDS_ATTENTION: 'bg-blue-100 text-blue-600'
};
function canSubmit(task) {
    if (task.submitted || task.score !== null) return false;
    if (task.submissionsClosed) return false;
    return true;
}
function canViewDetails(task) {
    return task.score !== null || task.submitted;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AICSLoginPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$portal$2d$route$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/aics/use-portal-route.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$student$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/aics/use-student-data.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$LoginView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/LoginView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$BranchRedirect$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/BranchRedirect.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$StudentDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/StudentDashboard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$StudentProfile$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/StudentProfile.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$AcademicsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/AcademicsPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$EventsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/EventsPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$ProfessorsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/ProfessorsPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$EnrollmentPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/EnrollmentPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$SettingsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/SettingsPage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$Skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/portal/Skeleton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MobileWarning$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/MobileWarning.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
function AICSLoginPage() {
    _s();
    const { route, navigate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$portal$2d$route$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePortalRoute"])();
    const { username, branch, role, loading: authLoading, login, logout } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$student$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [redirecting, setRedirecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [redirectBranch, setRedirectBranch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [redirectRole, setRedirectRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // --- Route guards ---
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AICSLoginPage.useEffect": ()=>{
            if (authLoading) return;
            const isLoginRoute = route.view === 'login';
            const isProtectedRoute = !isLoginRoute;
            // Unauthenticated user trying to access a protected route → login
            if (!username && isProtectedRoute) {
                navigate({
                    view: 'login'
                });
                return;
            }
            // Authenticated user on the login page → redirect to dashboard
            if (username && branch && isLoginRoute) {
                navigate({
                    view: 'dashboard',
                    branch,
                    username,
                    role: role || 'student'
                });
                return;
            }
        }
    }["AICSLoginPage.useEffect"], [
        authLoading,
        username,
        branch,
        role,
        route.view,
        navigate
    ]);
    const handleLogin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AICSLoginPage.useCallback[handleLogin]": async (user, pass)=>{
            const result = await login(user, pass);
            if (result.ok && result.branch) {
                setRedirectBranch(result.branch);
                setRedirectRole(result.role || 'student');
                setRedirecting(true);
            }
            return result;
        }
    }["AICSLoginPage.useCallback[handleLogin]"], [
        login
    ]);
    const handleRedirectComplete = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AICSLoginPage.useCallback[handleRedirectComplete]": ()=>{
            setRedirecting(false);
            if (redirectBranch && username) {
                navigate({
                    view: 'dashboard',
                    branch: redirectBranch,
                    username,
                    role: redirectRole || 'student'
                });
            }
        }
    }["AICSLoginPage.useCallback[handleRedirectComplete]"], [
        redirectBranch,
        redirectRole,
        username,
        navigate
    ]);
    const handleLogout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AICSLoginPage.useCallback[handleLogout]": ()=>{
            logout();
            navigate({
                view: 'login'
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].info('You have been signed out.');
        }
    }["AICSLoginPage.useCallback[handleLogout]"], [
        logout,
        navigate
    ]);
    // Still resolving auth state (SSR → client hydration)
    if (authLoading) return null;
    // Show the branch redirect animation overlay
    if (redirecting) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$BranchRedirect$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BranchRedirect"], {
                    branch: redirectBranch,
                    onComplete: handleRedirectComplete
                }, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 104,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MobileWarning$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileWarning"], {}, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 105,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true);
    }
    // Not authenticated → show login (regardless of URL)
    if (!username) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$LoginView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoginView"], {
                    onLogin: handleLogin
                }, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 114,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MobileWarning$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileWarning"], {}, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 115,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true);
    }
    // Authenticated but on login route → the useEffect guard will redirect.
    // Show nothing in the meantime to avoid flashing the login form.
    if (route.view === 'login') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MobileWarning$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileWarning"], {}, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 123,
            columnNumber: 12
        }, this);
    }
    // Authenticated + protected route → render the right view
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StudentDataWrapper, {
                username: username,
                route: route,
                navigate: navigate,
                onLogout: handleLogout
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MobileWarning$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileWarning"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 135,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(AICSLoginPage, "oF9ZOJUyKaG1M2nqxnmWkuy845Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$portal$2d$route$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePortalRoute"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$student$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = AICSLoginPage;
// ============================================================
//  Wrapper that fetches student data and renders the right view
//
//  CENTRALIZED NAVIGATION:
//  Instead of passing individual callback props (onBack, onProfile,
//  onAcademics, onEvents, onProfessors, ...) to each page, we pass
//  a single `onNavigate(view: View)` function. Each page calls
//  `onNavigate('academics')` or `onNavigate('dashboard')` etc.
//
//  This means adding a new sidebar tab only requires:
//    1. Add the view to the `View` type (types.ts)
//    2. Add the route to parsePath/routeToPath (use-portal-route.ts)
//    3. Add the nav item to Sidebar.tsx
//    4. Create the page component
//    5. Add one `if (route.view === 'newView')` block below
//
//  No existing page needs to change — they all use `onNavigate`.
// ============================================================
function StudentDataWrapper({ username, route, navigate, onLogout }) {
    _s1();
    const { student, courses, sessions, loading, error } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$student$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStudentData"])(username);
    // ----------------------------------------------------------
    //  Centralized navigation handler.
    //  Every page receives this as `onNavigate` and calls it with
    //  a View string. The routing logic lives HERE, not in each
    //  page component. Adding a new view = adding one case here.
    // ----------------------------------------------------------
    const handleNavigate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudentDataWrapper.useCallback[handleNavigate]": (view)=>{
            if (view === 'login') {
                onLogout();
                return;
            }
            if (route.view === 'login') return;
            navigate({
                view: view,
                branch: route.branch,
                username: route.username,
                role: route.role
            });
        }
    }["StudentDataWrapper.useCallback[handleNavigate]"], [
        navigate,
        route,
        onLogout
    ]);
    // ----------------------------------------------------------
    //  Tasks + Events + Professors data — lifted here so it
    //  persists across ALL route switches.
    // ----------------------------------------------------------
    const [tasks, setTasks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tasksLoading, setTasksLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [tasksError, setTasksError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [events, setEvents] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [eventsLoading, setEventsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [eventsError, setEventsError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [professors, setProfessors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [professorsLoading, setProfessorsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [professorsError, setProfessorsError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [enrollment, setEnrollment] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [enrollmentLoading, setEnrollmentLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [enrollmentError, setEnrollmentError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [announcements, setAnnouncements] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [announcementsLoading, setAnnouncementsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    // Events page UI preferences — lifted here so they persist across
    // route switches. Without this, navigating away from Events and
    // back would reset the task-due toggle and category filters.
    const [showTasks, setShowTasks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [enabledCats, setEnabledCats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set([
        'academic',
        'deadline',
        'campus',
        'holiday'
    ]));
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StudentDataWrapper.useEffect": ()=>{
            let cancelled = false;
            async function fetchAll() {
                try {
                    const [tkRes, evRes, profRes, enrRes, annRes] = await Promise.all([
                        fetch(`/api/tasks?username=${encodeURIComponent(username)}`),
                        fetch(`/api/events?username=${encodeURIComponent(username)}`),
                        fetch(`/api/professors?username=${encodeURIComponent(username)}`),
                        fetch(`/api/enrollment?username=${encodeURIComponent(username)}`),
                        fetch(`/api/announcements?username=${encodeURIComponent(username)}`)
                    ]);
                    const [tkData, evData, profData, enrData, annData] = await Promise.all([
                        tkRes.json(),
                        evRes.json(),
                        profRes.json(),
                        enrRes.json(),
                        annRes.json()
                    ]);
                    if (cancelled) return;
                    if (tkData.ok) setTasks(tkData.tasks);
                    else setTasksError(tkData.error || 'Failed to load tasks');
                    if (evData.ok) setEvents(evData.events);
                    else setEventsError(evData.error || 'Failed to load events');
                    if (profData.ok) setProfessors(profData.professors);
                    else setProfessorsError(profData.error || 'Failed to load professors');
                    // Enrollment is a single record (not found is fine — the page shows an
                    // empty state). Only set an error if the API itself fails.
                    if (enrData.ok) setEnrollment(enrData.enrollment ?? null);
                    else setEnrollmentError(enrData.error || 'Failed to load enrollment');
                    if (annData.ok) setAnnouncements(annData.announcements);
                // Announcements failure is non-fatal — dashboard shows empty state
                } catch  {
                    if (!cancelled) {
                        setTasksError('Network error');
                        setEventsError('Network error');
                        setProfessorsError('Network error');
                        setEnrollmentError('Network error');
                    }
                } finally{
                    if (!cancelled) {
                        setTasksLoading(false);
                        setEventsLoading(false);
                        setProfessorsLoading(false);
                        setEnrollmentLoading(false);
                        setAnnouncementsLoading(false);
                    }
                }
            }
            fetchAll();
            return ({
                "StudentDataWrapper.useEffect": ()=>{
                    cancelled = true;
                }
            })["StudentDataWrapper.useEffect"];
        }
    }["StudentDataWrapper.useEffect"], [
        username
    ]);
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PortalSkeleton, {
            view: route.view
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 276,
            columnNumber: 12
        }, this);
    }
    if (error || !student) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-dvh bg-slate-50 grid place-items-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-red-600 text-sm font-medium mb-2",
                        children: error || 'Failed to load student data.'
                    }, void 0, false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 283,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onLogout,
                        className: "text-blue-600 text-sm font-medium hover:underline",
                        children: "Back to login"
                    }, void 0, false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 286,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 282,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 281,
            columnNumber: 7
        }, this);
    }
    // ----------------------------------------------------------
    //  Render the right page based on route.view.
    //  Each page receives `onNavigate` + `onLogout` + its data props.
    //  No individual navigation callbacks — just `onNavigate`.
    // ----------------------------------------------------------
    if (route.view === 'profile') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$StudentProfile$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StudentProfile"], {
            student: student,
            onNavigate: handleNavigate,
            onLogout: onLogout,
            events: events,
            professors: professors,
            tasks: tasks
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 304,
            columnNumber: 7
        }, this);
    }
    if (route.view === 'academics') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$AcademicsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AcademicsPage"], {
            student: student,
            onNavigate: handleNavigate,
            onLogout: onLogout,
            tasks: tasks,
            tasksLoading: tasksLoading,
            tasksError: tasksError,
            setTasks: setTasks,
            events: events,
            professors: professors
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 317,
            columnNumber: 7
        }, this);
    }
    if (route.view === 'events') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$EventsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EventsPage"], {
            student: student,
            onNavigate: handleNavigate,
            onLogout: onLogout,
            events: events,
            eventsLoading: eventsLoading,
            eventsError: eventsError,
            tasks: tasks,
            showTasks: showTasks,
            setShowTasks: setShowTasks,
            enabledCats: enabledCats,
            setEnabledCats: setEnabledCats,
            professors: professors
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 333,
            columnNumber: 7
        }, this);
    }
    if (route.view === 'professors') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$ProfessorsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProfessorsPage"], {
            student: student,
            professors: professors,
            courses: courses,
            onNavigate: handleNavigate,
            onLogout: onLogout,
            events: events,
            tasks: tasks
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 352,
            columnNumber: 7
        }, this);
    }
    if (route.view === 'enrollment') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$EnrollmentPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EnrollmentPage"], {
            student: student,
            enrollment: enrollment,
            enrollmentLoading: enrollmentLoading,
            enrollmentError: enrollmentError,
            onNavigate: handleNavigate,
            onLogout: onLogout,
            events: events,
            professors: professors,
            tasks: tasks
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 366,
            columnNumber: 7
        }, this);
    }
    if (route.view === 'settings') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$SettingsPage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SettingsPage"], {
            student: student,
            onNavigate: handleNavigate,
            onLogout: onLogout,
            events: events,
            professors: professors,
            tasks: tasks
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 382,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$StudentDashboard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StudentDashboard"], {
        student: student,
        courses: courses,
        sessions: sessions,
        onNavigate: handleNavigate,
        onLogout: onLogout,
        events: events,
        professors: professors,
        tasks: tasks,
        announcements: announcements
    }, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 394,
        columnNumber: 5
    }, this);
}
_s1(StudentDataWrapper, "B52LxwmR4klAY5HiwNZm0MDhQ7c=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aics$2f$use$2d$student$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStudentData"]
    ];
});
_c1 = StudentDataWrapper;
// ============================================================
//  PortalSkeleton — picks the right skeleton layout for the
//  view being loaded. Each skeleton mirrors the real page's
//  shell (sidebar + topbar + main content blocks) so the
//  transition from skeleton → real content is jitter-free.
//
//  To add a new view's skeleton: add one `if` line here.
// ============================================================
function PortalSkeleton({ view }) {
    if (view === 'academics') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$Skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AcademicsSkeleton"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 418,
        columnNumber: 36
    }, this);
    if (view === 'profile') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$Skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProfileSkeleton"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 419,
        columnNumber: 34
    }, this);
    if (view === 'events') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$Skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EventsSkeleton"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 420,
        columnNumber: 33
    }, this);
    if (view === 'professors') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$Skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProfessorsSkeleton"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 421,
        columnNumber: 37
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$portal$2f$Skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DashboardSkeleton"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 422,
        columnNumber: 10
    }, this);
}
_c2 = PortalSkeleton;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "AICSLoginPage");
__turbopack_context__.k.register(_c1, "StudentDataWrapper");
__turbopack_context__.k.register(_c2, "PortalSkeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/portal/[...slug]/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PortalCatchAll
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
// This catch-all route renders the same root component for every
// /portal/* URL so that browser refreshes and direct navigation
// don't 404. The actual routing logic lives in src/app/page.tsx
// which reads window.location.pathname via the History API.
//
// We re-export the root page component so both `/` and `/portal/*`
// share the same client-side routing, auth, and view logic.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/page.tsx [app-client] (ecmascript)");
'use client';
;
;
function PortalCatchAll() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
        fileName: "[project]/src/app/portal/[...slug]/page.tsx",
        lineNumber: 14,
        columnNumber: 10
    }, this);
}
_c = PortalCatchAll;
var _c;
__turbopack_context__.k.register(_c, "PortalCatchAll");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_7db57b8f._.js.map