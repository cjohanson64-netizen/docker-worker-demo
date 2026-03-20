"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = void 0;
exports.parse = parse;
class ParseError extends Error {
    constructor(message, token) {
        super(`${message} at ${token.line}:${token.column}`);
        this.token = token;
        this.name = "ParseError";
    }
}
exports.ParseError = ParseError;
function parse(tokens) {
    const parser = new Parser(tokens);
    return parser.parseProgram();
}
class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
    }
    parseProgram() {
        const body = [];
        const start = this.peek();
        this.skipNewlines();
        while (!this.isAtEnd()) {
            body.push(this.parseStatement());
            this.skipNewlines();
        }
        return this.node("Program", {
            body,
        }, start);
    }
    parseStatement() {
        this.skipNewlines();
        if (this.checkTypeIdentifierValue("import")) {
            return this.parseImportDeclaration();
        }
        if (this.checkTypeIdentifierValue("export")) {
            return this.parseExportDeclaration();
        }
        if (this.check("KEYWORD", "@seed")) {
            return this.parseSeedBlock();
        }
        if (this.isGraphPipelineStart()) {
            return this.parseGraphPipeline();
        }
        if (this.isSystemRelationStart()) {
            return this.parseSystemRelation();
        }
        if (this.check("KEYWORD", "@match") ||
            this.check("KEYWORD", "@path") ||
            this.check("KEYWORD", "@why") ||
            this.check("KEYWORD", "@how") ||
            this.check("KEYWORD", "@where")) {
            const expr = this.parseQueryExpr();
            return this.node("QueryStatement", { expr }, this.previousOrPeek());
        }
        if (this.isBindStatementStart()) {
            return this.parseBindStatement();
        }
        if (this.checkType("IDENT")) {
            return this.parseBindingLikeStatement();
        }
        throw this.error(this.peek(), `Unexpected token "${this.peek().value}"`);
    }
    parseImportDeclaration() {
        const start = this.expectIdentifierValue("import");
        this.skipNewlines();
        this.expect("LBRACE");
        this.skipNewlines();
        const specifiers = [];
        while (!this.checkType("RBRACE")) {
            const imported = this.parseIdentifier();
            let local = imported;
            if (this.checkTypeIdentifierValue("as")) {
                this.expectIdentifierValue("as");
                local = this.parseIdentifier();
            }
            specifiers.push(this.node("ImportSpecifier", { imported, local }, identToToken(imported)));
            this.skipNewlines();
            if (this.match("COMMA")) {
                this.skipNewlines();
                continue;
            }
            break;
        }
        this.skipNewlines();
        this.expect("RBRACE");
        this.skipNewlines();
        this.expectIdentifierValue("from");
        this.skipNewlines();
        const source = this.parseStringLiteral();
        return this.node("ImportDeclaration", {
            specifiers,
            source,
        }, start);
    }
    parseExportDeclaration() {
        const start = this.expectIdentifierValue("export");
        this.skipNewlines();
        const specifiers = [];
        if (this.match("LBRACE")) {
            this.skipNewlines();
            while (!this.checkType("RBRACE")) {
                const local = this.parseIdentifier();
                specifiers.push(this.node("ExportSpecifier", { local }, identToToken(local)));
                this.skipNewlines();
                if (this.match("COMMA")) {
                    this.skipNewlines();
                    continue;
                }
                break;
            }
            this.skipNewlines();
            this.expect("RBRACE");
        }
        else {
            const local = this.parseIdentifier();
            specifiers.push(this.node("ExportSpecifier", { local }, identToToken(local)));
        }
        return this.node("ExportDeclaration", { specifiers }, start);
    }
    parseBindingLikeStatement() {
        const ident = this.parseIdentifier();
        if (this.match("COLON_EQUALS")) {
            if (this.check("KEYWORD", "@seed")) {
                return this.parseGraphPipelineAfterName(ident);
            }
            const value = this.parseOperatorExpr();
            return this.node("OperatorBinding", {
                name: ident,
                value,
            }, identToToken(ident));
        }
        if (this.match("EQUALS")) {
            const value = this.parseValueExpr();
            return this.node("ValueBinding", {
                name: ident,
                value,
            }, identToToken(ident));
        }
        throw this.error(this.peek(), `Expected "=" or ":=" after identifier "${ident.name}"`);
    }
    isBindStatementStart() {
        if (!this.checkType("KEYWORD")) {
            return false;
        }
        return this.peek().value === "@bind" || this.peek().value.startsWith("@bind.");
    }
    parseBindStatement() {
        const keyword = this.expectType("KEYWORD");
        const { layer, entity } = this.parseBindSelector(keyword);
        this.expect("LPAREN");
        const name = this.parseIdentifier();
        this.expect("COLON_EQUALS");
        const expression = this.parseValueExpr();
        this.expect("RPAREN");
        return this.node("BindStatement", {
            layer,
            entity,
            name,
            expression,
        }, keyword);
    }
    parseBindSelector(keyword) {
        const parts = keyword.value.split(".");
        if (parts[0] !== "@bind") {
            throw this.error(keyword, `Expected @bind statement, got "${keyword.value}"`);
        }
        if (parts.length === 1) {
            return { layer: null, entity: null };
        }
        if (parts.length === 2) {
            return {
                layer: parts[1],
                entity: null,
            };
        }
        if (parts.length === 3) {
            return {
                layer: parts[1],
                entity: parts[2],
            };
        }
        throw this.error(keyword, `Unsupported @bind form "${keyword.value}"`);
    }
    parseSeedBlock() {
        const start = this.expect("KEYWORD", "@seed");
        this.expect("COLON");
        this.skipNewlines();
        let nodes = [];
        let edges = [];
        let state = null;
        let meta = null;
        let root = null;
        while (!this.isAtEnd()) {
            this.skipNewlines();
            if (!(this.checkType("IDENT") && this.peekNext().type === "COLON")) {
                break;
            }
            const field = this.parseIdentifier().name;
            this.expect("COLON");
            switch (field) {
                case "nodes":
                    nodes = this.parseSeedNodes();
                    break;
                case "edges":
                    edges = this.parseSeedEdges();
                    break;
                case "state":
                    state = this.parseObjectLiteral();
                    break;
                case "meta":
                    meta = this.parseObjectLiteral();
                    break;
                case "root":
                    root = this.parseIdentifier();
                    break;
                default:
                    throw this.error(this.peek(), `Unknown @seed field "${field}"`);
            }
            this.skipNewlines();
        }
        if (!state) {
            state = this.node("ObjectLiteral", { properties: [] }, start);
        }
        if (!meta) {
            meta = this.node("ObjectLiteral", { properties: [] }, start);
        }
        if (!root) {
            throw this.error(start, `@seed requires a root field`);
        }
        return this.node("SeedBlock", {
            nodes,
            edges,
            state,
            meta,
            root,
        }, start);
    }
    parseSeedNodes() {
        this.expect("LBRACKET");
        const nodes = [];
        this.skipNewlines();
        while (!this.checkType("RBRACKET")) {
            this.skipNewlines();
            const ref = this.parseIdentifier();
            nodes.push(this.node("SeedNodeRef", { ref }, identToToken(ref)));
            this.skipNewlines();
            if (this.match("COMMA")) {
                this.skipNewlines();
                continue;
            }
            break;
        }
        this.skipNewlines();
        this.expect("RBRACKET");
        return nodes;
    }
    parseSeedEdges() {
        this.expect("LBRACKET");
        const edges = [];
        this.skipNewlines();
        while (!this.checkType("RBRACKET")) {
            this.skipNewlines();
            edges.push(this.parseSeedEdgeEntry());
            this.skipNewlines();
            if (this.match("COMMA")) {
                this.skipNewlines();
                continue;
            }
            break;
        }
        this.skipNewlines();
        this.expect("RBRACKET");
        return edges;
    }
    parseSeedEdgeEntry() {
        if (this.checkType("IDENT") &&
            this.peekNext().type === "COLON_EQUALS" &&
            this.peekN(2).type === "LBRACKET") {
            const name = this.parseIdentifier();
            this.expect("COLON_EQUALS");
            this.expect("LBRACKET");
            this.skipNewlines();
            const edge = this.parseEdgeExpr();
            this.skipNewlines();
            this.expect("RBRACKET");
            return this.node("SeedEdgeBinding", {
                name,
                edge,
            }, identToToken(name));
        }
        this.expect("LBRACKET");
        this.skipNewlines();
        const edge = this.parseEdgeExpr();
        this.skipNewlines();
        this.expect("RBRACKET");
        return edge;
    }
    parseEdgeExpr() {
        const left = this.parseIdentifier();
        this.expect("COLON");
        const relation = this.parseStringLiteral();
        this.expect("COLON");
        const right = this.parseIdentifier();
        return this.node("EdgeExpr", {
            left,
            relation,
            right,
        }, identToToken(left));
    }
    parseGraphPipeline() {
        const name = this.parseIdentifier();
        this.expect("COLON_EQUALS");
        return this.parseGraphPipelineAfterName(name);
    }
    parseGraphPipelineAfterName(name) {
        const start = identToToken(name);
        const source = this.parseGraphSource();
        const mutations = [];
        let projection = null;
        this.skipNewlines();
        while (this.match("ARROW")) {
            const mutation = this.parseMutationExpr();
            mutations.push(mutation);
            this.skipNewlines();
        }
        if (this.match("PROJECT")) {
            projection = this.parseProjectExpr();
        }
        return this.node("GraphPipeline", {
            name,
            source,
            mutations,
            projection,
        }, start);
    }
    parseMutationExpr() {
        const keyword = this.expectType("KEYWORD");
        switch (keyword.value) {
            case "@graft.branch": {
                this.expect("LPAREN");
                const subject = this.parseIdentifier();
                this.expect("COMMA");
                const relation = this.parseStringLiteral();
                this.expect("COMMA");
                const object = this.parseIdentifier();
                this.expect("RPAREN");
                return this.node("GraftBranchExpr", {
                    name: "@graft.branch",
                    subject,
                    relation,
                    object,
                }, keyword);
            }
            case "@graft.state": {
                this.expect("LPAREN");
                const node = this.parseIdentifier();
                this.expect("COMMA");
                const key = this.parseStringLiteral();
                this.expect("COMMA");
                const value = this.parseValueExpr();
                this.expect("RPAREN");
                return this.node("GraftStateExpr", {
                    name: "@graft.state",
                    node,
                    key,
                    value,
                }, keyword);
            }
            case "@graft.meta": {
                this.expect("LPAREN");
                const node = this.parseIdentifier();
                this.expect("COMMA");
                const key = this.parseStringLiteral();
                this.expect("COMMA");
                const value = this.parseValueExpr();
                this.expect("RPAREN");
                return this.node("GraftMetaExpr", {
                    name: "@graft.meta",
                    node,
                    key,
                    value,
                }, keyword);
            }
            case "@graft.progress": {
                this.expect("LPAREN");
                const from = this.parseIdentifier();
                this.expect("COMMA");
                const relation = this.parseStringLiteral();
                this.expect("COMMA");
                const to = this.parseIdentifier();
                this.expect("RPAREN");
                return this.node("GraftProgressExpr", {
                    name: "@graft.progress",
                    from,
                    relation,
                    to,
                }, keyword);
            }
            case "@prune.branch": {
                this.expect("LPAREN");
                const subject = this.parseIdentifier();
                this.expect("COMMA");
                const relation = this.parseStringLiteral();
                this.expect("COMMA");
                const object = this.parseIdentifier();
                this.expect("RPAREN");
                return this.node("PruneBranchExpr", {
                    name: "@prune.branch",
                    subject,
                    relation,
                    object,
                }, keyword);
            }
            case "@prune.state": {
                this.expect("LPAREN");
                const node = this.parseIdentifier();
                this.expect("COMMA");
                const key = this.parseStringLiteral();
                this.expect("RPAREN");
                return this.node("PruneStateExpr", {
                    name: "@prune.state",
                    node,
                    key,
                }, keyword);
            }
            case "@prune.meta": {
                this.expect("LPAREN");
                const node = this.parseIdentifier();
                this.expect("COMMA");
                const key = this.parseStringLiteral();
                this.expect("RPAREN");
                return this.node("PruneMetaExpr", {
                    name: "@prune.meta",
                    node,
                    key,
                }, keyword);
            }
            case "@prune.nodes": {
                this.expect("LPAREN");
                const where = this.parseWherePredicate();
                this.expect("RPAREN");
                return this.node("PruneNodesExpr", {
                    name: "@prune.nodes",
                    where,
                }, keyword);
            }
            case "@prune.edges": {
                this.expect("LPAREN");
                const where = this.parseWherePredicate();
                this.expect("RPAREN");
                return this.node("PruneEdgesExpr", {
                    name: "@prune.edges",
                    where,
                }, keyword);
            }
            case "@ctx.set":
                return this.parseCtxSetExpr(keyword);
            case "@ctx.clear":
                return this.parseCtxClearExpr(keyword);
            case "@apply":
                return this.parseApplyExpr(keyword);
            default:
                throw this.error(keyword, `Unsupported mutation operator "${keyword.value}"`);
        }
    }
    parseApplyExpr(startToken) {
        this.expect("LPAREN");
        let target;
        if (this.checkType("IDENT")) {
            target = this.parseIdentifier();
        }
        else if (this.checkType("LANGLE")) {
            target = this.parseNodeCapture();
        }
        else {
            throw this.error(this.peek(), "Expected identifier or node capture inside @apply(...)");
        }
        this.expect("RPAREN");
        return this.node("ApplyExpr", {
            name: "@apply",
            target,
        }, startToken);
    }
    parseCtxSetExpr(startToken) {
        this.expect("LPAREN");
        const edge = this.parseIdentifier();
        this.expect("COMMA");
        const context = this.parseValueExpr();
        this.expect("RPAREN");
        return this.node("CtxSetExpr", {
            name: "@ctx.set",
            edge,
            context,
        }, startToken);
    }
    parseCtxClearExpr(startToken) {
        this.expect("LPAREN");
        const edge = this.parseIdentifier();
        this.expect("RPAREN");
        return this.node("CtxClearExpr", {
            name: "@ctx.clear",
            edge,
        }, startToken);
    }
    parseSystemRelation() {
        const left = this.parseIdentifier();
        let relation = null;
        if (this.match("COLON")) {
            relation = this.parseStringLiteral();
            this.expect("TCOLON");
        }
        else {
            this.expect("TCOLON");
        }
        const right = this.parseIdentifier();
        return this.node("SystemRelation", {
            left,
            relation,
            right,
        }, identToToken(left));
    }
    parseQueryExpr() {
        if (this.check("KEYWORD", "@match"))
            return this.parseMatchExpr();
        if (this.check("KEYWORD", "@path"))
            return this.parsePathExpr();
        if (this.check("KEYWORD", "@why"))
            return this.parseWhyExpr();
        if (this.check("KEYWORD", "@how"))
            return this.parseHowExpr();
        if (this.check("KEYWORD", "@where"))
            return this.parseWhereExpr();
        throw this.error(this.peek(), "Expected query expression");
    }
    parseMatchExpr() {
        const start = this.expect("KEYWORD", "@match");
        this.expect("LPAREN");
        this.skipNewlines();
        const patterns = [];
        while (!this.checkType("RPAREN")) {
            patterns.push(this.parseRelationPattern());
            this.skipNewlines();
        }
        this.expect("RPAREN");
        let where = null;
        this.skipNewlines();
        if (this.check("KEYWORD", "@where")) {
            where = this.parseWhereClause();
        }
        return this.node("MatchExpr", {
            patterns,
            where,
        }, start);
    }
    parsePathExpr() {
        const start = this.expect("KEYWORD", "@path");
        this.expect("LPAREN");
        const from = this.parseValueExpr();
        this.expect("COMMA");
        const to = this.parseValueExpr();
        this.expect("RPAREN");
        let where = null;
        this.skipNewlines();
        if (this.check("KEYWORD", "@where")) {
            where = this.parseWhereClause();
        }
        return this.node("PathExpr", {
            from,
            to,
            where,
        }, start);
    }
    parseWhyExpr() {
        const start = this.expect("KEYWORD", "@why");
        this.expect("LPAREN");
        let target;
        if (this.check("KEYWORD", "@match")) {
            target = this.parseMatchExpr();
        }
        else if (this.check("KEYWORD", "@path")) {
            target = this.parsePathExpr();
        }
        else if (this.looksLikeEdgeExpr()) {
            target = this.parseEdgeExpr();
        }
        else {
            target = this.parseIdentifier();
        }
        this.expect("RPAREN");
        return this.node("WhyExpr", {
            target,
        }, start);
    }
    parseHowExpr() {
        const start = this.expect("KEYWORD", "@how");
        this.expect("LPAREN");
        let target;
        if (this.checkType("IDENT")) {
            target = this.parseIdentifier();
        }
        else if (this.checkType("LANGLE")) {
            target = this.parseNodeCapture();
        }
        else {
            throw this.error(this.peek(), "Expected identifier or node capture inside @how(...)");
        }
        this.expect("RPAREN");
        return this.node("HowExpr", {
            target,
        }, start);
    }
    parseWhereClause() {
        this.expect("KEYWORD", "@where");
        this.expect("LPAREN");
        const expr = this.parseBooleanExpr();
        this.expect("RPAREN");
        return expr;
    }
    parseWhereExpr() {
        const start = this.expect("KEYWORD", "@where");
        this.expect("LPAREN");
        const expression = this.parseBooleanExpr();
        this.expect("RPAREN");
        return this.node("WhereExpr", { expression }, start);
    }
    parseWherePredicate() {
        const start = this.expect("KEYWORD", "@where");
        this.expect("LPAREN");
        const expression = this.parseBooleanExpr();
        this.expect("RPAREN");
        return this.node("WherePredicate", { expression }, start);
    }
    parseRelationPattern() {
        const left = this.parsePatternAtom();
        this.expect("COLON");
        const relation = this.parsePatternAtom();
        this.expect("COLON");
        const right = this.parsePatternAtom();
        return this.node("RelationPattern", {
            left,
            relation,
            right,
        }, atomToToken(left));
    }
    parsePatternAtom() {
        if (this.checkType("WILDCARD"))
            return this.parseWildcard();
        if (this.checkType("REGEX"))
            return this.parseRegexLiteral();
        if (this.checkType("STRING"))
            return this.parseStringLiteral();
        if (this.checkType("NUMBER"))
            return this.parseNumberLiteral();
        if (this.checkType("BOOLEAN"))
            return this.parseBooleanLiteral();
        if (this.checkType("LANGLE"))
            return this.parseNodeCapture();
        if (this.checkType("IDENT"))
            return this.parseIdentifier();
        throw this.error(this.peek(), "Expected pattern atom");
    }
    parseValueExpr() {
        if (this.check("KEYWORD", "@where"))
            return this.parseWhereExpr();
        if (this.checkType("IDENT"))
            return this.parseIdentifier();
        if (this.checkType("STRING"))
            return this.parseStringLiteral();
        if (this.checkType("NUMBER"))
            return this.parseNumberLiteral();
        if (this.checkType("BOOLEAN"))
            return this.parseBooleanLiteral();
        if (this.checkType("LANGLE"))
            return this.parseNodeCapture();
        if (this.checkType("LBRACE"))
            return this.parseObjectLiteral();
        if (this.checkType("LBRACKET"))
            return this.parseArrayLiteral();
        throw this.error(this.peek(), "Expected value expression");
    }
    parseOperatorExpr() {
        const keyword = this.expectType("KEYWORD");
        switch (keyword.value) {
            case "@action":
                return this.parseActionExpr(keyword);
            case "@ctx":
                return this.parseCtxExpr(keyword);
            case "@project":
                return this.parseProjectExpr(keyword);
            default:
                throw this.error(keyword, `Expected operator expression, got "${keyword.value}"`);
        }
    }
    parseActionExpr(startToken) {
        const start = startToken ?? this.expect("KEYWORD", "@action");
        let guard = null;
        let pipeline = null;
        let project = null;
        this.skipNewlines();
        this.expect("LBRACE");
        this.skipNewlines();
        while (!this.checkType("RBRACE")) {
            if (!(this.checkType("IDENT") && this.peekNext().type === "COLON")) {
                throw this.error(this.peek(), "Expected @action section name");
            }
            const sectionToken = this.expectType("IDENT");
            const section = sectionToken.value;
            this.expect("COLON");
            this.skipNewlines();
            switch (section) {
                case "guard":
                    if (guard !== null) {
                        throw this.error(sectionToken, `Duplicate @action section "${section}"`);
                    }
                    guard = this.parseBooleanExpr();
                    break;
                case "pipeline":
                    if (pipeline !== null) {
                        throw this.error(sectionToken, `Duplicate @action section "${section}"`);
                    }
                    pipeline = this.parseActionPipelineSection();
                    break;
                case "project":
                    if (project !== null) {
                        throw this.error(sectionToken, `Duplicate @action section "${section}"`);
                    }
                    project = this.parseActionProjectSection();
                    break;
                default:
                    throw this.error(sectionToken, `Unknown @action section "${section}"`);
            }
            this.skipNewlines();
        }
        this.expect("RBRACE");
        if (pipeline === null) {
            throw this.error(start, `@action requires a pipeline section`);
        }
        return this.node("ActionExpr", {
            name: "@action",
            guard,
            pipeline,
            project,
        }, start);
    }
    parseActionPipelineSection() {
        const pipeline = [];
        this.skipNewlines();
        while (this.match("ARROW")) {
            pipeline.push(this.parseMutationExpr());
            this.skipNewlines();
        }
        if (pipeline.length === 0) {
            throw this.error(this.peek(), "@action pipeline must contain at least one step");
        }
        return pipeline;
    }
    parseActionProjectSection() {
        return this.parseValueExpr();
    }
    parseCtxExpr(startToken) {
        const start = startToken ?? this.expect("KEYWORD", "@ctx");
        this.expect("LPAREN");
        const args = this.parseArguments();
        this.expect("RPAREN");
        return this.node("CtxExpr", {
            name: "@ctx",
            args,
        }, start);
    }
    parseProjectExpr(startToken) {
        const start = startToken ?? this.expect("KEYWORD", "@project");
        this.expect("LPAREN");
        const args = this.parseArguments();
        this.expect("RPAREN");
        return this.node("ProjectExpr", {
            name: "@project",
            args,
        }, start);
    }
    parseArguments() {
        const args = [];
        if (this.checkType("RPAREN"))
            return args;
        while (true) {
            const start = this.peek();
            if (this.checkType("IDENT") && this.peekNext().type === "COLON") {
                const key = this.parseIdentifier();
                this.expect("COLON");
                const value = this.parseValueExpr();
                args.push(this.node("Argument", { key, value }, start));
            }
            else {
                const value = this.parseValueExpr();
                args.push(this.node("Argument", { key: null, value }, start));
            }
            if (!this.match("COMMA"))
                break;
        }
        return args;
    }
    parseNodeCapture() {
        const start = this.expect("LANGLE");
        const shape = this.parseNodeShape();
        this.expect("RANGLE");
        return this.node("NodeCapture", {
            shape,
        }, start);
    }
    parseNodeShape() {
        if (this.looksLikeTraversalExpr()) {
            return this.parseTraversalExpr();
        }
        if (this.checkType("IDENT"))
            return this.parseIdentifier();
        if (this.checkType("STRING"))
            return this.parseStringLiteral();
        if (this.checkType("NUMBER"))
            return this.parseNumberLiteral();
        if (this.checkType("BOOLEAN"))
            return this.parseBooleanLiteral();
        if (this.checkType("LBRACE"))
            return this.parseObjectLiteral();
        throw this.error(this.peek(), "Expected node shape");
    }
    parseTraversalExpr() {
        const start = this.peek();
        const segments = [];
        const first = this.parseActionSegment();
        segments.push(first);
        while (this.match("DDOT")) {
            const context = this.parseIdentifier();
            this.expect("DDOT");
            const segment = this.parseActionSegment();
            segments.push(this.node("ContextLift", {
                context,
                segment,
            }, identToToken(context)));
        }
        return this.node("TraversalExpr", {
            segments,
        }, start);
    }
    parseActionSegment() {
        const start = this.peek();
        const from = this.parseTraversalValue();
        this.expect("DOT");
        const operator = this.parseIdentifier();
        this.expect("DOT");
        const to = this.parseTraversalValue();
        return this.node("ActionSegment", {
            from,
            operator,
            to,
        }, start);
    }
    parseTraversalValue() {
        if (this.checkType("IDENT"))
            return this.parseIdentifier();
        if (this.checkType("STRING"))
            return this.parseStringLiteral();
        if (this.checkType("NUMBER"))
            return this.parseNumberLiteral();
        if (this.checkType("BOOLEAN"))
            return this.parseBooleanLiteral();
        if (this.checkType("LANGLE"))
            return this.parseNodeCapture();
        if (this.checkType("LBRACE"))
            return this.parseObjectLiteral();
        throw this.error(this.peek(), "Expected traversal value");
    }
    parseObjectLiteral() {
        const start = this.expect("LBRACE");
        const properties = [];
        while (!this.checkType("RBRACE")) {
            const keyToken = this.peek();
            let key;
            if (this.checkType("IDENT")) {
                key = this.advance().value;
            }
            else if (this.checkType("STRING")) {
                key = stripQuotes(this.advance().value);
            }
            else {
                throw this.error(this.peek(), "Expected object key");
            }
            this.expect("COLON");
            const value = this.parseValueExpr();
            properties.push(this.node("ObjectProperty", {
                key,
                value,
            }, keyToken));
            if (!this.match("COMMA"))
                break;
        }
        this.expect("RBRACE");
        return this.node("ObjectLiteral", {
            properties,
        }, start);
    }
    parseArrayLiteral() {
        const start = this.expect("LBRACKET");
        const elements = [];
        while (!this.checkType("RBRACKET")) {
            elements.push(this.parseValueExpr());
            if (!this.match("COMMA"))
                break;
        }
        this.expect("RBRACKET");
        return this.node("ArrayLiteral", {
            elements,
        }, start);
    }
    parseBooleanExpr() {
        return this.parseOrExpr();
    }
    parseOrExpr() {
        let expr = this.parseAndExpr();
        while (this.matchLogical("||")) {
            const op = this.previous();
            const right = this.parseAndExpr();
            expr = this.node("BinaryBooleanExpr", {
                operator: "||",
                left: expr,
                right,
            }, op);
        }
        return expr;
    }
    parseAndExpr() {
        let expr = this.parseNotExpr();
        while (this.matchLogical("&&")) {
            const op = this.previous();
            const right = this.parseNotExpr();
            expr = this.node("BinaryBooleanExpr", {
                operator: "&&",
                left: expr,
                right,
            }, op);
        }
        return expr;
    }
    parseNotExpr() {
        if (this.matchLogical("!")) {
            const op = this.previous();
            const argument = this.parseNotExpr();
            return this.node("UnaryBooleanExpr", {
                operator: "!",
                argument,
            }, op);
        }
        return this.parseComparisonOrPrimary();
    }
    parseComparisonOrPrimary() {
        if (this.match("LPAREN")) {
            const start = this.previous();
            const expression = this.parseBooleanExpr();
            this.expect("RPAREN");
            return this.node("GroupedBooleanExpr", {
                expression,
            }, start);
        }
        const left = this.parseBooleanValue();
        if (this.matchComparison()) {
            const op = this.previous();
            const right = this.parseBooleanValue();
            return this.node("ComparisonExpr", {
                operator: op.value,
                left,
                right,
            }, op);
        }
        return left;
    }
    parseBooleanValue() {
        if (this.checkType("IDENT")) {
            const ident = this.parseIdentifier();
            if (this.match("DOT")) {
                const property = this.parseIdentifier();
                const chain = [property];
                while (this.match("DOT")) {
                    chain.push(this.parseIdentifier());
                }
                return this.node("PropertyAccess", {
                    object: ident,
                    property,
                    chain,
                }, identToToken(ident));
            }
            return ident;
        }
        if (this.checkType("STRING"))
            return this.parseStringLiteral();
        if (this.checkType("NUMBER"))
            return this.parseNumberLiteral();
        if (this.checkType("BOOLEAN"))
            return this.parseBooleanLiteral();
        if (this.checkType("REGEX"))
            return this.parseRegexLiteral();
        throw this.error(this.peek(), "Expected boolean value");
    }
    parseIdentifier() {
        const token = this.expectType("IDENT");
        return this.node("Identifier", {
            name: token.value,
        }, token);
    }
    parseStringLiteral() {
        const token = this.expectType("STRING");
        return this.node("StringLiteral", {
            value: stripQuotes(token.value),
            raw: token.value,
        }, token);
    }
    parseNumberLiteral() {
        const token = this.expectType("NUMBER");
        return this.node("NumberLiteral", {
            value: Number(token.value),
            raw: token.value,
        }, token);
    }
    parseBooleanLiteral() {
        const token = this.expectType("BOOLEAN");
        return this.node("BooleanLiteral", {
            value: token.value === "true",
            raw: token.value,
        }, token);
    }
    parseRegexLiteral() {
        const token = this.expectType("REGEX");
        const { pattern, flags } = splitRegexLiteral(token.value);
        return this.node("RegexLiteral", {
            pattern,
            flags,
            raw: token.value,
        }, token);
    }
    parseWildcard() {
        const token = this.expectType("WILDCARD");
        return this.node("Wildcard", {
            raw: "_",
        }, token);
    }
    /* =========================
       Helpers
       ========================= */
    captureBraceBodyRaw() {
        const start = this.expect("LBRACE");
        let depth = 1;
        let raw = "{";
        while (!this.isAtEnd() && depth > 0) {
            const token = this.advance();
            if (token.type === "LBRACE")
                depth += 1;
            if (token.type === "RBRACE")
                depth -= 1;
            raw += token.value;
        }
        if (depth !== 0) {
            throw this.error(start, "Unterminated action body");
        }
        return raw;
    }
    looksLikeTraversalExpr() {
        if (!this.isTraversalValueStart(this.peek()))
            return false;
        if (this.peekNext().type !== "DOT")
            return false;
        if (this.peekN(2).type !== "IDENT")
            return false;
        if (this.peekN(3).type !== "DOT")
            return false;
        return this.isTraversalValueStart(this.peekN(4));
    }
    isTraversalValueStart(token) {
        return (token.type === "IDENT" ||
            token.type === "STRING" ||
            token.type === "NUMBER" ||
            token.type === "BOOLEAN" ||
            token.type === "LANGLE" ||
            token.type === "LBRACE");
    }
    looksLikeEdgeExpr() {
        return (this.peek().type === "IDENT" &&
            this.peekNext().type === "COLON" &&
            this.peekN(2).type === "STRING" &&
            this.peekN(3).type === "COLON" &&
            this.peekN(4).type === "IDENT");
    }
    isGraphPipelineStart() {
        return (this.peek().type === "IDENT" &&
            this.peekNext().type === "COLON_EQUALS" &&
            this.peekN(2).type === "KEYWORD" &&
            (this.peekN(2).value === "@seed" || this.peekN(2).value === "@compose"));
    }
    parseGraphSource() {
        if (this.match("KEYWORD", "@seed")) {
            const token = this.previous();
            return this.node("SeedSource", {
                name: "@seed",
            }, token);
        }
        if (this.match("KEYWORD", "@compose")) {
            const token = this.previous();
            this.expect("LPAREN");
            this.skipNewlines();
            this.expect("LBRACKET");
            this.skipNewlines();
            const assets = [];
            while (!this.checkType("RBRACKET")) {
                assets.push(this.parseIdentifier());
                this.skipNewlines();
                if (this.match("COMMA")) {
                    this.skipNewlines();
                    continue;
                }
                break;
            }
            this.skipNewlines();
            this.expect("RBRACKET");
            this.skipNewlines();
            this.expect("COMMA");
            this.skipNewlines();
            this.expectIdentifierValue("merge");
            this.expect("COLON");
            const merge = this.parseIdentifier();
            this.skipNewlines();
            this.expect("RPAREN");
            return this.node("ComposeExpr", {
                name: "@compose",
                assets,
                merge,
            }, token);
        }
        throw this.error(this.peek(), `Expected graph source @seed or @compose(...)`);
    }
    isSystemRelationStart() {
        if (this.peek().type !== "IDENT")
            return false;
        if (this.peekNext().type === "TCOLON" && this.peekN(2).type === "IDENT") {
            return true;
        }
        return (this.peekNext().type === "COLON" &&
            this.peekN(2).type === "STRING" &&
            this.peekN(3).type === "TCOLON" &&
            this.peekN(4).type === "IDENT");
    }
    matchComparison() {
        const token = this.peek();
        if (!["EQ2", "EQ3", "NEQ2", "NEQ3"].includes(token.type))
            return false;
        this.current += 1;
        return true;
    }
    matchLogical(expected) {
        const token = this.peek();
        if (expected === "&&" && token.type === "AND") {
            this.current += 1;
            return true;
        }
        if (expected === "||" && token.type === "OR") {
            this.current += 1;
            return true;
        }
        if (expected === "!" && token.type === "BANG") {
            this.current += 1;
            return true;
        }
        return false;
    }
    skipNewlines() {
        while (this.match("NEWLINE")) {
            // consume
        }
    }
    expect(type, value) {
        const token = this.peek();
        if (token.type !== type) {
            throw this.error(token, `Expected ${value ?? type}, got ${token.type}`);
        }
        if (value !== undefined && token.value !== value) {
            throw this.error(token, `Expected ${value}, got ${token.value}`);
        }
        this.current += 1;
        return token;
    }
    expectType(type) {
        return this.expect(type);
    }
    match(type, value) {
        if (!this.checkType(type))
            return false;
        if (value !== undefined && this.peek().value !== value)
            return false;
        this.current += 1;
        return true;
    }
    check(type, value) {
        if (!this.checkType(type))
            return false;
        if (value !== undefined && this.peek().value !== value)
            return false;
        return true;
    }
    checkType(type) {
        if (this.isAtEnd())
            return type === "EOF";
        return this.peek().type === type;
    }
    checkTypeIdentifierValue(value) {
        return this.checkType("IDENT") && this.peek().value === value;
    }
    expectIdentifierValue(value) {
        const token = this.expectType("IDENT");
        if (token.value !== value) {
            throw this.error(token, `Expected ${value}, got ${token.value}`);
        }
        return token;
    }
    advance() {
        if (!this.isAtEnd())
            this.current += 1;
        return this.tokens[this.current - 1];
    }
    previous() {
        return this.tokens[this.current - 1];
    }
    previousOrPeek() {
        return this.current > 0 ? this.previous() : this.peek();
    }
    peek() {
        return this.tokens[this.current];
    }
    peekNext() {
        return this.peekN(1);
    }
    peekN(offset) {
        return this.tokens[Math.min(this.current + offset, this.tokens.length - 1)];
    }
    isAtEnd() {
        return this.peek().type === "EOF";
    }
    error(token, message) {
        return new ParseError(message, token);
    }
    node(type, props, token) {
        return {
            type,
            ...props,
            span: {
                start: token.index,
                end: token.index + token.value.length,
                line: token.line,
                column: token.column,
            },
        };
    }
}
/* =========================
   Small utilities
   ========================= */
function stripQuotes(raw) {
    if (raw.length >= 2) {
        return raw.slice(1, -1);
    }
    return raw;
}
function splitRegexLiteral(raw) {
    const lastSlash = raw.lastIndexOf("/");
    if (lastSlash <= 0) {
        return { pattern: raw, flags: "" };
    }
    return {
        pattern: raw.slice(1, lastSlash),
        flags: raw.slice(lastSlash + 1),
    };
}
function identToToken(node) {
    return {
        type: "IDENT",
        value: node.name,
        line: node.span?.line ?? 0,
        column: node.span?.column ?? 0,
        index: node.span?.start ?? 0,
    };
}
function atomToToken(node) {
    return {
        type: "IDENT",
        value: node.type,
        line: node.span?.line ?? 0,
        column: node.span?.column ?? 0,
        index: node.span?.start ?? 0,
    };
}
