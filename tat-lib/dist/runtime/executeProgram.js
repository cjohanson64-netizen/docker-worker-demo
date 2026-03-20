"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeProgram = executeProgram;
const graph_1 = require("./graph");
const bindUtils_1 = require("./bindUtils");
const evaluateNodeCapture_1 = require("./evaluateNodeCapture");
const executeQuery_1 = require("./executeQuery");
const executeAction_1 = require("./executeAction");
const actionRegistry_1 = require("./actionRegistry");
function executeProgram(program, options) {
    const initialState = options?.initialState;
    const state = {
        bindings: initialState?.bindings ?? (0, evaluateNodeCapture_1.createRuntimeBindings)(),
        actions: initialState?.actions ?? (0, actionRegistry_1.createActionRegistry)(),
        assetKinds: initialState?.assetKinds ?? new Map(),
        seed: initialState?.seed ?? null,
        seedGraph: initialState?.seedGraph ?? null,
        graphs: initialState?.graphs ?? new Map(),
        projections: initialState?.projections ?? new Map(),
        systemRelations: initialState?.systemRelations ?? [],
        queries: initialState?.queries ?? [],
        queryResults: initialState?.queryResults ?? [],
        lastGraphName: initialState?.lastGraphName ?? null,
        terminalProjectReached: initialState?.terminalProjectReached ?? false,
    };
    for (const statement of program.body) {
        executeStatement(statement, state);
    }
    return { state };
}
function executeStatement(statement, state) {
    switch (statement.type) {
        case "ImportDeclaration":
        case "ExportDeclaration":
            return;
        case "ValueBinding":
            executeValueBinding(statement, state);
            return;
        case "BindStatement":
            ensureProjectNotTerminal(state, "@bind");
            executeBindStatement(statement, state);
            return;
        case "OperatorBinding":
            executeOperatorBinding(statement, state);
            return;
        case "SeedBlock":
            state.seed = statement;
            state.seedGraph = buildSeedGraph(statement, state.bindings);
            return;
        case "GraphPipeline":
            executeGraphPipeline(statement, state);
            return;
        case "SystemRelation":
            executeSystemRelation(statement, state);
            return;
        case "QueryStatement":
            executeQueryStatement(statement, state);
            return;
        default: {
            const _exhaustive = statement;
            throw new Error(`Unsupported statement type: ${JSON.stringify(_exhaustive)}`);
        }
    }
}
function executeValueBinding(statement, state) {
    const name = statement.name.name;
    if (statement.value.type === "NodeCapture") {
        const evaluated = (0, evaluateNodeCapture_1.evaluateNodeCapture)(name, statement.value, state.bindings, state.actions);
        (0, evaluateNodeCapture_1.registerNodeBinding)(state.bindings, name, evaluated.node);
        state.assetKinds.set(name, "node");
        return;
    }
    const value = (0, evaluateNodeCapture_1.evaluateValueExpr)(statement.value, state.bindings, state.actions);
    (0, evaluateNodeCapture_1.registerValueBinding)(state.bindings, name, value);
}
function executeBindStatement(statement, state) {
    const graph = getCurrentGraph(state);
    const value = (0, bindUtils_1.evaluateBindExpr)(statement.expression, state.bindings, state.actions, graph);
    if (statement.entity) {
        const kind = (0, bindUtils_1.classifyBindValue)(value);
        if (kind !== "empty" && kind !== statement.entity) {
            throw new Error(`@bind.${statement.layer ?? "ctx"}.${statement.entity} expected ${statement.entity} result, got ${kind}`);
        }
    }
    const layer = statement.layer ?? "ctx";
    switch (layer) {
        case "ctx":
            writeBindToContext(state, statement.name.name, value);
            return;
        case "state": {
            const target = requireCurrentGraph(state, "@bind.state");
            target.state[statement.name.name] = deepCloneBindValue(value);
            return;
        }
        case "meta": {
            const target = requireCurrentGraph(state, "@bind.meta");
            target.meta[statement.name.name] = deepCloneBindValue(value);
            return;
        }
        default: {
            const _exhaustive = layer;
            throw new Error(`Unsupported @bind layer: ${JSON.stringify(_exhaustive)}`);
        }
    }
}
function executeOperatorBinding(statement, state) {
    const name = statement.name.name;
    switch (statement.value.type) {
        case "ActionExpr":
            (0, actionRegistry_1.registerAction)(state.actions, {
                bindingName: name,
                guard: statement.value.guard,
                pipeline: statement.value.pipeline,
                project: statement.value.project,
            });
            state.assetKinds.set(name, "program");
            return;
        case "CtxExpr":
            return;
        case "ProjectExpr":
            return;
        default: {
            const _exhaustive = statement.value;
            throw new Error(`Unsupported operator binding type: ${JSON.stringify(_exhaustive)}`);
        }
    }
}
function buildSeedGraph(seed, bindings) {
    const stateValue = (0, evaluateNodeCapture_1.evaluateValueExpr)(seed.state, bindings, (0, actionRegistry_1.createActionRegistry)());
    const metaValue = (0, evaluateNodeCapture_1.evaluateValueExpr)(seed.meta, bindings, (0, actionRegistry_1.createActionRegistry)());
    if (!isRecordValue(stateValue)) {
        throw new Error(`@seed state must resolve to an object`);
    }
    if (!isRecordValue(metaValue)) {
        throw new Error(`@seed meta must resolve to an object`);
    }
    const graph = (0, graph_1.createGraph)(seed.root.name, stateValue, metaValue);
    for (const nodeRef of seed.nodes) {
        const node = bindings.nodes.get(nodeRef.ref.name);
        if (!node) {
            throw new Error(`Seed references unknown node binding "${nodeRef.ref.name}"`);
        }
        (0, graph_1.addNode)(graph, cloneRuntimeNode(node));
    }
    for (const edge of seed.edges) {
        const entry = materializeSeedEdgeEntry(edge);
        const before = graph.edges.length;
        (0, graph_1.addBranch)(graph, entry.subject, entry.relation, entry.object);
        if (entry.id && graph.edges.length > before) {
            graph.edges[graph.edges.length - 1].id = entry.id;
        }
    }
    return graph;
}
function materializeSeedEdgeEntry(entry) {
    if (entry.type === "SeedEdgeBinding") {
        return {
            id: entry.name.name,
            subject: entry.edge.left.name,
            relation: entry.edge.relation.value,
            object: entry.edge.right.name,
        };
    }
    return {
        id: null,
        subject: entry.left.name,
        relation: entry.relation.value,
        object: entry.right.name,
    };
}
function executeGraphPipeline(pipeline, state) {
    const graph = materializeGraphSource(pipeline.source, state);
    for (const mutation of pipeline.mutations) {
        switch (mutation.type) {
            case "GraftBranchExpr":
                (0, graph_1.addBranch)(graph, mutation.subject.name, mutation.relation.value, mutation.object.name);
                break;
            case "GraftStateExpr": {
                const value = (0, evaluateNodeCapture_1.evaluateValueExpr)(mutation.value, state.bindings, state.actions);
                (0, graph_1.setNodeState)(graph, mutation.node.name, mutation.key.value, value);
                break;
            }
            case "GraftMetaExpr": {
                const value = (0, evaluateNodeCapture_1.evaluateValueExpr)(mutation.value, state.bindings, state.actions);
                (0, graph_1.setNodeMeta)(graph, mutation.node.name, mutation.key.value, value);
                break;
            }
            case "GraftProgressExpr":
                (0, graph_1.addProgress)(graph, mutation.from.name, mutation.relation.value, mutation.to.name);
                break;
            case "PruneBranchExpr":
                (0, graph_1.removeBranch)(graph, mutation.subject.name, mutation.relation.value, mutation.object.name);
                break;
            case "PruneStateExpr":
                (0, graph_1.removeNodeState)(graph, mutation.node.name, mutation.key.value);
                break;
            case "PruneMetaExpr":
                (0, graph_1.removeNodeMeta)(graph, mutation.node.name, mutation.key.value);
                break;
            case "PruneNodesExpr":
                executePruneNodesExpr(graph, mutation, state);
                break;
            case "PruneEdgesExpr":
                executePruneEdgesExpr(graph, mutation, state);
                break;
            case "CtxSetExpr": {
                const context = (0, evaluateNodeCapture_1.evaluateValueExpr)(mutation.context, state.bindings, state.actions);
                (0, graph_1.setEdgeContext)(graph, mutation.edge.name, context);
                break;
            }
            case "CtxClearExpr":
                (0, graph_1.clearEdgeContext)(graph, mutation.edge.name);
                break;
            case "ApplyExpr":
                executeApplyExpr(graph, mutation, state);
                break;
            default: {
                const _exhaustive = mutation;
                throw new Error(`Unsupported mutation type: ${JSON.stringify(_exhaustive)}`);
            }
        }
    }
    state.graphs.set(pipeline.name.name, graph);
    state.assetKinds.set(pipeline.name.name, "graph");
    state.projections.set(pipeline.name.name, projectGraphResult(graph, pipeline.projection, state));
    state.lastGraphName = pipeline.name.name;
    if (pipeline.projection) {
        state.terminalProjectReached = true;
    }
}
function materializeGraphSource(source, state) {
    if (source.type === "SeedSource") {
        if (!state.seedGraph) {
            throw new Error(`Cannot execute graph pipeline from @seed before @seed is defined`);
        }
        return (0, graph_1.cloneGraph)(state.seedGraph);
    }
    return executeComposeSource(source, state);
}
function executeComposeSource(compose, state) {
    const mergeSymbol = compose.merge.name;
    const mergeNodeId = resolveMergeNodeId(mergeSymbol, state);
    const out = (0, graph_1.createGraph)(mergeNodeId);
    for (const asset of compose.assets) {
        const assetName = asset.name;
        const kind = state.assetKinds.get(assetName);
        if (!kind) {
            throw new Error(`@compose input "${assetName}" is unresolved`);
        }
        if (kind !== "graph" && kind !== "fragment") {
            throw new Error(`Invalid @compose input kind for "${assetName}": expected graph or fragment, got ${kind}`);
        }
        const sourceGraph = state.graphs.get(assetName);
        if (!sourceGraph) {
            throw new Error(`@compose input "${assetName}" is not a graph value`);
        }
        const sourceMergeNode = sourceGraph.nodes.get(mergeNodeId);
        if (!sourceMergeNode) {
            throw new Error(`Missing merge anchor "${mergeNodeId}" in composed asset "${assetName}"`);
        }
        if (!out.nodes.has(mergeNodeId)) {
            (0, graph_1.addNode)(out, cloneRuntimeNode(sourceMergeNode));
        }
        for (const [nodeId, node] of sourceGraph.nodes.entries()) {
            if (nodeId === mergeNodeId) {
                continue;
            }
            if (out.nodes.has(nodeId)) {
                throw new Error(`Duplicate non-merge node id "${nodeId}" during @compose`);
            }
            (0, graph_1.addNode)(out, cloneRuntimeNode(node));
        }
        for (const edge of sourceGraph.edges) {
            out.edges.push({ ...edge });
        }
        for (const entry of sourceGraph.history) {
            out.history.push({
                id: entry.id,
                op: entry.op,
                payload: deepCloneRecord(entry.payload),
            });
        }
    }
    out.root = mergeNodeId;
    return out;
}
function resolveMergeNodeId(mergeSymbol, state) {
    if (state.bindings.nodes.has(mergeSymbol)) {
        return state.bindings.nodes.get(mergeSymbol).id;
    }
    if (state.bindings.values.has(mergeSymbol)) {
        const resolved = state.bindings.values.get(mergeSymbol);
        if (typeof resolved === "string") {
            return resolved;
        }
    }
    throw new Error(`Invalid merge symbol "${mergeSymbol}": expected an in-scope node symbol`);
}
function executePruneNodesExpr(graph, mutation, state) {
    const targets = Array.from(graph.nodes.values())
        .filter((node) => evaluatePruneWhereNode(mutation.where.expression, node, state.bindings))
        .map((node) => node.id);
    for (const nodeId of targets) {
        (0, graph_1.removeNode)(graph, nodeId);
    }
}
function executePruneEdgesExpr(graph, mutation, state) {
    const removeIds = new Set(graph.edges
        .filter((edge) => evaluatePruneWhereEdge(mutation.where.expression, edge, state.bindings))
        .map((edge) => edge.id));
    graph.edges = graph.edges.filter((edge) => !removeIds.has(edge.id));
}
function executeApplyExpr(graph, mutation, state) {
    const targetValue = (0, evaluateNodeCapture_1.evaluateValueExpr)(mutation.target, state.bindings, state.actions);
    if (!isRecordValue(targetValue) || targetValue.kind !== "traversal") {
        throw new Error(`@apply target must resolve to a traversal value`);
    }
    const steps = targetValue.steps;
    if (!Array.isArray(steps)) {
        throw new Error(`@apply target must resolve to a traversal value`);
    }
    if (steps.length === 0) {
        throw new Error(`@apply traversal must contain at least one step`);
    }
    const firstStep = steps[0];
    if (!isRecordValue(firstStep) || typeof firstStep.binding !== "string") {
        throw new Error(`@apply traversal step is missing an action binding`);
    }
    if (typeof firstStep.fromRef !== "string") {
        throw new Error(`@apply traversal step is missing fromRef`);
    }
    if (typeof firstStep.toRef !== "string") {
        throw new Error(`@apply traversal step is missing toRef`);
    }
    const action = state.actions.get(firstStep.binding);
    if (!action) {
        throw new Error(`@apply could not find action "${firstStep.binding}"`);
    }
    (0, executeAction_1.executeAction)(graph, action, {
        from: firstStep.fromRef,
        to: firstStep.toRef,
    });
}
function executeSystemRelation(statement, state) {
    const left = statement.left.name;
    const right = statement.right.name;
    if (!state.graphs.has(left)) {
        throw new Error(`System relation references unknown graph "${left}"`);
    }
    if (!state.graphs.has(right)) {
        throw new Error(`System relation references unknown graph "${right}"`);
    }
    state.systemRelations.push({
        left,
        relation: statement.relation ? statement.relation.value : null,
        right,
    });
}
function executeQueryStatement(statement, state) {
    let graph = getCurrentGraph(state);
    let graphName = state.lastGraphName ?? "seed";
    if (!graph) {
        throw new Error(`Cannot execute query before @seed or any graph pipeline has run`);
    }
    const result = (0, executeQuery_1.executeQuery)(graph, statement.expr, state.bindings, state.actions);
    state.queries.push(statement);
    state.queryResults.push({
        query: statement,
        graphName,
        result,
    });
}
function getCurrentGraph(state) {
    if (state.lastGraphName) {
        return state.graphs.get(state.lastGraphName) ?? null;
    }
    return state.seedGraph;
}
function ensureProjectNotTerminal(state, opName) {
    if (state.terminalProjectReached) {
        throw new Error(`${opName} cannot execute after terminal @project(...)`);
    }
}
function requireCurrentGraph(state, opName) {
    const graph = getCurrentGraph(state);
    if (!graph) {
        throw new Error(`${opName} requires an active graph from @seed or a graph pipeline`);
    }
    return graph;
}
function writeBindToContext(state, name, value) {
    if (isGraphNodeLike(value)) {
        (0, evaluateNodeCapture_1.registerNodeBinding)(state.bindings, name, value);
        return;
    }
    (0, evaluateNodeCapture_1.registerValueBinding)(state.bindings, name, deepCloneBindValue(value));
}
function isGraphNodeLike(value) {
    return (!!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.id === "string" &&
        "value" in value &&
        "state" in value &&
        "meta" in value);
}
function deepCloneBindValue(value) {
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => deepCloneBindValue(item));
    }
    const out = {};
    for (const [key, item] of Object.entries(value)) {
        out[key] = deepCloneBindValue(item);
    }
    return out;
}
function evaluatePruneWhereNode(expr, node, bindings) {
    return evaluatePruneExpr(expr, "node", node, bindings);
}
function evaluatePruneWhereEdge(expr, edge, bindings) {
    return evaluatePruneExpr(expr, "edge", edge, bindings);
}
function evaluatePruneExpr(expr, context, item, bindings) {
    switch (expr.type) {
        case "GroupedBooleanExpr":
            return evaluatePruneExpr(expr.expression, context, item, bindings);
        case "BinaryBooleanExpr":
            if (expr.operator === "&&") {
                return (evaluatePruneExpr(expr.left, context, item, bindings) &&
                    evaluatePruneExpr(expr.right, context, item, bindings));
            }
            if (expr.operator === "||") {
                return (evaluatePruneExpr(expr.left, context, item, bindings) ||
                    evaluatePruneExpr(expr.right, context, item, bindings));
            }
            throw new Error(`Malformed @where predicate syntax: unsupported boolean operator "${expr.operator}"`);
        case "ComparisonExpr": {
            if (expr.operator !== "==" && expr.operator !== "!=") {
                throw new Error(`Malformed @where predicate syntax: unsupported comparison operator "${expr.operator}"`);
            }
            const left = resolvePruneValue(expr.left, context, item, bindings);
            const right = resolvePruneValue(expr.right, context, item, bindings);
            const equal = comparePruneValue(left, right);
            return expr.operator === "==" ? equal : !equal;
        }
        default:
            throw new Error(`Malformed @where predicate syntax: expected comparisons grouped with && / ||`);
    }
}
function resolvePruneValue(value, context, item, bindings) {
    switch (value.type) {
        case "StringLiteral":
            return value.value;
        case "NumberLiteral":
            return value.value;
        case "BooleanLiteral":
            return value.value;
        case "RegexLiteral":
            throw new Error(`Malformed @where predicate syntax: regex is not supported in prune predicates`);
        case "Identifier":
            return resolveIdentifierOperand(value.name, context, item, bindings);
        case "PropertyAccess":
            return resolvePropertyOperand(value, context, item);
        default: {
            const _exhaustive = value;
            throw new Error(`Malformed @where predicate syntax: unsupported value ${JSON.stringify(_exhaustive)}`);
        }
    }
}
function resolveIdentifierOperand(name, context, item, bindings) {
    if (context === "node") {
        const node = item;
        if (name === "id")
            return node.id;
        if (name === "type")
            return readObjectField(node.value, "type");
        if (name === "key")
            return readObjectField(node.value, "key");
        if (name === "value")
            return node.value;
    }
    if (context === "edge") {
        const edge = item;
        if (name === "source")
            return edge.subject;
        if (name === "target")
            return edge.object;
        if (name === "rel")
            return edge.relation;
    }
    if (bindings.nodes.has(name)) {
        return bindings.nodes.get(name).id;
    }
    if (bindings.values.has(name)) {
        return deepClone(bindings.values.get(name));
    }
    if (context === "node") {
        if (name === "source" || name === "target" || name === "rel") {
            throw new Error(`Invalid @where field for node prune: "${name}"`);
        }
    }
    if (context === "edge") {
        if (name === "id" ||
            name === "type" ||
            name === "key" ||
            name === "value" ||
            name === "state" ||
            name === "meta") {
            throw new Error(`Invalid @where field for edge prune: "${name}"`);
        }
    }
    throw new Error(`Unresolved symbol "${name}" in @where predicate`);
}
function resolvePropertyOperand(value, context, item) {
    if (context === "edge") {
        throw new Error(`Invalid @where field for edge prune: "${value.object.name}"`);
    }
    const node = item;
    if (value.object.name === "state") {
        return digPruneValue(node.state, value.chain.map((part) => part.name));
    }
    if (value.object.name === "meta") {
        return digPruneValue(node.meta, value.chain.map((part) => part.name));
    }
    throw new Error(`Invalid @where field for node prune: "${value.object.name}"`);
}
function readObjectField(value, field) {
    if (!isRecordValue(value))
        return undefined;
    if (!(field in value))
        return undefined;
    return value[field];
}
function digPruneValue(value, path) {
    let current = value;
    for (const part of path) {
        if (!isRecordValue(current)) {
            return undefined;
        }
        if (!(part in current)) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
function comparePruneValue(a, b) {
    if (a === undefined || b === undefined) {
        return false;
    }
    return JSON.stringify(a) === JSON.stringify(b);
}
function cloneRuntimeNode(node) {
    return {
        id: node.id,
        value: deepClone(node.value),
        state: deepCloneRecord(node.state),
        meta: deepCloneRecord(node.meta),
    };
}
function deepClone(value) {
    if (value === null)
        return value;
    if (Array.isArray(value)) {
        return value.map((item) => deepClone(item));
    }
    if (typeof value === "object") {
        const out = {};
        for (const [key, v] of Object.entries(value)) {
            out[key] = deepClone(v);
        }
        return out;
    }
    return value;
}
function deepCloneRecord(record) {
    const out = {};
    for (const [key, value] of Object.entries(record)) {
        out[key] = deepClone(value);
    }
    return out;
}
function isRecordValue(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function projectGraphResult(graph, projection, state) {
    const debugGraph = (0, graph_1.graphToDebugObject)(graph);
    if (!projection) {
        return debugGraph;
    }
    const formatArg = projection.args.find((arg) => arg.key && arg.key.name === "format");
    if (!formatArg) {
        throw new Error(`@project requires a format argument`);
    }
    const formatValue = (0, evaluateNodeCapture_1.evaluateValueExpr)(formatArg.value, state.bindings, state.actions);
    if (typeof formatValue !== "string") {
        throw new Error(`@project format must be a string`);
    }
    switch (formatValue) {
        case "graph":
            return debugGraph;
        case "nodes":
            return debugGraph.nodes;
        case "edges":
            return debugGraph.edges;
        case "history":
            return debugGraph.history;
        case "debug":
            return debugGraph;
        default:
            throw new Error(`Unsupported project format "${formatValue}"`);
    }
}
