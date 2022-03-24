import { workerData, parentPort } from 'worker_threads';
import resolveDependencies from '../resolveDependencies';

if (!parentPort) {
  throw new Error('ResolveDependenciesWorker must be called by Node.js Worker API');
}

resolveDependencies(workerData[0], workerData[1], workerData[2], workerData[3]).then(
  resolved => {
    parentPort?.postMessage(resolved)
  }
)
