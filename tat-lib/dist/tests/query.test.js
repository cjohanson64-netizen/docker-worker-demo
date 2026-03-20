"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../runtime/index");
(0, node_test_1.default)("match supports wildcard in subject position", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>

node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

@match(_ : "supports" : Y)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "MatchResultSet");
    if (queryResult.kind === "MatchResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].bindings.Y, "node2");
        strict_1.default.deepEqual(Object.keys(queryResult.items[0].bindings), ["Y"]);
    }
});
(0, node_test_1.default)("match supports wildcard in object position", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>

node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

@match(X : "supports" : _)
`);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "MatchResultSet");
    if (queryResult.kind === "MatchResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].bindings.X, "node1");
        strict_1.default.deepEqual(Object.keys(queryResult.items[0].bindings), ["X"]);
    }
});
(0, node_test_1.default)("match supports regex in relation position", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
C = <Mi>

node1 = <A>
node2 = <B>
node3 = <C>

@seed:
  nodes: [node1, node2, node3]
  edges: [
    [node1 : "supports" : node2],
    [node2 : "inside" : node3]
  ]
  state: {}
  meta: {}
  root: node1

@match(X : /support.*/ : Y)
`);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "MatchResultSet");
    if (queryResult.kind === "MatchResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].bindings.X, "node1");
        strict_1.default.equal(queryResult.items[0].bindings.Y, "node2");
    }
});
(0, node_test_1.default)("match supports regex with no matches", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>

node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

@match(X : /^inside$/ : Y)
`);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "MatchResultSet");
    if (queryResult.kind === "MatchResultSet") {
        strict_1.default.equal(queryResult.items.length, 0);
    }
});
(0, node_test_1.default)("match supports wildcard plus regex together", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
C = <Mi>

node1 = <A>
node2 = <B>
node3 = <C>

@seed:
  nodes: [node1, node2, node3]
  edges: [
    [node1 : "supports" : node2],
    [node2 : "inside" : node3]
  ]
  state: {}
  meta: {}
  root: node1

@match(_ : /support.*/ : Y)
`);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "MatchResultSet");
    if (queryResult.kind === "MatchResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].bindings.Y, "node2");
    }
});
