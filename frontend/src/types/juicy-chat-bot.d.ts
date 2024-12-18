interface BotOptions {
  language?: string;  // Language for the bot (e.g., 'en', 'es')
  debug?: boolean;    // Enable debug mode
  [key: string]: any; // Allow for additional dynamic keys (optional)
}

declare module 'juicy-chat-bot' {
  export interface BotOptions {
    language?: string;  // Language setting for the bot (e.g., 'en', 'es')
    debug?: boolean;    // Enable debug mode for the bot
    [key: string]: any; // Allow additional custom options (optional)
  }

  export class Bot {
    constructor(options: BotOptions); // Use BotOptions for constructor

    /**
     * Trains the bot with the provided training data.
     * @param trainingData - A string containing the training data.
     * @returns A promise that resolves when training is complete.
     */
    train(trainingData: string): Promise<void>;

    /**
     * Handles an incoming message and provides a response.
     * @param message - The message to process.
     * @returns A promise that resolves with the bot's response.
     */
    handleMessage(message: string): Promise<string>;
  }
}