module.exports = [
"[project]/src/components/auth/login-tokens.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Login-scoped institutional design tokens.
// Scoped to the login view so the dashboard / profile keep their existing palette.
// Reference direction: real university IT portal — restrained, mature, clean.
__turbopack_context__.s([
    "DEV_CREDENTIALS",
    ()=>DEV_CREDENTIALS,
    "PORTAL_TEXT_GRADIENT",
    ()=>PORTAL_TEXT_GRADIENT,
    "SHOW_DEMO_LOGIN",
    ()=>SHOW_DEMO_LOGIN,
    "T",
    ()=>T
]);
const T = {
    white: '#FFFFFF',
    bg: '#F7F9FB',
    border: '#D9E0E6',
    text: '#17324D',
    muted: '#6B7785',
    primary: '#1769AA',
    primaryDark: '#124D7A',
    accent: '#2F9ED8'
};
const SHOW_DEMO_LOGIN = ("TURBOPACK compile-time value", "development") === 'development';
const DEV_CREDENTIALS = {
    username: 'juan.santos',
    password: 'student123'
};
const PORTAL_TEXT_GRADIENT = 'linear-gradient(to bottom, #4EA4D7 0%, #64BFE9 100%)';
}),
"[project]/src/components/auth/CredentialsForm.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CredentialsForm",
    ()=>CredentialsForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-ssr] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye-off.js [app-ssr] (ecmascript) <export default as EyeOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user.js [app-ssr] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-ssr] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$round$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-round.js [app-ssr] (ecmascript) <export default as UserRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/login-tokens.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
