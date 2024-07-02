import * as vscode from "vscode";
import axios from "axios";

async function setApiKey() {
  try {
    const value = await vscode.window.showInputBox({
      prompt: 'Please enter your OpenAI API Key',
      ignoreFocusOut: true,
      password: true,
    });
    if (value && value.trim()) {
      const config = vscode.workspace.getConfiguration('codeGPT');
      await config.update('apiKey', value, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('API Key has been set successfully.');
    } else {
      vscode.window.showErrorMessage('API Key is required to use this extension.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function resetApiKey() {
  try {
    const config = vscode.workspace.getConfiguration('codeGPT');
    await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage('API Key has been reset successfully.');
  } catch (err) {
    vscode.window.showErrorMessage('Failed to reset API Key.');
    console.error(err);
  }
}

async function askChatGPT(question: string): Promise<string> {
  const apiKey = vscode.workspace.getConfiguration('codeGPT').get<string>('apiKey');

  if (!apiKey) {
    throw new Error("API Key is missing. Please set your OpenAI API Key.");
  }

  const apiBase = "https://api.openai.iniad.org/api/v1";

  try {
    const response = await axios.post(
      `${apiBase}/chat/completions`,
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: question },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const message = response.data.choices[0]?.message?.content;
    return message?.trim() || "";
  } catch (error: any) {
    console.error("Error requesting suggestion from ChatGPT:", error);
    if (error.response) {
      console.error("Error response data:", error.response.data);
      throw new Error(
        `Failed to get suggestion from ChatGPT: ${error.response.data.error.message}`
      );
    } else {
      throw new Error("Failed to get suggestion from ChatGPT");
    }
  }
}

async function getFixSuggestion(code: string): Promise<{ fixedCode: string, explanation: string, hasFix: boolean, changedLines: string }> {
  const config = vscode.workspace.getConfiguration('codeGPT');
  const apiKey = config.get<string>('apiKey');

  if (!apiKey) {
    throw new Error("API Key is missing. Please set your OpenAI API Key.");
  }

  const apiBase = "https://api.openai.iniad.org/api/v1";

  console.log("Sending request to ChatGPT with code:", code);  // デバッグログ
  console.log("Using API key:", apiKey);  // APIキーの確認
  try {
    const response = await axios.post(
      `${apiBase}/chat/completions`,
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides code fix suggestions.",
          },
          {
            role: "user",
            content: `Here is a Python code snippet. Please find any mistakes and suggest corrections. Provide the corrected code followed by an explanation in Japanese. Use "修正内容の説明:" as a delimiter between the corrected code and the explanation.\n\n\`\`\`python\n${code}\n\`\`\``,
          },
        ],
        max_tokens: 300,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Received response from ChatGPT:", response);  // デバッグログ

    const content = response.data.choices[0]?.message?.content;
    console.log("ChatGPT completion content:", content);  // デバッグログ

    if (content) {
      // 不要な部分を除去し、整形
      const cleanedContent = content.replace(/Here is the corrected code snippet:|Corrected code:/g, '').trim();
      
      // "修正内容の説明:" を使ってコードと説明を分ける
      const [fixedCodePart, explanationPart] = cleanedContent.split("修正内容の説明:");
      if (fixedCodePart && explanationPart) {
        const fixedCode = fixedCodePart.replace(/```python|```/g, '').trim();
        const explanation = explanationPart.trim();
        console.log("Parsed fixed code:", fixedCode);  // デバッグログ
        console.log("Parsed explanation:", explanation);  // デバッグログ

        // 修正された行を抽出
        const originalLines = code.split('\n');
        const fixedLines = fixedCode.split('\n');
        const changedLines = originalLines.map((line, index) => {
          if (line !== fixedLines[index]) {
            return `Line ${index + 1}: ${fixedLines[index]}`;
          }
          return null;
        }).filter(line => line !== null).join('\n');

        const hasFix = changedLines.length > 0;

        console.log("Changed lines:", changedLines);  // デバッグログ
        return { fixedCode, explanation, hasFix, changedLines };
      } else {
        console.error("Failed to parse response from ChatGPT:", content);  // デバッグログ
        throw new Error("Failed to get suggestion from ChatGPT: Invalid response format.");
      }
    } else {
      throw new Error("Failed to get suggestion from ChatGPT: Empty response.");
    }
  } catch (error: any) {
    console.error("Error requesting suggestion from ChatGPT:", error);
    if (error.response) {
      console.error("OpenAI API returned an error:", error.response.data);
    }

    if (error.response && error.response.data.error) {
      throw new Error(
        `Failed to get suggestion from ChatGPT: ${error.response.data.error.message || "Invalid request error"}`
      );
    } else {
      throw new Error("Failed to get suggestion from ChatGPT");
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  let fixSuggestionPanel: vscode.WebviewPanel | undefined = undefined;
  let evaluateOnSave = true;

  // コマンドの登録
  const setApiKeyDisposable = vscode.commands.registerCommand("extension.setApiKey", setApiKey);
  context.subscriptions.push(setApiKeyDisposable);

  const resetApiKeyDisposable = vscode.commands.registerCommand("extension.resetApiKey", resetApiKey);
  context.subscriptions.push(resetApiKeyDisposable);

  const suggestFixDisposable = vscode.commands.registerCommand("extension.suggestFix", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found.");
      return;
    }

    const config = vscode.workspace.getConfiguration('codeGPT');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey) {
      vscode.window.showErrorMessage("API Key is missing. Please set your OpenAI API Key.");
      return;
    }

    const document = editor.document;
    const code = document.getText();

    vscode.window.showInformationMessage("Requesting fix suggestions from ChatGPT...");
    console.log("Requesting fix suggestions from ChatGPT with code:", code);

    try {
      const { fixedCode, explanation, hasFix } = await getFixSuggestion(code);
      if (fixSuggestionPanel) {
        fixSuggestionPanel.reveal(vscode.ViewColumn.Two);
      } else {
        fixSuggestionPanel = vscode.window.createWebviewPanel(
          "fixSuggestion",
          "Fix Suggestion",
          vscode.ViewColumn.Two,
          { enableScripts: true }
        );
        fixSuggestionPanel.onDidDispose(() => {
          fixSuggestionPanel = undefined;
        }, null, context.subscriptions);
      }
      fixSuggestionPanel.webview.html = getWebviewContent(fixedCode, explanation, hasFix);
      fixSuggestionPanel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "applyFix") {
          const entireRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          editor.edit((editBuilder) => {
            editBuilder.replace(entireRange, fixedCode);
          });
          vscode.window.showInformationMessage("The code has been updated with the fix.");
          fixSuggestionPanel?.dispose();
        }
      });
    } catch (error: any) {
      console.error("An error occurred:", error);
      vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    }
  });
  context.subscriptions.push(suggestFixDisposable);

  const chatGptDisposable = vscode.commands.registerCommand("extension.askChatGPT", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const config = vscode.workspace.getConfiguration('codeGPT');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey) {
      vscode.window.showErrorMessage("API Key is missing. Please set your OpenAI API Key.");
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "chatGPTPanel",
      "Ask ChatGPT",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = getWebviewContentChatGPT();
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "ask":
          try {
            const response = await askChatGPT(message.text);
            panel.webview.postMessage({ command: "response", text: response });
          } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to get response from ChatGPT: ${error.message}`);
          }
          return;
      }
    }, undefined, context.subscriptions);
  });
  context.subscriptions.push(chatGptDisposable);

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const config = vscode.workspace.getConfiguration('codeGPT');
      const apiKey = config.get<string>('apiKey');

      if (!apiKey) {
        vscode.window.showErrorMessage("API Key is missing. Please set your OpenAI API Key.");
        return;
      }

      if (!evaluateOnSave) return;
      const code = document.getText();

      try {
        const { fixedCode, explanation, hasFix } = await getFixSuggestion(code);
        vscode.window.showInformationMessage(`Review received.`);
        if (fixSuggestionPanel) {
          fixSuggestionPanel.reveal(vscode.ViewColumn.Two);
        } else {
          fixSuggestionPanel = vscode.window.createWebviewPanel(
            "fixSuggestion",
            "Fix Suggestion",
            vscode.ViewColumn.Two,
            { enableScripts: true }
          );
          fixSuggestionPanel.onDidDispose(() => {
            fixSuggestionPanel = undefined;
          }, null, context.subscriptions);
        }
        fixSuggestionPanel.webview.html = getWebviewContent(fixedCode, explanation, hasFix);
        fixSuggestionPanel.webview.onDidReceiveMessage(async (message) => {
          if (message.command === "applyFix") {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              const document = editor.document;
              const entireRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              );
              editor.edit((editBuilder) => {
                editBuilder.replace(entireRange, fixedCode);
              });
              vscode.window.showInformationMessage("The code has been updated with the fix.");
              fixSuggestionPanel?.dispose();
            }
          } else if (message.command === "toggleEvaluateOnSave") {
            evaluateOnSave = !evaluateOnSave;
            vscode.window.showInformationMessage(`Evaluate on Save is now ${evaluateOnSave ? 'enabled' : 'disabled'}.`);
          }
        });
      } catch (error: any) {
        vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
      }
    })
  );
}

function getWebviewContent(fixedCode: string, explanation: string, hasFix: boolean): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: monospace; background-color: #1e1e1e; color: #d4d4d4; padding: 20px; }
            pre { white-space: pre-wrap; }
            button { padding: 10px 20px; margin-top: 10px; border: none; border-radius: 5px; background-color: #007bff; color: #fff; cursor: pointer; }
            button:hover { background-color: #0056b3; }
        </style>
    </head>
    <body>
        <h3>修正後のコード:</h3>
        <pre><code>${fixedCode}</code></pre>
        <h3>修正内容の説明:</h3>
        <p>${explanation}</p>
        ${hasFix ? '<button onclick="applyFix()">Apply Fix</button>' : ''}
        <button onclick="toggleEvaluateOnSave()">Disable Fix function</button>
        <script>
            const vscode = acquireVsCodeApi();
            function applyFix() {
                vscode.postMessage({ command: 'applyFix' });
            }
            function toggleEvaluateOnSave() {
                vscode.postMessage({ command: 'toggleEvaluateOnSave' });
            }
        </script>
    </body>
    </html>
  `;
}
function getWebviewContentChatGPT() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ChatGPT Questions</title>
        <style>
            body { font-family: Arial, sans-serif; display: flex; flex-direction: column; height: 100vh; background-color: #1e1e1e; color: #d4d4d4; margin: 0; }
            h1 { color: #d4d4d4; text-align: center; }
            .chat-container { flex-grow: 1; display: flex; flex-direction: column-reverse; padding: 10px; overflow-y: auto; }
            .message { margin: 10px 0; padding: 10px; border-radius: 10px; max-width: 80%; word-wrap: break-word; white-space: pre-wrap; }
            .message.question { align-self: flex-end; background-color: #3a3a3a; }
            .message.response { align-self: flex-start; background-color: #2d2d2d; border: 1px solid #555; }
            .input-container { display: flex; padding: 10px; background-color: #1e1e1e; border-top: 1px solid #555; }
            textarea { flex-grow: 1; padding: 10px; border: 1px solid #555; border-radius: 5px; resize: none; background-color: #2d2d2d; color: #d4d4d4; min-height: 50px; overflow-y: hidden; }
            button { padding: 10px 20px; margin-left: 10px; border: none; border-radius: 5px; background-color: #007bff; color: #fff; cursor: pointer; }
            button:hover { background-color: #0056b3; }
            .loading { color: #aaa; margin-top: 10px; text-align: center; }
        </style>
    </head>
    <body>
        <h1>Ask ChatGPT</h1>
        <div class="chat-container" id="responses"></div>
        <div class="input-container">
            <textarea id="question" rows="2" oninput="autoGrow(this)"></textarea>
            <button onclick="ask()">Ask</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const responsesDiv = document.getElementById('responses');
            const questionElement = document.getElementById('question');
            const originalHeight = questionElement.style.height;

            function ask() {
                const question = questionElement.value;
                displayMessage(question, 'question');
                displayLoading();
                vscode.postMessage({ command: 'ask', text: question });
                questionElement.value = ''; 
                questionElement.style.height = originalHeight;
            }

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'response':
                        removeLoading();
                        displayMessage(message.text, 'response');
                        break;
                }
            });

            function displayMessage(text, type) {
                const messageElement = document.createElement('div');
                messageElement.classList.add('message', type);
                messageElement.textContent = text;
                responsesDiv.insertBefore(messageElement, responsesDiv.firstChild);
                responsesDiv.scrollTop = 0; 
            }

            function displayLoading() {
                const loadingElement = document.createElement('div');
                loadingElement.classList.add('message', 'loading');
                loadingElement.textContent = 'Loading...';
                responsesDiv.insertBefore(loadingElement, responsesDiv.firstChild);
            }

            function removeLoading() {
                const loadingElement = document.querySelector('.loading');
                if (loadingElement) {
                    loadingElement.remove();
                }
            }

            function autoGrow(element) {
                element.style.height = "5px";
                element.style.height = (element.scrollHeight) + "px";
            }
        </script>
    </body>
    </html>
  `;
}

export function deactivate() {}