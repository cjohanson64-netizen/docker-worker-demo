"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../runtime/index");
function seedProgramSuffix(pipeline) {
    return `
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

${pipeline}
`;
}
(0, node_test_1.default)("project defaults to graph when omitted", () => {
    const result = (0, index_1.executeTat)(seedProgramSuffix(`graph1 := @seed`));
    strict_1.default.ok(result.execution.state.projections.has("graph1"));
    const projection = result.execution.state.projections.get("graph1");
    strict_1.default.ok(projection && typeof projection === "object");
    strict_1.default.ok(Array.isArray(projection.nodes));
    strict_1.default.ok(Array.isArray(projection.edges));
    strict_1.default.ok(Array.isArray(projection.history));
});
(0, node_test_1.default)("project graph returns full graph object", () => {
    const result = (0, index_1.executeTat)(seedProgramSuffix(`
graph1 := @seed
  <> @project(format: "graph")`));
    const projection = result.execution.state.projections.get("graph1");
    strict_1.default.ok(projection && typeof projection === "object");
    strict_1.default.ok(Array.isArray(projection.nodes));
    strict_1.default.ok(Array.isArray(projection.edges));
    strict_1.default.ok(Array.isArray(projection.history));
});
(0, node_test_1.default)("project nodes returns only node list", () => {
    const result = (0, index_1.executeTat)(seedProgramSuffix(`
graph1 := @seed
  <> @project(format: "nodes")`));
    const projection = result.execution.state.projections.get("graph1");
    strict_1.default.ok(Array.isArray(projection));
    strict_1.default.equal(projection.length, 2);
    strict_1.default.ok("id" in projection[0]);
    strict_1.default.ok("value" in projection[0]);
});
(0, node_test_1.default)("project edges returns only edge list", () => {
    const result = (0, index_1.executeTat)(seedProgramSuffix(`
graph1 := @seed
  <> @project(format: "edges")`));
    const projection = result.execution.state.projections.get("graph1");
    strict_1.default.ok(Array.isArray(projection));
    strict_1.default.equal(projection.length, 1);
    strict_1.default.ok("id" in projection[0]);
    strict_1.default.ok("subject" in projection[0]);
    strict_1.default.ok("relation" in projection[0]);
    strict_1.default.ok("object" in projection[0]);
});
(0, node_test_1.default)("project history returns only history list", () => {
    const result = (0, index_1.executeTat)(`
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
  -> @graft.branch(node1, "supports", node2)
  <> @project(format: "history")
`);
    const projection = result.execution.state.projections.get("graph1");
    strict_1.default.ok(Array.isArray(projection));
    strict_1.default.ok(projection.length >= 1);
    strict_1.default.ok("op" in projection[0]);
});
(0, node_test_1.default)("project debug returns debug-style object", () => {
    const result = (0, index_1.executeTat)(seedProgramSuffix(`
graph1 := @seed
  <> @project(format: "debug")`));
    const projection = result.execution.state.projections.get("graph1");
    strict_1.default.ok(projection && typeof projection === "object");
    strict_1.default.ok(Array.isArray(projection.nodes));
    strict_1.default.ok(Array.isArray(projection.edges));
    strict_1.default.ok(Array.isArray(projection.history));
});
(0, node_test_1.default)("project edges includes edge context", () => {
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
  <> @project(format: "edges")
`);
    const projection = result.execution.state.projections.get("graph1");
    strict_1.default.ok(Array.isArray(projection));
    strict_1.default.equal(projection[0].id, "e1");
    strict_1.default.equal(projection[0].context, "voiceLeading");
});
(0, node_test_1.default)("project throws when format is missing", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  <> @project()
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /@project requires a format argument/);
        return true;
    });
});
(0, node_test_1.default)("project throws when format is unsupported", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  <> @project(format: "banana")
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /Unsupported project format "banana"/);
        return true;
    });
});
(0, node_test_1.default)("project does not prevent graph from being stored in state.graphs", () => {
    const result = (0, index_1.executeTat)(seedProgramSuffix(`
graph1 := @seed
  <> @project(format: "nodes")`));
    strict_1.default.ok(result.execution.state.graphs.has("graph1"));
    strict_1.default.ok(result.execution.state.projections.has("graph1"));
});
