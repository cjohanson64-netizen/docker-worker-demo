"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeProgram = exports.printAST = exports.parse = exports.tokenize = exports.ParseError = void 0;
exports.tokenizeTat = tokenizeTat;
exports.parseTatToAst = parseTatToAst;
exports.printTatAst = printTatAst;
exports.parseTat = parseTat;
exports.executeTat = executeTat;
exports.executeTatModule = executeTatModule;
const printAST_1 = require("../debug/printAST");
Object.defineProperty(exports, "printAST", { enumerable: true, get: function () { return printAST_1.printAST; } });
const tokenize_1 = require("../lexer/tokenize");
Object.defineProperty(exports, "tokenize", { enumerable: true, get: function () { return tokenize_1.tokenize; } });
const parse_1 = require("../parser/parse");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parse_1.parse; } });
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return parse_1.ParseError; } });
const executeProgram_1 = require("./executeProgram");
Object.defineProperty(exports, "executeProgram", { enumerable: true, get: function () { return executeProgram_1.executeProgram; } });
const graph_1 = require("./graph");
const validateProgram_1 = require("./validateProgram");
const executeModule_1 = require("./executeModule");
function tokenizeTat(source) {
    return (0, tokenize_1.tokenize)(source);
}
function parseTatToAst(source) {
    const tokens = (0, tokenize_1.tokenize)(source);
    return (0, parse_1.parse)(tokens);
}
function printTatAst(source) {
    const tokens = (0, tokenize_1.tokenize)(source);
    const ast = (0, parse_1.parse)(tokens);
    return (0, printAST_1.printAST)(ast);
}
function parseTat(source) {
    const tokens = (0, tokenize_1.tokenize)(source);
    const ast = (0, parse_1.parse)(tokens);
    const printedAst = (0, printAST_1.printAST)(ast);
    return {
        source,
        tokens,
        ast,
        printedAst,
    };
}
function executeTat(source) {
    const parsed = parseTat(source);
    const validation = (0, validateProgram_1.validateProgram)(parsed.ast);
    const errors = validation.filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
        const message = errors
            .map((issue) => issue.span?.line && issue.span?.column
            ? `${issue.message} at ${issue.span.line}:${issue.span.column}`
            : issue.message)
            .join("\n");
        throw new Error(`Validation failed:\n${message}`);
    }
    const execution = (0, executeProgram_1.executeProgram)(parsed.ast);
    const graphs = {};
    for (const [name, graph] of execution.state.graphs.entries()) {
        graphs[name] = (0, graph_1.graphToDebugObject)(graph);
    }
    const projections = {};
    for (const [name, projection] of execution.state.projections.entries()) {
        projections[name] = structuredCloneSafe(projection);
    }
    const values = {};
    for (const [name, value] of execution.state.bindings.values.entries()) {
        values[name] = structuredCloneSafe(value);
    }
    const nodes = {};
    for (const [name, node] of execution.state.bindings.nodes.entries()) {
        nodes[name] = {
            id: node.id,
            value: structuredCloneSafe(node.value),
            state: structuredCloneSafe(node.state),
            meta: structuredCloneSafe(node.meta),
        };
    }
    return {
        ...parsed,
        validation,
        execution,
        debug: {
            graphs,
            projections,
            systemRelations: execution.state.systemRelations,
            queryResults: execution.state.queryResults,
            bindings: {
                values,
                nodes,
            },
        },
    };
}
function executeTatModule(entryPath) {
    return (0, executeModule_1.executeTatModule)(entryPath);
}
function structuredCloneSafe(value) {
    if (typeof globalThis.structuredClone === "function") {
        return globalThis.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
