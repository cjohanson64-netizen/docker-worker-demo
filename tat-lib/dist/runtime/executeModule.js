"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTatModule = executeTatModule;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const parse_1 = require("../parser/parse");
const tokenize_1 = require("../lexer/tokenize");
const executeProgram_1 = require("./executeProgram");
const actionRegistry_1 = require("./actionRegistry");
const graph_1 = require("./graph");
const evaluateNodeCapture_1 = require("./evaluateNodeCapture");
function executeTatModule(entryPath) {
    const cache = new Map();
    const loading = new Set();
    const normalizedEntry = normalizePath(entryPath);
    return loadModule(normalizedEntry, cache, loading);
}
function loadModule(filePath, cache, loading) {
    const normalizedPath = normalizePath(filePath);
    const cached = cache.get(normalizedPath);
    if (cached) {
        return cached;
    }
    if (loading.has(normalizedPath)) {
        throw new Error(`Circular module import detected: ${normalizedPath}`);
    }
    if (!(0, node_fs_1.existsSync)(normalizedPath)) {
        throw new Error(`Unresolved import path: ${normalizedPath}`);
    }
    loading.add(normalizedPath);
    try {
        const source = (0, node_fs_1.readFileSync)(normalizedPath, "utf8");
        const ast = (0, parse_1.parse)((0, tokenize_1.tokenize)(source));
        const initialState = createImportedInitialState(ast, normalizedPath, cache, loading);
        const execution = (0, executeProgram_1.executeProgram)(ast, { initialState });
        const exportedNames = collectExportNames(ast);
        const exports = new Map();
        for (const exportName of exportedNames) {
            const asset = resolveExportAsset(exportName, execution.state);
            if (!asset) {
                throw new Error(`Invalid export reference "${exportName}" in module ${normalizedPath}`);
            }
            exports.set(exportName, asset);
        }
        const loaded = {
            path: normalizedPath,
            source,
            ast,
            state: execution.state,
            exports,
        };
        cache.set(normalizedPath, loaded);
        return loaded;
    }
    finally {
        loading.delete(normalizedPath);
    }
}
function createImportedInitialState(ast, containingFile, cache, loading) {
    const bindings = (0, evaluateNodeCapture_1.createRuntimeBindings)();
    const actions = (0, actionRegistry_1.createActionRegistry)();
    const assetKinds = new Map();
    const graphs = new Map();
    const projections = new Map();
    for (const statement of ast.body) {
        if (statement.type !== "ImportDeclaration") {
            continue;
        }
        const modulePath = resolveImportPath(statement.source.value, containingFile);
        const importedModule = loadModule(modulePath, cache, loading);
        for (const specifier of statement.specifiers) {
            const importedName = specifier.imported.name;
            const localName = specifier.local.name;
            const asset = importedModule.exports.get(importedName);
            if (!asset) {
                throw new Error(`Unresolved imported symbol "${importedName}" from ${modulePath}`);
            }
            assetKinds.set(localName, asset.kind);
            switch (asset.kind) {
                case "node":
                    (0, evaluateNodeCapture_1.registerNodeBinding)(bindings, localName, cloneGraphNode(asset.value));
                    break;
                case "graph":
                case "fragment":
                    graphs.set(localName, (0, graph_1.cloneGraph)(asset.value));
                    break;
                case "projection":
                    projections.set(localName, structuredCloneSafe(asset.value));
                    break;
                case "program":
                    (0, actionRegistry_1.registerAction)(actions, {
                        ...asset.value,
                        bindingName: localName,
                    });
                    break;
                default: {
                    const _exhaustive = asset.kind;
                    throw new Error(`Unsupported imported asset kind: ${_exhaustive}`);
                }
            }
        }
    }
    return {
        bindings,
        actions,
        assetKinds,
        graphs,
        projections,
    };
}
function collectExportNames(ast) {
    const names = [];
    for (const statement of ast.body) {
        if (statement.type !== "ExportDeclaration") {
            continue;
        }
        for (const specifier of statement.specifiers) {
            names.push(specifier.local.name);
        }
    }
    return names;
}
function resolveExportAsset(name, state) {
    const kind = state.assetKinds.get(name);
    if (!kind) {
        return null;
    }
    switch (kind) {
        case "node": {
            const node = state.bindings.nodes.get(name);
            if (!node)
                return null;
            return { kind, value: cloneGraphNode(node) };
        }
        case "graph":
        case "fragment": {
            const graph = state.graphs.get(name);
            if (!graph)
                return null;
            return { kind, value: (0, graph_1.cloneGraph)(graph) };
        }
        case "projection": {
            const projection = state.projections.get(name);
            if (projection === undefined)
                return null;
            return { kind, value: structuredCloneSafe(projection) };
        }
        case "program": {
            const action = state.actions.get(name);
            if (!action)
                return null;
            return { kind, value: structuredCloneSafe(action) };
        }
        default: {
            const _exhaustive = kind;
            throw new Error(`Unsupported export kind: ${_exhaustive}`);
        }
    }
}
function resolveImportPath(specifier, containingFile) {
    const fromDir = node_path_1.default.dirname(containingFile);
    const rawPath = node_path_1.default.resolve(fromDir, specifier);
    if ((0, node_fs_1.existsSync)(rawPath)) {
        return normalizePath(rawPath);
    }
    const withTat = `${rawPath}.tat`;
    if ((0, node_fs_1.existsSync)(withTat)) {
        return normalizePath(withTat);
    }
    throw new Error(`Unresolved import path: ${specifier}`);
}
function normalizePath(value) {
    return node_path_1.default.resolve(value);
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
function structuredCloneSafe(value) {
    if (typeof globalThis.structuredClone === "function") {
        return globalThis.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