function CredentialsForm({ onLogin }) {
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [showPassword, setShowPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [remember, setRemember] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [submitting, setSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleCredentialSubmit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (e)=>{
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Please enter both your username and password.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await onLogin(username.trim(), password);
            if (!result.ok) {
                setSubmitting(false);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(result.error || 'Invalid username or password.');
                return;
            }
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Signed in. Redirecting to your AICS dashboard...');
        } catch  {
            setSubmitting(false);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Network error. Please try again.');
        }
    }, [
        username,
        password,
        onLogin
    ]);
    const handleTestLogin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setUsername(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].username);
        setPassword(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].password);
        setSubmitting(true);
        try {
            const result = await onLogin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].username, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].password);
            if (!result.ok) {
                setSubmitting(false);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(result.error || 'Test login failed.');
                return;
            }
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Test login successful. Welcome, Juan!');
        } catch  {
            setSubmitting(false);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Network error. Please try again.');
        }
    }, [
        onLogin
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].form, {
        initial: {
            opacity: 0,
            x: 8
        },
        animate: {
            opacity: 1,
            x: 0
        },
        exit: {
            opacity: 0,
            x: -8
        },
        transition: {
            duration: 0.2
        },
        onSubmit: handleCredentialSubmit,
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-1.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        htmlFor: "username",
                        className: "block text-xs font-medium",
                        style: {
                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                        },
                        children: "Username"
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none",
                                style: {
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 91,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                id: "username",
                                type: "text",
                                autoComplete: "username",
                                value: username,
                                onChange: (e)=>setUsername(e.target.value),
                                placeholder: "e.g. juan.delacruz",
                                className: "w-full h-11 pl-10 pr-3 rounded-[8px] text-sm bg-white border outline-none transition-colors",
                                style: {
                                    borderColor: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border,
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                                },
                                onFocus: (e)=>{
                                    e.currentTarget.style.borderColor = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary;
                                    e.currentTarget.style.boxShadow = `0 0 0 3px ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].accent}26`;
                                },
                                onBlur: (e)=>{
                                    e.currentTarget.style.borderColor = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border;
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 95,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                lineNumber: 86,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-1.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        htmlFor: "password",
                        className: "block text-xs font-medium",
                        style: {
                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                        },
                        children: "Password"
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 118,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none",
                                style: {
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 122,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                id: "password",
                                type: showPassword ? 'text' : 'password',
                                autoComplete: "current-password",
                                value: password,
                                onChange: (e)=>setPassword(e.target.value),
                                placeholder: "Enter your password",
                                className: "w-full h-11 pl-10 pr-10 rounded-[8px] text-sm bg-white border outline-none transition-colors",
                                style: {
                                    borderColor: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border,
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                                },
                                onFocus: (e)=>{
                                    e.currentTarget.style.borderColor = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary;
                                    e.currentTarget.style.boxShadow = `0 0 0 3px ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].accent}26`;
                                },
                                onBlur: (e)=>{
                                    e.currentTarget.style.borderColor = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border;
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 126,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setShowPassword((s)=>!s),
                                className: "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-gray-50",
                                style: {
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                },
                                "aria-label": showPassword ? 'Hide password' : 'Show password',
                                children: showPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                    lineNumber: 151,
                                    columnNumber: 29
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                    lineNumber: 151,
                                    columnNumber: 62
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 144,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 121,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between pt-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "inline-flex items-center gap-2 cursor-pointer select-none",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                role: "checkbox",
                                "aria-checked": remember,
                                onClick: ()=>setRemember((r)=>!r),
                                className: "w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 transition-colors",
                                style: remember ? {
                                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary,
                                    border: `1.5px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary}`
                                } : {
                                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white,
                                    border: `1.5px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border}`
                                },
                                children: remember && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                    className: "w-3 h-3 text-white",
                                    strokeWidth: 3
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                    lineNumber: 171,
                                    columnNumber: 26
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 159,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs",
                                style: {
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                },
                                children: "Remember me"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 173,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 158,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].info('Contact the AICS IT Office to reset your password.'),
                        className: "text-xs font-medium transition-colors hover:underline",
                        style: {
                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary
                        },
                        children: "Forgot password?"
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 177,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                lineNumber: 157,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "submit",
                disabled: submitting,
                className: "w-full h-11 rounded-[8px] font-semibold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary
                },
                onMouseEnter: (e)=>{
                    if (!submitting) e.currentTarget.style.background = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primaryDark;
                },
                onMouseLeave: (e)=>{
                    e.currentTarget.style.background = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary;
                },
                children: submitting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "inline-flex items-center gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                            className: "w-4 h-4 animate-spin"
                        }, void 0, false, {
                            fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                            lineNumber: 202,
                            columnNumber: 13
                        }, this),
                        " Signing in..."
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                    lineNumber: 201,
                    columnNumber: 11
                }, this) : 'Sign In'
            }, void 0, false, {
                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                lineNumber: 188,
                columnNumber: 7
            }, this),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SHOW_DEMO_LOGIN"] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3 pt-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 h-px",
                                style: {
                                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 213,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] uppercase tracking-wider",
                                style: {
                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                },
                                children: "Demo"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 214,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 h-px",
                                style: {
                                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 217,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 212,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleTestLogin,
                        disabled: submitting,
                        className: "w-full h-10 rounded-[8px] text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:bg-gray-50",
                        style: {
                            background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white,
                            border: `1px dashed ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border}`,
                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$round$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserRound$3e$__["UserRound"], {
                                className: "w-3.5 h-3.5"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 226,
                                columnNumber: 13
                            }, this),
                            " Test Student Login"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 219,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-center text-[10px]",
                        style: {
                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-mono",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].username
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 229,
                                columnNumber: 13
                            }, this),
                            ' / ',
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-mono",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].password
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                                lineNumber: 231,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
                        lineNumber: 228,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true)
        ]
    }, "cred", true, {
        fileName: "[project]/src/components/auth/CredentialsForm.tsx",
        lineNumber: 76,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/auth/FaceIdPanel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FaceIdPanel",
    ()=>FaceIdPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scan$2d$face$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ScanFace$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/scan-face.js [app-ssr] (ecmascript) <export default as ScanFace>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/camera.js [app-ssr] (ecmascript) <export default as Camera>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-ssr] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-ssr] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/login-tokens.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
