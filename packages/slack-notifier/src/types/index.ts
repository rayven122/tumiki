export type SlackBlock = {
  type: string;
  [key: string]: unknown;
};

export type SlackMessage = {
  text: string;
  blocks?: SlackBlock[];
};

export type SlackResponse = {
  success: boolean;
  ts?: string;
  error?: string;
};
