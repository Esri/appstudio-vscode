"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
let client;
function activate(context) {
    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'plaintext' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // Create the language client and start the client.
    client = new vscode_languageclient_1.LanguageClient('languageServerExample', 'Language Server Example', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
}
exports.activate = activate;
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
/*
else if (appStudioProjectPaths.length > 1) {
    // if there are more than one qml projects in the workspace, prompts the user to select one of them to run the command

    let file = window.activeTextEditor.document.fileName;

    if (window.activeTextEditor !== undefined && appStudioProjectPaths.some(projectPath => path.dirname(file) === projectPath)) {
        runProcess(consoleOutputs, appStudioPath, executable, path.dirname(file));
    } else {
        window.showQuickPick(appStudioProjectPaths, {
            placeHolder: 'Multiple AppStudio projects detected in workspace, please choose one to proceed'
        }).then(folder => {
            if (folder !== undefined) {
                runProcess(consoleOutputs, appStudioPath, executable, folder);
            }
        });
    }

} else {
    // there is one qml project in the workspace
    runProcess(consoleOutputs, appStudioPath, executable, appStudioProjectPaths[0]);
}
*/ 
//# sourceMappingURL=temp.js.map