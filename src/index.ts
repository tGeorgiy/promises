import * as console from 'console';
import { AsyncQueue } from './asyncQueue';
import { blue, red, yellow } from './color';

const doTask = (taskName: string): Promise<void> => {
  let begin = Date.now();
  return new Promise(function (resolve, _reject) {
    setTimeout(function () {
      const end = Date.now();
      const timeSpent = end - begin + 'ms';
      console.log(
        '\x1b[34m',
        '\t[TASK] FINISHED: ' + taskName + ' in ' + timeSpent,
        '\x1b[0m'
      );
      resolve();
    }, Math.random() * 200);
  });
};

async function init() {
  // Initializing tasks according to the doc
  const numberOfTasks = 100;
  let concurrencyMax = 4;
  const taskList = [...Array(numberOfTasks)].map(() =>
    [...Array(~~(Math.random() * 10 + 3))]
      .map(() => String.fromCharCode(Math.random() * (123 - 97) + 97))
      .join('')
  );
  console.log('[init] Concurrency Algo Testing...');
  console.log('[init] Tasks to process: ', taskList.length);
  console.log('[init] Task list: ' + taskList);
  console.log('[init] Maximum Concurrency: ', concurrencyMax, '\n');

  let queue = new AsyncQueue<string>(concurrencyMax, doTask, taskList);

  // We use events to track progress
  queue.on('task:done', (task, _done, left, inProgress) => {
    console.log(blue(`\t[TASK] task completed: ${task} (${left} left)`));
    // 10% chance to set a new concurrencyMax
    if (Math.random() < 0.1 && left - inProgress > 0) {
      concurrencyMax = ~~(Math.random() * 1.5 * (concurrencyMax + 5)) + 1;
      console.log(yellow(`[DEBUG] Set max concurrency to ${concurrencyMax}`));
      queue.maxConcurrency = concurrencyMax;
    }
  });

  queue.on('task:start', (task) => {
    console.log(red(`\t[TASK] launching task: ${task}`));
  });

  queue.on('debug:check', (launching, tasksLeft) => {
    console.log(
      `[CHECK] Launching ${launching.length} tasks (${
        tasksLeft.length
      }  left), current concurrency: ${
        queue.activeTasksCount() + launching.length
      }/${queue.maxConcurrency}`
    );
  });

  queue.on('done', () => {
    console.log(yellow('DONE!'));
  });

  queue.start();
}

init();
