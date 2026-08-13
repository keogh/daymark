export interface TimeInterval {
  readonly id: string;
  readonly taskId: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}
