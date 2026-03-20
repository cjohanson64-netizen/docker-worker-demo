"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../runtime/index");
(0, node_test_1.default)("apply executes action from inline traversal capture", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(<node1.x.node2>)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.edges.length, 1);
    strict_1.default.equal(graph.edges[0].relation, "supports");
    strict_1.default.equal(graph.edges[0].subject, "node1");
    strict_1.default.equal(graph.edges[0].object, "node2");
});
(0, node_test_1.default)("apply executes action from traversal binding identifier", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>
step1 = <node1.x.node2>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(step1)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.edges.length, 1);
    strict_1.default.equal(graph.edges[0].relation, "supports");
    strict_1.default.equal(graph.edges[0].subject, "node1");
    strict_1.default.equal(graph.edges[0].object, "node2");
});
(0, node_test_1.default)("apply respects action guard and does not run when guard fails", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  guard:
    from != to

  pipeline:
    -> @graft.branch(from, "supports", to)
}

A = <Ti>
node1 = <A>
step1 = <node1.x.node1>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(step1)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.edges.length, 0);
});
(0, node_test_1.default)("apply can execute action pipeline with state mutation", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.state(to, "visited", true)
}

A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>
step1 = <node1.x.node2>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(step1)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const node2 = graph.nodes.get("node2");
    strict_1.default.ok(node2);
    strict_1.default.equal(node2.state.visited, true);
});
(0, node_test_1.default)("apply can execute action pipeline with meta mutation", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.meta(to, "priority", "high")
}

A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>
step1 = <node1.x.node2>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(step1)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const node2 = graph.nodes.get("node2");
    strict_1.default.ok(node2);
    strict_1.default.equal(node2.meta.priority, "high");
});
(0, node_test_1.default)("apply throws if target does not resolve to traversal", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(node1)
  <> @project(format: "graph")
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /@apply target must resolve to a traversal value/);
        return true;
    });
});
(0, node_test_1.default)("apply throws if traversal step is missing refs", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(<"A".x."B">)
  <> @project(format: "graph")
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.ok(err.message.includes("@apply traversal step is missing fromRef") ||
            err.message.includes("@apply traversal step is missing toRef"));
        return true;
    });
});
(0, node_test_1.default)("apply records history from executed action mutations", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
    -> @graft.state(to, "visited", true)
}

A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>
step1 = <node1.x.node2>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @apply(step1)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.history.length, 2);
    strict_1.default.equal(graph.history[0].op, "@graft.branch");
    strict_1.default.equal(graph.history[1].op, "@graft.state");
});
