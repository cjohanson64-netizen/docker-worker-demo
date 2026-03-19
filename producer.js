const fs = require("fs/promises");
const path = require("path");

const QUEUE_PATH = path.join(__dirname, "queue.json");

const jobsToAdd = [
  { id: 1, url: "https://example.com" },
  { id: 2, url: "https://openai.com" },
  { id: 3, url: "https://developer.mozilla.org" },
  { id: 4, url: "https://observepoint.com" }
];

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

async function produceJobs() {
  console.log("[Producer] Starting producer...");

  const existingQueue = await loadQueue();
  const nextQueue = [...existingQueue, ...jobsToAdd];

  await saveQueue(nextQueue);

  console.log(`[Producer] Added ${jobsToAdd.length} jobs to the queue.`);
  console.log(`[Producer] Queue length is now ${nextQueue.length}.`);
}

produceJobs().catch((error) => {
  console.error("[Producer] Fatal error:", error);
  process.exit(1);
});