function FaceIdPanel({ onLogin }) {
    const [faceState, setFaceState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [faceProgress, setFaceProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [streamError, setStreamError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const videoRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const streamRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const scanTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const stopStream = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t)=>t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (scanTimerRef.current) {
            clearInterval(scanTimerRef.current);
            scanTimerRef.current = null;
        }
    }, []);
    // Cleanup on unmount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>()=>stopStream(), [
        stopStream
    ]);
    const startFaceScan = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setStreamError(null);
        setFaceProgress(0);
        setFaceState('starting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: {
                        ideal: 640
                    },
                    height: {
                        ideal: 480
                    }
                },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setFaceState('scanning');
            let p = 0;
            scanTimerRef.current = setInterval(()=>{
                p += Math.random() * 7 + 3;
                if (p >= 100) {
                    p = 100;
                    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
                    setFaceProgress(100);
                    setFaceState('verifying');
                    setTimeout(()=>{
                        setFaceState('success');
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Face verified. Welcome back to AICS Portal.');
                        // Face ID is a mock — log in with the dev demo credentials
                        setTimeout(()=>{
                            onLogin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].username, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CREDENTIALS"].password);
                        }, 1200);
                    }, 1100);
                } else {
                    setFaceProgress(p);
                }
            }, 220);
        } catch (err) {
            const e = err;
            setStreamError(e?.name === 'NotAllowedError' ? 'Camera access was denied. Please enable camera permissions in your browser.' : 'Unable to access camera. Please check your device and try again.');
            setFaceState('error');
            stopStream();
        }
    }, [
        stopStream,
        onLogin
    ]);
    const cancelFaceScan = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        stopStream();
        setFaceState('idle');
        setFaceProgress(0);
        setStreamError(null);
    }, [
        stopStream
    ]);
    const retryFaceScan = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        cancelFaceScan();
        setTimeout(()=>startFaceScan(), 50);
    }, [
        cancelFaceScan,
        startFaceScan
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            opacity: 0,
            x: 8
        },
        animate: {
            opacity: 1,
            x: 0
        },
        exit: {
            opacity: 0,
            x: -8
        },
        transition: {
            duration: 0.2
        },
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative aspect-square w-full rounded-[12px] overflow-hidden flex items-center justify-center",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text,
                    border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border}`
                },
                children: [
                    (faceState === 'starting' || faceState === 'scanning' || faceState === 'verifying' || faceState === 'success') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                        ref: videoRef,
                        autoPlay: true,
                        playsInline: true,
                        muted: true,
                        className: "absolute inset-0 w-full h-full object-cover",
                        style: {
                            transform: 'scaleX(-1)'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                        lineNumber: 132,
                        columnNumber: 11
                    }, this),
                    faceState === 'idle' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center px-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3",
                                style: {
                                    background: 'rgba(255,255,255,0.08)'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scan$2d$face$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ScanFace$3e$__["ScanFace"], {
                                    className: "w-8 h-8",
                                    style: {
                                        color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].accent
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                    lineNumber: 148,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 144,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white text-sm font-medium",
                                children: "Face Recognition"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 150,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white/50 text-xs mt-1 max-w-[220px] mx-auto leading-relaxed",
                                children: "Click start and look directly at the camera. Your face is your password."
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 151,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                        lineNumber: 143,
                        columnNumber: 11
                    }, this),
                    (faceState === 'scanning' || faceState === 'verifying') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 flex items-center justify-center pointer-events-none",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative w-[56%] aspect-[3/4] rounded-[40%]",
                                    style: {
                                        border: `2px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].accent}`,
                                        boxShadow: `0 0 0 3px ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].accent}22`
                                    },
                                    children: [
                                        '-top-1 -left-1 border-t-2 border-l-2',
                                        '-top-1 -right-1 border-t-2 border-r-2',
                                        '-bottom-1 -left-1 border-b-2 border-l-2',
                                        '-bottom-1 -right-1 border-b-2 border-r-2'
                                    ].map((pos)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: `absolute ${pos} w-3.5 h-3.5 rounded-sm`,
                                            style: {
                                                borderColor: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].accent
                                            }
                                        }, pos, false, {
                                            fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                            lineNumber: 173,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                    lineNumber: 160,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 159,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                className: "absolute left-0 right-0 h-[2px]",
                                style: {
                                    background: `linear-gradient(90deg, transparent, ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].accent}, transparent)`
                                },
                                initial: {
                                    top: '12%'
                                },
                                animate: {
                                    top: [
                                        '12%',
                                        '86%',
                                        '12%'
                                    ]
                                },
                                transition: {
                                    duration: 2.4,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 181,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute bottom-3 left-3 right-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between text-[10px] text-white/75 mb-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-flex items-center gap-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__["Camera"], {
                                                        className: "w-3 h-3"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                                        lineNumber: 193,
                                                        columnNumber: 19
                                                    }, this),
                                                    faceState === 'verifying' ? 'Verifying identity...' : 'Scanning face...'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                                lineNumber: 192,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    Math.round(faceProgress),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                                lineNumber: 196,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                        lineNumber: 191,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-1.5 rounded-full overflow-hidden",
                                        style: {
                                            background: 'rgba(255,255,255,0.15)'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-full rounded-full transition-all",
                                            style: {
                                                width: `${faceProgress}%`,
                                                background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                            lineNumber: 202,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                        lineNumber: 198,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 190,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true),
                    faceState === 'success' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: {
                            opacity: 0
                        },
                        animate: {
                            opacity: 1
                        },
                        className: "absolute inset-0 flex flex-col items-center justify-center text-center px-6",
                        style: {
                            background: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text}E6`
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                initial: {
                                    scale: 0.5
                                },
                                animate: {
                                    scale: 1
                                },
                                transition: {
                                    type: 'spring',
                                    stiffness: 220,
                                    damping: 16
                                },
                                className: "w-16 h-16 rounded-full flex items-center justify-center mb-3",
                                style: {
                                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                    className: "w-8 h-8 text-white"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                    lineNumber: 228,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 221,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white font-semibold text-sm",
                                children: "Identity Verified"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 230,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white/55 text-xs mt-1",
                                children: "Redirecting to portal..."
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 231,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                        lineNumber: 215,
                        columnNumber: 11
                    }, this),
                    faceState === 'error' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-center justify-center text-center px-6",
                        style: {
                            background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-14 h-14 rounded-full flex items-center justify-center mb-3",
                                style: {
                                    background: 'rgba(220,38,38,0.16)'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                    className: "w-7 h-7 text-red-400"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                    lineNumber: 244,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 240,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white text-sm font-medium",
                                children: "Camera Unavailable"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 246,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white/50 text-xs mt-1 max-w-[220px] leading-relaxed",
                                children: streamError || 'Please check your camera and try again.'
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                                lineNumber: 247,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                        lineNumber: 236,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                lineNumber: 124,
                columnNumber: 7
            }, this),
            faceState === 'idle' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: startFaceScan,
                className: "w-full h-11 rounded-[8px] font-semibold text-sm text-white transition-colors",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary
                },
                onMouseEnter: (e)=>e.currentTarget.style.background = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primaryDark,
                onMouseLeave: (e)=>e.currentTarget.style.background = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "inline-flex items-center gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__["Camera"], {
                            className: "w-4 h-4"
                        }, void 0, false, {
                            fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                            lineNumber: 264,
                            columnNumber: 13
                        }, this),
                        " Start Face Recognition"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                    lineNumber: 263,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                lineNumber: 255,
                columnNumber: 9
            }, this),
            (faceState === 'scanning' || faceState === 'verifying' || faceState === 'starting') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: cancelFaceScan,
                className: "w-full h-11 rounded-[8px] font-medium text-sm transition-colors hover:bg-gray-50",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white,
                    border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border}`,
                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                },
                children: "Cancel"
            }, void 0, false, {
                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                lineNumber: 270,
                columnNumber: 9
            }, this),
            faceState === 'error' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: retryFaceScan,
                className: "w-full h-11 rounded-[8px] font-semibold text-sm text-white transition-colors",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary
                },
                onMouseEnter: (e)=>e.currentTarget.style.background = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primaryDark,
                onMouseLeave: (e)=>e.currentTarget.style.background = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "inline-flex items-center gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                            className: "w-4 h-4"
                        }, void 0, false, {
                            fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                            lineNumber: 290,
                            columnNumber: 13
                        }, this),
                        " Try Again"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                    lineNumber: 289,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                lineNumber: 281,
                columnNumber: 9
            }, this),
            faceState === 'success' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: cancelFaceScan,
                className: "w-full h-11 rounded-[8px] font-medium text-sm transition-colors hover:bg-gray-50",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white,
                    border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border}`,
                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                },
                children: "Reset"
            }, void 0, false, {
                fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
                lineNumber: 296,
                columnNumber: 9
            }, this)
        ]
    }, "face", true, {
        fileName: "[project]/src/components/auth/FaceIdPanel.tsx",
        lineNumber: 115,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/auth/LoginView.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LoginView",
    ()=>LoginView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scan$2d$face$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ScanFace$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/scan-face.js [app-ssr] (ecmascript) <export default as ScanFace>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-ssr] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-ssr] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as CircleAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/login-tokens.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$CredentialsForm$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/CredentialsForm.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$FaceIdPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/FaceIdPanel.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
