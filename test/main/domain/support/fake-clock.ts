import type { Clock } from '@/main/domain/clock';

export class FakeClock implements Clock {
  #currentTime: number;

  constructor(initialTime: number) {
    this.#currentTime = initialTime;
  }

  now(): number {
    return this.#currentTime;
  }

  set(timestamp: number): void {
    this.#currentTime = timestamp;
  }

  advance(milliseconds: number): void {
    this.#currentTime += milliseconds;
  }
}
