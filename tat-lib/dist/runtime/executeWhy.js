"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWhy = executeWhy;
function executeWhy(graph, query) {
    const target = query.target;
    switch (target.type) {
        case "EdgeExpr":
            return explainEdgeExpr(graph, target);
        case "Identifier":
            return {
                kind: "ReasonResultSet",
                target: target.name,
                items: [],
            };
        case "MatchExpr":
            return {
                kind: "ReasonResultSet",
                target: "@match(...)",
                items: [],
            };
        case "PathExpr":
            return {
                kind: "ReasonResultSet",
                target: "@path(...)",
                items: [],
            };
        default: {
            const _exhaustive = target;
            throw new Error(`Unsupported @why target: ${JSON.stringify(_exhaustive)}`);
        }
    }
}
function explainEdgeExpr(graph, edgeExpr) {
    const subject = edgeExpr.left.name;
    const relation = edgeExpr.relation.value;
    const object = edgeExpr.right.name;
    const matchedEdges = graph.edges.filter((edge) => edge.subject === subject &&
        edge.relation === relation &&
        edge.object === object);
    const because = graph.history.filter((entry) => historyRelatesToEdge(entry, subject, relation, object));
    return {
        kind: "ReasonResultSet",
        target: `${subject} : ${JSON.stringify(relation)} : ${object}`,
        items: [
            {
                kind: "ReasonResult",
                claim: {
                    subject,
                    relation,
                    object,
                },
                matchedEdges,
                because,
            },
        ],
    };
}
function historyRelatesToEdge(entry, subject, relation, object) {
    const payload = entry.payload;
    const payloadSubject = typeof payload.subject === "string" ? payload.subject : null;
    const payloadRelation = typeof payload.relation === "string" ? payload.relation : null;
    const payloadObject = typeof payload.object === "string" ? payload.object : null;
    return (payloadSubject === subject &&
        payloadRelation === relation &&
        payloadObject === object);
}
