"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRuntimeBindings = createRuntimeBindings;
exports.registerValueBinding = registerValueBinding;
exports.registerNodeBinding = registerNodeBinding;
exports.evaluateNodeCapture = evaluateNodeCapture;
exports.evaluateCapturedShape = evaluateCapturedShape;
exports.evaluateValueExpr = evaluateValueExpr;
const actionRegistry_1 = require("./actionRegistry");
function createRuntimeBindings() {
    return {
        values: new Map(),
        nodes: new Map(),
    };
}
function registerValueBinding(bindings, name, value) {
    bindings.values.set(name, deepClone(value));
}
function registerNodeBinding(bindings, name, node) {
    bindings.nodes.set(name, cloneGraphNode(node));
    bindings.values.set(name, deepClone(node.value));
}
function evaluateNodeCapture(name, capture, bindings, actions) {
    const value = evaluateCapturedShape(capture, bindings, actions);
    const id = name;
    const node = {
        id,
        value: deepClone(value),
        state: {},
        meta: {},
    };
    return {
        id,
        value,
        node,
    };
}
function evaluateCapturedShape(capture, bindings, actions) {
    const shape = capture.shape;
    switch (shape.type) {
        case "Identifier":
            return evaluateIdentifier(shape, bindings);
        case "StringLiteral":
            return shape.value;
        case "NumberLiteral":
            return shape.value;
        case "BooleanLiteral":
            return shape.value;
        case "ObjectLiteral":
            return evaluateObjectLiteral(shape, bindings, actions);
        case "TraversalExpr":
            return evaluateTraversalExpr(shape, bindings, actions);
        default:
            return exhaustiveNever(shape);
    }
}
function evaluateValueExpr(expr, bindings, actions) {
    switch (expr.type) {
        case "Identifier":
            return evaluateIdentifier(expr, bindings);
        case "StringLiteral":
            return expr.value;
        case "NumberLiteral":
            return expr.value;
        case "BooleanLiteral":
            return expr.value;
        case "NodeCapture":
            return evaluateCapturedShape(expr, bindings, actions);
        case "WhereExpr":
            throw new Error(`@where cannot be evaluated as a plain value expression; use @bind(...) or a query statement`);
        case "ObjectLiteral":
            return evaluateObjectLiteral(expr, bindings, actions);
        case "ArrayLiteral":
            return expr.elements.map((element) => evaluateValueExpr(element, bindings, actions));
        default:
            return exhaustiveNever(expr);
    }
}
function evaluateIdentifier(node, bindings) {
    if (bindings.values.has(node.name)) {
        return deepClone(bindings.values.get(node.name));
    }
    return node.name;
}
function evaluateObjectLiteral(node, bindings, actions) {
    const out = {};
    for (const prop of node.properties) {
        out[prop.key] = evaluateValueExpr(prop.value, bindings, actions);
    }
    return out;
}
function evaluateTraversalExpr(node, bindings, actions) {
    const steps = [];
    for (const segment of node.segments) {
        if (segment.type === "ActionSegment") {
            const action = (0, actionRegistry_1.getAction)(actions, segment.operator.name);
            const fromRef = getValueRef(segment.from, bindings);
            const toRef = getValueRef(segment.to, bindings);
            steps.push({
                kind: "action",
                binding: segment.operator.name,
                callee: action ? action.bindingName : segment.operator.name,
                fromRef,
                toRef,
                from: evaluateValueExpr(segment.from, bindings, actions),
                to: evaluateValueExpr(segment.to, bindings, actions),
                action: action ? runtimeActionToValue(action) : null,
            });
            continue;
        }
        const action = (0, actionRegistry_1.getAction)(actions, segment.segment.operator.name);
        const fromRef = getValueRef(segment.segment.from, bindings);
        const toRef = getValueRef(segment.segment.to, bindings);
        steps.push({
            kind: "context",
            context: segment.context.name,
            binding: segment.segment.operator.name,
            callee: action ? action.bindingName : segment.segment.operator.name,
            fromRef,
            toRef,
            from: evaluateValueExpr(segment.segment.from, bindings, actions),
            to: evaluateValueExpr(segment.segment.to, bindings, actions),
            action: action ? runtimeActionToValue(action) : null,
        });
    }
    return {
        kind: "traversal",
        source: printTraversalSource(node),
        steps,
    };
}
function getValueRef(expr, bindings) {
    switch (expr.type) {
        case "Identifier":
            if (bindings.nodes.has(expr.name)) {
                return expr.name;
            }
            return null;
        case "NodeCapture":
            return null;
        case "WhereExpr":
            return null;
        case "StringLiteral":
        case "NumberLiteral":
        case "BooleanLiteral":
        case "ObjectLiteral":
        case "ArrayLiteral":
            return null;
        default:
            return exhaustiveNever(expr);
    }
}
function runtimeActionToValue(action) {
    return {
        bindingName: action.bindingName,
        guard: action.guard ? astNodeToValue(action.guard) : null,
        pipeline: action.pipeline.map((step) => astNodeToValue(step)),
        project: action.project ? astProjectToValue(action.project) : null,
    };
}
function astProjectToValue(node) {
    return astNodeToValue(node);
}
function astNodeToValue(node) {
    if (node === null)
        return null;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
        return node;
    }
    if (Array.isArray(node)) {
        return node.map((item) => astNodeToValue(item));
    }
    if (typeof node !== "object") {
        return null;
    }
    const out = {};
    for (const [key, value] of Object.entries(node)) {
        if (key === "span")
            continue;
        out[key] = astNodeToValue(value);
    }
    return out;
}
function printTraversalSource(node) {
    const parts = [];
    for (const segment of node.segments) {
        if (segment.type === "ActionSegment") {
            parts.push(`${printTraversalValue(segment.from)}.${segment.operator.name}.${printTraversalValue(segment.to)}`);
            continue;
        }
        parts.push(`..${segment.context.name}..${printTraversalValue(segment.segment.from)}.${segment.segment.operator.name}.${printTraversalValue(segment.segment.to)}`);
    }
    return parts.join("");
}
function printTraversalValue(expr) {
    switch (expr.type) {
        case "Identifier":
            return expr.name;
        case "StringLiteral":
            return expr.raw;
        case "NumberLiteral":
            return expr.raw;
        case "BooleanLiteral":
            return expr.raw;
        case "NodeCapture":
            return printNodeCapture(expr);
        case "ObjectLiteral":
            return printObjectLiteral(expr);
        case "ArrayLiteral":
            return printArrayLiteral(expr);
        default:
            return "[value]";
    }
}
function printNodeCapture(node) {
    switch (node.shape.type) {
        case "Identifier":
            return `<${node.shape.name}>`;
        case "StringLiteral":
            return `<${node.shape.raw}>`;
        case "NumberLiteral":
            return `<${node.shape.raw}>`;
        case "BooleanLiteral":
            return `<${node.shape.raw}>`;
        case "ObjectLiteral":
            return `<${printObjectLiteral(node.shape)}>`;
        case "TraversalExpr":
            return `<${printTraversalSource(node.shape)}>`;
        default:
            return "<capture>";
    }
}
function printObjectLiteral(node) {
    return `{${node.properties
        .map((prop) => `${prop.key}: ${printTraversalValue(prop.value)}`)
        .join(", ")}}`;
}
function printArrayLiteral(node) {
    return `[${node.elements.map((el) => printTraversalValue(el)).join(", ")}]`;
}
function cloneGraphNode(node) {
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
function exhaustiveNever(value) {
    throw new Error(`Unexpected node: ${JSON.stringify(value)}`);
}
