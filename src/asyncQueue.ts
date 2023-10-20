import { EventEmitter } from 'events';

type AsyncQueueEvents<T> = {
  /**
   * emitted when task is done processing
   * @param task processed task
   * @param done amount of completed tasks
   * @param left amount of tasks left to complete, including tasks in progress
   * @param inProgress amount of tasks in progress
   */
  'task:done': (
    task: T,
    done: number,
    left: number,
    inProgress: number
  ) => void;
  /**
   * emitted before task starts processing
   * @param task task to be processed
   */
  'task:start': (task: T) => void;
  /**
   * Emitted on every check call. TODO: remove in release
   * @param launching array of tasks that are getting launched
   * @param tasksLeft array of not yet processed tasks, not including active tasks
   */
  'debug:check': (launching: T[], tasksLeft: T[]) => void;
  done: () => void;
};

// Using declarations for strongly-typed event emitter
export declare interface AsyncQueue<T> {
  on<U extends keyof AsyncQueueEvents<T>>(
    event: U,
    listener: AsyncQueueEvents<T>[U]
  ): this;

  emit<U extends keyof AsyncQueueEvents<T>>(
    event: U,
    ...args: Parameters<AsyncQueueEvents<T>[U]>
  ): boolean;
}

export class AsyncQueue<T> extends EventEmitter {
  private readonly tasks: T[];
  private readonly tasksProcessor: (task: T) => Promise<void>;
  private active: number = 0;
  private running: boolean = false;
  private allDone: boolean = false;
  private doneCount = 0;

  /**
   * @param maxConcurrency max amount of tasks to be processed at once
   * @param processor function to process tasks
   * @param tasks array of tasks to process
   */
  constructor(
    maxConcurrency: number,
    processor: (task: T) => Promise<void>,
    tasks: T[]
  ) {
    super();
    this.tasks = tasks;
    this._maxConcurrency = maxConcurrency;
    this.tasksProcessor = processor;
  }

  private _maxConcurrency: number = 0;

  public get maxConcurrency() {
    return this._maxConcurrency;
  }

  /**
   * Sets max concurrency and runs a check immediately to launch more tasks
   * @param maxConcurrency new max concurrency
   */
  public set maxConcurrency(maxConcurrency: number) {
    if (maxConcurrency < 1)
      throw new Error("Concurrency can't be lower than 0");
    if (maxConcurrency !== this._maxConcurrency) {
      this._maxConcurrency = maxConcurrency;
      this.checkTasks();
    }
  }

  /**
   * Starts tasks processing
   */
  public start(): void {
    if (this.running || this.allDone) return;
    this.running = true;
    this.running = this.checkTasks();
  }

  /**
   * Pauses tasks processing
   */
  public pause() {
    this.running = false;
  }

  public activeTasksCount() {
    return this.active;
  }

  private checkTasks(): boolean {
    // If called when not running, do nothing
    if (!this.running) return false;

    // Calculate tasks to get processed
    let toLaunch = this._maxConcurrency - this.active;
    if (toLaunch <= 0) return false;
    let tasks = this.tasks.splice(0, toLaunch);

    if (tasks.length === 0) {
      if (this.active === 0) {
        // If no tasks or active tasks left, we are done
        this.emit('done');
        this.allDone = true;
      }
      return false;
    }
    // TODO: remove before release
    this.emit('debug:check', tasks, this.tasks);

    // Start tasks for processing
    for (let task of tasks) {
      this.startTask(task);
    }
    return true;
  }

  private startTask(task: T): void {
    this.active++;
    this.emit('task:start', task);
    this.tasksProcessor(task).then(this.taskCompleted(task));
  }

  private taskCompleted(task: T): () => void {
    return () => {
      this.active--;
      this.doneCount++;
      this.emit(
        'task:done',
        task,
        this.doneCount,
        this.tasks.length + this.active,
        this.active
      );
      this.checkTasks();
    };
  }
}
