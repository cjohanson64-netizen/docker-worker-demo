"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraph = createGraph;
exports.cloneGraph = cloneGraph;
exports.hasNode = hasNode;
exports.getNode = getNode;
exports.addNode = addNode;
exports.upsertNode = upsertNode;
exports.removeNode = removeNode;
exports.addBranch = addBranch;
exports.removeBranch = removeBranch;
exports.addProgress = addProgress;
exports.setNodeState = setNodeState;
exports.removeNodeState = removeNodeState;
exports.setNodeMeta = setNodeMeta;
exports.removeNodeMeta = removeNodeMeta;
exports.setEdgeContext = setEdgeContext;
exports.clearEdgeContext = clearEdgeContext;
exports.getOutgoingEdges = getOutgoingEdges;
exports.getIncomingEdges = getIncomingEdges;
exports.getEdgesByRelation = getEdgesByRelation;
exports.hasEdge = hasEdge;
exports.graphToDebugObject = graphToDebugObject;
function createGraph(root = null, state = {}, meta = {}) {
    return {
        nodes: new Map(),
        edges: [],
        root,
        state: deepCloneRecord(state),
        meta: deepCloneRecord(meta),
        history: [],
    };
}
function cloneGraph(graph) {
    return {
        nodes: new Map(Array.from(graph.nodes.entries()).map(([id, node]) => [
            id,
            {
                id: node.id,
                value: deepClone(node.value),
                state: deepCloneRecord(node.state),
                meta: deepCloneRecord(node.meta),
            },
        ])),
        edges: graph.edges.map((edge) => ({ ...edge })),
        root: graph.root,
        state: deepCloneRecord(graph.state),
        meta: deepCloneRecord(graph.meta),
        history: graph.history.map((entry) => ({
            id: entry.id,
            op: entry.op,
            payload: deepCloneRecord(entry.payload),
        })),
    };
}
function hasNode(graph, id) {
    return graph.nodes.has(id);
}
function getNode(graph, id) {
    const node = graph.nodes.get(id);
    if (!node) {
        throw new Error(`Graph node "${id}" does not exist`);
    }
    return node;
}
function addNode(graph, node) {
    if (graph.nodes.has(node.id)) {
        throw new Error(`Graph node "${node.id}" already exists`);
    }
    graph.nodes.set(node.id, {
        id: node.id,
        value: deepClone(node.value),
        state: deepCloneRecord(node.state),
        meta: deepCloneRecord(node.meta),
    });
    return graph;
}
function upsertNode(graph, node) {
    graph.nodes.set(node.id, {
        id: node.id,
        value: deepClone(node.value),
        state: deepCloneRecord(node.state),
        meta: deepCloneRecord(node.meta),
    });
    return graph;
}
function removeNode(graph, id) {
    if (!graph.nodes.has(id)) {
        return graph;
    }
    graph.nodes.delete(id);
    graph.edges = graph.edges.filter((edge) => edge.subject !== id && edge.object !== id);
    if (graph.root === id) {
        graph.root = null;
    }
    return graph;
}
function addBranch(graph, subject, relation, object) {
    assertNodeExists(graph, subject);
    assertNodeExists(graph, object);
    if (hasEdge(graph, subject, relation, object, "branch")) {
        return graph;
    }
    graph.edges.push({
        id: makeEdgeId(subject, relation, object, "branch"),
        subject,
        relation,
        object,
        kind: "branch",
        context: null,
    });
    graph.history.push({
        id: makeHistoryId(),
        op: "@graft.branch",
        payload: {
            subject,
            relation,
            object,
            kind: "branch",
        },
    });
    return graph;
}
function removeBranch(graph, subject, relation, object) {
    const before = graph.edges.length;
    graph.edges = graph.edges.filter((edge) => !(edge.subject === subject &&
        edge.relation === relation &&
        edge.object === object &&
        edge.kind === "branch"));
    if (graph.edges.length !== before) {
        graph.history.push({
            id: makeHistoryId(),
            op: "@prune.branch",
            payload: {
                subject,
                relation,
                object,
                kind: "branch",
            },
        });
    }
    return graph;
}
function addProgress(graph, subject, relation, object) {
    assertNodeExists(graph, subject);
    assertNodeExists(graph, object);
    if (hasEdge(graph, subject, relation, object, "progress")) {
        return graph;
    }
    graph.edges.push({
        id: makeEdgeId(subject, relation, object, "progress"),
        subject,
        relation,
        object,
        kind: "progress",
        context: null,
    });
    graph.history.push({
        id: makeHistoryId(),
        op: "@graft.progress",
        payload: {
            subject,
            relation,
            object,
            kind: "progress",
        },
    });
    return graph;
}
function setNodeState(graph, nodeId, key, value) {
    const node = getNode(graph, nodeId);
    node.state[key] = deepClone(value);
    graph.history.push({
        id: makeHistoryId(),
        op: "@graft.state",
        payload: {
            nodeId,
            key,
            value: deepClone(value),
        },
    });
    return graph;
}
function removeNodeState(graph, nodeId, key) {
    const node = getNode(graph, nodeId);
    if (key in node.state) {
        delete node.state[key];
        graph.history.push({
            id: makeHistoryId(),
            op: "@prune.state",
            payload: {
                nodeId,
                key,
            },
        });
    }
    return graph;
}
function setNodeMeta(graph, nodeId, key, value) {
    const node = getNode(graph, nodeId);
    node.meta[key] = deepClone(value);
    graph.history.push({
        id: makeHistoryId(),
        op: "@graft.meta",
        payload: {
            nodeId,
            key,
            value: deepClone(value),
        },
    });
    return graph;
}
function removeNodeMeta(graph, nodeId, key) {
    const node = getNode(graph, nodeId);
    if (key in node.meta) {
        delete node.meta[key];
        graph.history.push({
            id: makeHistoryId(),
            op: "@prune.meta",
            payload: {
                nodeId,
                key,
            },
        });
    }
    return graph;
}
function setEdgeContext(graph, edgeId, context) {
    const edge = getEdgeById(graph, edgeId);
    edge.context = deepClone(context);
    graph.history.push({
        id: makeHistoryId(),
        op: "@ctx.set",
        payload: {
            edgeId,
            context: deepClone(context),
        },
    });
    return graph;
}
function clearEdgeContext(graph, edgeId) {
    const edge = getEdgeById(graph, edgeId);
    edge.context = null;
    graph.history.push({
        id: makeHistoryId(),
        op: "@ctx.clear",
        payload: {
            edgeId,
        },
    });
    return graph;
}
function getOutgoingEdges(graph, nodeId, kind) {
    return graph.edges.filter((edge) => edge.subject === nodeId && (!kind || edge.kind === kind));
}
function getIncomingEdges(graph, nodeId, kind) {
    return graph.edges.filter((edge) => edge.object === nodeId && (!kind || edge.kind === kind));
}
function getEdgesByRelation(graph, relation, kind) {
    return graph.edges.filter((edge) => edge.relation === relation && (!kind || edge.kind === kind));
}
function hasEdge(graph, subject, relation, object, kind) {
    return graph.edges.some((edge) => edge.subject === subject &&
        edge.relation === relation &&
        edge.object === object &&
        (!kind || edge.kind === kind));
}
function graphToDebugObject(graph) {
    return {
        root: graph.root,
        state: deepCloneRecord(graph.state),
        meta: deepCloneRecord(graph.meta),
        nodes: Array.from(graph.nodes.values()).map((node) => ({
            id: node.id,
            value: deepClone(node.value),
            state: deepCloneRecord(node.state),
            meta: deepCloneRecord(node.meta),
        })),
        edges: graph.edges.map((edge) => ({ ...edge })),
        history: graph.history.map((entry) => ({
            id: entry.id,
            op: entry.op,
            payload: deepCloneRecord(entry.payload),
        })),
    };
}
/* =========================
   Internal helpers
   ========================= */
function assertNodeExists(graph, id) {
    if (!graph.nodes.has(id)) {
        throw new Error(`Graph node "${id}" does not exist`);
    }
}
function getEdgeById(graph, edgeId) {
    const edge = graph.edges.find((item) => item.id === edgeId);
    if (!edge) {
        throw new Error(`Graph edge "${edgeId}" does not exist`);
    }
    return edge;
}
function makeEdgeId(subject, relation, object, kind) {
    return `${kind}:${subject}:${relation}:${object}`;
}
function makeHistoryId() {
    return `h_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
