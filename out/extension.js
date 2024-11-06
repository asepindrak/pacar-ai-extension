"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const SidebarProvider_1 = require("./SidebarProvider");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "pacar-ai" is now active!');
    // Register the Sidebar Panel
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("pacar-ai-sidebar", sidebarProvider));
    context.subscriptions.push(vscode.commands.registerCommand('pacar-ai.triggerCompletion', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Dapatkan seluruh kode dari editor
            const allCode = editor.document.getText();
            const currentLine = editor.selection.active.line;
            // Tambahkan new line setelahnya
            editor.edit(editBuilder => {
                // Tambahkan new line di akhir baris saat ini
                editBuilder.insert(new vscode.Position(currentLine + 1, 0), '\n');
            }).then(() => {
                // Set cursor ke line berikutnya
                editor.selection = new vscode.Selection(currentLine + 1, 0, currentLine + 1, 0);
                if (currentLine >= 0) {
                    let coding = "";
                    // Tambahkan baris saat ini
                    coding += editor.document.lineAt(currentLine).text + '\n';
                    if (/^\s*(\/\/|\/\*|\*|#|<!--)/.test(coding)) {
                        console.log("coding", coding);
                        const cleanCode = removeCommentTags(coding);
                        console.log("cleanCode", cleanCode);
                        triggerCodeCompletion(context, cleanCode, allCode);
                    }
                }
            });
        }
    }));
    // Register keybinding untuk Tab
    const triggerTabCommand = vscode.commands.registerCommand('pacar-ai.triggerTab', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const currentLine = editor.selection.active.line;
            if (currentLine + 1 < editor.document.lineCount) {
                const instructionLine = editor.document.lineAt(currentLine + 1).text;
                if (instructionLine === "Tekan Tab untuk menerima kode dari Pacar AI") {
                    vscode.commands.executeCommand('pacar-ai.applyCode').then(() => {
                        // Kembalikan fungsi asli tombol tab setelah code completion
                        vscode.commands.executeCommand('editor.action.indentLines');
                    });
                }
                else {
                    // Jika tidak ada pesan instruksi, gunakan fungsi asli tombol tab
                    vscode.commands.executeCommand('editor.action.indentLines');
                }
            }
            else {
                // Jika tidak ada pesan instruksi, gunakan fungsi asli tombol tab
                vscode.commands.executeCommand('editor.action.indentLines');
            }
        }
    });
    context.subscriptions.push(triggerTabCommand); // Pastikan command ini juga terdaftar
}
function onUserInput(line) {
    // Simpan line ke riwayat
    console.log(line);
}
function removeCommentTags(code) {
    return code
        .replace(/\/\/(.*)$/gm, '$1') // Menghapus // dan menyimpan teks setelahnya
        .replace(/\/\*[\s\S]*?\*\//g, '') // Menghapus komentar multi-baris
        .replace(/#(.*)$/gm, '$1') // Menghapus # dan menyimpan teks setelahnya
        .replace(/<!--(.*?)-->/g, '$1') // Menghapus komentar HTML
        .replace(/\n\s*\n/g, '\n') // Menghapus baris kosong yang tersisa
        .trim(); // Menghapus spasi di awal dan akhir
}
async function triggerCodeCompletion(context, comment, allCode) {
    const allCodeData = "```" + allCode + "```";
    // Logika untuk generate suggestion berdasarkan lineContent
    const token = context.globalState.get('token'); // Ambil token dari globalState
    const body = {
        code: `this is the full code from editor ${allCodeData}. continue the code from instruction comment: "${comment}". Provide only the code without triple backtick and programming language, with comments for additional lines.`,
    };
    console.log(body);
    const response = await fetch('https://chat.pacar-ai.my.id/api/code', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    // Cek apakah response berhasil
    if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Error ${response.status}: ${errorMessage}`);
    }
    // Jika berhasil, ambil data
    const coding = await response.json();
    // Menambahkan hasil sementara ke editor
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const currentLine = editor.selection.active.line;
        // Tampilkan pesan instruksi
        const instructionMessage = "Tekan Tab untuk menerima kode dari Pacar AI";
        editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(currentLine + 1, 0), `${instructionMessage}\n`); // Tampilkan instruksi
        }).then(() => {
            // Daftarkan command untuk menerapkan hasil code completion
            const applyCodeCommand = vscode.commands.registerCommand('pacar-ai.applyCode', () => {
                editor.edit(editBuilder => {
                    // Hapus pesan instruksi
                    const instructionStartPosition = new vscode.Position(currentLine + 1, 0);
                    const instructionEndPosition = new vscode.Position(currentLine + 2, 0);
                    editBuilder.delete(new vscode.Range(instructionStartPosition, instructionEndPosition));
                    // Sisipkan hasil code completion
                    editBuilder.insert(new vscode.Position(currentLine + 1, 0), `${coding}\n`);
                }).then(() => {
                    // Unregister applyCodeCommand setelah kode disisipkan
                    applyCodeCommand.dispose();
                    // Kembalikan fungsi asli tombol tab
                    vscode.commands.executeCommand('editor.action.indentLines');
                });
            });
            // Daftarkan command ke context
            context.subscriptions.push(applyCodeCommand);
        });
    }
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map