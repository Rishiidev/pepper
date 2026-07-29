export const PEPPER_COMMANDS = {
  QUICK_CAPTURE: 'save-session',
  OPEN_MANAGER: 'open-manager',
  SAVE_AND_CLOSE: 'save-and-close-current-tab',
  TOGGLE_FOCUS: 'toggle-focus-timer',
  EXECUTE_ACTION: '_execute_action',
  RESTORE_LAST: 'restore-last',
} as const;

export type PepperCommandName = typeof PEPPER_COMMANDS[keyof typeof PEPPER_COMMANDS];
