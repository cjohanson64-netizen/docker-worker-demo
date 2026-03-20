"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const index_1 = require("../runtime/index");
function bindSeedProgram(statements) {
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

${statements}
`;
}
(0, node_test_1.default)("executes seed graph creation", () => {
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
`);
    strict_1.default.equal(result.execution.state.seedGraph?.root, "node1");
    strict_1.default.equal(result.execution.state.seedGraph?.nodes.size, 2);
    strict_1.default.equal(result.execution.state.seedGraph?.edges.length, 1);
    const edge = result.execution.state.seedGraph?.edges[0];
    strict_1.default.ok(edge);
    strict_1.default.equal(edge.subject, "node1");
    strict_1.default.equal(edge.relation, "supports");
    strict_1.default.equal(edge.object, "node2");
    strict_1.default.equal(edge.kind, "branch");
});
(0, node_test_1.default)("bind writes generic and ctx bindings into execution context", () => {
    const result = (0, index_1.executeTat)(bindSeedProgram(`
@bind(boundNode := node1)
@bind.ctx(boundEdge := e1)
`));
    strict_1.default.equal(result.debug.bindings.nodes.boundNode.id, "node1");
    strict_1.default.equal(result.debug.bindings.values.boundNode, "Ti");
    const edgeValue = result.debug.bindings.values.boundEdge;
    strict_1.default.ok(edgeValue && typeof edgeValue === "object");
    strict_1.default.equal(edgeValue.id, "e1");
    strict_1.default.equal(edgeValue.subject, "node1");
    strict_1.default.equal(edgeValue.object, "node2");
});
(0, node_test_1.default)("bind writes to graph state and meta", () => {
    const result = (0, index_1.executeTat)(bindSeedProgram(`
@bind.state.node(savedNode := node1)
@bind.meta.edge(savedEdge := e1)
`));
    const graph = result.execution.state.seedGraph;
    strict_1.default.ok(graph);
    strict_1.default.ok(graph.state.savedNode && typeof graph.state.savedNode === "object");
    strict_1.default.ok(graph.meta.savedEdge && typeof graph.meta.savedEdge === "object");
    const stateNode = graph.state.savedNode;
    const metaEdge = graph.meta.savedEdge;
    strict_1.default.equal(stateNode.id, "node1");
    strict_1.default.equal(metaEdge.id, "e1");
});
(0, node_test_1.default)("bind entity validation rejects edge result for node bind", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(bindSeedProgram(`
@bind.ctx.node(wrong := e1)
`)), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /expected node result, got edge/);
        return true;
    });
});
(0, node_test_1.default)("bind entity validation rejects node result for edge bind", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(bindSeedProgram(`
@bind.ctx.edge(wrong := node1)
`)), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /expected edge result, got node/);
        return true;
    });
});
(0, node_test_1.default)("bind entity validation allows empty arrays", () => {
    const result = (0, index_1.executeTat)(bindSeedProgram(`
@bind.meta.edge(emptyEdges := [])
`));
    const graph = result.execution.state.seedGraph;
    strict_1.default.ok(graph);
    strict_1.default.deepEqual(graph.meta.emptyEdges, []);
});
(0, node_test_1.default)("bind node succeeds on @where node result", () => {
    const result = (0, index_1.executeTat)(bindSeedProgram(`
@bind.ctx.node(selected := @where(node.id == "node1"))
`));
    const selected = result.debug.bindings.values.selected;
    strict_1.default.ok(Array.isArray(selected));
    strict_1.default.equal(selected.length, 1);
    strict_1.default.equal(selected[0].id, "node1");
});
(0, node_test_1.default)("bind edge succeeds on @where edge result", () => {
    const result = (0, index_1.executeTat)(bindSeedProgram(`
@bind.ctx.edge(selected := @where(edge.rel == "supports"))
`));
    const selected = result.debug.bindings.values.selected;
    strict_1.default.ok(Array.isArray(selected));
    strict_1.default.equal(selected.length, 1);
    strict_1.default.equal(selected[0].id, "e1");
});
(0, node_test_1.default)("bind with @where is top-to-bottom and can read earlier bind results", () => {
    const result = (0, index_1.executeTat)(bindSeedProgram(`
@bind.ctx(targetId := "node2")
@bind.ctx.node(selected := @where(node.id == targetId))
`));
    const selected = result.debug.bindings.values.selected;
    strict_1.default.ok(Array.isArray(selected));
    strict_1.default.equal(selected.length, 1);
    strict_1.default.equal(selected[0].id, "node2");
});
(0, node_test_1.default)("@where query is read-only and returns node result set", () => {
    const result = (0, index_1.executeTat)(bindSeedProgram(`
@where(node.id == "node1")
`));
    const graph = result.execution.state.seedGraph;
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.history.length, 1);
    const queryResult = result.execution.state.queryResults[0]?.result;
    strict_1.default.equal(queryResult.kind, "WhereResultSet");
    strict_1.default.equal(queryResult.sourceKind, "node");
    strict_1.default.equal(queryResult.items.length, 1);
    strict_1.default.equal(queryResult.items[0].id, "node1");
});
(0, node_test_1.default)("bind after terminal project fails", () => {
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
  <> @project(format: "graph")

@bind.ctx(x := node1)
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /cannot appear after terminal @project|cannot execute after terminal @project/);
        return true;
    });
});
(0, node_test_1.default)("executes graft.branch in graph pipeline", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
C = <Mi>

node1 = <A>
node2 = <B>
node3 = <C>

@seed:
  nodes: [node1, node2, node3]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @graft.branch(node1, "supports", node3)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.edges.length, 1);
    strict_1.default.equal(graph.edges[0].subject, "node1");
    strict_1.default.equal(graph.edges[0].relation, "supports");
    strict_1.default.equal(graph.edges[0].object, "node3");
    strict_1.default.equal(graph.edges[0].kind, "branch");
});
(0, node_test_1.default)("executes graft.state in graph pipeline", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @graft.state(node1, "active", true)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const node = graph.nodes.get("node1");
    strict_1.default.ok(node);
    strict_1.default.equal(node.state.active, true);
});
(0, node_test_1.default)("executes graft.meta in graph pipeline", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @graft.meta(node1, "priority", "high")
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const node = graph.nodes.get("node1");
    strict_1.default.ok(node);
    strict_1.default.equal(node.meta.priority, "high");
});
(0, node_test_1.default)("executes graft.progress in graph pipeline", () => {
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
  -> @graft.progress(node1, "transitionsTo", node2)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.edges.length, 1);
    strict_1.default.equal(graph.edges[0].kind, "progress");
    strict_1.default.equal(graph.edges[0].relation, "transitionsTo");
});
(0, node_test_1.default)("executes prune.branch in graph pipeline", () => {
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

graph1 := @seed
  -> @prune.branch(node1, "supports", node2)
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.edges.length, 0);
});
(0, node_test_1.default)("executes prune.state in graph pipeline", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @graft.state(node1, "active", true)
  -> @prune.state(node1, "active")
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const node = graph.nodes.get("node1");
    strict_1.default.ok(node);
    strict_1.default.equal("active" in node.state, false);
});
(0, node_test_1.default)("executes prune.meta in graph pipeline", () => {
    const result = (0, index_1.executeTat)(`
A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

graph1 := @seed
  -> @graft.meta(node1, "priority", "high")
  -> @prune.meta(node1, "priority")
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    const node = graph.nodes.get("node1");
    strict_1.default.ok(node);
    strict_1.default.equal("priority" in node.meta, false);
});
(0, node_test_1.default)("records mutation history", () => {
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
  -> @graft.state(node1, "active", true)
  -> @graft.meta(node2, "priority", "high")
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.history.length, 3);
    strict_1.default.equal(graph.history[0].op, "@graft.branch");
    strict_1.default.equal(graph.history[1].op, "@graft.state");
    strict_1.default.equal(graph.history[2].op, "@graft.meta");
});
(0, node_test_1.default)("executes match query against seed graph", () => {
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

@match(X : "supports" : Y)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "MatchResultSet");
    if (queryResult.kind === "MatchResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].bindings.X, "node1");
        strict_1.default.equal(queryResult.items[0].bindings.Y, "node2");
    }
});
(0, node_test_1.default)("executes where filter on match results", () => {
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

graph1 := @seed
  -> @graft.state(node2, "active", true)
  -> @graft.meta(node2, "priority", "high")
  <> @project(format: "graph")

@match(X : "supports" : Y)
@where(Y.priority == "high" && Y.active === true)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "FilteredResultSet");
    if (queryResult.kind === "FilteredResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].bindings.X, "node1");
        strict_1.default.equal(queryResult.items[0].bindings.Y, "node2");
    }
});
(0, node_test_1.default)("compose two imported graphs with shared merge root", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
identityNode = <{type: "identity"}>
abilityNode = <{type: "ability"}>

@seed:
  nodes: [character_root, identityNode]
  edges: [[character_root : "hasIdentity" : identityNode]]
  state: {}
  meta: {}
  root: character_root

identityGraph := @seed
  <> @project(format: "graph")

@seed:
  nodes: [character_root, abilityNode]
  edges: [[character_root : "hasAbility" : abilityNode]]
  state: {}
  meta: {}
  root: character_root

abilityGraph := @seed
  <> @project(format: "graph")

export { character_root, identityGraph, abilityGraph }
`,
        "app.tat": `
import { character_root, identityGraph, abilityGraph } from "./core.tat"

appGraph := @compose([
  identityGraph,
  abilityGraph
], merge: character_root)
  <> @project(format: "graph")
`,
    });
    const result = (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat"));
    const graph = result.state.graphs.get("appGraph");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.root, "character_root");
    strict_1.default.equal(graph.nodes.has("identityNode"), true);
    strict_1.default.equal(graph.nodes.has("abilityNode"), true);
    strict_1.default.equal(graph.nodes.has("character_root"), true);
});
(0, node_test_1.default)("compose multiple imported graphs sharing merge root", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
identityNode = <{type: "identity"}>
abilityNode = <{type: "ability"}>
combatNode = <{type: "combat"}>

@seed:
  nodes: [character_root, identityNode]
  edges: [[character_root : "hasIdentity" : identityNode]]
  state: {}
  meta: {}
  root: character_root
identityGraph := @seed <> @project(format: "graph")

@seed:
  nodes: [character_root, abilityNode]
  edges: [[character_root : "hasAbility" : abilityNode]]
  state: {}
  meta: {}
  root: character_root
abilityGraph := @seed <> @project(format: "graph")

@seed:
  nodes: [character_root, combatNode]
  edges: [[character_root : "hasCombat" : combatNode]]
  state: {}
  meta: {}
  root: character_root
combatGraph := @seed <> @project(format: "graph")

export { character_root, identityGraph, abilityGraph, combatGraph }
`,
        "app.tat": `
import {
  character_root,
  identityGraph,
  abilityGraph,
  combatGraph,
} from "./core.tat"

appGraph := @compose([identityGraph, abilityGraph, combatGraph], merge: character_root)
  <> @project(format: "graph")
`,
    });
    const result = (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat"));
    const graph = result.state.graphs.get("appGraph");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.nodes.size, 4);
    strict_1.default.equal(graph.root, "character_root");
});
(0, node_test_1.default)("compose rejects duplicate non-merge node ids", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
dup = <{type: "identity"}>

@seed:
  nodes: [character_root, dup]
  edges: [[character_root : "a" : dup]]
  state: {}
  meta: {}
  root: character_root
graphA := @seed <> @project(format: "graph")

@seed:
  nodes: [character_root, dup]
  edges: [[character_root : "b" : dup]]
  state: {}
  meta: {}
  root: character_root
graphB := @seed <> @project(format: "graph")

export { character_root, graphA, graphB }
`,
        "app.tat": `
import { character_root, graphA, graphB } from "./core.tat"
appGraph := @compose([graphA, graphB], merge: character_root)
  <> @project(format: "graph")
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat")), /Duplicate non-merge node id/);
});
(0, node_test_1.default)("compose rejects invalid input kind", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
export { character_root }
`,
        "app.tat": `
import { character_root } from "./core.tat"
appGraph := @compose([character_root], merge: character_root)
  <> @project(format: "graph")
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat")), /Invalid @compose input kind/);
});
(0, node_test_1.default)("compose rejects program input kind", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
doThing := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}
export { character_root, doThing }
`,
        "app.tat": `
import { character_root, doThing } from "./core.tat"
appGraph := @compose([doThing], merge: character_root)
  <> @project(format: "graph")
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat")), /Invalid @compose input kind/);
});
(0, node_test_1.default)("aliased import binds to local name", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
identityNode = <{type: "identity"}>
@seed:
  nodes: [character_root, identityNode]
  edges: []
  state: {}
  meta: {}
  root: character_root
identityGraph := @seed <> @project(format: "graph")
export { character_root, identityGraph }
`,
        "app.tat": `
import {
  character_root as root,
  identityGraph as identity
} from "./core.tat"

appGraph := @compose([identity], merge: root)
  <> @project(format: "graph")
`,
    });
    const result = (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat"));
    const graph = result.state.graphs.get("appGraph");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.root, "character_root");
});
(0, node_test_1.default)("compose rejects invalid merge symbol", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
identityNode = <{type: "identity"}>
@seed:
  nodes: [character_root, identityNode]
  edges: []
  state: {}
  meta: {}
  root: character_root
identityGraph := @seed <> @project(format: "graph")
export { identityGraph }
`,
        "app.tat": `
import { identityGraph } from "./core.tat"
appGraph := @compose([identityGraph], merge: missing_root)
  <> @project(format: "graph")
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat")), /Invalid merge symbol/);
});
(0, node_test_1.default)("importing a non-exported symbol fails", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
export { }
`,
        "app.tat": `
import { character_root } from "./core.tat"
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat")), /Unresolved imported symbol/);
});
(0, node_test_1.default)("unresolved import path fails", () => {
    const project = createModuleProject({
        "app.tat": `
import { x } from "./missing.tat"
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat")), /Unresolved import path/);
});
(0, node_test_1.default)("invalid export reference fails", () => {
    const project = createModuleProject({
        "core.tat": `
export missingSymbol
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "core.tat")), /Invalid export reference/);
});
(0, node_test_1.default)("compose fails when merge anchor is missing in an asset", () => {
    const project = createModuleProject({
        "core.tat": `
character_root = <{type: "root"}>
other_root = <{type: "root"}>
identityNode = <{type: "identity"}>
abilityNode = <{type: "ability"}>

@seed:
  nodes: [character_root, identityNode]
  edges: []
  state: {}
  meta: {}
  root: character_root
identityGraph := @seed <> @project(format: "graph")

@seed:
  nodes: [other_root, abilityNode]
  edges: []
  state: {}
  meta: {}
  root: other_root
abilityGraph := @seed <> @project(format: "graph")

export { character_root, identityGraph, abilityGraph }
`,
        "app.tat": `
import { character_root, identityGraph, abilityGraph } from "./core.tat"
appGraph := @compose([identityGraph, abilityGraph], merge: character_root)
`,
    });
    strict_1.default.throws(() => (0, index_1.executeTatModule)(node_path_1.default.join(project, "app.tat")), /Missing merge anchor/);
});
(0, node_test_1.default)("@where node context supports type/state/meta and compound operators", () => {
    const result = (0, index_1.executeTat)(`
character_root = <{type: "root"}>
choice_fighting_style = <{type: "choice"}>
option_defense_style = <{type: "option"}>
option_debug = <{type: "option"}>

@seed:
  nodes: [character_root, choice_fighting_style, option_defense_style, option_debug]
  edges: [
    [choice_fighting_style : "offers" : option_defense_style],
    [choice_fighting_style : "offers" : option_debug]
  ]
  state: {}
  meta: {}
  root: character_root

graph1 := @seed
  -> @graft.state(option_defense_style, "selected", false)
  -> @graft.meta(option_debug, "category", "debug")
  -> @prune.nodes(@where(type == "option" && (state.selected == false || meta.category == "debug")))
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.nodes.has("option_defense_style"), false);
    strict_1.default.equal(graph.nodes.has("option_debug"), false);
});
(0, node_test_1.default)("@where node context missing keys are non-match", () => {
    const result = (0, index_1.executeTat)(`
character_root = <{type: "root"}>
option_a = <{type: "option"}>
option_b = <{type: "option"}>

@seed:
  nodes: [character_root, option_a, option_b]
  edges: []
  state: {}
  meta: {}
  root: character_root

graph1 := @seed
  -> @graft.meta(option_b, "category", "debug")
  -> @prune.nodes(@where(meta.category == "debug"))
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.nodes.has("option_a"), true);
    strict_1.default.equal(graph.nodes.has("option_b"), false);
});
(0, node_test_1.default)("@where edge context supports rel/source symbol matching", () => {
    const result = (0, index_1.executeTat)(`
character_root = <{type: "root"}>
choice_fighting_style = <{type: "choice"}>
option_defense_style = <{type: "option"}>
class_fighter = <{type: "class"}>

@seed:
  nodes: [character_root, choice_fighting_style, option_defense_style, class_fighter]
  edges: [
    [choice_fighting_style : "offers" : option_defense_style],
    [class_fighter : "grantsFeature" : option_defense_style]
  ]
  state: {}
  meta: {}
  root: character_root

graph1 := @seed
  -> @prune.edges(@where(rel == "offers"))
  <> @project(format: "graph")

graph2 := @seed
  -> @prune.edges(@where(source == class_fighter && rel == "grantsFeature"))
  <> @project(format: "graph")
`);
    const graph1 = result.execution.state.graphs.get("graph1");
    const graph2 = result.execution.state.graphs.get("graph2");
    strict_1.default.ok(graph1);
    strict_1.default.ok(graph2);
    strict_1.default.equal(graph1.edges.some((edge) => edge.relation === "offers"), false);
    strict_1.default.equal(graph2.edges.some((edge) => edge.subject === "class_fighter" && edge.relation === "grantsFeature"), false);
});
(0, node_test_1.default)("@prune.nodes removes matching nodes, attached edges, and node state/meta", () => {
    const result = (0, index_1.executeTat)(`
character_root = <{type: "root"}>
option_defense_style = <{type: "option"}>
option_other = <{type: "option"}>

@seed:
  nodes: [character_root, option_defense_style, option_other]
  edges: [
    [character_root : "offers" : option_defense_style],
    [character_root : "offers" : option_other]
  ]
  state: {}
  meta: {}
  root: character_root

graph1 := @seed
  -> @graft.state(option_defense_style, "selected", false)
  -> @graft.meta(option_defense_style, "category", "debug")
  -> @prune.nodes(@where(id == "option_defense_style"))
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.nodes.has("option_defense_style"), false);
    strict_1.default.equal(graph.edges.some((edge) => edge.subject === "option_defense_style" || edge.object === "option_defense_style"), false);
});
(0, node_test_1.default)("@prune.edges removes matching edges only and keeps nodes", () => {
    const result = (0, index_1.executeTat)(`
character_root = <{type: "root"}>
choice_fighting_style = <{type: "choice"}>
option_defense_style = <{type: "option"}>

@seed:
  nodes: [character_root, choice_fighting_style, option_defense_style]
  edges: [
    [choice_fighting_style : "offers" : option_defense_style]
  ]
  state: {}
  meta: {}
  root: character_root

graph1 := @seed
  -> @prune.edges(@where(rel == "offers"))
  <> @project(format: "graph")
`);
    const graph = result.execution.state.graphs.get("graph1");
    strict_1.default.ok(graph);
    strict_1.default.equal(graph.edges.length, 0);
    strict_1.default.equal(graph.nodes.has("choice_fighting_style"), true);
    strict_1.default.equal(graph.nodes.has("option_defense_style"), true);
});
(0, node_test_1.default)("invalid @where field for edge prune fails", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
character_root = <{type: "root"}>
option_a = <{type: "option"}>
@seed:
  nodes: [character_root, option_a]
  edges: [[character_root : "offers" : option_a]]
  state: {}
  meta: {}
  root: character_root
graph1 := @seed
  -> @prune.edges(@where(state.selected == false))
`), /Invalid @where field for edge prune/);
});
(0, node_test_1.default)("malformed @where predicate syntax fails", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
character_root = <{type: "root"}>
option_a = <{type: "option"}>
@seed:
  nodes: [character_root, option_a]
  edges: []
  state: {}
  meta: {}
  root: character_root
graph1 := @seed
  -> @prune.nodes(@where(!type))
`), /Malformed @where predicate syntax/);
});
function createModuleProject(files) {
    const root = (0, node_fs_1.mkdtempSync)(node_path_1.default.join(node_os_1.default.tmpdir(), "tat-mod-"));
    for (const [name, content] of Object.entries(files)) {
        (0, node_fs_1.writeFileSync)(node_path_1.default.join(root, name), content.trimStart(), "utf8");
    }
    return root;
}
(0, node_test_1.default)("executes path query", () => {
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

@path(node1, node3)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "PathResultSet");
    if (queryResult.kind === "PathResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].length, 2);
        strict_1.default.equal(queryResult.items[0].steps[0].relation, "supports");
        strict_1.default.equal(queryResult.items[0].steps[1].relation, "inside");
    }
});
(0, node_test_1.default)("executes why query", () => {
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

@why(node1 : "supports" : node2)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "ReasonResultSet");
    if (queryResult.kind === "ReasonResultSet") {
        strict_1.default.equal(queryResult.items.length, 1);
        strict_1.default.equal(queryResult.items[0].claim.subject, "node1");
        strict_1.default.equal(queryResult.items[0].claim.relation, "supports");
        strict_1.default.equal(queryResult.items[0].claim.object, "node2");
        strict_1.default.equal(queryResult.items[0].matchedEdges.length, 1);
        strict_1.default.ok(queryResult.items[0].because.length >= 1);
    }
});
