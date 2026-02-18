const jobs = new Map();

let jobIdCounter = 0;

export function createJob(type, data = {}) {
  const jobId = `${type}-${++jobIdCounter}`;
  const job = {
    id: jobId,
    type,
    status: 'pending',
    progress: 0,
    data,
    result: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  jobs.set(jobId, job);
  return job;
}

export function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (!job) return null;

  Object.assign(job, updates, { updatedAt: new Date() });
  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId) {
  return jobs.get(jobId);
}

export function deleteJob(jobId) {
  jobs.delete(jobId);
}

export function cleanupOldJobs(maxAgeMs = 5 * 60 * 1000) {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.updatedAt.getTime() > maxAgeMs) {
      jobs.delete(jobId);
    }
  }
}

setInterval(() => cleanupOldJobs(), 60 * 1000);
