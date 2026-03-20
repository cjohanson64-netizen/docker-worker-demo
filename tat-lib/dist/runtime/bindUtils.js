"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateBindExpr = evaluateBindExpr;
exports.classifyBindValue = classifyBindValue;
const evaluateNodeCapture_1 = require("./evaluateNodeCapture");
const executeWhere_1 = require("./executeWhere");
function evaluateBindExpr(expr, bindings, actions, graph) {
    switch (expr.type) {
        case "Identifier":
            return evaluateBindIdentifier(expr, bindings, graph);
        case "StringLiteral":
            return expr.value;
        case "NumberLiteral":
            return expr.value;
        case "BooleanLiteral":
            return expr.value;
        case "NodeCapture":
            return (0, evaluateNodeCapture_1.evaluateCapturedShape)(expr, bindings, actions);
        case "WhereExpr":
            return evaluateBindWhereExpr(expr, bindings, graph);
        case "ObjectLiteral":
            return evaluateBindObject(expr, bindings, actions, graph);
        case "ArrayLiteral":
            return evaluateBindArray(expr, bindings, actions, graph);
        default:
            return exhaustiveNever(expr);
    }
}
function evaluateBindWhereExpr(expr, bindings, graph) {
    if (!graph) {
        throw new Error(`@where requires an active graph from @seed or a graph pipeline`);
    }
    return (0, executeWhere_1.executeWhereQuery)(graph, expr.expression, bindings).items;
}
function classifyBindValue(value) {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return "empty";
        }
        let found = null;
        for (const item of value) {
            const kind = classifyBindValue(item);
            if (kind === "empty") {
                continue;
            }
            if (kind !== "node" && kind !== "edge") {
                return "value";
            }
            if (found && found !== kind) {
                return "mixed";
            }
            found = kind;
        }
        return found ?? "empty";
    }
    if (isGraphNode(value)) {
        return "node";
    }
    if (isGraphEdge(value)) {
        return "edge";
    }
    return "value";
}
function evaluateBindIdentifier(node, bindings, graph) {
    if (bindings.nodes.has(node.name)) {
        return cloneGraphNode(bindings.nodes.get(node.name));
    }
    if (graph) {
        const edge = graph.edges.find((item) => item.id === node.name);
        if (edge) {
            return cloneGraphEdge(edge);
        }
    }
    if (bindings.values.has(node.name)) {
        return deepClone(bindings.values.get(node.name));
    }
    return node.name;
}
function evaluateBindObject(node, bindings, actions, graph) {
    const out = {};
    for (const prop of node.properties) {
        out[prop.key] = evaluateBindExpr(prop.value, bindings, actions, graph);
    }
    return out;
}
function evaluateBindArray(node, bindings, actions, graph) {
    return node.elements.map((element) => evaluateBindExpr(element, bindings, actions, graph));
}
function isGraphNode(value) {
    return (!!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.id === "string" &&
        "value" in value &&
        isRecord(value.state) &&
        isRecord(value.meta));
}
function isGraphEdge(value) {
    return (!!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.id === "string" &&
        typeof value.subject === "string" &&
        typeof value.relation === "string" &&
        typeof value.object === "string" &&
        (value.kind === "branch" || value.kind === "progress"));
}
function cloneGraphNode(node) {
    return {
        id: node.id,
        value: deepClone(node.value),
        state: deepCloneRecord(node.state),
        meta: deepCloneRecord(node.meta),
    };
}
function cloneGraphEdge(edge) {
    return {
        ...edge,
        context: deepClone(edge.context),
    };
}
function deepClone(value) {
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => deepClone(item));
    }
    const out = {};
    for (const [key, item] of Object.entries(value)) {
        out[key] = deepClone(item);
    }
    return out;
}
function deepCloneRecord(record) {
    const out = {};
    for (const [key, value] of Object.entries(record)) {
        out[key] = deepClone(value);
    }
    return out;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exhaustiveNever(value) {
    throw new Error(`Unexpected bind expression: ${JSON.stringify(value)}`);
}
