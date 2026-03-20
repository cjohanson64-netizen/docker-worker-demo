"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../runtime/index");
(0, node_test_1.default)("registers action bindings at runtime", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}
`);
    const action = result.execution.state.actions.get("x");
    strict_1.default.ok(action);
    strict_1.default.equal(action.bindingName, "x");
    strict_1.default.equal(action.guard, null);
    strict_1.default.equal(action.pipeline.length, 1);
    strict_1.default.equal(action.pipeline[0].type, "GraftBranchExpr");
    strict_1.default.equal(action.project, null);
});
(0, node_test_1.default)("registers action with guard and project", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  guard:
    from != to

  pipeline:
    -> @graft.branch(from, "supports", to)

  project:
    to
}
`);
    const action = result.execution.state.actions.get("x");
    strict_1.default.ok(action);
    strict_1.default.ok(action.guard);
    strict_1.default.equal(action.guard?.type, "ComparisonExpr");
    strict_1.default.equal(action.pipeline.length, 1);
    strict_1.default.ok(action.project);
    strict_1.default.equal(action.project?.type, "Identifier");
    if (action.project?.type === "Identifier") {
        strict_1.default.equal(action.project.name, "to");
    }
});
(0, node_test_1.default)("traversal node capture includes action metadata", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

A = <Ti>
B = <Do>

node1 = <A.x.B>
`);
    const node = result.execution.state.bindings.nodes.get("node1");
    strict_1.default.ok(node);
    const value = node.value;
    strict_1.default.equal(value.kind, "traversal");
    strict_1.default.equal(value.source, "A.x.B");
    strict_1.default.equal(Array.isArray(value.steps), true);
    strict_1.default.equal(value.steps.length, 1);
    const step = value.steps[0];
    strict_1.default.equal(step.kind, "action");
    strict_1.default.equal(step.binding, "x");
    strict_1.default.equal(step.callee, "x");
    strict_1.default.equal(step.from, "Ti");
    strict_1.default.equal(step.to, "Do");
    strict_1.default.ok(step.action);
    strict_1.default.equal(step.action.bindingName, "x");
    strict_1.default.equal(Array.isArray(step.action.pipeline), true);
    strict_1.default.equal(step.action.pipeline.length, 1);
});
(0, node_test_1.default)("context traversal includes action metadata on inner action", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

z := @action {
  pipeline:
    -> @graft.state(to, "visited", true)
}

A = <Ti>
B = <Do>
C = <"voice">
D = <"Soprano">

node1 = <A.x.B..ctx..C.z.D>
`);
    const node = result.execution.state.bindings.nodes.get("node1");
    strict_1.default.ok(node);
    const value = node.value;
    strict_1.default.equal(value.kind, "traversal");
    strict_1.default.equal(value.steps.length, 2);
    const first = value.steps[0];
    strict_1.default.equal(first.kind, "action");
    strict_1.default.equal(first.binding, "x");
    strict_1.default.ok(first.action);
    strict_1.default.equal(first.action.bindingName, "x");
    const second = value.steps[1];
    strict_1.default.equal(second.kind, "context");
    strict_1.default.equal(second.context, "ctx");
    strict_1.default.equal(second.binding, "z");
    strict_1.default.ok(second.action);
    strict_1.default.equal(second.action.bindingName, "z");
});
(0, node_test_1.default)("action-aware traversal still evaluates identifiers through bindings", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

A = <Ti>
B = <Do>

node1 = <A.x.B>
node2 = <node1>
`);
    const node2 = result.execution.state.bindings.nodes.get("node2");
    strict_1.default.ok(node2);
    const value = node2.value;
    strict_1.default.equal(value.kind, "traversal");
    strict_1.default.equal(value.source, "A.x.B");
    strict_1.default.equal(value.steps[0].from, "Ti");
    strict_1.default.equal(value.steps[0].to, "Do");
});
(0, node_test_1.default)("multiple actions can coexist in runtime registry", () => {
    const result = (0, index_1.executeTat)(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

y := @action {
  pipeline:
    -> @graft.progress(from, "movesTo", to)
}
`);
    strict_1.default.equal(result.execution.state.actions.size, 2);
    const x = result.execution.state.actions.get("x");
    const y = result.execution.state.actions.get("y");
    strict_1.default.ok(x);
    strict_1.default.ok(y);
    strict_1.default.equal(x.bindingName, "x");
    strict_1.default.equal(y.bindingName, "y");
    strict_1.default.equal(x.pipeline[0].type, "GraftBranchExpr");
    strict_1.default.equal(y.pipeline[0].type, "GraftProgressExpr");
});
