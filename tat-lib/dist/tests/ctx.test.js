"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../runtime/index");
(0, node_test_1.default)("ctx.set assigns context to named edge", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.set(e1, "voiceLeading")
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const edge = graph.edges[0];
    strict_1.default.ok(edge);
    strict_1.default.equal(edge.id, "e1");
    strict_1.default.equal(edge.context, "voiceLeading");
});
(0, node_test_1.default)("ctx.set overwrites existing context", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.set(e1, "voiceLeading")
  -> @ctx.set(e1, "partWriting")
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const edge = graph.edges[0];
    strict_1.default.ok(edge);
    strict_1.default.equal(edge.context, "partWriting");
});
(0, node_test_1.default)("ctx.clear removes edge context", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.set(e1, "voiceLeading")
  -> @ctx.clear(e1)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const edge = graph.edges[0];
    strict_1.default.ok(edge);
    strict_1.default.equal(edge.context, null);
});
(0, node_test_1.default)("ctx.set accepts object literal context", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.set(e1, { scope: "voiceLeading", strict: true })
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const edge = graph.edges[0];
    strict_1.default.ok(edge);
    strict_1.default.ok(edge.context && typeof edge.context === "object" && !Array.isArray(edge.context));
    if (edge.context && typeof edge.context === "object" && !Array.isArray(edge.context)) {
        strict_1.default.equal(edge.context.scope, "voiceLeading");
        strict_1.default.equal(edge.context.strict, true);
    }
});
(0, node_test_1.default)("ctx.clear on edge with no context leaves it null", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.clear(e1)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const edge = graph.edges[0];
    strict_1.default.ok(edge);
    strict_1.default.equal(edge.context, null);
});
(0, node_test_1.default)("ctx.set throws for unknown edge id", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.set(missingEdge, "voiceLeading")
  <> @project(format: "graph")
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /missingEdge/);
        return true;
    });
});
(0, node_test_1.default)("ctx.clear throws for unknown edge id", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.clear(missingEdge)
  <> @project(format: "graph")
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /missingEdge/);
        return true;
    });
});
(0, node_test_1.default)("ctx mutations preserve edge subject relation object", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: [
    e1 := [node1 : "supports" : node2]
  ]
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @ctx.set(e1, "voiceLeading")
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const edge = graph.edges[0];
    strict_1.default.ok(edge);
    strict_1.default.equal(edge.subject, "node1");
    strict_1.default.equal(edge.relation, "supports");
    strict_1.default.equal(edge.object, "node2");
    strict_1.default.equal(edge.context, "voiceLeading");
    strict_1.default.equal(graph.history[1].op, "@ctx.set");
});
