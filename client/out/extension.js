"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const ChildProcess = require("child_process");
const vscode_1 = require("vscode");
const path = require("path");
const loadIniFile = require("read-ini-file");
const fs = require("fs");
const vscode_languageclient_1 = require("vscode-languageclient");
let client;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "appstudio" is now active!');
    const osVer = process.platform;
    if (osVer !== 'darwin' && osVer !== 'win32' && osVer !== 'linux') {
        vscode_1.window.showErrorMessage('Unsupported Operating System. Abort.');
        return;
    }
    // If the configuration value is a empty string, i.e. the extension is run for the first time on the machine, 
    // select the AppStudio automatically
    if (vscode_1.workspace.getConfiguration().get('AppStudio Path') === "") {
        vscode_1.window.showInformationMessage("Locating AppStudio folder...");
        autoSelectAppStudioPath();
    }
    // Array containing the paths of all AppStudio projects in the workspace
    let appStudioProjectPaths;
    let activeProjectPath;
    // Console ouput for the AppStudio Apps
    let consoleOutput = vscode_1.window.createOutputChannel('AppStudio');
    // Add any AppStudio projects when the extension is activated
    addAppStudioProject();
    // Event emitted when any appinfo.json file is created or deleted in the workspace
    let appinfoWatcher = vscode_1.workspace.createFileSystemWatcher('**/appinfo.json');
    appinfoWatcher.onDidCreate(() => {
        addAppStudioProject();
    });
    appinfoWatcher.onDidDelete(() => {
        addAppStudioProject();
    });
    // Event emitted when a workspace folder is added or removed
    vscode_1.workspace.onDidChangeWorkspaceFolders(() => {
        addAppStudioProject();
    });
    // Create status bar items for all commands
    createStatusBarItem('$(question)', 'openApiRefLink', 'Open Api Reference');
    let appSettingStatusBar = createStatusBarItem('$(gear)', 'appSetting', 'appSetting(Alt+Shift+S)');
    let appUploadStatusBar = createStatusBarItem('$(cloud-upload)', 'appUpload', 'appUpload(Alt+Shift+UpArrow)');
    let appMakeStatusBar = createStatusBarItem('$(tools)', 'appMake', 'appMake(Alt+Shift+M)');
    let appRunStatusBar = createStatusBarItem('$(triangle-right)', 'appRun', 'appRun(Alt+Shift+R)');
    let activeProjectStatusBar = createStatusBarItem('$(file-directory)', 'setActiveProject', 'Set Active Project');
    let noProjectStatusBar = vscode_1.window.createStatusBarItem();
    let activeStatusBarItems = [appSettingStatusBar, appUploadStatusBar, appMakeStatusBar, appRunStatusBar, activeProjectStatusBar];
    //createStatusBarItem('$(rocket)', 'testCmd', 'testCommand');
    // Code below is for registering all the commands
    let openApiRefCmd = vscode_1.commands.registerCommand('openApiRefLink', function () {
        vscode_1.commands.executeCommand('vscode.open', vscode.Uri.parse('https://doc.arcgis.com/en/appstudio/api/reference/'));
    });
    context.subscriptions.push(openApiRefCmd);
    // Command to manually select the AppStudio installation path
    let manualSelectPathCmd = vscode_1.commands.registerCommand('manualSelectAppStudioPath', function () {
        vscode_1.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Would you like to select the installation path of AppStudio manually? NOTE: This will override the current path.',
        }).then(choice => {
            if (choice === 'Yes') {
                vscode_1.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false
                }).then(folder => {
                    if (folder !== undefined && folder.length === 1) {
                        vscode_1.workspace.getConfiguration().update('AppStudio Path', folder[0].fsPath.toString(), true);
                        vscode_1.window.showInformationMessage('AppStudio installation path updated: ' + folder[0].fsPath);
                    }
                });
            }
        });
    });
    context.subscriptions.push(manualSelectPathCmd);
    let autoSelectAppStudioPathCmd = vscode_1.commands.registerCommand('autoSelectAppStudioPath', () => {
        vscode_1.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Would you like the extension to find the AppStudio installation path for you?',
        }).then(choice => {
            if (choice == 'Yes') {
                autoSelectAppStudioPath();
            }
        });
    });
    context.subscriptions.push(autoSelectAppStudioPathCmd);
    let setActiveProjectCmd = vscode_1.commands.registerCommand('setActiveProject', () => {
        if (appStudioProjectPaths) {
            vscode_1.window.showQuickPick(appStudioProjectPaths, {
                placeHolder: 'Set an Active AppStudio project:'
            }).then(folder => {
                if (folder !== undefined) {
                    activeProjectPath = folder;
                    activeProjectStatusBar.text = "Active Project: " + path.basename(activeProjectPath);
                }
            });
        }
        else {
            vscode_1.window.showErrorMessage("No appinfo.json found.");
        }
    });
    context.subscriptions.push(setActiveProjectCmd);
    // Register all the executable related commands with the appropriate paths for the operating system
    let commandNames = ['appRun', 'appMake', 'appSetting', 'appUpload'];
    if (osVer === 'darwin') {
        registerExecutableCommands([
            '/AppRun.app/Contents/MacOS/AppRun',
            '/AppMake.app/Contents/MacOS/AppMake',
            '/AppSettings.app/Contents/MacOS/AppSettings',
            '/AppUpload.app/Contents/MacOS/AppUpload'
        ]);
    }
    else if (osVer === 'win32') {
        registerExecutableCommands([
            '\\bin\\appRun.exe',
            '\\bin\\appMake.exe',
            '\\bin\\appSettings.exe',
            '\\bin\\appUpload.exe'
        ]);
    }
    else if (osVer === 'linux') {
        registerExecutableCommands([
            '/scripts/AppRun.sh',
            '/scripts/AppMake.sh',
            '/scripts/AppSettings.sh',
            '/scripts/AppUpload.sh'
        ]);
    }
    let testCmd = vscode_1.commands.registerCommand('testCmd', () => {
        /*
        let appStudioPath: string = workspace.getConfiguration().get('AppStudio Path');

        let qmlTypes = findFilesInDir(process.env.USERPROFILE + '\\Applications\\ArcGIS\\AppStudio\\bin\\qml',/\.qmltypes/i);
        
        for (let i = 0; i < qmlTypes.length; i++) {

            let result = ChildProcess.spawn(appStudioPath + '\\bin\\appRun.exe ', [path.join(__dirname,'../../QMLTYPEStoJSON'), '--qmltypes', qmlTypes[i], '--json', path.join(__dirname,'../../qml_types', i+'.json'), '--show', 'minimized']);
            result.on('close', data => {
                console.log(i+ ' finished ' +data);
                
                console.log('All finished');
            });
            
        }
        */
        //glob(process.env.USERPROFILE + '\\Applications\\ArcGIS\\AppStudio\\bin\\qml' + '/**/*.qmltypes',{}, (err, files) => {
        //console.log(files);
        //console.log('Length: ', files.length);
        //});
    });
    // code below is all the helper functions 
    function findFilesInDir(startPath, filter) {
        var results = [];
        if (!fs.existsSync(startPath)) {
            console.log("no dir ", startPath);
            return;
        }
        var files = fs.readdirSync(startPath);
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(startPath, files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                results = results.concat(findFilesInDir(filename, filter)); //recurse
            }
            else if (filter.test(filename)) {
                //console.log('-- found: ',filename);
                results.push(filename);
            }
        }
        return results;
    }
    // Function to find 'appinfo.json' across all workspace folders,
    // and add the project paths to the appStudioProjectPaths array
    function addAppStudioProject() {
        appStudioProjectPaths = [];
        activeProjectPath = undefined;
        vscode_1.workspace.findFiles('**/appinfo.json').then(result => {
            if (result.length > 0) {
                result.forEach(uri => {
                    //let folderPath = workspace.getWorkspaceFolder(uri).uri.fsPath;
                    let projectPath = path.dirname(uri.fsPath);
                    fs.readFile(uri.fsPath, (err, data) => {
                        if (err)
                            console.log(err);
                        let mainFile = JSON.parse(data.toString()).mainFile;
                        vscode_1.window.showTextDocument(vscode.Uri.file(path.join(projectPath, mainFile)), {
                            preview: false
                        });
                    });
                    // use the directory name containing the appinfo.json file found as the project path
                    appStudioProjectPaths.push(projectPath);
                    activeProjectPath = projectPath;
                    activeProjectStatusBar.text = "Active Project: " + path.basename(activeProjectPath);
                });
                noProjectStatusBar.hide();
                for (let item of activeStatusBarItems) {
                    item.show();
                }
            }
            else {
                for (let item of activeStatusBarItems) {
                    item.hide();
                }
                noProjectStatusBar.text = 'No AppStudio Project found';
                noProjectStatusBar.show();
            }
        });
    }
    // Function to select the AppStudio folder automatically from the AppStudio.ini file
    function autoSelectAppStudioPath() {
        let filePath;
        if (osVer === 'darwin' || osVer === 'linux') {
            let HOME = process.env.HOME;
            filePath = HOME + '/.config/Esri/AppStudio.ini';
        }
        else if (osVer === 'win32') {
            let appData = process.env.APPDATA;
            filePath = path.join(appData, '\\Esri\\AppStudio.ini');
        }
        loadIniFile(filePath).then(data => {
            let appStudioPath = data.General.installDir;
            if (appStudioPath !== undefined) {
                vscode_1.workspace.getConfiguration().update('AppStudio Path', appStudioPath, true);
                vscode_1.window.showInformationMessage('AppStudio installation path updated: ' + appStudioPath);
            }
            else {
                manualSelectAppStudioPath();
                console.log('No such property');
            }
        }, (reason) => {
            manualSelectAppStudioPath();
            console.log("Reading .ini file failed.");
            console.log(reason);
        });
    }
    // Ask the user to select the AppStudio folder manually
    function manualSelectAppStudioPath() {
        vscode_1.window.showErrorMessage('System cannot find AppStudio installation on this machine. Select Yes above if you wish to find the installation manually.');
        vscode_1.commands.executeCommand('manualSelectAppStudioPath');
    }
    function createStatusBarItem(itemText, itemCommand, itemTooltip) {
        const statusBarItem = vscode_1.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = itemText;
        statusBarItem.command = itemCommand;
        statusBarItem.tooltip = itemTooltip;
        statusBarItem.show();
        return statusBarItem;
    }
    // Register all the executable commands with the corresponding command names and executable paths
    function registerExecutableCommands(cmdPaths) {
        commandNames.forEach((value, index) => {
            let cmd = vscode_1.commands.registerCommand(value, () => {
                runAppStudioCommand(cmdPaths[index]);
            });
            // Add to a list of disposables which are disposed when this extension is deactivated.
            context.subscriptions.push(cmd);
        });
    }
    // Run commands to run the executables
    function runAppStudioCommand(executable) {
        let appStudioPath = vscode_1.workspace.getConfiguration().get('AppStudio Path');
        if (appStudioPath === "") {
            vscode_1.window.showWarningMessage("Please select the AppStudio folder first.");
            return;
        }
        if (!vscode_1.workspace.workspaceFolders) {
            vscode_1.window.showWarningMessage('No folder opened.');
        }
        else {
            if (appStudioProjectPaths.length === 0 || !activeProjectPath) {
                vscode_1.window.showErrorMessage("No appinfo.json found.");
            }
            else {
                runProcess(appStudioPath, executable, activeProjectPath);
            }
        }
    }
    // run the executable with the corresponding paths and parameters
    function runProcess(appStudioPath, executable, appStudioProjectPath) {
        consoleOutput.show();
        consoleOutput.appendLine("Starting external tool " + "\"" + appStudioPath + executable + " " + appStudioProjectPath + "\"");
        // Add the necessary environment variables 
        process.env.QT_ASSUME_STDERR_HAS_CONSOLE = '1';
        process.env.QT_FORCE_STDERR_LOGGING = '1';
        let childProcess = ChildProcess.spawn(appStudioPath + executable, [appStudioProjectPath], { env: process.env });
        childProcess.stdout.on('data', data => {
            consoleOutput.show();
            consoleOutput.append(data.toString());
        });
        childProcess.stderr.on('data', data => {
            consoleOutput.show();
            consoleOutput.append(data.toString());
        });
        childProcess.on('error', err => {
            vscode_1.window.showErrorMessage('Error occured during execution, see console output for more details.');
            vscode_1.window.showWarningMessage('Please ensure correct path for AppStudio folder is selected.');
            consoleOutput.show();
            consoleOutput.appendLine(err.name + ': ' + err.message);
            console.error(`exec error: ${err}`);
        });
        childProcess.on('exit', (code) => {
            console.log(`child process exited with code ${code}`);
            consoleOutput.appendLine("\"" + appStudioPath + executable + "\"" + " finished");
        });
    }
    // Code below is for creating client for the QML language server
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
        documentSelector: [{ scheme: 'file', language: 'qml' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // Create the language client and start the client.
    client = new vscode_languageclient_1.LanguageClient('AppStudioLanguageServer', 'AppStudio Language Server', serverOptions, clientOptions);
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
//# sourceMappingURL=extension.js.map