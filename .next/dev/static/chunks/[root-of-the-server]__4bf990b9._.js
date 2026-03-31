(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/vector2.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Vector2",
    ()=>Vector2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
;
class Vector2 extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"] {
    constructor(encoded){
        super(encoded.x, encoded.y);
    }
    toVector3(z = 0) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"](this.x, this.y, z);
    }
    clone() {
        return new Vector2({
            x: this.x,
            y: this.y
        });
    }
    serialize() {
        return {
            x: this.x,
            y: this.y
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/moss.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ZenGardenMoss",
    ()=>ZenGardenMoss
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/vector2.ts [client] (ecmascript)");
;
;
const MOSS_Z = 0.01;
class ZenGardenMoss {
    id;
    object;
    points;
    constructor(encoded){
        this.id = encoded.id;
        this.points = [
            ...encoded.polygonPath
        ];
        this.object = new ZenGardenMossObject(encoded.position, this.points);
    }
    setHighlight(highlighted) {
        this.object.setHighlight(highlighted);
    }
    testRaycast(raycaster) {
        return this.object.testRaycast(raycaster);
    }
    move(delta) {
        this.object.position.add(delta.toVector3());
    }
    dispose() {
        this.object.removeFromParent();
        this.object.dispose();
    }
    serialize() {
        return {
            id: this.id,
            type: "moss",
            position: {
                x: this.object.position.x,
                y: this.object.position.y
            },
            polygonPath: this.points
        };
    }
}
class ZenGardenMossObject extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Object3D"] {
    mesh;
    material;
    constructor(position, points){
        super();
        const shape = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Shape"]();
        if (points.length > 0) {
            shape.moveTo(points[0].x, points[0].y);
            for(let i = 1; i < points.length; i++){
                shape.lineTo(points[i].x, points[i].y);
            }
            shape.closePath();
        }
        const geometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ShapeGeometry"](shape);
        this.material = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
            color: 0x4a7c23,
            roughness: 0.8,
            side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DoubleSide"]
        });
        this.mesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Mesh"](geometry, this.material);
        this.add(this.mesh);
        this.position.copy(new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](position).toVector3(MOSS_Z));
    }
    setHighlight(highlighted) {
        if (highlighted) {
            this.material.emissive.setHex(0xffaa00);
            this.material.emissiveIntensity = 0.4;
        } else {
            this.material.emissive.setHex(0x000000);
            this.material.emissiveIntensity = 0;
        }
    }
    testRaycast(raycaster) {
        return raycaster.intersectObject(this.mesh).length > 0;
    }
    dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/utils/subscriptions.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Subscriptions",
    ()=>Subscriptions
]);
class Subscriptions {
    subscriptions = [];
    add(subscription) {
        this.subscriptions.push(subscription);
    }
    [Symbol.dispose] = ()=>{
        this.subscriptions.map((s)=>s.unsubscribe());
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/nodes/texture-set-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TextureSetNode",
    ()=>TextureSetNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module './reactive-node'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
class TextureSetNode extends ReactiveNode {
    async process(context, { name }) {
        const loader = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["TextureLoader"]();
        const basePath = `/textures/${name}`;
        const load = (texName)=>new Promise((resolve, reject)=>{
                loader.load(`${basePath}/${texName}.jpg`, resolve, undefined, reject);
            });
        const [ao, color, displacement, normal, roughness] = await Promise.all([
            load("ao"),
            load("color"),
            load("displacement"),
            load("normal"),
            load("roughness")
        ]);
        return {
            ao,
            color,
            displacement,
            normal,
            roughness
        };
    }
    dispose() {}
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/nodes/map-texture-set-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MapTextureSetNode",
    ()=>MapTextureSetNode
]);
(()=>{
    const e = new Error("Cannot find module './reactive-node'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
class MapTextureSetNode extends ReactiveNode {
    constructor(context, inputs){
        super(context, inputs);
    }
    process(_context, { textureData, repeat, wrapS, wrapT }) {
        Object.values(textureData).forEach((texture)=>{
            if (repeat) texture.repeat.set(repeat.x, repeat.y);
            if (wrapS !== undefined) texture.wrapS = wrapS;
            if (wrapT !== undefined) texture.wrapT = wrapT;
        });
        return textureData;
    }
    dispose() {}
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/nodes/plain-displacement-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlainDisplacementNode",
    ()=>PlainDisplacementNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module './reactive-node'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
class PlainDisplacementNode extends ReactiveNode {
    static RESOLUTION = 1024;
    static MAX_STROKES = 8;
    static SAMPLES_PER_STROKE = 32;
    static vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;
    static fragmentShader = `
    precision highp float;

    uniform sampler2D baseDisplacement;
    uniform vec2 textureRepeat;
    uniform vec2 plainSize;

    uniform vec4 strokeData[${PlainDisplacementNode.MAX_STROKES}];
    uniform vec2 circleCenters[${PlainDisplacementNode.MAX_STROKES}];
    uniform vec2 strokePoints[${PlainDisplacementNode.MAX_STROKES * PlainDisplacementNode.SAMPLES_PER_STROKE}];
    uniform int strokeCount;

    varying vec2 vUv;

    #define PI 3.14159265359

    // Returns: x = distance to segment, y = signed perpendicular distance
    vec2 distanceToSegmentWithPerp(vec2 p, vec2 a, vec2 b) {
      vec2 ab = b - a;
      float len2 = dot(ab, ab);
      if (len2 < 0.0001) return vec2(length(p - a), 0.0);
      float t = clamp(dot(p - a, ab) / len2, 0.0, 1.0);
      vec2 closest = a + t * ab;
      float dist = length(p - closest);
      // Signed perpendicular: cross product gives signed distance
      vec2 dir = normalize(ab);
      float signedPerp = (p.x - closest.x) * dir.y - (p.y - closest.y) * dir.x;
      return vec2(dist, signedPerp);
    }

    // Returns: x = distance to path, y = signed perpendicular distance
    vec2 distanceToPathWithPerp(vec2 worldPos, int strokeIndex, int pointCount) {
      float minDist = 1000000.0;
      float perpAtMin = 0.0;
      int base = strokeIndex * ${PlainDisplacementNode.SAMPLES_PER_STROKE};
      for (int i = 0; i < ${PlainDisplacementNode.SAMPLES_PER_STROKE - 1}; i++) {
        if (i >= pointCount - 1) break;
        vec2 result = distanceToSegmentWithPerp(worldPos, strokePoints[base + i], strokePoints[base + i + 1]);
        if (result.x < minDist) {
          minDist = result.x;
          perpAtMin = result.y;
        }
      }
      return vec2(minDist, perpAtMin);
    }

    void main() {
      vec2 worldPos = (vUv - 0.5) * plainSize;

      vec2 tiledUv = fract(vUv * textureRepeat);
      float baseHeight = texture2D(baseDisplacement, tiledUv).r;

      float rakeEffect = 0.0;
      for (int i = 0; i < ${PlainDisplacementNode.MAX_STROKES}; i++) {
        if (i >= strokeCount) break;

        vec4 data = strokeData[i];
        float strokeType = data.x;
        float strokeWidth = data.y;
        float tineFrequency = data.w; // tines per unit
        if (strokeType < 0.5) continue;

        float dist;
        float perpDist;

        if (strokeType < 1.5) {
          // Circle: wave is radial (concentric rings)
          vec2 center = circleCenters[i];
          float radius = data.z;
          float distFromCenter = length(worldPos - center);
          dist = abs(distFromCenter - radius);
          perpDist = distFromCenter - radius; // radial distance from circle centerline
        } else {
          // Path: use perpendicular distance for wave
          vec2 result = distanceToPathWithPerp(worldPos, i, int(data.z));
          dist = result.x;
          perpDist = result.y;
        }

        float halfWidth = strokeWidth * 0.5;
        float influence = 1.0 - smoothstep(halfWidth * 0.7, halfWidth, dist);

        // Sine wave for ridges and grooves
        float wave = sin(perpDist * tineFrequency * PI * 2.0);
        rakeEffect += influence * wave * 1.0;
      }

      gl_FragColor = vec4(vec3(baseHeight + rakeEffect), 1.0);
    }
  `;
    renderTarget;
    scene;
    camera;
    material;
    strokeDataArray = new Float32Array(PlainDisplacementNode.MAX_STROKES * 4);
    circleCentersArray = new Float32Array(PlainDisplacementNode.MAX_STROKES * 2);
    strokePointsArray = new Float32Array(PlainDisplacementNode.MAX_STROKES * PlainDisplacementNode.SAMPLES_PER_STROKE * 2);
    constructor(context, inputs){
        super(context, inputs);
        this.renderTarget = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["WebGLRenderTarget"](PlainDisplacementNode.RESOLUTION, PlainDisplacementNode.RESOLUTION, {
            minFilter: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LinearFilter"],
            magFilter: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LinearFilter"],
            format: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RGBAFormat"]
        });
        this.renderTarget.texture.flipY = false;
        this.material = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ShaderMaterial"]({
            vertexShader: PlainDisplacementNode.vertexShader,
            fragmentShader: PlainDisplacementNode.fragmentShader,
            uniforms: {
                baseDisplacement: {
                    value: null
                },
                textureRepeat: {
                    value: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](1, 1)
                },
                plainSize: {
                    value: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](1, 1)
                },
                strokeData: {
                    value: this.strokeDataArray
                },
                circleCenters: {
                    value: this.circleCentersArray
                },
                strokePoints: {
                    value: this.strokePointsArray
                },
                strokeCount: {
                    value: 0
                }
            }
        });
        const quad = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Mesh"](new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["PlaneGeometry"](2, 2), this.material);
        this.scene = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Scene"]();
        this.scene.add(quad);
        this.camera = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["OrthographicCamera"](-1, 1, 1, -1, 0, 1);
    }
    process(context, { baseMap, textureRepeat, plainSize, rakes }) {
        this.material.uniforms.baseDisplacement.value = baseMap;
        this.material.uniforms.textureRepeat.value.set(textureRepeat.x, textureRepeat.y);
        this.material.uniforms.plainSize.value.set(plainSize.x, plainSize.y);
        this.strokeDataArray.fill(0);
        this.circleCentersArray.fill(0);
        this.strokePointsArray.fill(0);
        const count = Math.min(rakes.length, PlainDisplacementNode.MAX_STROKES);
        for(let i = 0; i < count; i++){
            const rake = rakes[i];
            const encoded = rake.serialize();
            const pos = rake.object.position;
            // Tine frequency: number of forks across the stroke width
            const tineFrequency = encoded.numberOfForks / encoded.width;
            if (encoded.path.type === "circle") {
                this.strokeDataArray[i * 4] = 1;
                this.strokeDataArray[i * 4 + 1] = encoded.width;
                this.strokeDataArray[i * 4 + 2] = encoded.path.radius;
                this.strokeDataArray[i * 4 + 3] = tineFrequency;
                this.circleCentersArray[i * 2] = encoded.path.center.x + pos.x;
                this.circleCentersArray[i * 2 + 1] = encoded.path.center.y + pos.y;
            } else {
                const points = encoded.path.points.map((p)=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"](p.x + pos.x, p.y + pos.y, 0));
                if (points.length < 2) continue;
                const curve = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CatmullRomCurve3"](points, encoded.path.closed);
                const sampled = curve.getPoints(PlainDisplacementNode.SAMPLES_PER_STROKE - 1);
                this.strokeDataArray[i * 4] = 2;
                this.strokeDataArray[i * 4 + 1] = encoded.width;
                this.strokeDataArray[i * 4 + 2] = sampled.length;
                this.strokeDataArray[i * 4 + 3] = tineFrequency;
                const base = i * PlainDisplacementNode.SAMPLES_PER_STROKE * 2;
                for(let j = 0; j < sampled.length; j++){
                    this.strokePointsArray[base + j * 2] = sampled[j].x;
                    this.strokePointsArray[base + j * 2 + 1] = sampled[j].y;
                }
            }
        }
        this.material.uniforms.strokeCount.value = count;
        const prev = context.textureRenderer.getRenderTarget();
        context.textureRenderer.setRenderTarget(this.renderTarget);
        context.textureRenderer.render(this.scene, this.camera);
        context.textureRenderer.setRenderTarget(prev);
        return this.renderTarget.texture;
    }
    dispose() {
        this.renderTarget.dispose();
        this.material.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/nodes/plain-normal-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlainNormalNode",
    ()=>PlainNormalNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module './reactive-node'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
class PlainNormalNode extends ReactiveNode {
    static RESOLUTION = 1024;
    static vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;
    static fragmentShader = `
    precision highp float;

    uniform sampler2D displacement;
    uniform float strength;
    uniform vec2 texelSize;

    varying vec2 vUv;

    void main() {
      float hL = texture2D(displacement, vUv - vec2(texelSize.x, 0.0)).r;
      float hR = texture2D(displacement, vUv + vec2(texelSize.x, 0.0)).r;
      float hD = texture2D(displacement, vUv - vec2(0.0, texelSize.y)).r;
      float hU = texture2D(displacement, vUv + vec2(0.0, texelSize.y)).r;

      vec3 normal = normalize(vec3(hL - hR, hD - hU, 1.0 / strength));

      // Encode normal to 0-1 range for storage
      gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
    }
  `;
    renderTarget;
    scene;
    camera;
    material;
    constructor(context, inputs){
        super(context, inputs);
        this.renderTarget = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["WebGLRenderTarget"](PlainNormalNode.RESOLUTION, PlainNormalNode.RESOLUTION, {
            minFilter: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LinearFilter"],
            magFilter: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LinearFilter"],
            format: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RGBAFormat"]
        });
        this.material = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ShaderMaterial"]({
            vertexShader: PlainNormalNode.vertexShader,
            fragmentShader: PlainNormalNode.fragmentShader,
            uniforms: {
                displacement: {
                    value: null
                },
                strength: {
                    value: 1.0
                },
                texelSize: {
                    value: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](1 / PlainNormalNode.RESOLUTION, 1 / PlainNormalNode.RESOLUTION)
                }
            }
        });
        const quad = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Mesh"](new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["PlaneGeometry"](2, 2), this.material);
        this.scene = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Scene"]();
        this.scene.add(quad);
        this.camera = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["OrthographicCamera"](-1, 1, 1, -1, 0, 1);
    }
    process(context, { displacement, strength }) {
        this.material.uniforms.displacement.value = displacement;
        this.material.uniforms.strength.value = strength;
        const prev = context.textureRenderer.getRenderTarget();
        context.textureRenderer.setRenderTarget(this.renderTarget);
        context.textureRenderer.render(this.scene, this.camera);
        context.textureRenderer.setRenderTarget(prev);
        return this.renderTarget.texture;
    }
    dispose() {
        this.renderTarget.dispose();
        this.material.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/nodes/plain-material-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlainMaterialNode",
    ()=>PlainMaterialNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module './reactive-node'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
class PlainMaterialNode extends ReactiveNode {
    material = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        displacementScale: 0.10
    });
    constructor(context, inputs){
        super(context, inputs);
    }
    process(_context, { textureData, displacement, normal }) {
        this.material.map = textureData.color;
        this.material.normalMap = normal;
        this.material.aoMap = textureData.ao;
        this.material.roughnessMap = textureData.roughness;
        this.material.displacementMap = displacement;
        // Debug feature
        // this.material.wireframe = true;
        // this.material.wireframeLinecap = true
        return this.material;
    }
    dispose() {
        this.material.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/nodes/static-plain-geometry-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StaticPlainGeometryNode",
    ()=>StaticPlainGeometryNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module './reactive-node'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
class StaticPlainGeometryNode extends ReactiveNode {
    geometry = null;
    constructor(context, inputs){
        super(context, inputs);
    }
    process(_context, { size, segmentsPerUnit }) {
        // Dispose old geometry if exists
        this.geometry?.dispose();
        const segmentsX = Math.round(size.x * segmentsPerUnit);
        const segmentsY = Math.round(size.y * segmentsPerUnit);
        this.geometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["PlaneGeometry"](size.x, size.y, segmentsX, segmentsY);
        return this.geometry;
    }
    dispose() {
        this.geometry?.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/plain.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ZenGardenPlain",
    ()=>ZenGardenPlain
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/vector2.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$combineLatest$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$map$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/map.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$merge$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/observable/merge.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/observable/of.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$shareReplay$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/shareReplay.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$startWith$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/startWith.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$switchMap$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/switchMap.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$utils$2f$subscriptions$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/utils/subscriptions.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$texture$2d$set$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/nodes/texture-set-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$map$2d$texture$2d$set$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/nodes/map-texture-set-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$plain$2d$displacement$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/nodes/plain-displacement-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$plain$2d$normal$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/nodes/plain-normal-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$plain$2d$material$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/nodes/plain-material-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$static$2d$plain$2d$geometry$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/nodes/static-plain-geometry-node.ts [client] (ecmascript)");
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
class ZenGardenPlain {
    object;
    $size;
    $textureName;
    subscriptions = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$utils$2f$subscriptions$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["Subscriptions"]();
    // Exposed for debugging
    materialNode;
    geometryNode;
    constructor(encoded, $rakes, renderer){
        const context = {
            textureRenderer: renderer
        };
        this.$size = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BehaviorSubject"](new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](encoded.size));
        this.$textureName = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BehaviorSubject"](encoded.textureName);
        const $tileSize = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BehaviorSubject"](3);
        // Calculate texture repeat
        const $textureRepeat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$combineLatest$2e$js__$5b$client$5d$__$28$ecmascript$29$__["combineLatest"])([
            this.$size,
            $tileSize
        ]).pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$map$2e$js__$5b$client$5d$__$28$ecmascript$29$__["map"])(([plainSize, tileSize])=>plainSize.clone().divideScalar(tileSize)), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$shareReplay$2e$js__$5b$client$5d$__$28$ecmascript$29$__["shareReplay"])(1));
        // Rakes that emits whenever any rake changes
        const $rakesChanged = $rakes.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$switchMap$2e$js__$5b$client$5d$__$28$ecmascript$29$__["switchMap"])((rakes)=>rakes.length === 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__["of"])(rakes) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$merge$2e$js__$5b$client$5d$__$28$ecmascript$29$__["merge"])(...rakes.map((r)=>r.$changed)).pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$startWith$2e$js__$5b$client$5d$__$28$ecmascript$29$__["startWith"])(null), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$map$2e$js__$5b$client$5d$__$28$ecmascript$29$__["map"])(()=>rakes))));
        // Node graph
        const textureSetNode = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$texture$2d$set$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["TextureSetNode"](context, {
            name: this.$textureName
        });
        const mappedTextureNode = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$map$2d$texture$2d$set$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["MapTextureSetNode"](context, {
            textureData: textureSetNode,
            repeat: $textureRepeat,
            wrapS: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__["of"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RepeatWrapping"]),
            wrapT: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__["of"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RepeatWrapping"])
        });
        const displacementNode = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$plain$2d$displacement$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["PlainDisplacementNode"](context, {
            baseMap: textureSetNode.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$map$2e$js__$5b$client$5d$__$28$ecmascript$29$__["map"])((t)=>t.displacement), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$shareReplay$2e$js__$5b$client$5d$__$28$ecmascript$29$__["shareReplay"])(1)),
            textureRepeat: $textureRepeat,
            plainSize: this.$size,
            rakes: $rakesChanged
        });
        const normalNode = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$plain$2d$normal$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["PlainNormalNode"](context, {
            displacement: displacementNode,
            strength: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__["of"])(1.0)
        });
        this.materialNode = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$plain$2d$material$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["PlainMaterialNode"](context, {
            textureData: mappedTextureNode,
            displacement: displacementNode,
            normal: normalNode
        });
        this.geometryNode = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$static$2d$plain$2d$geometry$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["StaticPlainGeometryNode"](context, {
            size: this.$size,
            segmentsPerUnit: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__["of"])(64)
        });
        // Create mesh
        this.object = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Mesh"]();
        this.object.position.set(0, 0, 0);
        this.object.receiveShadow = true;
        // Geometry updates
        this.subscriptions.add(this.geometryNode.subscribe((geo)=>{
            this.object.geometry = geo;
        }));
        // Material updates
        this.subscriptions.add(this.materialNode.subscribe((mat)=>{
            this.object.material = mat;
        }));
    }
    [Symbol.dispose] = ()=>{
        this.subscriptions[Symbol.dispose]();
        this.materialNode.dispose();
        this.geometryNode.dispose();
    };
    serialize() {
        return {
            size: this.$size.value.serialize(),
            textureName: this.$textureName.value
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/rake-stroke.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ZenGardenRakeStroke",
    ()=>ZenGardenRakeStroke
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$Subject$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/Subject.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
;
;
const RAKE_Z = 0.02;
class ZenGardenRakeStroke {
    id;
    object;
    $changed = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$Subject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Subject"]();
    path;
    _width;
    numberOfForks;
    forkDepth;
    constructor(encoded){
        this.id = encoded.id;
        this.path = encoded.path;
        this._width = encoded.width;
        this.numberOfForks = encoded.numberOfForks;
        this.forkDepth = encoded.forkDepth;
        this.object = new ZenGardenRakeStrokeObject(this.path, this._width);
    }
    get width() {
        return this._width;
    }
    set width(value) {
        this._width = value;
        this.object.updateGeometry({
            path: this.path,
            width: value
        });
        this.$changed.next();
    }
    setHighlight(highlighted) {
        this.object.setHighlight(highlighted);
    }
    testRaycast(raycaster) {
        return this.object.testRaycast(raycaster);
    }
    move(delta) {
        this.object.position.add(delta.toVector3());
        this.$changed.next();
    }
    dispose() {
        this.$changed.complete();
        this.object.removeFromParent();
        this.object.dispose();
    }
    serialize() {
        return {
            id: this.id,
            type: "rakeStroke",
            path: this.path,
            width: this._width,
            numberOfForks: this.numberOfForks,
            forkDepth: this.forkDepth
        };
    }
}
class ZenGardenRakeStrokeObject extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Object3D"] {
    mesh;
    material;
    debugPoints = null;
    constructor(path, width){
        super();
        this.material = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
            color: 0xc2b280,
            roughness: 0.9,
            side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DoubleSide"],
            transparent: true,
            opacity: 0
        });
        this.mesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Mesh"](new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BufferGeometry"](), this.material);
        this.mesh.position.z = RAKE_Z;
        this.add(this.mesh);
        this.updateGeometry({
            path,
            width
        });
    }
    updateGeometry({ path, width }) {
        this.mesh.geometry.dispose();
        this.mesh.geometry = this.createGeometry(path, width);
        if (this.debugPoints) {
            this.debugPoints.geometry.dispose();
            this.debugPoints.material.dispose();
            this.remove(this.debugPoints);
            this.debugPoints = null;
        }
        if (path.type === "points") {
            this.debugPoints = this.createDebugPoints(path);
            this.add(this.debugPoints);
        }
    }
    createGeometry(path, width) {
        switch(path.type){
            case "circle":
                return this.createCircleGeometry(path, width);
            case "points":
                return this.createPointsGeometry(path, width);
        }
    }
    createCircleGeometry(path, width) {
        const innerRadius = Math.max(0, path.radius - width / 2);
        const outerRadius = path.radius + width / 2;
        const geometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RingGeometry"](innerRadius, outerRadius, 64);
        geometry.translate(path.center.x, path.center.y, 0);
        return geometry;
    }
    createPointsGeometry(path, width) {
        if (path.points.length < 2) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BufferGeometry"]();
        }
        const curvePoints = path.points.map((p)=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"](p.x, p.y, 0));
        const curve = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CatmullRomCurve3"](curvePoints, path.closed);
        const sampledPoints = curve.getPoints(50);
        const shape = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Shape"]();
        const halfWidth = width / 2;
        const leftPoints = [];
        const rightPoints = [];
        for(let i = 0; i < sampledPoints.length; i++){
            const curr = sampledPoints[i];
            const prev = i > 0 ? sampledPoints[i - 1] : null;
            const next = i < sampledPoints.length - 1 ? sampledPoints[i + 1] : null;
            let perpX = 0, perpY = 0;
            if (prev && next) {
                const dirX = next.x - prev.x;
                const dirY = next.y - prev.y;
                const len = Math.sqrt(dirX * dirX + dirY * dirY);
                perpX = -dirY / len;
                perpY = dirX / len;
            } else if (next) {
                const dirX = next.x - curr.x;
                const dirY = next.y - curr.y;
                const len = Math.sqrt(dirX * dirX + dirY * dirY);
                perpX = -dirY / len;
                perpY = dirX / len;
            } else if (prev) {
                const dirX = curr.x - prev.x;
                const dirY = curr.y - prev.y;
                const len = Math.sqrt(dirX * dirX + dirY * dirY);
                perpX = -dirY / len;
                perpY = dirX / len;
            }
            leftPoints.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](curr.x + perpX * halfWidth, curr.y + perpY * halfWidth));
            rightPoints.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](curr.x - perpX * halfWidth, curr.y - perpY * halfWidth));
        }
        shape.moveTo(leftPoints[0].x, leftPoints[0].y);
        for(let i = 1; i < leftPoints.length; i++){
            shape.lineTo(leftPoints[i].x, leftPoints[i].y);
        }
        for(let i = rightPoints.length - 1; i >= 0; i--){
            shape.lineTo(rightPoints[i].x, rightPoints[i].y);
        }
        if (path.closed) {
            shape.closePath();
        }
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ShapeGeometry"](shape);
    }
    createDebugPoints(path) {
        const curvePoints = path.points.map((p)=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"](p.x, p.y, 0));
        const curve = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CatmullRomCurve3"](curvePoints, path.closed);
        const sampledPoints = curve.getPoints(50);
        const positions = new Float32Array(sampledPoints.length * 3);
        for(let i = 0; i < sampledPoints.length; i++){
            positions[i * 3] = sampledPoints[i].x;
            positions[i * 3 + 1] = sampledPoints[i].y;
            positions[i * 3 + 2] = RAKE_Z + 0.1;
        }
        const geometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BufferGeometry"]();
        geometry.setAttribute("position", new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BufferAttribute"](positions, 3));
        const material = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["PointsMaterial"]({
            color: 0xff0000,
            size: 0.1,
            sizeAttenuation: true
        });
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Points"](geometry, material);
    }
    setHighlight(highlighted) {
        if (highlighted) {
            this.material.opacity = 1;
            this.material.emissive.setHex(0xffaa00);
            this.material.emissiveIntensity = 0.4;
        } else {
            this.material.opacity = 0;
            this.material.emissive.setHex(0x000000);
            this.material.emissiveIntensity = 0;
        }
    }
    testRaycast(raycaster) {
        return raycaster.intersectObject(this.mesh).length > 0;
    }
    dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
        if (this.debugPoints) {
            this.debugPoints.geometry.dispose();
            this.debugPoints.material.dispose();
        }
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/rock.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ZenGardenRock",
    ()=>ZenGardenRock
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/vector2.ts [client] (ecmascript)");
;
;
const ROCK_Z = 0.15;
class ZenGardenRock {
    id;
    object;
    constructor(encoded){
        this.id = encoded.id;
        this.object = new ZenGardenRockObject(encoded.position);
    }
    setHighlight(highlighted) {
        this.object.setHighlight(highlighted);
    }
    testRaycast(raycaster) {
        return this.object.testRaycast(raycaster);
    }
    move(delta) {
        this.object.position.add(delta.toVector3());
    }
    dispose() {
        this.object.removeFromParent();
        this.object.dispose();
    }
    serialize() {
        return {
            id: this.id,
            type: "rock",
            position: {
                x: this.object.position.x,
                y: this.object.position.y
            }
        };
    }
}
class ZenGardenRockObject extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Object3D"] {
    mesh;
    material;
    constructor(position){
        super();
        const geometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["SphereGeometry"](0.3, 8, 6);
        geometry.scale(1, 1, 0.6);
        this.material = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
            color: 0x666666,
            roughness: 0.9
        });
        this.mesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Mesh"](geometry, this.material);
        this.mesh.castShadow = true;
        this.add(this.mesh);
        this.position.copy(new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](position).toVector3(ROCK_Z));
    }
    setHighlight(highlighted) {
        if (highlighted) {
            this.material.emissive.setHex(0xffaa00);
            this.material.emissiveIntensity = 0.4;
        } else {
            this.material.emissive.setHex(0x000000);
            this.material.emissiveIntensity = 0;
        }
    }
    testRaycast(raycaster) {
        return raycaster.intersectObject(this.mesh).length > 0;
    }
    dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/sun.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Sun",
    ()=>Sun
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
;
class Sun extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DirectionalLight"] {
    angle = 0;
    constructor(){
        super(0xffffff, 1);
        this.castShadow = true;
    }
    update() {
        this.angle += 0.01;
        const radius = 7;
        this.position.set(Math.cos(this.angle) * radius, Math.sin(this.angle) * radius, 10);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/scene.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ZenGardenScene",
    ()=>ZenGardenScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$map$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/map.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$moss$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/moss.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$plain$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/plain.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rake$2d$stroke$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/rake-stroke.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rock$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/rock.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$sun$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/sun.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/vector2.ts [client] (ecmascript)");
;
;
;
;
;
;
;
;
class ZenGardenScene {
    scene;
    camera;
    sun;
    plain;
    $objects = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BehaviorSubject"]([]);
    raycaster = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Raycaster"]();
    constructor(encoded, renderer){
        // Z-up coordinate system
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Object3D"].DEFAULT_UP.set(0, 0, 1);
        this.scene = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Scene"]();
        this.camera = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["PerspectiveCamera"](60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 10);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(0, 0, 0);
        // Lights
        const ambient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AmbientLight"](0xffffff, 0.5);
        this.scene.add(ambient);
        this.sun = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$sun$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["Sun"]();
        this.scene.add(this.sun);
        // Plain - $rakes is derived from $objects
        const $rakes = this.$objects.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$map$2e$js__$5b$client$5d$__$28$ecmascript$29$__["map"])((objects)=>objects.filter((o)=>o instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rake$2d$stroke$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenRakeStroke"])));
        this.plain = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$plain$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenPlain"](encoded.plain, $rakes, renderer);
        this.scene.add(this.plain.object);
        // Objects
        for (const e of encoded.objects){
            this.addObject(e);
        }
    }
    deserialize(encoded) {
        switch(encoded.type){
            case "rock":
                return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rock$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenRock"](encoded);
            case "moss":
                return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$moss$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenMoss"](encoded);
            case "rakeStroke":
                return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rake$2d$stroke$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenRakeStroke"](encoded);
        }
    }
    get threeScene() {
        return this.scene;
    }
    get threeCamera() {
        return this.camera;
    }
    update() {
        this.sun.update();
    }
    addObject(encoded) {
        const obj = this.deserialize(encoded);
        this.scene.add(obj.object);
        this.$objects.next([
            ...this.$objects.value,
            obj
        ]);
    }
    deleteObject(id) {
        const obj = this.$objects.value.find((o)=>o.id === id);
        if (obj) {
            obj.dispose();
            this.$objects.next(this.$objects.value.filter((o)=>o.id !== id));
        }
    }
    handleResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    hitTest(screenX, screenY) {
        const mouse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](screenX, screenY);
        this.raycaster.setFromCamera(mouse, this.camera);
        for (const obj of this.$objects.value){
            if (obj.testRaycast(this.raycaster)) {
                return obj;
            }
        }
        return null;
    }
    screenToPlaneCoordinate(screenX, screenY) {
        const mouse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector2"](screenX, screenY);
        this.raycaster.setFromCamera(mouse, this.camera);
        const plane = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Plane"](new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"](0, 0, 1), 0);
        const intersection = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"]();
        if (this.raycaster.ray.intersectPlane(plane, intersection)) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["Vector2"]({
                x: intersection.x,
                y: intersection.y
            });
        }
        return null;
    }
    serialize() {
        return {
            plain: this.plain.serialize(),
            objects: this.$objects.value.map((obj)=>obj.serialize())
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/editor.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ZenGardenEditor",
    ()=>ZenGardenEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$pairwise$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/pairwise.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$startWith$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/startWith.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.module.js [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/controls/OrbitControls.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$scene$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/scene.ts [client] (ecmascript)");
;
;
;
;
class ZenGardenEditor {
    renderer;
    controls;
    scene;
    canvas;
    _$selectedObject = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BehaviorSubject"](null);
    _$mode = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BehaviorSubject"](null);
    subscriptions = [];
    disposed = false;
    dragging = null;
    constructor(canvas, encoded){
        this.canvas = canvas;
        this.renderer = (()=>{
            const renderer = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["WebGLRenderer"]({
                canvas,
                antialias: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            return renderer;
        })();
        this.scene = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$scene$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenScene"](encoded, this.renderer);
        this.controls = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$client$5d$__$28$ecmascript$29$__["OrbitControls"](this.scene.threeCamera, canvas);
        this.controls.enableDamping = true;
        this.controls.mouseButtons = {
            LEFT: null,
            MIDDLE: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["MOUSE"].DOLLY,
            RIGHT: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["MOUSE"].ROTATE
        };
        // Selection highlight logic
        this.subscriptions.push(this._$selectedObject.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$startWith$2e$js__$5b$client$5d$__$28$ecmascript$29$__["startWith"])(null), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$pairwise$2e$js__$5b$client$5d$__$28$ecmascript$29$__["pairwise"])()).subscribe(([prev, curr])=>{
            prev?.setHighlight(false);
            curr?.setHighlight(true);
        }));
        canvas.addEventListener("mousedown", this.handleMouseDown);
        canvas.addEventListener("mousemove", this.handleMouseMove);
        canvas.addEventListener("mouseup", this.handleMouseUp);
        window.addEventListener("resize", this.handleResize);
        this.animate();
    }
    screenCoords(event) {
        return {
            x: event.clientX / window.innerWidth * 2 - 1,
            y: -(event.clientY / window.innerHeight) * 2 + 1
        };
    }
    handleMouseDown = (event)=>{
        const screen = this.screenCoords(event);
        const pos = this.scene.screenToPlaneCoordinate(screen.x, screen.y);
        const mode = this._$mode.value;
        if (pos) {
            const id = crypto.randomUUID();
            switch(mode){
                case null:
                    break;
                case "addRock":
                    this.scene.addObject({
                        id,
                        type: "rock",
                        position: pos.serialize()
                    });
                    this._$mode.next(null);
                    return;
                case "addMoss":
                    this.scene.addObject({
                        id,
                        type: "moss",
                        position: pos.serialize(),
                        polygonPath: [
                            {
                                x: -0.5,
                                y: -0.5
                            },
                            {
                                x: 0.5,
                                y: -0.5
                            },
                            {
                                x: 0.5,
                                y: 0.5
                            },
                            {
                                x: -0.5,
                                y: 0.5
                            }
                        ]
                    });
                    this._$mode.next(null);
                    return;
            }
        }
        const hit = this.scene.hitTest(screen.x, screen.y);
        if (hit && pos) {
            this.dragging = {
                object: hit,
                lastPos: pos
            };
            this._$selectedObject.next(hit);
        }
    };
    handleMouseMove = (event)=>{
        if (!this.dragging) return;
        const screen = this.screenCoords(event);
        const pos = this.scene.screenToPlaneCoordinate(screen.x, screen.y);
        if (pos) {
            const delta = pos.clone().sub(this.dragging.lastPos);
            this.dragging.object.move(delta);
            this.dragging.lastPos = pos;
        }
    };
    handleMouseUp = ()=>{
        this.dragging = null;
    };
    handleResize = ()=>{
        this.scene.handleResize(window.innerWidth, window.innerHeight);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    animate = ()=>{
        if (this.disposed) return;
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.scene.update();
        this.renderer.render(this.scene.threeScene, this.scene.threeCamera);
    };
    get $selectedObject() {
        return this._$selectedObject;
    }
    get $mode() {
        return this._$mode;
    }
    get threeRenderer() {
        return this.renderer;
    }
    setMode(mode) {
        this._$mode.next(mode);
    }
    deleteObject(id) {
        if (this._$selectedObject.value?.id === id) {
            this._$selectedObject.next(null);
        }
        this.scene.deleteObject(id);
    }
    dispose() {
        this.disposed = true;
        this.subscriptions.forEach((s)=>s.unsubscribe());
        this.controls.dispose();
        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        this.canvas.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("mouseup", this.handleMouseUp);
        window.removeEventListener("resize", this.handleResize);
        this.renderer.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/nodes/node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ReactiveNode",
    ()=>ReactiveNode,
    "isReactiveNode",
    ()=>isReactiveNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$combineLatest$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$from$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/observable/from.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$util$2f$isObservable$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/util/isObservable.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$Observable$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/Observable.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/observable/of.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$shareReplay$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/shareReplay.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$switchMap$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/operators/switchMap.js [client] (ecmascript)");
;
class ReactiveNode extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$Observable$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Observable"] {
    debugLogInputChanges = false;
    prevValues = null;
    // Debug: store inputs for graph traversal
    debugInputs;
    // Debug: latest output value
    debugLatestOutput = null;
    // Debug: marker to identify ReactiveNode instances
    isReactiveNode = true;
    constructor(context, inputs){
        const keys = Object.keys(inputs);
        const observables = keys.map((k)=>inputs[k]);
        // Store inputs for debug traversal
        const inputMap = new Map();
        for (const key of keys){
            inputMap.set(String(key), inputs[key]);
        }
        const source$ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$combineLatest$2e$js__$5b$client$5d$__$28$ecmascript$29$__["combineLatest"])(observables).pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$switchMap$2e$js__$5b$client$5d$__$28$ecmascript$29$__["switchMap"])((values)=>{
            const named = Object.fromEntries(keys.map((k, i)=>[
                    k,
                    values[i]
                ]));
            if (this.debugLogInputChanges) {
                const className = this.constructor.name;
                if (this.prevValues === null) {
                    console.log(`[${className}] initial:`, Object.keys(named).join(", "));
                } else {
                    for (const key of keys){
                        if (this.prevValues[key] !== named[key]) {
                            console.log(`[${className}] changed: ${String(key)}`, named[key]);
                        }
                    }
                }
                this.prevValues = {
                    ...named
                };
            }
            if (this.debugLogInputChanges) {
                console.log(`[${this.constructor.name}] process()`);
            }
            const result = this.process(context, named);
            if (result instanceof Promise) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$from$2e$js__$5b$client$5d$__$28$ecmascript$29$__["from"])(result);
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$util$2f$isObservable$2e$js__$5b$client$5d$__$28$ecmascript$29$__["isObservable"])(result)) return result;
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$observable$2f$of$2e$js__$5b$client$5d$__$28$ecmascript$29$__["of"])(result);
        }), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$operators$2f$shareReplay$2e$js__$5b$client$5d$__$28$ecmascript$29$__["shareReplay"])(1));
        super((subscriber)=>source$.subscribe(subscriber));
        this.debugInputs = inputMap;
        // Subscribe to capture latest output
        source$.subscribe((value)=>{
            this.debugLatestOutput = value;
        });
    }
    [Symbol.dispose]() {
        this.dispose();
    }
}
function isReactiveNode(obs) {
    return obs.isReactiveNode === true;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NodeGraphViewer",
    ()=>NodeGraphViewer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/nodes/node.ts [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
;
;
;
function buildGraph(sinkNodes) {
    const visited = new Map();
    let idCounter = 0;
    function traverse(node, depth) {
        if (visited.has(node)) {
            return visited.get(node);
        }
        const info = {
            id: `node-${idCounter++}`,
            name: node.constructor.name,
            node,
            inputs: new Map(),
            depth
        };
        visited.set(node, info);
        Array.from(node.debugInputs.entries()).forEach(([inputName, inputObs])=>{
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["isReactiveNode"])(inputObs)) {
                info.inputs.set(inputName, traverse(inputObs, depth + 1));
            } else {
                info.inputs.set(inputName, null);
            }
        });
        return info;
    }
    for (const sink of sinkNodes){
        traverse(sink, 0);
    }
    return new Map(Array.from(visited.values()).map((n)=>[
            n.id,
            n
        ]));
}
function TexturePreview({ texture }) {
    _s();
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TexturePreview.useEffect": ()=>{
            const canvas = canvasRef.current;
            if (!canvas || !texture.image) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const img = texture.image;
            if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || img instanceof ImageBitmap) {
                ctx.drawImage(img, 0, 0, 80, 80);
            }
        }
    }["TexturePreview.useEffect"], [
        texture
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
        ref: canvasRef,
        width: 80,
        height: 80,
        className: "border border-gray-600"
    }, void 0, false, {
        fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
        lineNumber: 72,
        columnNumber: 10
    }, this);
}
_s(TexturePreview, "UJgi7ynoup7eqypjnwyX/s32POg=");
_c = TexturePreview;
function RenderTargetPreview({ texture, renderer }) {
    _s1();
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RenderTargetPreview.useEffect": ()=>{
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            // For WebGLRenderTarget textures, we need to read pixels
            const rt = findRenderTarget(texture, renderer);
            if ("TURBOPACK compile-time truthy", 1) return;
            //TURBOPACK unreachable
            ;
            const width = undefined;
            const height = undefined;
            const pixels = undefined;
            // Create ImageData and draw scaled
            const imageData = undefined;
            const tempCanvas = undefined;
            const tempCtx = undefined;
        }
    }["RenderTargetPreview.useEffect"], [
        texture,
        renderer
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
        ref: canvasRef,
        width: 80,
        height: 80,
        className: "border border-gray-600"
    }, void 0, false, {
        fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
        lineNumber: 111,
        columnNumber: 10
    }, this);
}
_s1(RenderTargetPreview, "UJgi7ynoup7eqypjnwyX/s32POg=");
_c1 = RenderTargetPreview;
function findRenderTarget(_texture, _renderer) {
    // For now, return null - render target preview requires additional tracking
    return null;
}
function OutputPreview({ value, renderer }) {
    if (value instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Texture"]) {
        if (value.image) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TexturePreview, {
                texture: value
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                lineNumber: 122,
                columnNumber: 14
            }, this);
        } else if (renderer) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RenderTargetPreview, {
                texture: value,
                renderer: renderer
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                lineNumber: 124,
                columnNumber: 14
            }, this);
        }
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-20 h-20 bg-gray-700 flex items-center justify-center text-xs",
            children: "RT Texture"
        }, void 0, false, {
            fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
            lineNumber: 126,
            columnNumber: 12
        }, this);
    }
    if (value instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Material"]) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-xs bg-gray-700 p-1 rounded",
            children: value.type
        }, void 0, false, {
            fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
            lineNumber: 131,
            columnNumber: 7
        }, this);
    }
    if (value instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BufferGeometry"]) {
        const posAttr = value.getAttribute("position");
        const vertCount = posAttr ? posAttr.count : 0;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-xs bg-gray-700 p-1 rounded",
            children: [
                vertCount,
                " verts"
            ]
        }, void 0, true, {
            fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
            lineNumber: 141,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "text-xs bg-gray-700 p-1 rounded",
        children: String(value).slice(0, 50)
    }, void 0, false, {
        fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
        lineNumber: 148,
        columnNumber: 5
    }, this);
}
_c2 = OutputPreview;
function NodeCard({ info, renderer }) {
    const inputNodes = Array.from(info.inputs.entries()).filter(([, v])=>v !== null);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-gray-800 border border-gray-600 rounded-lg p-3 min-w-[140px]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "font-bold text-sm mb-2 text-blue-300",
                children: info.name
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                lineNumber: 165,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OutputPreview, {
                    value: info.node.debugLatestOutput,
                    renderer: renderer
                }, void 0, false, {
                    fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                    lineNumber: 167,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                lineNumber: 166,
                columnNumber: 7
            }, this),
            inputNodes.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-xs text-gray-400",
                children: [
                    "← ",
                    inputNodes.map(([name])=>name).join(", ")
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                lineNumber: 170,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
        lineNumber: 164,
        columnNumber: 5
    }, this);
}
_c3 = NodeCard;
function NodeGraphViewer({ sinkNodes, renderer, onClose }) {
    _s2();
    const [graph, setGraph] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Map());
    const [, forceUpdate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({});
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NodeGraphViewer.useEffect": ()=>{
            setGraph(buildGraph(sinkNodes));
        }
    }["NodeGraphViewer.useEffect"], [
        sinkNodes
    ]);
    // Refresh periodically to show updated outputs
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NodeGraphViewer.useEffect": ()=>{
            const interval = setInterval({
                "NodeGraphViewer.useEffect.interval": ()=>forceUpdate({})
            }["NodeGraphViewer.useEffect.interval"], 500);
            return ({
                "NodeGraphViewer.useEffect": ()=>clearInterval(interval)
            })["NodeGraphViewer.useEffect"];
        }
    }["NodeGraphViewer.useEffect"], []);
    // Group nodes by depth
    const nodesByDepth = new Map();
    Array.from(graph.values()).forEach((node)=>{
        const list = nodesByDepth.get(node.depth) ?? [];
        list.push(node);
        nodesByDepth.set(node.depth, list);
    });
    const maxDepth = Math.max(0, ...Array.from(nodesByDepth.keys()));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed left-0 right-0 top-0 bottom-0 bg-black/80 z-50 flex items-center justify-center",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-900 rounded-lg p-6 max-w-[90vw] max-h-[90vh] overflow-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-between items-center mb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-bold text-white",
                            children: "Node Graph"
                        }, void 0, false, {
                            fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                            lineNumber: 211,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white",
                            children: "Close"
                        }, void 0, false, {
                            fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                            lineNumber: 212,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                    lineNumber: 210,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex gap-8",
                    children: Array.from({
                        length: maxDepth + 1
                    }, (_, depth)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-xs text-gray-500 text-center",
                                    children: depth === 0 ? "Sinks" : depth === maxDepth ? "Sources" : `Depth ${depth}`
                                }, void 0, false, {
                                    fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                                    lineNumber: 223,
                                    columnNumber: 15
                                }, this),
                                (nodesByDepth.get(depth) ?? []).map((info)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NodeCard, {
                                        info: info,
                                        renderer: renderer
                                    }, info.id, false, {
                                        fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                                        lineNumber: 227,
                                        columnNumber: 17
                                    }, this))
                            ]
                        }, depth, true, {
                            fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                            lineNumber: 222,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
                    lineNumber: 219,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
            lineNumber: 209,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx",
        lineNumber: 208,
        columnNumber: 5
    }, this);
}
_s2(NodeGraphViewer, "6AHpMQ9pIAMcEU0F4bH9fSHW7j0=");
_c4 = NodeGraphViewer;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "TexturePreview");
__turbopack_context__.k.register(_c1, "RenderTargetPreview");
__turbopack_context__.k.register(_c2, "OutputPreview");
__turbopack_context__.k.register(_c3, "NodeCard");
__turbopack_context__.k.register(_c4, "NodeGraphViewer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden-v2/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$editor$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/editor.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$moss$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/moss.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/node-graph-viewer.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rake$2d$stroke$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/rake-stroke.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rock$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/rock.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/zen-garden-v2/zen-garden/vector2.ts [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
const ZenGardenV2Page = ()=>{
    _s();
    const [editor, setEditor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showNodeGraph, setShowNodeGraph] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ZenGardenV2Page.useEffect": ()=>{
            const canvas = document.getElementById("canvas");
            if (!canvas) return;
            const ed = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$editor$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenEditor"](canvas, {
                plain: {
                    size: {
                        x: 10,
                        y: 5
                    },
                    textureName: "gravel"
                },
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
                    },
                    {
                        id: "rake1",
                        type: "rakeStroke",
                        path: {
                            type: "circle",
                            center: {
                                x: 2,
                                y: 0
                            },
                            radius: 1
                        },
                        width: 0.5,
                        numberOfForks: 3,
                        forkDepth: 0.1
                    },
                    {
                        id: "rake2",
                        type: "rakeStroke",
                        path: {
                            type: "points",
                            points: [
                                {
                                    x: -3,
                                    y: -1
                                },
                                {
                                    x: -2,
                                    y: 0
                                },
                                {
                                    x: -3,
                                    y: 1
                                }
                            ],
                            closed: false
                        },
                        width: 0.5,
                        numberOfForks: 3,
                        forkDepth: 0.1
                    }
                ]
            });
            setEditor(ed);
            return ({
                "ZenGardenV2Page.useEffect": ()=>ed.dispose()
            })["ZenGardenV2Page.useEffect"];
        }
    }["ZenGardenV2Page.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                id: "canvas",
                className: "w-full h-full"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            editor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PlainSizePanel, {
                        editor: editor
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 48,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ObjectPanel, {
                        editor: editor
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 49,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AddPanel, {
                        editor: editor
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 50,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setShowNodeGraph(true),
                        className: "fixed left-4 bottom-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700",
                        children: "Node Graph"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    showNodeGraph && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["NodeGraphViewer"], {
                        sinkNodes: [
                            editor.scene.plain.materialNode,
                            editor.scene.plain.geometryNode
                        ],
                        renderer: editor.threeRenderer,
                        onClose: ()=>setShowNodeGraph(false)
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 58,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true)
        ]
    }, void 0, true);
};
_s(ZenGardenV2Page, "WccmAMFiwVXuYxOiAwMPPrvGdAQ=");
_c = ZenGardenV2Page;
const __TURBOPACK__default__export__ = ZenGardenV2Page;
function PlainSizePanel({ editor }) {
    const updateSize = (axis, value)=>{
        const current = editor.scene.plain.$size.value;
        editor.scene.plain.$size.next(new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$vector2$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["Vector2"]({
            x: axis === "x" ? value : current.x,
            y: axis === "y" ? value : current.y
        }));
    };
    const size = editor.scene.plain.$size.value;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed left-4 top-4 bg-white text-black p-4 rounded-lg space-y-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold",
                children: "Plain Size"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 90,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "block",
                children: [
                    "Width:",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "number",
                        defaultValue: size.x,
                        onChange: (e)=>updateSize("x", Number(e.target.value)),
                        className: "ml-2 w-20 px-2 py-1 bg-white/20 rounded"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "block",
                children: [
                    "Height:",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "number",
                        defaultValue: size.y,
                        onChange: (e)=>updateSize("y", Number(e.target.value)),
                        className: "ml-2 w-20 px-2 py-1 bg-white/20 rounded"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 102,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
        lineNumber: 89,
        columnNumber: 5
    }, this);
}
_c1 = PlainSizePanel;
function ObjectPanel({ editor }) {
    _s1();
    const selected = useObservable(editor.$selectedObject);
    if (!selected) return null;
    const onDelete = ()=>editor.deleteObject(selected.id);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed right-4 top-4 bg-white text-black p-4 rounded-lg space-y-2",
        children: [
            (()=>{
                if (selected instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rock$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenRock"]) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RockPanel, {
                        rock: selected
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 124,
                        columnNumber: 18
                    }, this);
                } else if (selected instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$moss$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenMoss"]) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MossPanel, {
                        moss: selected
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 126,
                        columnNumber: 18
                    }, this);
                } else if (selected instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$zen$2d$garden$2d$v2$2f$zen$2d$garden$2f$rake$2d$stroke$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ZenGardenRakeStroke"]) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RakeStrokePanel, {
                        rakeStroke: selected
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 128,
                        columnNumber: 18
                    }, this);
                } else {
                    throw new Error("not implemented yet");
                }
            })(),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: onDelete,
                className: "w-full px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600",
                children: "Delete"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 133,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
        lineNumber: 121,
        columnNumber: 5
    }, this);
}
_s1(ObjectPanel, "pwiKKmm2zaOYoaURQGc8UmjoH6w=", false, function() {
    return [
        useObservable
    ];
});
_c2 = ObjectPanel;
function RockPanel({ rock }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold",
                children: "Rock"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 146,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "ID: ",
                    rock.id
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 147,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c3 = RockPanel;
function MossPanel({ moss }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold",
                children: "Moss"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 155,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "ID: ",
                    moss.id
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 156,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c4 = MossPanel;
function RakeStrokePanel({ rakeStroke }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold",
                children: "Rake Stroke"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 164,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "ID: ",
                    rakeStroke.id
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 165,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "block",
                children: [
                    "Width:",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "number",
                        step: "0.1",
                        defaultValue: rakeStroke.width,
                        onChange: (e)=>{
                            rakeStroke.width = Number(e.target.value);
                        },
                        className: "ml-2 w-20 px-2 py-1 bg-white/20 rounded"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                        lineNumber: 168,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 166,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c5 = RakeStrokePanel;
function AddPanel({ editor }) {
    _s2();
    const mode = useObservable(editor.$mode);
    if (mode) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed right-4 bottom-4 bg-white text-black p-4 rounded-lg",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>editor.setMode(null),
                className: "px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600",
                children: "Cancel"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 186,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
            lineNumber: 185,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed right-4 bottom-4 bg-white text-black p-4 rounded-lg space-x-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>editor.setMode("addRock"),
                className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600",
                children: "Add Rock"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>editor.setMode("addMoss"),
                className: "px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600",
                children: "Add Moss"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
                lineNumber: 204,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden-v2/index.tsx",
        lineNumber: 197,
        columnNumber: 5
    }, this);
}
_s2(AddPanel, "UjhJ1p6cP8g5vRvRuw3xLn/tOCQ=", false, function() {
    return [
        useObservable
    ];
});
_c6 = AddPanel;
function useObservable(observable) {
    _s3();
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useObservable.useEffect": ()=>{
            const sub = observable.subscribe(setValue);
            return ({
                "useObservable.useEffect": ()=>sub.unsubscribe()
            })["useObservable.useEffect"];
        }
    }["useObservable.useEffect"], [
        observable
    ]);
    return value;
}
_s3(useObservable, "QNA6AqGJKsyY0NGOv8Nup0fReMk=");
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "ZenGardenV2Page");
__turbopack_context__.k.register(_c1, "PlainSizePanel");
__turbopack_context__.k.register(_c2, "ObjectPanel");
__turbopack_context__.k.register(_c3, "RockPanel");
__turbopack_context__.k.register(_c4, "MossPanel");
__turbopack_context__.k.register(_c5, "RakeStrokePanel");
__turbopack_context__.k.register(_c6, "AddPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/zen-garden-v2/index.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/zen-garden-v2";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/src/pages/zen-garden-v2/index.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/src/pages/zen-garden-v2/index.tsx\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/zen-garden-v2/index.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__4bf990b9._.js.map