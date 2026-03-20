"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printAST = exports.parse = exports.tokenize = exports.ParseError = void 0;
exports.parseTat = parseTat;
exports.tokenizeTat = tokenizeTat;
exports.parseTatToAst = parseTatToAst;
exports.printTatAst = printTatAst;
const printAST_1 = require("./debug/printAST");
Object.defineProperty(exports, "printAST", { enumerable: true, get: function () { return printAST_1.printAST; } });
const tokenize_1 = require("./lexer/tokenize");
Object.defineProperty(exports, "tokenize", { enumerable: true, get: function () { return tokenize_1.tokenize; } });
const parse_1 = require("./parser/parse");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parse_1.parse; } });
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return parse_1.ParseError; } });
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
