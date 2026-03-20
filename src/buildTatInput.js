const fs = require("fs/promises");
const path = require("path");

const GENERATED_DIR = path.join(__dirname, "../tat/generated");

function tatString(value) {
  return JSON.stringify(String(value ?? ""));
}

function tatBoolean(value) {
  return value ? "true" : "false";
}

function tatNumber(value) {
  return Number.isFinite(value) ? String(value) : "0";
}

function sanitizeSegment(value) {
  return String(value ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function buildModuleKey(result) {
  const host = sanitizeSegment(process.env.HOSTNAME || "worker");
  const jobId = sanitizeSegment(result.jobId);
  return `${host}-${jobId}-${Date.now()}-${process.pid}`;
}

function buildFactsSource(result) {
  const isThinContent = (result.analysis.contentLength ?? 0) < 500;

  return `pageKey = <${tatString(`page-${result.jobId}`)}>
urlValue = <${tatString(result.url)}>
processedAtValue = <${tatString(result.processedAt)}>
titleValue = <${tatString(result.analysis.title ?? "")}>
hasTitleValue = <${tatBoolean(result.analysis.hasTitle)}>
hasMetaDescriptionValue = <${tatBoolean(result.analysis.hasMetaDescription)}>
contentLengthValue = <${tatNumber(result.analysis.contentLength)}>
isThinContentValue = <${tatBoolean(isThinContent)}>

export { pageKey, urlValue, processedAtValue, titleValue, hasTitleValue, hasMetaDescriptionValue, contentLengthValue, isThinContentValue }
`;
}

function buildAnalysisSource(factsImportPath) {
  return `import { pageKey, urlValue, processedAtValue, titleValue, hasTitleValue, hasMetaDescriptionValue, contentLengthValue, isThinContentValue } from "${factsImportPath}"

pageNode = <{ kind: "page", key: pageKey }>
urlNode = <{ kind: "resource", key: "url", value: urlValue }>
timestampNode = <{ kind: "metric", key: "processed_at", value: processedAtValue }>
lengthNode = <{ kind: "metric", key: "content_length", value: contentLengthValue }>
titleNode = <{ kind: "metadata", key: "title", value: titleValue }>
titlePresenceNode = <{ kind: "signal", key: "has_title", value: hasTitleValue }>
metaPresenceNode = <{ kind: "signal", key: "has_meta_description", value: hasMetaDescriptionValue }>
thinContentNode = <{ kind: "signal", key: "is_thin_content", value: isThinContentValue }>
missingTitleWarning = <{ kind: "warning", key: "missing_title", severity: "high" }>
missingMetaWarning = <{ kind: "warning", key: "missing_meta_description", severity: "medium" }>
thinContentWarning = <{ kind: "warning", key: "thin_content", severity: "medium" }>

@seed:
  nodes: [pageNode, urlNode, timestampNode, lengthNode, titleNode, titlePresenceNode, metaPresenceNode, thinContentNode, missingTitleWarning, missingMetaWarning, thinContentWarning]
  edges: [[pageNode : "sourced_from" : urlNode], [pageNode : "evaluated_at" : timestampNode], [pageNode : "has_metric" : lengthNode], [pageNode : "has" : titleNode], [pageNode : "signals" : titlePresenceNode], [pageNode : "signals" : metaPresenceNode], [pageNode : "signals" : thinContentNode]]
  state: {}
  meta: {}
  root: pageNode

pageGraph := @seed
  <> @project(format: "graph")

export { pageNode, pageGraph, titlePresenceNode, metaPresenceNode, thinContentNode, missingTitleWarning, missingMetaWarning, thinContentWarning }
`;
}

function buildRulesSource(analysisImportPath) {
  return `import { pageNode, pageGraph, titlePresenceNode, metaPresenceNode, thinContentNode, missingTitleWarning, missingMetaWarning, thinContentWarning } from "${analysisImportPath}"

attachMissingTitle := @action {
  guard:
    to.value.value === false

  pipeline:
    -> @graft.branch(from, "warns", missingTitleWarning)
}

attachMissingMeta := @action {
  guard:
    to.value.value === false

  pipeline:
    -> @graft.branch(from, "warns", missingMetaWarning)
}

attachThinContent := @action {
  guard:
    to.value.value === true

  pipeline:
    -> @graft.branch(from, "warns", thinContentWarning)
}

titleCheck = <pageNode.attachMissingTitle.titlePresenceNode>
metaCheck = <pageNode.attachMissingMeta.metaPresenceNode>
thinCheck = <pageNode.attachThinContent.thinContentNode>

rulesGraph := @compose([
  pageGraph
], merge: pageNode)
  -> @apply(titleCheck)
  -> @apply(metaCheck)
  -> @apply(thinCheck)
  <> @project(format: "graph")

export { rulesGraph }
`;
}

async function writeTatModules(result) {
  const moduleKey = buildModuleKey(result);
  const factsFilename = `pageFacts.${moduleKey}.generated.tat`;
  const analysisFilename = `pageAnalysis.${moduleKey}.generated.tat`;
  const rulesFilename = `pageRules.${moduleKey}.generated.tat`;

  const factsPath = path.join(GENERATED_DIR, factsFilename);
  const analysisPath = path.join(GENERATED_DIR, analysisFilename);
  const rulesPath = path.join(GENERATED_DIR, rulesFilename);

  await fs.mkdir(GENERATED_DIR, { recursive: true });

  const factsSource = buildFactsSource(result);
  const analysisSource = buildAnalysisSource(`./${factsFilename}`);
  const rulesSource = buildRulesSource(`./${analysisFilename}`);

  await fs.writeFile(factsPath, factsSource, "utf8");
  await fs.writeFile(analysisPath, analysisSource, "utf8");
  await fs.writeFile(rulesPath, rulesSource, "utf8");

  return {
    factsPath,
    factsSource,
    analysisPath,
    analysisSource,
    rulesPath,
    rulesSource,
  };
}

module.exports = {
  writeTatModules,
  GENERATED_DIR,
};
