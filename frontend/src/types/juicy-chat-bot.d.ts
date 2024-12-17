declare module 'juicy-chat-bot' {
    export class Bot {
      constructor(options: any);
      train(trainingData: string): Promise<void>;
      handleMessage(message: string): Promise<string>;
    }
  }