const WARNING_FALLBACKS = {
  missingTitleWarning: { key: "missing_title", severity: "high" },
  missingMetaWarning: { key: "missing_meta_description", severity: "medium" },
  thinContentWarning: { key: "thin_content", severity: "medium" },
};

const METADATA_NODE_MAP = {
  titleNode: "title",
};

const METRIC_NODE_MAP = {
  lengthNode: "contentLength",
};

const SIGNAL_NODE_MAP = {
  titlePresenceNode: "hasTitle",
  metaPresenceNode: "hasMetaDescription",
  thinContentNode: "isThinContent",
};

function edgeList(graph) {
  return Array.isArray(graph?.edges) ? graph.edges : [];
}

function historyList(graph) {
  return Array.isArray(graph?.history) ? graph.history : [];
}

function nodeMap(graph) {
  return graph && typeof graph.nodes === "object" && graph.nodes !== null
    ? graph.nodes
    : {};
}

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value))];
}

function relationObjects(graph, relation) {
  return edgeList(graph)
    .filter((edge) => edge?.relation === relation)
    .map((edge) => edge?.object)
    .filter((value) => typeof value === "string" && value);
}

function relationTriples(graph) {
  return edgeList(graph).map((edge) => ({
    id: edge?.id ?? null,
    subject: edge?.subject ?? null,
    relation: edge?.relation ?? null,
    object: edge?.object ?? null,
    kind: edge?.kind ?? null,
    context: edge?.context ?? null,
  }));
}

function toNodeRecord(graph, nodeId) {
  const node = nodeMap(graph)[nodeId];

  if (!node || typeof node !== "object") {
    return null;
  }

  return {
    id: node.id ?? nodeId,
    value: safeObject(node.value),
    state: safeObject(node.state),
    meta: safeObject(node.meta),
  };
}

function pickDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
}

function coerceBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return null;
}

function coerceNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractNodeValue(graph, nodeId) {
  const record = toNodeRecord(graph, nodeId);

  if (!record) {
    return null;
  }

  return pickDefined(
    record.value.value,
    record.value.key,
    record.value.label,
    record.value.name,
  );
}

function buildPage(rawResult, graph) {
  const analysis = safeObject(rawResult?.analysis);

  if (rawResult && typeof rawResult === "object") {
    return {
      jobId: rawResult.jobId ?? null,
      url: rawResult.url ?? null,
      processedAt: rawResult.processedAt ?? null,
      title: pickDefined(analysis.title, extractNodeValue(graph, "titleNode")),
      hasTitle: coerceBoolean(analysis.hasTitle),
      hasMetaDescription: coerceBoolean(analysis.hasMetaDescription),
      contentLength: coerceNumber(analysis.contentLength),
      root: graph?.root ?? null,
    };
  }

  return {
    jobId: null,
    url: null,
    processedAt: null,
    title: extractNodeValue(graph, "titleNode"),
    hasTitle: null,
    hasMetaDescription: null,
    contentLength: null,
    root: graph?.root ?? null,
  };
}

function buildMetadata(graph, rawResult) {
  const analysis = safeObject(rawResult?.analysis);
  const metadataNodeIds = relationObjects(graph, "has");

  return {
    title: pickDefined(
      analysis.title,
      metadataNodeIds.includes("titleNode") ? extractNodeValue(graph, "titleNode") : null,
    ),
    hasMetaDescription: pickDefined(
      coerceBoolean(analysis.hasMetaDescription),
      relationObjects(graph, "signals").includes("metaPresenceNode")
        ? coerceBoolean(extractNodeValue(graph, "metaPresenceNode"))
        : null,
    ),
  };
}

function buildMetrics(graph, rawResult) {
  const analysis = safeObject(rawResult?.analysis);
  const metricNodeIds = relationObjects(graph, "has_metric");
  const rawContentLength = coerceNumber(analysis.contentLength);
  const signalNodeIds = relationObjects(graph, "signals");

  return {
    contentLength: pickDefined(
      rawContentLength,
      metricNodeIds.includes("lengthNode") ? coerceNumber(extractNodeValue(graph, "lengthNode")) : null,
    ),
    isThinContent: pickDefined(
      rawContentLength !== null ? rawContentLength < 500 : null,
      signalNodeIds.includes("thinContentNode")
        ? coerceBoolean(extractNodeValue(graph, "thinContentNode"))
        : null,
    ),
  };
}

function buildSignals(graph, rawResult, metadata, metrics) {
  const analysis = safeObject(rawResult?.analysis);
  const signalNodeIds = relationObjects(graph, "signals");

  return {
    hasTitle: pickDefined(
      coerceBoolean(analysis.hasTitle),
      signalNodeIds.includes("titlePresenceNode")
        ? coerceBoolean(extractNodeValue(graph, "titlePresenceNode"))
        : null,
      typeof metadata.title === "string" ? metadata.title.length > 0 : null,
    ),
    hasMetaDescription: pickDefined(
      coerceBoolean(analysis.hasMetaDescription),
      signalNodeIds.includes("metaPresenceNode")
        ? coerceBoolean(extractNodeValue(graph, "metaPresenceNode"))
        : null,
      metadata.hasMetaDescription,
    ),
    isThinContent: pickDefined(
      metrics.isThinContent,
      signalNodeIds.includes("thinContentNode")
        ? coerceBoolean(extractNodeValue(graph, "thinContentNode"))
        : null,
    ),
  };
}

function warningFromNode(graph, warningId) {
  const fallback = WARNING_FALLBACKS[warningId];
  const record = toNodeRecord(graph, warningId);

  if (!record) {
    return fallback
      ? { id: warningId, key: fallback.key, severity: fallback.severity }
      : { id: warningId, key: warningId, severity: "unknown" };
  }

  return {
    id: warningId,
    key: pickDefined(record.value.key, fallback?.key, warningId),
    severity: pickDefined(record.value.severity, fallback?.severity, "unknown"),
  };
}

function buildWarnings(graph) {
  const warningIds = uniqueStrings(relationObjects(graph, "warns"));
  return warningIds.map((warningId) => warningFromNode(graph, warningId));
}

function buildProvenance(graph) {
  return {
    sourceIds: relationObjects(graph, "sourced_from"),
    evaluatedAtIds: relationObjects(graph, "evaluated_at"),
  };
}

function countPresentValues(object) {
  return Object.values(object).filter((value) => value !== null && value !== undefined).length;
}

function buildSummary(graph, warnings, metadata, metrics, signals) {
  const edges = edgeList(graph);
  const history = historyList(graph);

  return {
    relationCount: edges.length,
    warningCount: warnings.length,
    hasWarnings: warnings.length > 0,
    metadataCount: countPresentValues(metadata),
    metricCount: countPresentValues(metrics),
    signalCount: countPresentValues(signals),
    historyCount: history.length,
  };
}

function graphToViewModel(graph, rawResult = null) {
  const safeGraph = graph && typeof graph === "object" ? graph : null;
  const history = historyList(safeGraph);
  const metadata = buildMetadata(safeGraph, rawResult);
  const metrics = buildMetrics(safeGraph, rawResult);
  const signals = buildSignals(safeGraph, rawResult, metadata, metrics);
  const warnings = buildWarnings(safeGraph);

  return {
    page: buildPage(rawResult, safeGraph),
    warnings,
    metadata,
    metrics,
    signals,
    provenance: buildProvenance(safeGraph),
    relations: relationTriples(safeGraph),
    history,
    summary: buildSummary(safeGraph, warnings, metadata, metrics, signals),
  };
}

module.exports = { graphToViewModel };
