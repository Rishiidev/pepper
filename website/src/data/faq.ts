export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    question: 'Does Pepper close my tabs?',
    answer: 'Pepper saves the selected workspace before closing the selected tabs. You can restore the workspace later whenever you need it.',
  },
  {
    question: 'Will Pepper delete my work?',
    answer: 'No. Pepper is designed to save the workspace information before tabs are closed. Test the current version with non-critical work before relying on it for important sessions.',
  },
  {
    question: 'Does Pepper actually free memory?',
    answer: 'Closing active tabs can reduce browser memory use. The amount depends on the websites, browser behavior, and your computer.',
  },
  {
    question: 'Is Pepper the same as Chrome Tab Groups?',
    answer: 'No. Chrome Tab Groups primarily organize open tabs while keeping them active in memory. Pepper is designed to save workspaces so tabs can be closed to free RAM and restored later.',
  },
  {
    question: 'Do I need an account?',
    answer: 'No account is required for the local-first experience. Pepper works out of the box directly in your Chrome browser.',
  },
  {
    question: 'Can I restore only one tab?',
    answer: 'Yes. You can restore full workspaces or open individual tabs selectively from your saved history.',
  },
  {
    question: 'Where is my data stored?',
    answer: 'Your workspace data is stored locally in your browser using Chrome Extension storage and IndexedDB. It stays entirely on your device.',
  },
];
