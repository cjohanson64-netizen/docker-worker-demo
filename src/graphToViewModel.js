function edgeList(graph) {
  return Array.isArray(graph?.edges) ? graph.edges : [];
}

function historyList(graph) {
  return Array.isArray(graph?.history) ? graph.history : [];
}

function unique(values) {
  return [...new Set(values)];
}

function relationObjects(graph, relation) {
  return edgeList(graph)
    .filter((edge) => edge.relation === relation)
    .map((edge) => edge.object);
}

function relationTriples(graph) {
  return edgeList(graph).map((edge) => ({
    id: edge.id,
    subject: edge.subject,
    relation: edge.relation,
    object: edge.object,
    kind: edge.kind,
    context: edge.context ?? null,
  }));
}

function graphToViewModel(graph, rawResult = null) {
  const edges = edgeList(graph);
  const history = historyList(graph);

  const warnings = unique(
    relationObjects(graph, "warns").map((warningId) => ({
      id: warningId,
      key: warningId,
    }))
  );

  const metrics = relationObjects(graph, "has_metric").map((metricId) => ({
    id: metricId,
    key: metricId,
  }));

  const metadata = relationObjects(graph, "has").map((nodeId) => ({
    id: nodeId,
    key: nodeId,
  }));

  const signals = relationObjects(graph, "signals").map((nodeId) => ({
    id: nodeId,
    key: nodeId,
  }));

  const provenance = {
    sourceIds: relationObjects(graph, "sourced_from"),
    evaluatedAtIds: relationObjects(graph, "evaluated_at"),
  };

  const page = rawResult
    ? {
        jobId: rawResult.jobId,
        url: rawResult.url,
        processedAt: rawResult.processedAt,
        title: rawResult.analysis?.title ?? null,
        hasTitle: rawResult.analysis?.hasTitle ?? false,
        hasMetaDescription: rawResult.analysis?.hasMetaDescription ?? false,
        contentLength: rawResult.analysis?.contentLength ?? null,
      }
    : {
        root: graph?.root ?? null,
      };

  return {
    page,
    warnings,
    metadata,
    metrics,
    signals,
    provenance,
    relations: relationTriples(graph),
    history,
    summary: {
      relationCount: edges.length,
      warningCount: warnings.length,
      metricCount: metrics.length,
      metadataCount: metadata.length,
      signalCount: signals.length,
      historyCount: history.length,
    },
  };
}

module.exports = { graphToViewModel };