function LoginView({ onLogin }) {
    const [authMode, setAuthMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('credentials');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "w-full min-h-dvh flex flex-col lg:flex-row font-sans",
        style: {
            background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white,
            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "relative lg:w-[60%] w-full h-[42vh] lg:h-auto lg:min-h-dvh overflow-hidden flex-shrink-0",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "/aics-campus.jpg",
                        alt: "Asian Institute of Computer Studies campus",
                        className: "absolute inset-0 w-full h-full object-cover",
                        onError: (e)=>{
                            ;
                            e.currentTarget.style.display = 'none';
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 46,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0",
                        style: {
                            background: 'linear-gradient(160deg, rgba(23,50,77,0.78) 0%, rgba(18,77,122,0.92) 100%)'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-0 left-0 right-0 px-6 sm:px-10 lg:px-14 py-7 flex items-center gap-4 text-white",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: "/aics-logo.svg",
                                alt: "AICS logo",
                                className: "flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 object-contain"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "leading-tight",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-base sm:text-lg font-semibold",
                                        children: "Asian Institute"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/auth/LoginView.tsx",
                                        lineNumber: 71,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-base sm:text-lg font-semibold",
                                        children: "of Computer Studies"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/auth/LoginView.tsx",
                                        lineNumber: 72,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 70,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 flex flex-col items-start justify-center px-6 sm:px-10 lg:px-14 text-white",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: {
                                opacity: 0,
                                y: 16
                            },
                            animate: {
                                opacity: 1,
                                y: 0
                            },
                            transition: {
                                duration: 0.5,
                                ease: 'easeOut'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight text-white",
                                    children: "Welcome to your"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 83,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight",
                                    style: {
                                        backgroundImage: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PORTAL_TEXT_GRADIENT"],
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        color: 'transparent'
                                    },
                                    children: "AICS Portal."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 86,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-4 text-sm sm:text-[15px] text-white max-w-md leading-relaxed",
                                    children: "Access your academic resources, schedules, grades, and enrollment information in one place."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 98,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/auth/LoginView.tsx",
                            lineNumber: 78,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-14 pb-10 lg:pb-14 flex items-center gap-2 text-[11px] text-white/45",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                className: "w-3.5 h-3.5"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 107,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Protected by AICS Information Technology Services"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 106,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/auth/LoginView.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "relative z-10 lg:w-[calc(40%+3rem)] w-full flex-1 flex items-center justify-center px-6 sm:px-10 py-12 lg:min-h-dvh lg:-ml-12 rounded-l-[40px]",
                style: {
                    background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative w-full max-w-sm py-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-8",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-[22px] font-bold tracking-tight leading-snug",
                                    style: {
                                        color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                                    },
                                    children: "Sign in to AICS Portal"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 120,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm mt-2",
                                    style: {
                                        color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                    },
                                    children: "Use your AICS credentials to access your student or staff portal."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 123,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/auth/LoginView.tsx",
                            lineNumber: 119,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 gap-1 p-1 rounded-[10px] mb-6",
                            style: {
                                background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].bg,
                                border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border}`
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setAuthMode('credentials'),
                                    className: "rounded-[8px] py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5",
                                    style: authMode === 'credentials' ? {
                                        background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white,
                                        color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary,
                                        boxShadow: '0 1px 2px rgba(23,50,77,0.08)'
                                    } : {
                                        color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                            className: "w-3.5 h-3.5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/auth/LoginView.tsx",
                                            lineNumber: 143,
                                            columnNumber: 15
                                        }, this),
                                        " Credentials"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 133,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setAuthMode('face'),
                                    className: "rounded-[8px] py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5",
                                    style: authMode === 'face' ? {
                                        background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].white,
                                        color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary,
                                        boxShadow: '0 1px 2px rgba(23,50,77,0.08)'
                                    } : {
                                        color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scan$2d$face$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ScanFace$3e$__["ScanFace"], {
                                            className: "w-3.5 h-3.5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/auth/LoginView.tsx",
                                            lineNumber: 155,
                                            columnNumber: 15
                                        }, this),
                                        " Face ID"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 145,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/auth/LoginView.tsx",
                            lineNumber: 129,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                            mode: "wait",
                            children: authMode === 'credentials' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$CredentialsForm$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CredentialsForm"], {
                                onLogin: onLogin
                            }, "cred", false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 161,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$FaceIdPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FaceIdPanel"], {
                                onLogin: onLogin
                            }, "face", false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 163,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/auth/LoginView.tsx",
                            lineNumber: 159,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-6 rounded-[10px] p-4",
                            style: {
                                background: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].bg,
                                border: `1px solid ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].border}`
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleAlert$3e$__["CircleAlert"], {
                                        className: "w-4 h-4 flex-shrink-0 mt-0.5",
                                        style: {
                                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/auth/LoginView.tsx",
                                        lineNumber: 173,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-xs leading-relaxed",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "font-semibold",
                                                style: {
                                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                                                },
                                                children: "Need help signing in?"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                                lineNumber: 178,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "mt-0.5",
                                                style: {
                                                    color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].muted
                                                },
                                                children: [
                                                    "Contact AICS IT Support at",
                                                    ' ',
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "mailto:it-support@aics.edu.ph",
                                                        className: "font-medium transition-colors hover:underline",
                                                        style: {
                                                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].primary
                                                        },
                                                        children: "it-support@aics.edu.ph"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/auth/LoginView.tsx",
                                                        lineNumber: 183,
                                                        columnNumber: 19
                                                    }, this),
                                                    ' ',
                                                    "or call ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-medium",
                                                        style: {
                                                            color: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$login$2d$tokens$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["T"].text
                                                        },
                                                        children: "(02) 8XXX-XXXX"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/auth/LoginView.tsx",
                                                        lineNumber: 190,
                                                        columnNumber: 27
                                                    }, this),
                                                    "."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                                lineNumber: 181,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/auth/LoginView.tsx",
                                        lineNumber: 177,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 172,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/auth/LoginView.tsx",
                            lineNumber: 168,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-6 text-center text-[11px]",
                            style: {
                                color: '#9aa5b1'
                            },
                            children: [
                                "© ",
                                new Date().getFullYear(),
                                " Asian Institute of Computer Studies. All rights reserved."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/auth/LoginView.tsx",
                            lineNumber: 197,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/auth/LoginView.tsx",
                    lineNumber: 117,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/auth/LoginView.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/auth/LoginView.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/auth/BranchRedirect.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BranchRedirect",
    ()=>BranchRedirect
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-ssr] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-ssr] (ecmascript) <export default as CheckCircle2>");
'use client';
;
;
;
;
const STEPS = [
    'Authenticating credentials…',
    'Detecting branch…',
    'Loading your portal…'
];
function BranchRedirect({ branch, onComplete }) {
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    // Capitalize the branch name for display
    const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Step 0: "Authenticating credentials…"
        const t1 = setTimeout(()=>setStep(1), 600);
        // Step 1: "Detecting branch…"
        const t2 = setTimeout(()=>setStep(2), 1300);
        // Step 2: "Loading your portal…" → then complete
        const t3 = setTimeout(()=>onComplete(), 2400);
        return ()=>{
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [
        onComplete
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            opacity: 0
        },
        animate: {
            opacity: 1
        },
        exit: {
            opacity: 0
        },
        transition: {
            duration: 0.3
        },
        className: "fixed inset-0 z-50 grid place-items-center bg-white",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col items-center text-center px-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        scale: 0.8,
                        opacity: 0
                    },
                    animate: {
                        scale: 1,
                        opacity: 1
                    },
                    transition: {
                        duration: 0.4,
                        ease: 'easeOut'
                    },
                    className: "mb-8",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                className: "w-4 h-4 text-blue-600"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                lineNumber: 60,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-semibold text-blue-700",
                                children: [
                                    "AICS ",
                                    branchDisplay,
                                    " Branch"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                        lineNumber: 59,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                    lineNumber: 53,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        scale: 0.5,
                        opacity: 0
                    },
                    animate: {
                        scale: 1,
                        opacity: 1
                    },
                    transition: {
                        duration: 0.5,
                        ease: 'easeOut'
                    },
                    className: "relative mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-20 h-20 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 grid place-items-center shadow-lg",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: "/aics-logo.svg",
                                alt: "AICS",
                                className: "w-12 h-12"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                lineNumber: 75,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                            lineNumber: 74,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            className: "absolute inset-0 rounded-full border-2 border-blue-400",
                            animate: {
                                scale: [
                                    1,
                                    1.3,
                                    1
                                ],
                                opacity: [
                                    0.6,
                                    0,
                                    0.6
                                ]
                            },
                            transition: {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                            lineNumber: 78,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                    lineNumber: 68,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-2.5 mb-6 w-64",
                    children: STEPS.map((label, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: {
                                opacity: 0,
                                x: -8
                            },
                            animate: {
                                opacity: i <= step ? 1 : 0.3,
                                x: 0
                            },
                            transition: {
                                duration: 0.3,
                                delay: i * 0.1
                            },
                            className: "flex items-center gap-2.5 text-sm",
                            children: [
                                i < step ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                    className: "w-4 h-4 text-green-600 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                    lineNumber: 99,
                                    columnNumber: 17
                                }, this) : i === step ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                    className: "w-4 h-4 text-blue-600 animate-spin flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                    lineNumber: 101,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                    lineNumber: 103,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: i <= step ? 'text-slate-700 font-medium' : 'text-slate-400',
                                    children: label
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                    lineNumber: 105,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                            lineNumber: 88,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                    lineNumber: 86,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                    children: step >= 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].p, {
                        initial: {
                            opacity: 0,
                            y: 8
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        transition: {
                            duration: 0.4
                        },
                        className: "text-sm text-slate-500",
                        children: [
                            "Redirecting to your branch:",
                            ' ',
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-semibold text-blue-700",
                                children: branchDisplay
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                                lineNumber: 122,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                        lineNumber: 115,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/auth/BranchRedirect.tsx",
                    lineNumber: 113,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/auth/BranchRedirect.tsx",
            lineNumber: 51,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/auth/BranchRedirect.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_components_auth_346fd1e9._.js.map