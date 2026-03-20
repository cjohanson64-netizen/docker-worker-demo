const fs = require("fs/promises");
const path = require("path");

const GENERATED_FACTS_PATH = path.join(
  __dirname,
  "../tat/pageFacts.generated.tat"
);

function tatString(value) {
  return JSON.stringify(String(value ?? ""));
}

function tatBoolean(value) {
  return value ? "true" : "false";
}

function tatNumber(value) {
  return Number.isFinite(value) ? String(value) : "0";
}

function buildFactsSource(result) {
  return `pageKey = <${tatString(`page-${result.jobId}`)}>
urlValue = <${tatString(result.url)}>
processedAtValue = <${tatString(result.processedAt)}>
titleValue = <${tatString(result.analysis.title ?? "")}>
hasTitleValue = <${tatBoolean(result.analysis.hasTitle)}>
hasMetaDescriptionValue = <${tatBoolean(result.analysis.hasMetaDescription)}>
contentLengthValue = <${tatNumber(result.analysis.contentLength)}>

export {
  pageKey,
  urlValue,
  processedAtValue,
  titleValue,
  hasTitleValue,
  hasMetaDescriptionValue,
  contentLengthValue
}
`;
}

async function writeTatFactsModule(result) {
  const source = buildFactsSource(result);
  await fs.writeFile(GENERATED_FACTS_PATH, source, "utf8");
  return {
    path: GENERATED_FACTS_PATH,
    source,
  };
}

module.exports = {
  writeTatFactsModule,
  GENERATED_FACTS_PATH,
};