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
"[project]/src/components/zen-garden/nodes/node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ReactiveNode",
    ()=>ReactiveNode
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
    debugLogInputChanges = true;
    prevValues = null;
    // Debug: store inputs for graph traversal
    debugInputs;
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
    }
    [Symbol.dispose]() {
        this.dispose();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/nodes/value-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ValueNode",
    ()=>ValueNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js [client] (ecmascript)");
;
class ValueNode extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$esm5$2f$internal$2f$BehaviorSubject$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BehaviorSubject"] {
    name;
    schema;
    constructor(name, schema, initial){
        super(initial), this.name = name, this.schema = schema;
    }
    get value() {
        return this.getValue();
    }
    set value(v) {
        this.next(this.schema.parse(v));
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/graph.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildGraph",
    ()=>buildGraph
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$value$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/value-node.ts [client] (ecmascript)");
;
;
function buildGraph(sinkNodes) {
    const visited = new Map();
    let idCounter = 0;
    function traverseValueNode(node) {
        if (visited.has(node)) return visited.get(node);
        const info = {
            id: `node-${idCounter++}`,
            output: node,
            inputs: new Map(),
            depth: 0
        };
        visited.set(node, info);
        return info;
    }
    function traverse(node) {
        if (visited.has(node)) return visited.get(node);
        const info = {
            id: `node-${idCounter++}`,
            output: node,
            inputs: new Map(),
            depth: 0
        };
        visited.set(node, info);
        Array.from(node.debugInputs.entries()).forEach(([inputName, inputObs])=>{
            if (inputObs instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ReactiveNode"]) {
                info.inputs.set(inputName, traverse(inputObs));
            } else if (inputObs instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$value$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ValueNode"]) {
                info.inputs.set(inputName, traverseValueNode(inputObs));
            } else {
                info.inputs.set(inputName, null);
            }
        });
        return info;
    }
    for (const sink of sinkNodes){
        traverse(sink);
    }
    // Second pass: compute depths (max distance to any sink)
    function computeDepth(info, depth) {
        if (depth > info.depth) {
            info.depth = depth;
        }
        info.inputs.forEach((inputInfo)=>{
            if (inputInfo) computeDepth(inputInfo, info.depth + 1);
        });
    }
    for (const sink of sinkNodes){
        const info = visited.get(sink);
        if (info) computeDepth(info, 0);
    }
    return new Map(Array.from(visited.values()).map((n)=>[
            n.id,
            n
        ]));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/layout.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "computeLayout",
    ()=>computeLayout,
    "computeLines",
    ()=>computeLines
]);
const NODE_SPACING_X = 400;
const NODE_SPACING_Y = 500;
const PADDING = 50;
function computeLayout(graph) {
    const outputs = buildOutputMap(graph);
    const nodesByDepth = groupByDepth(graph);
    const maxDepth = Math.max(0, ...Array.from(nodesByDepth.keys()));
    const positions = new Map();
    for(let depth = 0; depth <= maxDepth; depth++){
        const nodes = nodesByDepth.get(depth) ?? [];
        const withIdealY = nodes.map((node, i)=>({
                node,
                y: computeIdealY(node.id, i, outputs, positions)
            }));
        withIdealY.sort((a, b)=>a.y - b.y);
        withIdealY.forEach((item, i)=>{
            const prevY = i === 0 ? PADDING : positions.get(withIdealY[i - 1].node.id).y + NODE_SPACING_Y;
            positions.set(item.node.id, {
                x: (maxDepth - depth) * NODE_SPACING_X + PADDING,
                y: Math.max(item.y, prevY)
            });
        });
    }
    return positions;
}
function buildOutputMap(graph) {
    const outputs = new Map();
    graph.forEach((info)=>{
        info.inputs.forEach((inputInfo)=>{
            if (!inputInfo) return;
            const list = outputs.get(inputInfo.id) ?? [];
            list.push(info.id);
            outputs.set(inputInfo.id, list);
        });
    });
    return outputs;
}
function groupByDepth(graph) {
    const byDepth = new Map();
    graph.forEach((node)=>{
        const list = byDepth.get(node.depth) ?? [];
        list.push(node);
        byDepth.set(node.depth, list);
    });
    return byDepth;
}
function computeIdealY(nodeId, index, outputs, positions) {
    const outputIds = outputs.get(nodeId) ?? [];
    if (outputIds.length === 0) {
        return index * NODE_SPACING_Y + PADDING;
    }
    return outputIds.reduce((sum, id)=>sum + (positions.get(id)?.y ?? 0), 0) / outputIds.length;
}
function computeLines(graph, positions, nodeRefs) {
    const lines = [];
    graph.forEach((info)=>{
        const toPos = positions.get(info.id);
        const toEl = nodeRefs.get(info.id);
        if (!toPos || !toEl) return;
        info.inputs.forEach((inputInfo)=>{
            if (!inputInfo) return;
            const fromPos = positions.get(inputInfo.id);
            const fromEl = nodeRefs.get(inputInfo.id);
            if (!fromPos || !fromEl) return;
            lines.push({
                from: {
                    x: fromPos.x + fromEl.offsetWidth,
                    y: fromPos.y + 25
                },
                to: {
                    x: toPos.x,
                    y: toPos.y + 38
                }
            });
        });
    });
    return lines;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/nodes/pipe-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MapNode",
    ()=>MapNode,
    "PipeNode",
    ()=>PipeNode,
    "RxNode",
    ()=>RxNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/node.ts [client] (ecmascript)");
;
class MapNode extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ReactiveNode"] {
    name;
    map;
    constructor(context, inputs, name, map){
        super(context, inputs), this.name = name, this.map = map;
    }
    process(context, inputs) {
        return this.map(inputs);
    }
    dispose() {}
}
class PipeNode extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ReactiveNode"] {
    transform;
    constructor(context, source, transform){
        super(context, {
            source
        }), this.transform = transform;
    }
    process(_context, inputs) {
        return this.transform(inputs.source);
    }
    dispose() {}
}
class RxNode extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ReactiveNode"] {
    constructor(context, source){
        super(context, {
            source
        });
    }
    process(_context, inputs) {
        return inputs.source;
    }
    dispose() {}
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/nodes/texture-set-node.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TextureSetData",
    ()=>TextureSetData,
    "TextureSetNode",
    ()=>TextureSetNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/node.ts [client] (ecmascript)");
