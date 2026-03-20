"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const tokenize_1 = require("../lexer/tokenize");
const parse_1 = require("../parser/parse");
function parseSource(source) {
    return (0, parse_1.parse)((0, tokenize_1.tokenize)(source));
}
(0, node_test_1.default)("parses simple node binding", () => {
    const ast = parseSource(`A = <Ti>`);
    strict_1.default.equal(ast.type, "Program");
    strict_1.default.equal(ast.body.length, 1);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "ValueBinding");
    const binding = stmt;
    strict_1.default.equal(binding.name.name, "A");
    strict_1.default.equal(binding.value.type, "NodeCapture");
    strict_1.default.equal(binding.value.shape.type, "Identifier");
    strict_1.default.equal(binding.value.shape.name, "Ti");
});
(0, node_test_1.default)("parses object node capture", () => {
    const ast = parseSource(`node2 = <{id: "Ti", pitch: 71}>`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "ValueBinding");
    const binding = stmt;
    strict_1.default.equal(binding.name.name, "node2");
    strict_1.default.equal(binding.value.type, "NodeCapture");
    strict_1.default.equal(binding.value.shape.type, "ObjectLiteral");
    strict_1.default.equal(binding.value.shape.properties.length, 2);
    strict_1.default.equal(binding.value.shape.properties[0].key, "id");
    strict_1.default.equal(binding.value.shape.properties[1].key, "pitch");
});
(0, node_test_1.default)("parses traversal node capture", () => {
    const ast = parseSource(`node1 = <A.x.B..y..C.z.D>`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "ValueBinding");
    const binding = stmt;
    strict_1.default.equal(binding.value.type, "NodeCapture");
    strict_1.default.equal(binding.value.shape.type, "TraversalExpr");
    const traversal = binding.value.shape;
    strict_1.default.equal(traversal.segments.length, 2);
    const first = traversal.segments[0];
    strict_1.default.equal(first.type, "ActionSegment");
    strict_1.default.equal(first.from.type, "Identifier");
    strict_1.default.equal(first.from.name, "A");
    strict_1.default.equal(first.operator.name, "x");
    strict_1.default.equal(first.to.type, "Identifier");
    strict_1.default.equal(first.to.name, "B");
    const second = traversal.segments[1];
    strict_1.default.equal(second.type, "ContextLift");
    strict_1.default.equal(second.context.name, "y");
    strict_1.default.equal(second.segment.type, "ActionSegment");
    strict_1.default.equal(second.segment.from.type, "Identifier");
    strict_1.default.equal(second.segment.from.name, "C");
    strict_1.default.equal(second.segment.operator.name, "z");
    strict_1.default.equal(second.segment.to.type, "Identifier");
    strict_1.default.equal(second.segment.to.name, "D");
});
(0, node_test_1.default)("parses operator bindings", () => {
    const ast = parseSource(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}
y := @ctx(scope: "partWriting")
z := @project(format: "graph")
`);
    strict_1.default.equal(ast.body.length, 3);
    strict_1.default.equal(ast.body[0].type, "OperatorBinding");
    strict_1.default.equal(ast.body[1].type, "OperatorBinding");
    strict_1.default.equal(ast.body[2].type, "OperatorBinding");
    const x = ast.body[0];
    const y = ast.body[1];
    const z = ast.body[2];
    strict_1.default.equal(x.type, "OperatorBinding");
    strict_1.default.equal(x.name.name, "x");
    strict_1.default.equal(x.value.type, "ActionExpr");
    strict_1.default.equal(x.value.name, "@action");
    strict_1.default.equal(x.value.guard, null);
    strict_1.default.equal(x.value.pipeline.length, 1);
    strict_1.default.equal(x.value.pipeline[0].type, "GraftBranchExpr");
    strict_1.default.equal(x.value.project, null);
    strict_1.default.equal(y.type, "OperatorBinding");
    strict_1.default.equal(y.name.name, "y");
    strict_1.default.equal(y.value.type, "CtxExpr");
    strict_1.default.equal(y.value.args.length, 1);
    strict_1.default.equal(z.type, "OperatorBinding");
    strict_1.default.equal(z.name.name, "z");
    strict_1.default.equal(z.value.type, "ProjectExpr");
    strict_1.default.equal(z.value.args.length, 1);
});
(0, node_test_1.default)("parses bind variants with optional layer and entity", () => {
    const ast = parseSource(`
@bind(x := node1)
@bind.ctx(y := node1)
@bind.state(z := node1)
@bind.meta(w := node1)
@bind.ctx.node(n := node1)
@bind.ctx.edge(e := edge1)
@bind.state.node(sn := node1)
@bind.state.edge(se := edge1)
@bind.meta.node(mn := node1)
@bind.meta.edge(me := edge1)
`);
    const statements = ast.body;
    strict_1.default.equal(statements.length, 10);
    strict_1.default.equal(statements[0].type, "BindStatement");
    strict_1.default.equal(statements[0].layer, null);
    strict_1.default.equal(statements[0].entity, null);
    strict_1.default.equal(statements[0].name.name, "x");
    strict_1.default.equal(statements[1].layer, "ctx");
    strict_1.default.equal(statements[1].entity, null);
    strict_1.default.equal(statements[2].layer, "state");
    strict_1.default.equal(statements[3].layer, "meta");
    strict_1.default.equal(statements[4].layer, "ctx");
    strict_1.default.equal(statements[4].entity, "node");
    strict_1.default.equal(statements[5].layer, "ctx");
    strict_1.default.equal(statements[5].entity, "edge");
    strict_1.default.equal(statements[6].layer, "state");
    strict_1.default.equal(statements[6].entity, "node");
    strict_1.default.equal(statements[7].layer, "state");
    strict_1.default.equal(statements[7].entity, "edge");
    strict_1.default.equal(statements[8].layer, "meta");
    strict_1.default.equal(statements[8].entity, "node");
    strict_1.default.equal(statements[9].layer, "meta");
    strict_1.default.equal(statements[9].entity, "edge");
});
(0, node_test_1.default)("invalid bind variant throws", () => {
    strict_1.default.throws(() => parseSource(`@bind.node(x := y)`));
});
(0, node_test_1.default)("malformed bind syntax throws", () => {
    strict_1.default.throws(() => parseSource(`@bind.ctx.node(x = y)`));
});
(0, node_test_1.default)("mutation syntax after project is rejected", () => {
    strict_1.default.throws(() => parseSource(`
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
  -> @graft.state(node1, "active", true)
`));
});
(0, node_test_1.default)("parses structured @action with guard, pipeline, and project", () => {
    const ast = parseSource(`
x := @action {
  guard:
    from != to

  pipeline:
    -> @graft.branch(from, "supports", to)
    -> @graft.state(to, "visited", true)

  project:
    to
}
`);
    strict_1.default.equal(ast.body.length, 1);
    strict_1.default.equal(ast.body[0].type, "OperatorBinding");
    const binding = ast.body[0];
    strict_1.default.equal(binding.type, "OperatorBinding");
    strict_1.default.equal(binding.name.name, "x");
    strict_1.default.equal(binding.value.type, "ActionExpr");
    strict_1.default.equal(binding.value.name, "@action");
    strict_1.default.ok(binding.value.guard);
    strict_1.default.equal(binding.value.guard?.type, "ComparisonExpr");
    strict_1.default.equal(binding.value.pipeline.length, 2);
    strict_1.default.equal(binding.value.pipeline[0].type, "GraftBranchExpr");
    strict_1.default.equal(binding.value.pipeline[1].type, "GraftStateExpr");
    strict_1.default.ok(binding.value.project);
    strict_1.default.equal(binding.value.project?.type, "Identifier");
    strict_1.default.equal(binding.value.project?.name, "to");
});
(0, node_test_1.default)("@action section order does not matter", () => {
    const ast = parseSource(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)

  project:
    to

  guard:
    from != to
}
`);
    const binding = ast.body[0];
    strict_1.default.equal(binding.type, "OperatorBinding");
    strict_1.default.equal(binding.name.name, "x");
    strict_1.default.equal(binding.value.type, "ActionExpr");
    strict_1.default.ok(binding.value.guard);
    strict_1.default.equal(binding.value.guard?.type, "ComparisonExpr");
    strict_1.default.equal(binding.value.pipeline.length, 1);
    strict_1.default.equal(binding.value.pipeline[0].type, "GraftBranchExpr");
    strict_1.default.ok(binding.value.project);
    strict_1.default.equal(binding.value.project?.type, "Identifier");
    strict_1.default.equal(binding.value.project?.name, "to");
});
(0, node_test_1.default)("@action without pipeline section throws", () => {
    strict_1.default.throws(() => parseSource(`
x := @action {
  guard:
    from != to

  project:
    to
}
`));
});
(0, node_test_1.default)("@action with unknown section throws", () => {
    strict_1.default.throws(() => parseSource(`
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)

  unknown:
    to
}
`));
});
(0, node_test_1.default)("parses @seed block", () => {
    const ast = parseSource(`
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
    const seedStmt = ast.body[4];
    strict_1.default.equal(seedStmt.type, "SeedBlock");
    const seed = seedStmt;
    strict_1.default.equal(seed.nodes.length, 2);
    strict_1.default.equal(seed.nodes[0].ref.name, "node1");
    strict_1.default.equal(seed.nodes[1].ref.name, "node2");
    strict_1.default.equal(seed.edges.length, 1);
    const seedEdge = seed.edges[0].type === "SeedEdgeBinding" ? seed.edges[0].edge : seed.edges[0];
    strict_1.default.equal(seedEdge.left.name, "node1");
    strict_1.default.equal(seedEdge.relation.value, "supports");
    strict_1.default.equal(seedEdge.right.name, "node2");
    strict_1.default.equal(seed.state.type, "ObjectLiteral");
    strict_1.default.equal(seed.meta.type, "ObjectLiteral");
    strict_1.default.equal(seed.root.name, "node1");
});
(0, node_test_1.default)("parses graph pipeline with mutations and projection", () => {
    const ast = parseSource(`
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
  -> @graft.progress(node1, "transitionsTo", node2)
  <> @project(format: "graph")
`);
    const pipelineStmt = ast.body[5];
    strict_1.default.equal(pipelineStmt.type, "GraphPipeline");
    const pipeline = pipelineStmt;
    strict_1.default.equal(pipeline.name.name, "graph1");
    strict_1.default.equal(pipeline.source.name, "@seed");
    strict_1.default.equal(pipeline.mutations.length, 4);
    strict_1.default.equal(pipeline.mutations[0].type, "GraftBranchExpr");
    strict_1.default.equal(pipeline.mutations[1].type, "GraftStateExpr");
    strict_1.default.equal(pipeline.mutations[2].type, "GraftMetaExpr");
    strict_1.default.equal(pipeline.mutations[3].type, "GraftProgressExpr");
    strict_1.default.ok(pipeline.projection);
    strict_1.default.equal(pipeline.projection?.type, "ProjectExpr");
});
(0, node_test_1.default)("parses system relation :::", () => {
    const ast = parseSource(`
graph1 ::: graph2
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "SystemRelation");
    const relation = stmt;
    strict_1.default.equal(relation.left.name, "graph1");
    strict_1.default.equal(relation.relation, null);
    strict_1.default.equal(relation.right.name, "graph2");
});
(0, node_test_1.default)("parses explicit system relation", () => {
    const ast = parseSource(`
graph1 : "comparesTo" ::: graph2
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "SystemRelation");
    const relation = stmt;
    strict_1.default.equal(relation.left.name, "graph1");
    strict_1.default.ok(relation.relation);
    strict_1.default.equal(relation.relation?.value, "comparesTo");
    strict_1.default.equal(relation.right.name, "graph2");
});
(0, node_test_1.default)("parses @match query", () => {
    const ast = parseSource(`
@match(X : "supports" : Y)
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "QueryStatement");
    strict_1.default.equal(stmt.expr.type, "MatchExpr");
    const match = stmt.expr;
    strict_1.default.equal(match.patterns.length, 1);
    strict_1.default.equal(match.patterns[0].left.type, "Identifier");
    strict_1.default.equal(match.patterns[0].left.name, "X");
    strict_1.default.equal(match.patterns[0].relation.type, "StringLiteral");
    strict_1.default.equal(match.patterns[0].relation.value, "supports");
    strict_1.default.equal(match.patterns[0].right.type, "Identifier");
    strict_1.default.equal(match.patterns[0].right.name, "Y");
    strict_1.default.equal(match.where, null);
});
(0, node_test_1.default)("parses @match with @where", () => {
    const ast = parseSource(`
@match(X : "supports" : Y)
@where(Y.priority == "high" && Y.active === true)
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "QueryStatement");
    strict_1.default.equal(stmt.expr.type, "MatchExpr");
    const match = stmt.expr;
    strict_1.default.ok(match.where);
    strict_1.default.equal(match.where?.type, "BinaryBooleanExpr");
    strict_1.default.equal(match.where?.operator, "&&");
});
(0, node_test_1.default)("parses @path query", () => {
    const ast = parseSource(`
@path(node1, node2)
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "QueryStatement");
    strict_1.default.equal(stmt.expr.type, "PathExpr");
    const path = stmt.expr;
    strict_1.default.equal(path.from.type, "Identifier");
    strict_1.default.equal(path.from.name, "node1");
    strict_1.default.equal(path.to.type, "Identifier");
    strict_1.default.equal(path.to.name, "node2");
    strict_1.default.equal(path.where, null);
});
(0, node_test_1.default)("parses standalone @where query", () => {
    const ast = parseSource(`
@where(node.state.active == true)
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "QueryStatement");
    strict_1.default.equal(stmt.expr.type, "WhereExpr");
    strict_1.default.equal(stmt.expr.expression.type, "ComparisonExpr");
});
(0, node_test_1.default)("parses @why query with edge target", () => {
    const ast = parseSource(`
@why(node1 : "supports" : node2)
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "QueryStatement");
    strict_1.default.equal(stmt.expr.type, "WhyExpr");
    const why = stmt.expr;
    strict_1.default.equal(why.target.type, "EdgeExpr");
    strict_1.default.equal(why.target.left.name, "node1");
    strict_1.default.equal(why.target.relation.value, "supports");
    strict_1.default.equal(why.target.right.name, "node2");
});
(0, node_test_1.default)("parses multiple top-level statements in order", () => {
    const ast = parseSource(`
A = <Ti>
x := @action {
  pipeline:
    -> @graft.branch(from, "supports", to)
}

@seed:
  nodes: [A]
  edges: []
  state: {}
  meta: {}
  root: A

graph1 := @seed
  <> @project(format: "graph")

@match(X : "supports" : Y)
graph1 ::: graph1
`);
    strict_1.default.equal(ast.body.length, 6);
    strict_1.default.equal(ast.body[0].type, "ValueBinding");
    strict_1.default.equal(ast.body[1].type, "OperatorBinding");
    strict_1.default.equal(ast.body[2].type, "SeedBlock");
    strict_1.default.equal(ast.body[3].type, "GraphPipeline");
    strict_1.default.equal(ast.body[4].type, "QueryStatement");
    strict_1.default.equal(ast.body[5].type, "SystemRelation");
});
(0, node_test_1.default)("parses single import declaration", () => {
    const ast = parseSource(`import { identityGraph } from "./domains/identity.tat"`);
    strict_1.default.equal(ast.body.length, 1);
    strict_1.default.equal(ast.body[0].type, "ImportDeclaration");
    const stmt = ast.body[0];
    if (stmt.type !== "ImportDeclaration")
        throw new Error("expected import");
    strict_1.default.equal(stmt.specifiers.length, 1);
    strict_1.default.equal(stmt.specifiers[0].imported.name, "identityGraph");
    strict_1.default.equal(stmt.specifiers[0].local.name, "identityGraph");
    strict_1.default.equal(stmt.source.value, "./domains/identity.tat");
});
(0, node_test_1.default)("parses multiline import list with alias and trailing comma", () => {
    const ast = parseSource(`
import {
  identityGraph as identity,
  abilityGraph as abilities,
  combatGraph,
} from "./domains/core.tat"
`);
    strict_1.default.equal(ast.body.length, 1);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "ImportDeclaration");
    if (stmt.type !== "ImportDeclaration")
        throw new Error("expected import");
    strict_1.default.equal(stmt.specifiers.length, 3);
    strict_1.default.equal(stmt.specifiers[0].imported.name, "identityGraph");
    strict_1.default.equal(stmt.specifiers[0].local.name, "identity");
    strict_1.default.equal(stmt.specifiers[1].imported.name, "abilityGraph");
    strict_1.default.equal(stmt.specifiers[1].local.name, "abilities");
    strict_1.default.equal(stmt.specifiers[2].imported.name, "combatGraph");
    strict_1.default.equal(stmt.specifiers[2].local.name, "combatGraph");
});
(0, node_test_1.default)("parses single export declaration", () => {
    const ast = parseSource(`export identityGraph`);
    strict_1.default.equal(ast.body.length, 1);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "ExportDeclaration");
    if (stmt.type !== "ExportDeclaration")
        throw new Error("expected export");
    strict_1.default.equal(stmt.specifiers.length, 1);
    strict_1.default.equal(stmt.specifiers[0].local.name, "identityGraph");
});
(0, node_test_1.default)("parses braced export declaration", () => {
    const ast = parseSource(`export { character_root, identityGraph, characterHeaderProjection }`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "ExportDeclaration");
    if (stmt.type !== "ExportDeclaration")
        throw new Error("expected export");
    strict_1.default.deepEqual(stmt.specifiers.map((item) => item.local.name), ["character_root", "identityGraph", "characterHeaderProjection"]);
});
(0, node_test_1.default)("parses @compose graph source", () => {
    const ast = parseSource(`
appGraph := @compose([
  graphA,
  graphB,
], merge: character_root)
  <> @project(format: "graph")
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "GraphPipeline");
    if (stmt.type !== "GraphPipeline")
        throw new Error("expected graph pipeline");
    strict_1.default.equal(stmt.source.type, "ComposeExpr");
    if (stmt.source.type !== "ComposeExpr")
        throw new Error("expected compose");
    strict_1.default.deepEqual(stmt.source.assets.map((asset) => asset.name), ["graphA", "graphB"]);
    strict_1.default.equal(stmt.source.merge.name, "character_root");
});
(0, node_test_1.default)("parses @prune.nodes(@where(...)) and @prune.edges(@where(...))", () => {
    const ast = parseSource(`
graph1 := @seed
  -> @prune.nodes(@where(type == "option" && state.selected == false))
  -> @prune.edges(@where(source == class_fighter && rel == "grantsFeature"))
`);
    const stmt = ast.body[0];
    strict_1.default.equal(stmt.type, "GraphPipeline");
    if (stmt.type !== "GraphPipeline")
        throw new Error("expected graph pipeline");
    strict_1.default.equal(stmt.mutations[0].type, "PruneNodesExpr");
    strict_1.default.equal(stmt.mutations[1].type, "PruneEdgesExpr");
});
