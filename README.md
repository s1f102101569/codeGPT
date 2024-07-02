# VSCode拡張機能のインストールおよびテスト手順

## 事前準備

1. **Node.jsとnpmをダウンロードする**
    - [Node.jsの公式サイト](https://nodejs.org/)にアクセスします。
    - 推奨バージョン（LTS）のNode.jsをダウンロードします。これにはnpmも含まれています。

2. **Node.jsとnpmをインストールする**
    - ダウンロードしたインストーラーを実行します。
    - 画面の指示に従ってインストールを完了します。

3. **APIキーの用意**
    - この拡張機能ではINIADのAPIキーを使用します。

## 手順

### GitHubリポジトリからのインストール

1. リポジトリをクローンする
    - 次のコマンドを実行してリポジトリをクローンします。
    - git clone https://github.com/s1f102101569/codeGPT.git

2. ディレクトリに移動する
    - クローンしたディレクトリに移動します。
    - cd codeGPT

3. 依存関係をインストールする
    - 必要なパッケージをインストールします。
    - npm install

4. 拡張機能をビルドする
    - 拡張機能をビルドします。
    - npm run compile

5. Visual Studio Codeを開き、クローンしたディレクトリを開く
    - Visual Studio Codeを開き、クローンしたディレクトリを開きます。
    - code .

6. 拡張機能をデバッグモードで起動する
    - サイドバー左の「実行とデバッグ」アイコン（再生ボタンに虫のアイコン）をクリックします。
    - 「Run Extension」を選択し、デバッグを開始します。

### 拡張機能のコマンド一覧と説明

### Set API Key
    コマンド: Set API Key
    説明: OpenAIのAPIキーを設定するためのコマンドです。実行すると、APIキーの入力を求められます。

### Reset API Key
    コマンド: Reset API Key
    説明: 設定したAPIキーをリセットするためのコマンドです。実行すると、APIキーが削除されます。

### Suggest Fix
    コマンド: Suggest Fix
    説明: 現在のコードに対して修正提案を取得します。修正後のコードと説明が表示され、必要に応じて修正を適用できます。

### Ask ChatGPT
    コマンド: Ask ChatGPT
    説明: ChatGPTにコード関連の質問を行うためのコマンドです。質問を入力し、回答を得ることができます。

## 注意事項

### APIキーの設定:
    拡張機能を使用する前に、必ずSet API Keyコマンドを実行してAPIキーを設定してください。APIキーが設定されていないと、Suggest FixやAsk ChatGPTコマンドが正常に動作しません。

### 評価の無効化: 
    保存時の評価を無効にするには、Disable Fix functionボタンを使用してください。

## 拡張機能のテスト

1. 拡張機能がインストールされたことを確認します。VSCodeの左下に拡張機能のアイコンが表示されるはずです。

2. OpenAI APIキーを設定します。

    - VSCodeのコマンドパレットを開きます（`Ctrl+Shift+P` または macOSでは `Cmd+Shift+P`）。
    - `Set API Key`と入力し、プロンプトに従ってOpenAI APIキーを入力します。

3. `Ask ChatGPT`をテストします。

    - VSCodeのコマンドパレットを開きます（`Ctrl+Shift+P` または macOSでは `Cmd+Shift+P`）。
    - `Ask ChatGPT`と入力します。
    - 質問を入力するプロンプトが表示されるので、質問を入力し、Enterキーを押します。
    - ChatGPTからの回答が表示されます。

4. `Suggest Fix`をテストします。

    - VSCodeのコマンドパレットを開きます（`Ctrl+Shift+P` または macOSでは `Cmd+Shift+P`）。
    - `Suggest Fix`と入力します。
    - コードの修正提案が表示されるパネルが開きます。
    - 修正の提案がある場合、提案された修正を適用できます。
    - ファイルを保存する（`Ctrl+S` または macOSでは `Cmd+S`）たび、修正および評価が表示されます。
    - 保存時の評価を無効にするには、Disable Fix functionボタンを使用してください。

5. APIキーをリセットするには：

    - VSCodeのコマンドパレットを開きます（`Ctrl+Shift+P` または macOSでは `Cmd+Shift+P`）。
    - `Reset API Key`と入力します。

## 注意事項

    現在pythonファイルにしか対応していません。
    APIキーを他人と共有せず、機密情報として保持してください。
    現在以下のようなエラーが確認されています。
    ・Set API Keyコマンド実行時、APIキーの設定は正しく行われているのにエラーメッセージが出る場合がある。
    ・Suggest Fixコマンド初回実行時、Disable Fix functionボタンが反応しない場合がある。
