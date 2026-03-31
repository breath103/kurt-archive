module.exports = [
"[next]/internal/font/google/inter_64117c1c.module.css [ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "className": "inter_64117c1c-module__he53uW__className",
});
}),
"[next]/internal/font/google/inter_64117c1c.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_64117c1c$2e$module$2e$css__$5b$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_64117c1c.module.css [ssr] (css module)");
;
const fontData = {
    className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_64117c1c$2e$module$2e$css__$5b$ssr$5d$__$28$css__module$29$__["default"].className,
    style: {
        fontFamily: "'Inter', 'Inter Fallback'",
        fontStyle: "normal"
    }
};
if (__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_64117c1c$2e$module$2e$css__$5b$ssr$5d$__$28$css__module$29$__["default"].variable != null) {
    fontData.variable = __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_64117c1c$2e$module$2e$css__$5b$ssr$5d$__$28$css__module$29$__["default"].variable;
}
const __TURBOPACK__default__export__ = fontData;
}),
"[project]/src/pages/_app.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>App
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_64117c1c$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_64117c1c.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$posthog$2d$js__$5b$external$5d$__$28$posthog$2d$js$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$posthog$2d$js$29$__ = __turbopack_context__.i("[externals]/posthog-js [external] (posthog-js, cjs, [project]/node_modules/posthog-js)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$posthog$2d$js$2f$react__$5b$external$5d$__$28$posthog$2d$js$2f$react$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$posthog$2d$js$29$__ = __turbopack_context__.i("[externals]/posthog-js/react [external] (posthog-js/react, cjs, [project]/node_modules/posthog-js)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
;
;
;
;
function App({ Component, pageProps }) {
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        __TURBOPACK__imported__module__$5b$externals$5d2f$posthog$2d$js__$5b$external$5d$__$28$posthog$2d$js$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$posthog$2d$js$29$__["default"].init(("TURBOPACK compile-time value", "phc_i137na3J3eT0uJCvdNrfpywJ1Tt3bXuopRLIwoJsqU2"), {
            api_host: ("TURBOPACK compile-time value", "https://us.i.posthog.com") || "https://us.i.posthog.com",
            person_profiles: "identified_only",
            defaults: "2025-11-30",
            loaded: (posthog)=>{
                if ("TURBOPACK compile-time truthy", 1) posthog.debug();
            }
        });
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$posthog$2d$js$2f$react__$5b$external$5d$__$28$posthog$2d$js$2f$react$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$posthog$2d$js$29$__["PostHogProvider"], {
        client: __TURBOPACK__imported__module__$5b$externals$5d2f$posthog$2d$js__$5b$external$5d$__$28$posthog$2d$js$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$posthog$2d$js$29$__["default"],
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
            className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_64117c1c$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"].className,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Component, {
                ...pageProps
            }, void 0, false, {
                fileName: "[project]/src/pages/_app.tsx",
                lineNumber: 27,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/pages/_app.tsx",
            lineNumber: 26,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/pages/_app.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
}),
"[externals]/posthog-js [external] (posthog-js, cjs, [project]/node_modules/posthog-js)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("posthog-js-8c2bb007dc8cf4fa", () => require("posthog-js-8c2bb007dc8cf4fa"));

module.exports = mod;
}),
"[externals]/posthog-js/react [external] (posthog-js/react, cjs, [project]/node_modules/posthog-js)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("posthog-js-8c2bb007dc8cf4fa/react", () => require("posthog-js-8c2bb007dc8cf4fa/react"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8525044d._.js.map