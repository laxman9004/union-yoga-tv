import type { ReactNode } from "react";

export type ScenePriority = 0 | 10 | 50 | 90 | 100;

export type SceneDefinition<TData = unknown> = {
  id: string;
  displayDuration: number;
  priority: ScenePriority;
  dataSelectors: string[];
  shouldRender: (data: TData) => boolean;
  render: (data: TData) => ReactNode;
};

export type DisplaySnapshot = {
  hasMemberData: boolean;
  hasCheckInData: boolean;
  lastImportAt: string | null;
  publishedCopyCount: number;
};
