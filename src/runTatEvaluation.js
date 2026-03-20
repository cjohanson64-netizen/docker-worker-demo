const path = require("path");

const { executeTatModule } = require(path.join(
  __dirname,
  "../tat-lib/dist/runtime/index.js"
));

const { writeTatModules } = require("./buildTatInput");

async function runTatEvaluation(result) {
  const generated = await writeTatModules(result);
  const loadedModule = executeTatModule(generated.rulesPath);

  const rulesGraphAsset = loadedModule.exports.get("rulesGraph");

  return {
    factsPath: generated.factsPath,
    factsSource: generated.factsSource,
    analysisPath: generated.analysisPath,
    rulesPath: generated.rulesPath,
    modulePath: loadedModule.path,
    exports: [...loadedModule.exports.keys()],
    graph: rulesGraphAsset ? rulesGraphAsset.value : null,
  };
}

module.exports = { runTatEvaluation };