;
;
class TextureSetData {
    ao;
    color;
    displacement;
    normal;
    roughness;
    constructor(ao, color, displacement, normal, roughness){
        this.ao = ao;
        this.color = color;
        this.displacement = displacement;
        this.normal = normal;
        this.roughness = roughness;
    }
    [Symbol.iterator]() {
        return [
            this.ao,
            this.color,
            this.displacement,
            this.normal,
            this.roughness
        ][Symbol.iterator]();
    }
}
class TextureSetNode extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ReactiveNode"] {
    async process(_context, { name }) {
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
        return new TextureSetData(ao, color, displacement, normal, roughness);
    }
    dispose() {}
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/output-preview/default-preview.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DefaultPreview",
    ()=>DefaultPreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function DefaultPreview({ value }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "text-xs bg-gray-700 p-1 rounded",
        children: JSON.stringify(value, null, 2)
    }, void 0, false, {
        fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/default-preview.tsx",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = DefaultPreview;
var _c;
__turbopack_context__.k.register(_c, "DefaultPreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/output-preview/geometry-preview.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GeometryPreview",
    ()=>GeometryPreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function GeometryPreview({ value }) {
    const posAttr = value.getAttribute("position");
    const vertCount = posAttr ? posAttr.count : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "text-xs bg-gray-700 p-1 rounded",
        children: [
            vertCount,
            " vertices"
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/geometry-preview.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
_c = GeometryPreview;
var _c;
__turbopack_context__.k.register(_c, "GeometryPreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/output-preview/material-preview.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MaterialPreview",
    ()=>MaterialPreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function MaterialPreview({ value }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "text-xs bg-gray-700 p-1 rounded",
        children: value.type
    }, void 0, false, {
        fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/material-preview.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
_c = MaterialPreview;
var _c;
__turbopack_context__.k.register(_c, "MaterialPreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-preview.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TexturePreview",
    ()=>TexturePreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dom$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-dom/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
function TexturePreview({ value, renderer }) {
    _s();
    const [div, setDiv] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showFull, setShowFull] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const imageSrc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "TexturePreview.useMemo[imageSrc]": ()=>{
            const img = value.image;
            if (img instanceof HTMLImageElement) {
                return img.src;
            }
            if (img instanceof HTMLCanvasElement || img instanceof ImageBitmap) {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext("2d").drawImage(img, 0, 0);
                return canvas.toDataURL();
            }
            const rt = value.renderTarget;
            if (rt) {
                const { width, height } = rt;
                const pixels = new Uint8Array(width * height * 4);
                renderer.readRenderTargetPixels(rt, 0, 0, width, height, pixels);
                // Flip Y in-place
                const rowSize = width * 4;
                const temp = new Uint8Array(rowSize);
                for(let y = 0; y < height / 2; y++){
                    const topOffset = y * rowSize;
                    const bottomOffset = (height - 1 - y) * rowSize;
                    temp.set(pixels.subarray(topOffset, topOffset + rowSize));
                    pixels.copyWithin(topOffset, bottomOffset, bottomOffset + rowSize);
                    pixels.set(temp, bottomOffset);
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
                return canvas.toDataURL();
            }
            return null;
        }
    }["TexturePreview.useMemo[imageSrc]"], [
        value,
        renderer
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TexturePreview.useEffect": ()=>{
            if (!div || !imageSrc) return;
            div.innerHTML = "";
            const img = document.createElement("img");
            img.src = imageSrc;
            img.style.width = "w-full";
            img.style.height = "auto";
            div.appendChild(img);
        }
    }["TexturePreview.useEffect"], [
        div,
        imageSrc
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: setDiv,
                className: "border border-gray-600 bg-gray-800 cursor-pointer",
                onClick: ()=>setShowFull(true)
            }, void 0, false, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-preview.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this),
            showFull && imageSrc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dom$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/50",
                onClick: ()=>setShowFull(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: imageSrc,
                    className: "max-w-[90vw] max-h-[90vh] object-contain"
                }, void 0, false, {
                    fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-preview.tsx",
                    lineNumber: 74,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-preview.tsx",
                lineNumber: 73,
                columnNumber: 9
            }, this), document.body)
        ]
    }, void 0, true);
}
_s(TexturePreview, "6HBDHLZjiqjmBA7waZKpS7GDQIA=");
_c = TexturePreview;
var _c;
__turbopack_context__.k.register(_c, "TexturePreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-set-preview.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TextureSetPreview",
    ()=>TextureSetPreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$texture$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-preview.tsx [client] (ecmascript)");
;
;
const KEYS = [
    "ao",
    "color",
    "displacement",
    "normal",
    "roughness"
];
function TextureSetPreview({ value, renderer }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid",
        style: {
            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(KEYS.length))}, minmax(0, 1fr))`
        },
        children: KEYS.map((key)=>// <div key={key} className="flex flex-col gap-2">
            //   <span className="text-xs text-gray-400">{key}</span>
            // </div>
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$texture$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TexturePreview"], {
                value: value[key],
                renderer: renderer
            }, void 0, false, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-set-preview.tsx",
                lineNumber: 22,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-set-preview.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = TextureSetPreview;
var _c;
__turbopack_context__.k.register(_c, "TextureSetPreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/output-preview/value-node-preview.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ValueNodePreview",
    ()=>ValueNodePreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$rjsf$2f$core$2f$lib$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@rjsf/core/lib/index.js [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$rjsf$2f$validator$2d$ajv8$2f$lib$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@rjsf/validator-ajv8/lib/index.js [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
function ValueNodePreview({ node }) {
    _s();
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(node.value);
    const jsonSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ValueNodePreview.useMemo[jsonSchema]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__["toJSONSchema"])(node.schema)
    }["ValueNodePreview.useMemo[jsonSchema]"], [
        node.schema
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ValueNodePreview.useEffect": ()=>{
            const sub = node.subscribe(setValue);
            return ({
                "ValueNodePreview.useEffect": ()=>sub.unsubscribe()
            })["ValueNodePreview.useEffect"];
        }
    }["ValueNodePreview.useEffect"], [
        node
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$rjsf$2f$core$2f$lib$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"], {
        schema: jsonSchema,
        formData: value,
        validator: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$rjsf$2f$validator$2d$ajv8$2f$lib$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"],
        onChange: (e)=>{
            try {
                node.value = e.formData;
            } catch  {
            // validation failed, ignore
            }
        },
        uiSchema: {
            "ui:submitButtonOptions": {
                norender: true
            }
        },
        className: "text-black"
    }, void 0, false, {
        fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/value-node-preview.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_s(ValueNodePreview, "dePqgQRNrGsEQiDJRMZhxUPkGoA=");
_c = ValueNodePreview;
var _c;
__turbopack_context__.k.register(_c, "ValueNodePreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OutputPreview",
    ()=>OutputPreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$texture$2d$set$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/texture-set-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$value$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/value-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$default$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/default-preview.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$geometry$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/geometry-preview.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$material$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/material-preview.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$texture$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-preview.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$texture$2d$set$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/texture-set-preview.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$value$2d$node$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/value-node-preview.tsx [client] (ecmascript)");
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
function OutputPreview({ value, node, renderer }) {
    if (node instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$value$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ValueNode"]) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$value$2d$node$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ValueNodePreview"], {
            node: node
        }, void 0, false, {
            fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx",
            lineNumber: 21,
            columnNumber: 12
        }, this);
    } else if (value instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$texture$2d$set$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["TextureSetData"]) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$texture$2d$set$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TextureSetPreview"], {
            value: value,
            renderer: renderer
        }, void 0, false, {
            fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx",
            lineNumber: 23,
            columnNumber: 12
        }, this);
    } else if (value instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Texture"]) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$texture$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TexturePreview"], {
            value: value,
            renderer: renderer
        }, void 0, false, {
            fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx",
            lineNumber: 25,
            columnNumber: 12
        }, this);
    } else if (value instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Material"]) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$material$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["MaterialPreview"], {
            value: value
        }, void 0, false, {
            fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx",
            lineNumber: 27,
            columnNumber: 12
        }, this);
    } else if (value instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BufferGeometry"]) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$geometry$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["GeometryPreview"], {
            value: value
        }, void 0, false, {
            fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx",
            lineNumber: 29,
            columnNumber: 12
        }, this);
    } else {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$default$2d$preview$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["DefaultPreview"], {
            value: value
        }, void 0, false, {
            fileName: "[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx",
            lineNumber: 31,
            columnNumber: 12
        }, this);
    }
}
_c = OutputPreview;
var _c;
__turbopack_context__.k.register(_c, "OutputPreview");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NodeCard",
    ()=>NodeCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$pipe$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/pipe-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$value$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/nodes/value-node.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$index$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/output-preview/index.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
function NodeCard({ info, renderer }) {
    _s();
    const [output, setOutput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NodeCard.useEffect": ()=>{
            const sub = info.output.subscribe(setOutput);
            return ({
                "NodeCard.useEffect": ()=>sub.unsubscribe()
            })["NodeCard.useEffect"];
        }
    }["NodeCard.useEffect"], [
        info.output
    ]);
    const inputNodes = Array.from(info.inputs.entries()).filter(([, v])=>v !== null);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-gray-800 border border-gray-600 rounded-lg p-2 w-44",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "font-bold text-sm text-blue-300",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NodeName, {
                    node: info.output
                }, void 0, false, {
                    fileName: "[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx",
                    lineNumber: 27,
                    columnNumber: 56
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, this),
            inputNodes.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-xs text-gray-400",
                children: inputNodes.map(([name])=>name).join(", ")
            }, void 0, false, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx",
                lineNumber: 29,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pt-1",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$output$2d$preview$2f$index$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["OutputPreview"], {
                    value: output,
                    node: info.output,
                    renderer: renderer
                }, void 0, false, {
                    fileName: "[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
_s(NodeCard, "Dy9F/UZmKEOsf538zsUjQxtQfco=");
_c = NodeCard;
function NodeName({ node }) {
    if (node instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$value$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ValueNode"]) {
        return node.name;
    } else if (node instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$nodes$2f$pipe$2d$node$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["MapNode"]) {
        return node.name;
    } else {
        return node.constructor.name;
    }
}
_c1 = NodeName;
var _c, _c1;
__turbopack_context__.k.register(_c, "NodeCard");
__turbopack_context__.k.register(_c1, "NodeName");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/zen-garden/node-graph-viewer/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NodeGraphViewer",
    ()=>NodeGraphViewer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$graph$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/graph.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$layout$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/layout.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$node$2d$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/node-card.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
function loadCachedPositions() {
    try {
        const json = localStorage.getItem("node-graph-positions");
        if (!json) return new Map();
        const obj = JSON.parse(json);
        return new Map(Object.entries(obj));
    } catch  {
        return new Map();
    }
}
function savePositions(positions) {
    const obj = {};
    positions.forEach((pos, id)=>{
        obj[id] = pos;
    });
    localStorage.setItem("node-graph-positions", JSON.stringify(obj));
}
function NodeGraphViewer({ sinkNodes, renderer, onClose }) {
    _s();
    const [graph, setGraph] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Map());
    const [positions, setPositions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Map());
    const [dragging, setDragging] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [lines, setLines] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const nodeRefs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NodeGraphViewer.useEffect": ()=>{
            const g = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$graph$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["buildGraph"])(sinkNodes);
            setGraph(g);
            const generated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$layout$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["computeLayout"])(g);
            const cached = loadCachedPositions();
            // Use cached positions, fall back to generated for new nodes
            const merged = new Map();
            g.forEach({
                "NodeGraphViewer.useEffect": (_, id)=>{
                    merged.set(id, cached.get(id) ?? generated.get(id));
                }
            }["NodeGraphViewer.useEffect"]);
            setPositions(merged);
        }
    }["NodeGraphViewer.useEffect"], [
        sinkNodes
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useLayoutEffect"])({
        "NodeGraphViewer.useLayoutEffect": ()=>{
            setLines((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$layout$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["computeLines"])(graph, positions, nodeRefs.current));
        }
    }["NodeGraphViewer.useLayoutEffect"], [
        graph,
        positions
    ]);
    const contentSize = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "NodeGraphViewer.useMemo[contentSize]": ()=>{
            let maxX = 0, maxY = 0;
            positions.forEach({
                "NodeGraphViewer.useMemo[contentSize]": (pos)=>{
                    maxX = Math.max(maxX, pos.x + 200);
                    maxY = Math.max(maxY, pos.y + 300);
                }
            }["NodeGraphViewer.useMemo[contentSize]"]);
            return {
                width: maxX + 50,
                height: maxY + 50
            };
        }
    }["NodeGraphViewer.useMemo[contentSize]"], [
        positions
    ]);
    const handleMouseDown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "NodeGraphViewer.useCallback[handleMouseDown]": (e, id)=>{
            const pos = positions.get(id);
            if (!pos) return;
            setDragging({
                id,
                offset: {
                    x: e.clientX - pos.x,
                    y: e.clientY - pos.y
                }
            });
        }
    }["NodeGraphViewer.useCallback[handleMouseDown]"], [
        positions
    ]);
    const handleMouseMove = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "NodeGraphViewer.useCallback[handleMouseMove]": (e)=>{
            if (!dragging) return;
            setPositions({
                "NodeGraphViewer.useCallback[handleMouseMove]": (prev)=>{
                    const next = new Map(prev);
                    next.set(dragging.id, {
                        x: e.clientX - dragging.offset.x,
                        y: e.clientY - dragging.offset.y
                    });
                    return next;
                }
            }["NodeGraphViewer.useCallback[handleMouseMove]"]);
        }
    }["NodeGraphViewer.useCallback[handleMouseMove]"], [
        dragging
    ]);
    const handleMouseUp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "NodeGraphViewer.useCallback[handleMouseUp]": ()=>{
            if (dragging) {
                setPositions({
                    "NodeGraphViewer.useCallback[handleMouseUp]": (current)=>{
                        savePositions(current);
                        return current;
                    }
                }["NodeGraphViewer.useCallback[handleMouseUp]"]);
            }
            setDragging(null);
        }
    }["NodeGraphViewer.useCallback[handleMouseUp]"], [
        dragging
    ]);
    const setNodeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "NodeGraphViewer.useCallback[setNodeRef]": (id, el)=>{
            if (el) {
                nodeRefs.current.set(id, el);
            } else {
                nodeRefs.current.delete(id);
            }
        }
    }["NodeGraphViewer.useCallback[setNodeRef]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/80 z-50 flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between items-center p-4 bg-gray-900",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xl font-bold text-white",
                        children: "Node Graph"
                    }, void 0, false, {
                        fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        className: "px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white",
                        children: "Close"
                    }, void 0, false, {
                        fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                        lineNumber: 111,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                lineNumber: 109,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-auto bg-gray-950",
                onMouseMove: handleMouseMove,
                onMouseUp: handleMouseUp,
                onMouseLeave: handleMouseUp,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative",
                    style: {
                        width: contentSize.width,
                        height: contentSize.height
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            className: "absolute inset-0 pointer-events-none",
                            width: contentSize.width,
                            height: contentSize.height,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                                    children: `
              @keyframes dash-flow {
                to { stroke-dashoffset: -20; }
              }
              .flow-line {
                animation: dash-flow 0.5s linear infinite;
              }
            `
                                }, void 0, false, {
                                    fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                                    lineNumber: 127,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("marker", {
                                        id: "arrowhead",
                                        markerWidth: "10",
                                        markerHeight: "7",
                                        refX: "9",
                                        refY: "3.5",
                                        orient: "auto",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                            points: "0 0, 10 3.5, 0 7",
                                            fill: "#4B5563"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                                            lineNumber: 137,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                                        lineNumber: 136,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                                    lineNumber: 135,
                                    columnNumber: 13
                                }, this),
                                lines.map((line, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        className: "flow-line",
                                        d: `M ${line.from.x} ${line.from.y} C ${line.from.x + 60} ${line.from.y}, ${line.to.x - 60} ${line.to.y}, ${line.to.x} ${line.to.y}`,
                                        stroke: "#4B5563",
                                        strokeWidth: 2,
                                        strokeDasharray: "10 10",
                                        fill: "none",
                                        markerEnd: "url(#arrowhead)"
                                    }, i, false, {
                                        fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                                        lineNumber: 141,
                                        columnNumber: 15
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                            lineNumber: 122,
                            columnNumber: 11
                        }, this),
                        Array.from(graph.values()).map((info)=>{
                            const pos = positions.get(info.id);
                            if (!pos) return null;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                ref: (el)=>setNodeRef(info.id, el),
                                className: "absolute cursor-move",
                                style: {
                                    left: pos.x,
                                    top: pos.y
                                },
                                onMouseDown: (e)=>{
                                    e.preventDefault();
                                    handleMouseDown(e, info.id);
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$node$2d$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["NodeCard"], {
                                    info: info,
                                    renderer: renderer
                                }, void 0, false, {
                                    fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                                    lineNumber: 164,
                                    columnNumber: 17
                                }, this)
                            }, info.id, false, {
                                fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                                lineNumber: 157,
                                columnNumber: 15
                            }, this);
                        })
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                    lineNumber: 121,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
                lineNumber: 115,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/zen-garden/node-graph-viewer/index.tsx",
        lineNumber: 108,
        columnNumber: 5
    }, this);
}
_s(NodeGraphViewer, "fw8EJrAi2q4zR4uCFbljPbukmzM=");
_c = NodeGraphViewer;
var _c;
__turbopack_context__.k.register(_c, "NodeGraphViewer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/zen-garden.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module '@/components/zen-garden/editor'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/zen-garden/moss'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$index$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/zen-garden/node-graph-viewer/index.tsx [client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module '@/components/zen-garden/rake-stroke'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/zen-garden/rock'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
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
            const ed = new ZenGardenEditor(canvas, {
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
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            editor && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ObjectPanel, {
                        editor: editor
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 48,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AddPanel, {
                        editor: editor
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 49,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setShowNodeGraph(true),
                        className: "fixed left-4 bottom-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700",
                        children: "Node Graph"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 50,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    showNodeGraph && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$zen$2d$garden$2f$node$2d$graph$2d$viewer$2f$index$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["NodeGraphViewer"], {
                        sinkNodes: [
                            editor.scene.plain.materialNode,
                            editor.scene.plain.geometryNode
                        ],
                        renderer: editor.threeRenderer,
                        onClose: ()=>setShowNodeGraph(false)
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 57,
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
function ObjectPanel({ editor }) {
    _s1();
    const selected = useObservable(editor.$selectedObject);
    if (!selected) return null;
    const onDelete = ()=>editor.deleteObject(selected.id);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed right-4 top-4 bg-white text-black p-4 rounded-lg space-y-2",
        children: [
            (()=>{
                if (selected instanceof ZenGardenRock) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RockPanel, {
                        rock: selected
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 85,
                        columnNumber: 18
                    }, this);
                } else if (selected instanceof ZenGardenMoss) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MossPanel, {
                        moss: selected
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 87,
                        columnNumber: 18
                    }, this);
                } else if (selected instanceof ZenGardenRakeStroke) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RakeStrokePanel, {
                        rakeStroke: selected
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 89,
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
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden.tsx",
        lineNumber: 82,
        columnNumber: 5
    }, this);
}
_s1(ObjectPanel, "pwiKKmm2zaOYoaURQGc8UmjoH6w=", false, function() {
    return [
        useObservable
    ];
});
_c1 = ObjectPanel;
function RockPanel({ rock }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold",
                children: "Rock"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "ID: ",
                    rock.id
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 108,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c2 = RockPanel;
function MossPanel({ moss }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold",
                children: "Moss"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "ID: ",
                    moss.id
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c3 = MossPanel;
function RakeStrokePanel({ rakeStroke }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold",
                children: "Rake Stroke"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 125,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "ID: ",
                    rakeStroke.id
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 126,
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
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 127,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_c4 = RakeStrokePanel;
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
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 147,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/pages/zen-garden.tsx",
            lineNumber: 146,
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
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 159,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>editor.setMode("addMoss"),
                className: "px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600",
                children: "Add Moss"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 165,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden.tsx",
        lineNumber: 158,
        columnNumber: 5
    }, this);
}
_s2(AddPanel, "UjhJ1p6cP8g5vRvRuw3xLn/tOCQ=", false, function() {
    return [
        useObservable
    ];
});
_c5 = AddPanel;
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
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "ZenGardenV2Page");
__turbopack_context__.k.register(_c1, "ObjectPanel");
__turbopack_context__.k.register(_c2, "RockPanel");
__turbopack_context__.k.register(_c3, "MossPanel");
__turbopack_context__.k.register(_c4, "RakeStrokePanel");
__turbopack_context__.k.register(_c5, "AddPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/zen-garden.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/zen-garden";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/src/pages/zen-garden.tsx [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/src/pages/zen-garden\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/zen-garden.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__1808cbc2._.js.map