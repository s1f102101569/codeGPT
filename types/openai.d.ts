declare namespace OpenAI {
    interface ChatCompletionChoice {
      message: {
        content: string;
      };
    }
  
    interface ChatCompletionResponse {
      choices: ChatCompletionChoice[];
    }
  }