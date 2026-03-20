"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProgram = validateProgram;
function validateProgram(program) {
    const state = {
        valueBindings: new Set(),
        nodeBindings: new Set(),
        operatorBindings: new Set(),
        actionBindings: new Set(),
        graphBindings: new Set(),
        hasSeed: false,
        terminalProjectReached: false,
        issues: [],
    };
    for (const statement of program.body) {
        validateStatement(statement, state);
    }
    return state.issues;
}
function validateStatement(statement, state) {
    switch (statement.type) {
        case "ImportDeclaration":
        case "ExportDeclaration":
            return;
        case "BindStatement":
            validateStatementAfterTerminalProject(statement.type, state);
            return;
        case "ValueBinding":
            validateValueBinding(statement, state);
            return;
        case "OperatorBinding":
            validateOperatorBinding(statement, state);
            return;
        case "SeedBlock":
            validateSeedBlock(statement, state);
            return;
        case "GraphPipeline":
            validateGraphPipeline(statement, state);
            return;
        case "QueryStatement":
            validateQueryStatement(statement, state);
            return;
        default:
            return;
    }
}
function validateValueBinding(statement, state) {
    const name = statement.name.name;
    if (isTopLevelNameTaken(name, state)) {
        pushIssue(state, "error", statement.name.span, `Duplicate binding "${name}"`);
        return;
    }
    state.valueBindings.add(name);
    if (statement.value.type === "NodeCapture") {
        state.nodeBindings.add(name);
        validateNodeCapture(statement, state);
    }
}
function validateOperatorBinding(statement, state) {
    const name = statement.name.name;
    if (isTopLevelNameTaken(name, state)) {
        pushIssue(state, "error", statement.name.span, `Duplicate binding "${name}"`);
        return;
    }
    state.operatorBindings.add(name);
    if (statement.value.type === "ActionExpr") {
        state.actionBindings.add(name);
        validateAction(statement.value, state);
    }
}
function validateSeedBlock(statement, state) {
    if (state.hasSeed) {
        pushIssue(state, "error", statement.span, "Multiple @seed blocks are not allowed");
    }
    state.hasSeed = true;
}
function validateGraphPipeline(statement, state) {
    const name = statement.name.name;
    if (isTopLevelNameTaken(name, state)) {
        pushIssue(state, "error", statement.name.span, `Duplicate graph name "${name}"`);
        return;
    }
    state.graphBindings.add(name);
    if (statement.projection) {
        state.terminalProjectReached = true;
    }
}
function validateQueryStatement(statement, state) {
    // query validation can be expanded later
    return;
}
function validateAction(action, state) {
    if (!action.pipeline || action.pipeline.length === 0) {
        pushIssue(state, "error", action.span, "@action must define at least one pipeline step");
    }
    if (action.guard) {
        validateActionExpression(action.guard, state);
    }
    if (action.project) {
        validateActionExpression(action.project, state);
    }
    for (const step of action.pipeline) {
        validateMutation(step, state);
    }
}
function validateNodeCapture(statement, state) {
    const value = statement.value;
    if (value.type !== "NodeCapture")
        return;
    const shape = value.shape;
    if (shape.type !== "TraversalExpr")
        return;
    for (const segment of shape.segments) {
        const operator = segment.type === "ActionSegment"
            ? segment.operator
            : segment.segment.operator;
        ensureKnownAction(state, operator.name, operator.span);
    }
}
function validateMutation(mutation, state) {
    switch (mutation.type) {
        case "GraftBranchExpr":
        case "PruneBranchExpr":
            validateIdentifier(mutation.subject.name, mutation.subject.span, state);
            validateIdentifier(mutation.object.name, mutation.object.span, state);
            return;
        case "GraftProgressExpr":
            validateIdentifier(mutation.from.name, mutation.from.span, state);
            validateIdentifier(mutation.to.name, mutation.to.span, state);
            return;
        case "GraftStateExpr":
        case "GraftMetaExpr":
        case "PruneStateExpr":
        case "PruneMetaExpr":
            validateIdentifier(mutation.node.name, mutation.node.span, state);
            return;
        case "PruneNodesExpr":
        case "PruneEdgesExpr":
            return;
        default:
            return;
    }
}
function validateActionExpression(expr, state) {
    if (!expr || typeof expr !== "object")
        return;
    switch (expr.type) {
        case "Identifier":
            validateIdentifier(expr.name, expr.span, state);
            return;
        case "PropertyAccess":
            validateIdentifier(expr.object.name, expr.object.span, state);
            return;
        case "BinaryBooleanExpr":
            validateActionExpression(expr.left, state);
            validateActionExpression(expr.right, state);
            return;
        case "UnaryBooleanExpr":
            validateActionExpression(expr.argument, state);
            return;
        case "ComparisonExpr":
            validateActionExpression(expr.left, state);
            validateActionExpression(expr.right, state);
            return;
        case "ObjectLiteral":
            for (const prop of expr.properties) {
                validateActionExpression(prop.value, state);
            }
            return;
        case "ArrayLiteral":
            for (const el of expr.elements) {
                validateActionExpression(el, state);
            }
            return;
        default:
            return;
    }
}
function validateIdentifier(name, span, state) {
    if (name === "from" || name === "to") {
        return;
    }
    if (state.nodeBindings.has(name) ||
        state.valueBindings.has(name) ||
        state.actionBindings.has(name)) {
        return;
    }
    pushIssue(state, "warning", span, `Unknown identifier "${name}" inside @action`);
}
function ensureKnownAction(state, name, span) {
    if (!state.actionBindings.has(name)) {
        pushIssue(state, "error", span, `Traversal operator "${name}" is not a declared action`);
    }
}
function isTopLevelNameTaken(name, state) {
    return (state.valueBindings.has(name) ||
        state.operatorBindings.has(name) ||
        state.graphBindings.has(name));
}
function pushIssue(state, severity, span, message) {
    state.issues.push({
        severity,
        message,
        span,
    });
}
function validateStatementAfterTerminalProject(statementType, state) {
    if (!state.terminalProjectReached) {
        return;
    }
    pushIssue(state, "error", undefined, `${statementType} cannot appear after terminal @project(...)`);
}
