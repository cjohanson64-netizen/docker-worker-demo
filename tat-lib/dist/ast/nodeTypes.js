"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIdentifierNode = isIdentifierNode;
exports.isNodeCaptureNode = isNodeCaptureNode;
exports.isTraversalExprNode = isTraversalExprNode;
exports.isMatchExprNode = isMatchExprNode;
exports.isPathExprNode = isPathExprNode;
exports.isWhyExprNode = isWhyExprNode;
exports.isHowExprNode = isHowExprNode;
exports.isSeedEdgeBindingNode = isSeedEdgeBindingNode;
/* =========================
   Type Guards
   ========================= */
function isIdentifierNode(node) {
    return !!node && typeof node === "object" && node.type === "Identifier";
}
function isNodeCaptureNode(node) {
    return !!node && typeof node === "object" && node.type === "NodeCapture";
}
function isTraversalExprNode(node) {
    return !!node && typeof node === "object" && node.type === "TraversalExpr";
}
function isMatchExprNode(node) {
    return !!node && typeof node === "object" && node.type === "MatchExpr";
}
function isPathExprNode(node) {
    return !!node && typeof node === "object" && node.type === "PathExpr";
}
function isWhyExprNode(node) {
    return !!node && typeof node === "object" && node.type === "WhyExpr";
}
function isHowExprNode(node) {
    return !!node && typeof node === "object" && node.type === "HowExpr";
}
function isSeedEdgeBindingNode(node) {
    return !!node && typeof node === "object" && node.type === "SeedEdgeBinding";
}
