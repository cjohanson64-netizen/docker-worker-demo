"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../runtime/index");
(0, node_test_1.default)("how inspects action from traversal binding", () => {
    const result = (0, index_1.executeTat)(`
resolve := @action {
  pipeline:
    -> @graft.branch(from, "resolvesTo", to)
}

A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>
step1 = <node1.resolve.node2>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

@how(step1)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "HowResult");
    strict_1.default.equal(queryResult.binding, "resolve");
    strict_1.default.equal(queryResult.fromRef, "node1");
    strict_1.default.equal(queryResult.toRef, "node2");
    strict_1.default.equal(queryResult.from, "Ti");
    strict_1.default.equal(queryResult.to, "Do");
    strict_1.default.ok(queryResult.action);
    strict_1.default.equal(queryResult.action.bindingName, "resolve");
});
(0, node_test_1.default)("how inspects action from inline traversal capture", () => {
    const result = (0, index_1.executeTat)(`
resolve := @action {
  pipeline:
    -> @graft.branch(from, "resolvesTo", to)
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

@how(<node1.resolve.node2>)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "HowResult");
    strict_1.default.equal(queryResult.binding, "resolve");
    strict_1.default.equal(queryResult.fromRef, "node1");
    strict_1.default.equal(queryResult.toRef, "node2");
});
(0, node_test_1.default)("how returns first traversal step only", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

z := @action {
  pipeline:
    -> @graft.branch(from, "leadsTo", to)
}

A = <Ti>
B = <Do>
C = <"voice">
D = <"Soprano">
node1 = <A.x.B..ctx..C.z.D>

@seed:
  nodes: []
  edges: []
  state: {}
  meta: {}
  root: nowhere

@how(node1)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "HowResult");
    strict_1.default.equal(queryResult.binding, "x");
    strict_1.default.ok(queryResult.action);
    strict_1.default.equal(queryResult.action.bindingName, "x");
});
(0, node_test_1.default)("how throws when target is not a traversal", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
A = <Ti>
node1 = <A>

@seed:
  nodes: [node1]
  edges: []
  state: {}
  meta: {}
  root: node1

@how(node1)
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.match(err.message, /@how target must resolve to a traversal value/);
        return true;
    });
});
(0, node_test_1.default)("how throws when action binding is missing", () => {
    strict_1.default.throws(() => (0, index_1.executeTat)(`
A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>
step1 = <node1.missingAction.node2>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

@how(step1)
`), (err) => {
        strict_1.default.ok(err instanceof Error);
        strict_1.default.ok(err.message.includes('@how traversal step is missing an action binding') ||
            err.message.includes('@how could not find action "missingAction"') ||
            err.message.includes('Traversal operator "missingAction" is not a declared action'));
        return true;
    });
});
(0, node_test_1.default)("how exposes action guard and project when present", () => {
    const result = (0, index_1.executeTat)(`
resolve := @action {
  guard:
    from != to

  pipeline:
    -> @graft.branch(from, "resolvesTo", to)

  project:
    to
}

A = <Ti>
B = <Do>
node1 = <A>
node2 = <B>
step1 = <node1.resolve.node2>

@seed:
  nodes: [node1, node2]
  edges: []
  state: {}
  meta: {}
  root: node1

@how(step1)
`);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "HowResult");
    strict_1.default.ok(queryResult.action);
    strict_1.default.equal(queryResult.action.bindingName, "resolve");
    strict_1.default.ok(queryResult.action.guard);
    strict_1.default.ok(queryResult.action.project);
});
(0, node_test_1.default)("how preserves null refs for raw traversal values", () => {
    const result = (0, index_1.executeTat)(`
resolve := @action {
  pipeline:
    -> @graft.branch(from, "resolvesTo", to)
}

@seed:
  nodes: []
  edges: []
  state: {}
  meta: {}
  root: nowhere

@how(<"A".resolve."B">)
`);
    strict_1.default.equal(result.execution.state.queryResults.length, 1);
    const queryResult = result.execution.state.queryResults[0].result;
    strict_1.default.equal(queryResult.kind, "HowResult");
    strict_1.default.equal(queryResult.binding, "resolve");
    strict_1.default.equal(queryResult.fromRef, null);
    strict_1.default.equal(queryResult.toRef, null);
    strict_1.default.equal(queryResult.from, "A");
    strict_1.default.equal(queryResult.to, "B");
});
