// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { spawn } = require('child_process');
const { window, workspace, commands } = vscode;
const loadIniFile = require('read-ini-file');
const path = require('path');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "appstudio" is now active!');

    // Array containing the paths of all qml projects in the workspace
    let qmlProjectPaths = [];
    // Console ouput for the AppStudio Apps
    let consoleOutput = window.createOutputChannel('AppStudio');

    // Function to find files with extension '.qmlproject' across all workspace folders,
    // and add the folder path to the qmlProjectPaths array
    let addQmlProject = () => {
        workspace.findFiles('*.qmlproject').then( result => {
            result.forEach( uri => {
                let folderPath = workspace.getWorkspaceFolder(uri).uri.fsPath;
                qmlProjectPaths.push(folderPath);
            });
        });
    }
    
    addQmlProject();

    // Event emitted when a workspace folder is added or removed
    // Empty the qmlProjectPaths array and call the function to add qml projects again  
    workspace.onDidChangeWorkspaceFolders( () => {
        qmlProjectPaths = [];
        addQmlProject();
    });
    
    // Command to select the AppStudio bin folder for executables
    let selectBinFolderCmd = commands.registerCommand('selectBinFolder', function () {

        //window.showInformationMessage('Current AppStudio bin folder: ' + workspace.getConfiguration().get('AppStudio Bin Folder'));

        window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false
        }).then( folder => {
            if (folder !== undefined && folder.length === 1) {
                workspace.getConfiguration().update('AppStudio Bin Folder', folder[0].fsPath.toString(),true);
                window.showInformationMessage('AppStudio bin folder updated: ' + folder[0].fsPath);
            } 
        });
    });

    // Commands to run all executables 
    let appRunCmd = commands.registerCommand('appRun', () => {
        createCommand('\\appRun.exe', qmlProjectPaths, consoleOutput);
    });

    let appMakeCmd = commands.registerCommand('appMake', () => {
        createCommand('\\appMake.exe', qmlProjectPaths, consoleOutput);
    }); 

    let appSettingCmd = commands.registerCommand('appSetting', () => {
        createCommand('\\appSettings.exe', qmlProjectPaths, consoleOutput);
    }); 

    let appUploadCmd = commands.registerCommand('appUpload', () => {
        createCommand('\\appUpload.exe', qmlProjectPaths, consoleOutput);
    });

    let readFile = commands.registerCommand('readFile', () => {
        let env = process.env.APPDATA;
        let filePath = path.join(env, '\\Esri\\AppStudio.ini');

        console.log(filePath);

        let data = loadIniFile(filePath + "sda").catch( () => {
            console.log("Reading .ini file failed.")
        });
        //console.log(data);
    })

    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(selectBinFolderCmd);
    context.subscriptions.push(appRunCmd);
    context.subscriptions.push(appMakeCmd);
    context.subscriptions.push(appSettingCmd);
    context.subscriptions.push(appUploadCmd);
    context.subscriptions.push(readFile);

    // Create status bar items for the commands
    createStatusBarItem('$(file-directory)', 'selectBinFolder', "Select Bin Folder");
    createStatusBarItem('$(gear)', 'appSetting', 'appSetting');
    createStatusBarItem('$(cloud-upload)', 'appUpload', 'appUpload');
    createStatusBarItem('$(circuit-board)', 'appMake', 'appMake');
    createStatusBarItem('$(triangle-right)', 'appRun', 'appRun');
    createStatusBarItem('$(rocket)', 'readFile', 'Read');
    
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

function createStatusBarItem(itemText, itemCommand, itemTooltip) {
    const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = itemText;
    statusBarItem.command = itemCommand;
    statusBarItem.tooltip = itemTooltip;
    statusBarItem.show();
}

// Create commands to run the executables
function createCommand (executable, qmlProjectPaths, consoleOutputs) {
    let appStudioBinPath = workspace.getConfiguration().get('AppStudio Bin Folder');

    if (appStudioBinPath === "") {
        window.showWarningMessage("Please select the AppStudio bin folder first.");
        return;
    }

    if (!workspace.workspaceFolders) {
        window.showWarningMessage('No folder opened.');
    } else {

        if (qmlProjectPaths.length === 0) {
            window.showErrorMessage("No qmlproject found.");
        } else if (qmlProjectPaths.length > 1) {
            // if there are more than one qml projects in the workspace, prompts the user to select one of them to run the command

            window.showQuickPick(qmlProjectPaths, {
                placeHolder: 'Multiple qmlprojects detected in workspace, please choose one to proceed'
            }).then( folder => {
                if(folder !== undefined) {
                    runProcess(consoleOutputs,appStudioBinPath,executable,folder);
                }
            });
           
        } else {
            runProcess(consoleOutputs,appStudioBinPath,executable,qmlProjectPaths[0]);
        }
    }
}

// run the executable with the corresponding paths and parameters
function runProcess(consoleOutput, appStudioBinPath, executable, qmlProjectPath) {

    consoleOutput.show();
    consoleOutput.appendLine("Starting external tool " + "\"" + appStudioBinPath + executable + " " + qmlProjectPath + "\"");
    //let process = execFile(appStudioBinPath + '\\AppRun.exe ' + projectPath, { env:
    let childProcess = spawn(appStudioBinPath + executable, [qmlProjectPath], { env:
    {
        'QT_ASSUME_STDERR_HAS_CONSOLE':'1',
        'QT_FORCE_STDERR_LOGGING':'1'
    }}
    );

    childProcess.stdout.on('data', data => {
        consoleOutput.show();
        consoleOutput.append(data.toString());
    });

    childProcess.stderr.on('data', data => {
        consoleOutput.show();
        consoleOutput.append(data.toString());
    });

    childProcess.on('error', err => {
        window.showErrorMessage('Error occured during execution, see console output for more details.');
        window.showWarningMessage('Please ensure correct path for AppStudio bin folder is selected.');
        consoleOutput.show();
        consoleOutput.appendLine(err.message);
        console.error(`exec error: ${err}`);
    })

    childProcess.on('exit', (code) => {
        console.log(`child process exited with code ${code}`);
        consoleOutput.appendLine("\"" + appStudioBinPath + executable + "\"" + " finished");
    });
}
