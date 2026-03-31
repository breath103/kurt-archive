module.exports = [
"[project]/src/zen-garden-v2/object.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
}),
"[project]/src/zen-garden-v2/scene.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "ZenGardenScene",
    ()=>ZenGardenScene
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__ = __turbopack_context__.i("[externals]/three [external] (three, esm_import, [project]/node_modules/three)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$object$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden-v2/object.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
class ZenGardenScene {
    scene;
    camera;
    objects;
    raycaster = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Raycaster"]();
    constructor(encoded){
        this.scene = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Scene"]();
        this.camera = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["PerspectiveCamera"](60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 0);
        this.camera.lookAt(0, 0, 0);
        // Lights
        const ambient = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["AmbientLight"](0xffffff, 0.5);
        this.scene.add(ambient);
        const sun = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["DirectionalLight"](0xffffff, 1);
        sun.position.set(5, 10, 5);
        this.scene.add(sun);
        // Objects
        this.objects = new Map(encoded.objects.map((e)=>{
            switch(e.type){
                case "rock":
                    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$object$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["ZenGardenRock"](e, this.scene);
                case "moss":
                    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$object$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["ZenGardenMoss"](e, this.scene);
            }
        }).map((o)=>[
                o.id,
                o
            ]));
    }
    get threeScene() {
        return this.scene;
    }
    get threeCamera() {
        return this.camera;
    }
    handleResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    hitTest(screenX, screenY) {
        const mouse = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector2"](screenX, screenY);
        this.raycaster.setFromCamera(mouse, this.camera);
        const objects = Array.from(this.objects.values());
        for (const obj of objects){
            if (obj.testRaycast(this.raycaster)) {
                return obj;
            }
        }
        return null;
    }
    serialize() {
        return {
            objects: Array.from(this.objects.values()).map((object)=>object.serialize())
        };
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/zen-garden-v2/editor.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "ZenGardenEditor",
    ()=>ZenGardenEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/cjs/index.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__ = __turbopack_context__.i("[externals]/three [external] (three, esm_import, [project]/node_modules/three)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$scene$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden-v2/scene.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$scene$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$scene$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
class ZenGardenEditor {
    renderer;
    scene;
    canvas;
    $selectedObject = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["BehaviorSubject"](null);
    subscriptions = [];
    disposed = false;
    constructor(canvas, encoded){
        this.canvas = canvas;
        this.renderer = (()=>{
            const renderer = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["WebGLRenderer"]({
                canvas,
                antialias: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            return renderer;
        })();
        this.scene = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$scene$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["ZenGardenScene"](encoded);
        // Selection highlight logic
        this.subscriptions.push(this.$selectedObject.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["startWith"])(null), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["pairwise"])()).subscribe(([prev, curr])=>{
            prev?.setHighlight(false);
            curr?.setHighlight(true);
        }));
        canvas.addEventListener("click", this.handleClick);
        window.addEventListener("resize", this.handleResize);
        this.animate();
    }
    handleClick = (event)=>{
        const screenX = event.clientX / window.innerWidth * 2 - 1;
        const screenY = -(event.clientY / window.innerHeight) * 2 + 1;
        this.$selectedObject.next(this.scene.hitTest(screenX, screenY));
    };
    handleResize = ()=>{
        this.scene.handleResize(window.innerWidth, window.innerHeight);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    animate = ()=>{
        if (this.disposed) return;
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene.threeScene, this.scene.threeCamera);
    };
    dispose() {
        this.disposed = true;
        this.subscriptions.forEach((s)=>s.unsubscribe());
        this.canvas.removeEventListener("click", this.handleClick);
        window.removeEventListener("resize", this.handleResize);
        this.renderer.dispose();
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/pages/zen-garden-v2.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden-v2/editor.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const ZenGardenV2Page = ()=>{
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const editor = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2d$v2$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["ZenGardenEditor"](canvas, {
            objects: [
                {
                    id: "rock1",
                    type: "rock",
                    position: {
                        x: -1,
                        y: 0
                    }
                },
                {
                    id: "rock2",
                    type: "rock",
                    position: {
                        x: 1,
                        y: 1
                    }
                },
                {
                    id: "moss1",
                    type: "moss",
                    position: {
                        x: 0,
                        y: 0
                    },
                    polygonPath: [
                        {
                            x: -2,
                            y: -2
                        },
                        {
                            x: -1,
                            y: -2
                        },
                        {
                            x: -1,
                            y: -1
                        },
                        {
                            x: -2,
                            y: -1
                        }
                    ]
                }
            ]
        });
        return ()=>editor.dispose();
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("canvas", {
        ref: canvasRef,
        className: "w-full h-full"
    }, void 0, false, {
        fileName: "[project]/src/pages/zen-garden-v2.tsx",
        lineNumber: 29,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = ZenGardenV2Page;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ccc389f1._.js.map