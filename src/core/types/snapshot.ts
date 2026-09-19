import { PepperTab } from './session';

/** Last known tab state of one browser window, kept so it can be saved after the window is gone. */
export interface WindowTabSnapshot {
  tabs: PepperTab[];
  activeTabIndex: number;
  capturedAt: number;
}
