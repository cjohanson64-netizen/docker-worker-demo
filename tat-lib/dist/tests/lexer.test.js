"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const tokenize_1 = require("../lexer/tokenize");
function types(source) {
    return (0, tokenize_1.tokenize)(source).map((token) => token.type);
}
function values(source) {
    return (0, tokenize_1.tokenize)(source).map((token) => token.value);
}
(0, node_test_1.default)("tokenizes simple node binding", () => {
    const source = `A = <Ti>`;
    strict_1.default.deepEqual(types(source), [
        "IDENT",
        "EQUALS",
        "LANGLE",
        "IDENT",
        "RANGLE",
        "EOF",
    ]);
    strict_1.default.deepEqual(values(source), [
        "A",
        "=",
        "<",
        "Ti",
        ">",
        "",
    ]);
});
(0, node_test_1.default)("tokenizes traversal node capture", () => {
    const source = `node1 = <A.x.B..y..C.z.D>`;
    strict_1.default.deepEqual(types(source), [
        "IDENT",
        "EQUALS",
        "LANGLE",
        "IDENT",
        "DOT",
        "IDENT",
        "DOT",
        "IDENT",
        "DDOT",
        "IDENT",
        "DDOT",
        "IDENT",
        "DOT",
        "IDENT",
        "DOT",
        "IDENT",
        "RANGLE",
        "EOF",
    ]);
});
(0, node_test_1.default)("tokenizes @seed block fields", () => {
    const source = `@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1`;
    strict_1.default.deepEqual(types(source), [
        "KEYWORD",
        "COLON",
        "NEWLINE",
        "IDENT",
        "COLON",
        "LBRACKET",
        "IDENT",
        "COMMA",
        "IDENT",
        "RBRACKET",
        "NEWLINE",
        "IDENT",
        "COLON",
        "LBRACKET",
        "RBRACKET",
        "NEWLINE",
        "IDENT",
        "COLON",
        "LBRACE",
        "RBRACE",
        "NEWLINE",
        "IDENT",
        "COLON",
        "LBRACE",
        "RBRACE",
        "NEWLINE",
        "IDENT",
        "COLON",
        "IDENT",
        "EOF",
    ]);
});
(0, node_test_1.default)("tokenizes graph pipeline operators", () => {
    const source = `graph1 := @seed
  -> @graft.branch(node1, "supports", node2)
  <> @project(format: "graph")`;
    strict_1.default.deepEqual(types(source), [
        "IDENT",
        "COLON_EQUALS",
        "KEYWORD",
        "NEWLINE",
        "ARROW",
        "KEYWORD",
        "LPAREN",
        "IDENT",
        "COMMA",
        "STRING",
        "COMMA",
        "IDENT",
        "RPAREN",
        "NEWLINE",
        "PROJECT",
        "KEYWORD",
        "LPAREN",
        "IDENT",
        "COLON",
        "STRING",
        "RPAREN",
        "EOF",
    ]);
});
(0, node_test_1.default)("tokenizes system relation :::", () => {
    const source = `graph1 ::: graph2`;
    strict_1.default.deepEqual(types(source), [
        "IDENT",
        "TCOLON",
        "IDENT",
        "EOF",
    ]);
    strict_1.default.deepEqual(values(source), [
        "graph1",
        ":::",
        "graph2",
        "",
    ]);
});
(0, node_test_1.default)("tokenizes boolean and comparison operators in @where", () => {
    const source = `@where(Y.priority == "high" && Y.active === true || !Y.blocked)`;
    strict_1.default.deepEqual(types(source), [
        "KEYWORD",
        "LPAREN",
        "IDENT",
        "DOT",
        "IDENT",
        "EQ2",
        "STRING",
        "AND",
        "IDENT",
        "DOT",
        "IDENT",
        "EQ3",
        "BOOLEAN",
        "OR",
        "BANG",
        "IDENT",
        "DOT",
        "IDENT",
        "RPAREN",
        "EOF",
    ]);
});
(0, node_test_1.default)("tokenizes regex in @match", () => {
    const source = `@match(X : /support.*/ : Y)`;
    strict_1.default.deepEqual(types(source), [
        "KEYWORD",
        "LPAREN",
        "IDENT",
        "COLON",
        "REGEX",
        "COLON",
        "IDENT",
        "RPAREN",
        "EOF",
    ]);
    strict_1.default.deepEqual(values(source), [
        "@match",
        "(",
        "X",
        ":",
        "/support.*/",
        ":",
        "Y",
        ")",
        "",
    ]);
});
(0, node_test_1.default)("tokenizes wildcard in @match", () => {
    const source = `@match(_ : "supports" : Y)`;
    strict_1.default.deepEqual(types(source), [
        "KEYWORD",
        "LPAREN",
        "WILDCARD",
        "COLON",
        "STRING",
        "COLON",
        "IDENT",
        "RPAREN",
        "EOF",
    ]);
});
(0, node_test_1.default)("ignores // line comments", () => {
    const source = `A = <Ti> // comment here
B = <Do>`;
    strict_1.default.deepEqual(types(source), [
        "IDENT",
        "EQUALS",
        "LANGLE",
        "IDENT",
        "RANGLE",
        "NEWLINE",
        "IDENT",
        "EQUALS",
        "LANGLE",
        "IDENT",
        "RANGLE",
        "EOF",
    ]);
});
(0, node_test_1.default)("tracks line and column positions", () => {
    const source = `A = <Ti>
B = <Do>`;
    const tokens = (0, tokenize_1.tokenize)(source);
    strict_1.default.equal(tokens[0].type, "IDENT");
    strict_1.default.equal(tokens[0].value, "A");
    strict_1.default.equal(tokens[0].line, 1);
    strict_1.default.equal(tokens[0].column, 1);
    const bToken = tokens.find((token) => token.type === "IDENT" && token.value === "B");
    strict_1.default.ok(bToken);
    strict_1.default.equal(bToken.line, 2);
    strict_1.default.equal(bToken.column, 1);
});
(0, node_test_1.default)("tokenizes compose and selective prune keywords", () => {
    const source = `graph1 := @compose([a], merge: root)
  -> @prune.nodes(@where(type == "option"))
  -> @prune.edges(@where(rel == "offers"))`;
    const tokenValues = values(source);
    strict_1.default.ok(tokenValues.includes("@compose"));
    strict_1.default.ok(tokenValues.includes("@prune.nodes"));
    strict_1.default.ok(tokenValues.includes("@prune.edges"));
});
