const fs = require("fs/promises");
const path = require("path");
const fetch = require("node-fetch");

const QUEUE_PATH = path.join(__dirname, "queue.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  console.log(`\n[Worker] Starting job ${job.id}`);
  console.log(`[Worker] Fetching URL: ${job.url}`);

  try {
    const response = await fetch(job.url);
    const html = await response.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "No title found";

    console.log(`[Worker] Page title: ${title}`);

  } catch (error) {
    console.error(`[Worker] Failed to fetch ${job.url}:`, error.message);
  }

  console.log(`[Worker] Finished job ${job.id}`);
}

async function startWorker() {
  console.log("[Worker] Worker started. Polling for jobs...");

  while (true) {
    const nextJob = await getNextJob();

    if (!nextJob) {
      console.log("[Worker] No jobs found. Sleeping...");
      await sleep(2000);
      continue;
    }

    try {
      await processJob(nextJob);
    } catch (error) {
      console.error(`[Worker] Job ${nextJob.id} failed:`, error.message);
    }
  }
}

startWorker().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});