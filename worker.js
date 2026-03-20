const { graphToViewModel } = require("./src/graphToViewModel");

const fs = require("fs/promises");
const path = require("path");

const QUEUE_PATH = path.join(__dirname, "queue.json");
const WORKER_NAME = process.env.HOSTNAME || "worker";

const { runTatEvaluation } = require("./src/runTatEvaluation");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function analyzePage(html) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const hasTitle = !!title;
  const contentLength = html.length;
  const hasMetaDescription = /<meta\s+name=["']description["']/i.test(html);

  return {
    hasTitle,
    title,
    contentLength,
    hasMetaDescription,
  };
}

async function loadQueue() {
  try {
    const raw = await fs.readFile(QUEUE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function saveQueue(queue) {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

async function getNextJob() {
  const queue = await loadQueue();

  if (queue.length === 0) {
    return null;
  }

  const nextJob = queue.shift();
  await saveQueue(queue);
  return nextJob;
}

async function processJob(job) {
  console.log(`\n[${WORKER_NAME}] Starting job ${job.id}`);
  console.log(`[${WORKER_NAME}] Fetching URL: ${job.url}`);

  try {
    const response = await globalThis.fetch(job.url);
    const html = await response.text();

    const analysis = analyzePage(html);

    const result = {
      jobId: job.id,
      url: job.url,
      analysis,
      processedAt: new Date().toISOString(),
    };

    const tat = await runTatEvaluation(result);
    const viewModel = graphToViewModel(tat.graph, result);

    console.log(`[${WORKER_NAME}] View Model:`);
    console.log(JSON.stringify(viewModel, null, 2));

    console.log(`[${WORKER_NAME}] Raw Result:`);
    console.log(JSON.stringify(result, null, 2));

    console.log(`[${WORKER_NAME}] Generated Facts Module:`);
    console.log(tat.factsSource);

    console.log(`[${WORKER_NAME}] TAT Exports:`);
    console.log(tat.exports);

    console.log(`[${WORKER_NAME}] Rules Graph:`);
    console.log(JSON.stringify(tat.graph, null, 2));
  } catch (error) {
    console.error(
      `[${WORKER_NAME}] Failed to process ${job.url}:`,
      error.message,
    );
  }

  console.log(`[${WORKER_NAME}] Finished job ${job.id}`);
}

async function startWorker() {
  console.log(`[${WORKER_NAME}] Worker started. Polling for jobs...`);

  while (true) {
    const nextJob = await getNextJob();

    if (!nextJob) {
      console.log(`[${WORKER_NAME}] No jobs found. Sleeping...`);
      await sleep(2000);
      continue;
    }

    try {
      await processJob(nextJob);
    } catch (error) {
      console.error(
        `[${WORKER_NAME}] Job ${nextJob.id} failed:`,
        error.message,
      );
    }
  }
}

startWorker().catch((error) => {
  console.error(`[${WORKER_NAME}] Fatal error:`, error);
  process.exit(1);
});
