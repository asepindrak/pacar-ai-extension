import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    const selectedText = webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === 'getSelectedText') {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const allCode = editor.document.getText();
          const selection = editor.selection;
          const text = editor.document.getText(selection);
          // Kirim ke webview
          webviewView.webview.postMessage({ text, allCode });
        } else {
          // Kirim ke webview
          webviewView.webview.postMessage({ text: '' });
        }
      }
    });

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'saveToken':
            // Simpan token di globalState
            this.context.globalState.update('token', message.token);
            return;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'webview.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const logoPath = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'logo.png')));
    const stylesPath = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'styles.css')));
    const prismPath = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'prism.css')));
    const prismJSPath = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'prism.js')));
    const chara = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'Kireyna Anami.vrm')));
    const audio = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'welcome.mp3')));
    const vrm = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'node_modules/@pixiv/three-vrm/lib/', 'three-vrm.module.js')));
    const background = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'celestia-bg.jpg')));;

    // Replace placeholder with actual logo path htmlContent = htmlContent.replace('%LOGO_PATH%', logoPath.toString());
    htmlContent = htmlContent.replace('%LOGO_PATH%', logoPath.toString());
    htmlContent = htmlContent.replace('%STYLES_PATH%', stylesPath.toString());
    htmlContent = htmlContent.replace('%PRISM_PATH%', prismPath.toString());
    htmlContent = htmlContent.replace('%PRISMJS_PATH%', prismJSPath.toString());
    htmlContent = htmlContent.replace('%CHARA%', chara.toString());
    htmlContent = htmlContent.replace('%VRM%', vrm.toString());
    htmlContent = htmlContent.replace('%AUDIO%', audio.toString());
    htmlContent = htmlContent.replace('%BACKGROUND%', background.toString());
    return htmlContent;
  }
}