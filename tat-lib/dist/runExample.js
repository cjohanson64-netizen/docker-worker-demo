"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_1 = require("./runtime/index");
const printGraphs_1 = require("./runtime/printGraphs");
function main() {
    try {
        const fileArg = process.argv[2] ?? "examples/basic.tat";
        const filePath = path.isAbsolute(fileArg)
            ? fileArg
            : path.resolve(process.cwd(), fileArg);
        const source = fs.readFileSync(filePath, "utf8");
        console.log("========== FILE ==========");
        console.log(filePath);
        console.log("\n========== SOURCE ==========");
        console.log(source);
        const result = (0, index_1.executeTat)(source);
        console.log("\n========== TOKENS ==========");
        for (const token of result.tokens) {
            console.log(`${token.type.padEnd(14)} ${JSON.stringify(token.value).padEnd(20)} (${token.line}:${token.column})`);
        }
        console.log("\n========== AST ==========");
        console.log(result.printedAst);
        console.log("\n========== BINDINGS: VALUES ==========");
        console.log(JSON.stringify(result.debug.bindings.values, null, 2));
        console.log("\n========== BINDINGS: NODES ==========");
        console.log(JSON.stringify(result.debug.bindings.nodes, null, 2));
        console.log("\n========== REALIZED GRAPHS ==========");
        console.log(JSON.stringify(result.debug.graphs, null, 2));
        console.log("\n========== SYSTEM RELATIONS ==========");
        console.log(JSON.stringify(result.debug.systemRelations, null, 2));
        console.log("\n========== PRETTY GRAPHS ==========");
        console.log((0, printGraphs_1.printGraphs)(result.execution.state.graphs));
        console.log("\n========== QUERY RESULTS ==========");
        console.log(JSON.stringify(result.debug.queryResults, null, 2));
    }
    catch (err) {
        console.error("\n❌ ERROR\n");
        if (err instanceof Error) {
            console.error(err.message);
            console.error(err.stack);
        }
        else {
            console.error(err);
        }
        process.exit(1);
    }
}
main();
