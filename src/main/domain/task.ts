export interface Task {
  readonly id: string;
  readonly description: string;
  readonly normalizedDescription: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}
