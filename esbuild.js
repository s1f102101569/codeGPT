const esbuild = require("esbuild");
const { BuildFailure } = require("esbuild");

const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    },
};

async function build() {
    try {
      const result = await esbuild.build({
        // ... (ビルド設定は省略)
      });
  
      if (result.errors.length > 0) {
        // エラーが発生した場合、エラーメッセージを出力
        console.error("Build failed with errors:", result.errors);
      } else if (result.warnings.length > 0) {
        // 警告が発生した場合、警告メッセージを出力
        console.warn("Build succeeded with warnings:", result.warnings);
      } else {
        console.log("Build succeeded.");
      }
    } catch (e) {
      if (e instanceof BuildFailure) {
        // ビルド失敗時のエラーハンドリング
        console.error("Build failed:", e.message);
        process.exit(1);
      } else {
        // その他のエラーハンドリング
        console.error("An unexpected error occurred:", e);
        process.exit(1);
      }
    }
  }
  
  build();