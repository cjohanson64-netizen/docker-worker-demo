const path = require("path");

const { executeTatModule } = require(path.join(
  __dirname,
  "../tat-lib/dist/runtime/index.js"
));

const { writeTatFactsModule } = require("./buildTatInput");

const RULES_ENTRY_PATH = path.join(__dirname, "../tat/pageRules.tat");

async function runTatEvaluation(result) {
  const generated = await writeTatFactsModule(result);
  const loadedModule = executeTatModule(RULES_ENTRY_PATH);

  const rulesGraphAsset = loadedModule.exports.get("rulesGraph");

  return {
    factsPath: generated.path,
    factsSource: generated.source,
    modulePath: loadedModule.path,
    exports: [...loadedModule.exports.keys()],
    graph: rulesGraphAsset ? rulesGraphAsset.value : null,
  };
}

module.exports = { runTatEvaluation };
