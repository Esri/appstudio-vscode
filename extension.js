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
    const osVer = process.platform;

    if (osVer !== 'darwin' && osVer !== 'win32' && osVer !== 'linux') {
        window.showErrorMessage('Unsupported Operating System. Abort.');
        return
    }

    // Function to select the AppStudio folder automatically from the AppStudio.ini file
    let autoSelectAppStudioPath = () => {
        
        let filePath;

        if (osVer === 'darwin' || osVer === 'linux') {
            let HOME = process.env.HOME;
            filePath = HOME + '/.config/Esri/AppStudio.ini'
        } else if (osVer === 'win32') {
            let appData = process.env.APPDATA;
            filePath = path.join(appData, '\\Esri\\AppStudio.ini');
        }

        loadIniFile(filePath).then( data => {

            let appStudioPath = data.General.installDir;
            if (appStudioPath !== undefined) {
                workspace.getConfiguration().update('AppStudio Path', appStudioPath, true);
                window.showInformationMessage('AppStudio path updated: ' + appStudioPath);
            } else {
                manualSelectAppStudioPath();
                console.log('No such property');
            }

        }, (reason) => {
            manualSelectAppStudioPath();
            console.log("Reading .ini file failed.")
            console.log(reason);
        });
    }

    // Function to select the AppStudio folder manually
    let manualSelectAppStudioPath = () => {
        window.showErrorMessage('System cannot find AppStudio on this machine');
        window.showWarningMessage('Select Yes above if you wish to find the folder manually');

        window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Would you like to select the AppStudio folder manually?',
        }).then( choice => {
            if(choice === 'Yes') {
                commands.executeCommand('selectAppStudioPath');
            }
        });
    }

    // If the configuration value is a empty string, i.e. the extension is run for the first time on the machine, 
    // select the AppStudio automatically
    if (workspace.getConfiguration().get('AppStudio Path') === "") {
        window.showInformationMessage("Locating AppStudio folder...");
        autoSelectAppStudioPath();
    }
    
    // Array containing the paths of all qml projects in the workspace
    let qmlProjectPaths = [];
    // Console ouput for the AppStudio Apps
    let consoleOutput = window.createOutputChannel('AppStudio');

    // Function to find files with extension '.qmlproject' across all workspace folders,
    // and add the folder path to the qmlProjectPaths array
    let addQmlProject = () => {
        workspace.findFiles('**/*.qmlproject').then( result => {
            result.forEach( uri => {
                //let folderPath = workspace.getWorkspaceFolder(uri).uri.fsPath;
                
                // use the directory name containing the .qmlproject file found as the project path
                qmlProjectPaths.push(path.dirname(uri.fsPath));
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
    
    // Command to select the AppStudio folder for executables
    let selectPathCmd = commands.registerCommand('selectAppStudioPath', function () {

        window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false
        }).then( folder => {
            if (folder !== undefined && folder.length === 1) {
                workspace.getConfiguration().update('AppStudio Path', folder[0].fsPath.toString(),true);
                window.showInformationMessage('AppStudio folder updated: ' + folder[0].fsPath);
            } 
        });
    });
    context.subscriptions.push(selectPathCmd);

    // Register all the executable related commands with the appropriate paths for the operating system
    let commandNames = ['appRun', 'appMake', 'appSetting', 'appUpload'];
    if (osVer === 'darwin') {

        registerExecutableCommands([
            '/AppRun.app/Contents/MacOS/AppRun',
            '/AppMake.app/Contents/MacOS/AppMake',
            '/AppSettings.app/Contents/MacOS/AppSettings',
            '/AppUpload.app/Contents/MacOS/AppUpload'
        ]);
        
    } else if (osVer === 'win32') {

        registerExecutableCommands([
            '\\bin\\appRun.exe',
            '\\bin\\appMake.exe',
            '\\bin\\appSettings.exe',
            '\\bin\\appUpload.exe'
        ])
        
    } else if (osVer === 'linux') {

        registerExecutableCommands([
            '/scripts/AppRun.sh',
            '/scripts/AppMake.sh',
            '/scripts/AppSettings.sh',
            '/scripts/AppUpload.sh'
        ]);
    }

    /*
    let testCmd = commands.registerCommand('testCmd', () => {

    });
    */

    // Create status bar items for the commands
    createStatusBarItem('$(file-directory)', 'selectAppStudioPath', "Select AppStudio Folder");
    createStatusBarItem('$(gear)', 'appSetting', 'appSetting(Alt+Shift+S)');
    createStatusBarItem('$(cloud-upload)', 'appUpload', 'appUpload(Alt+Shift+UpArrow)');
    createStatusBarItem('$(tools)', 'appMake', 'appMake(Alt+Shift+M)');
    createStatusBarItem('$(triangle-right)', 'appRun', 'appRun(Alt+Shift+R)');
    //createStatusBarItem('$(rocket)', 'testCmd', 'testCommand');

    // Register all the executable commands with the corresponding command names and executable paths
    function registerExecutableCommands (cmdPaths) {
        commandNames.forEach( (value, index) => {
            let cmd = commands.registerCommand(value, ()=> {
                createCommand(cmdPaths[index], qmlProjectPaths, consoleOutput);
            });
            // Add to a list of disposables which are disposed when this extension is deactivated.
            context.subscriptions.push(cmd);
        });
    }
    
    function createStatusBarItem(itemText, itemCommand, itemTooltip) {
        const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = itemText;
        statusBarItem.command = itemCommand;
        statusBarItem.tooltip = itemTooltip;
        statusBarItem.show();
    }
    
    // Create commands to run the executables
    function createCommand (executable, qmlProjectPaths, consoleOutputs) {
        let appStudioPath = workspace.getConfiguration().get('AppStudio Path');
    
        if (appStudioPath === "") {
            window.showWarningMessage("Please select the AppStudio folder first.");
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
                        runProcess(consoleOutputs,appStudioPath,executable,folder);
                    }
                });
            } else {
                // there is one qml project in the workspace
                runProcess(consoleOutputs,appStudioPath,executable,qmlProjectPaths[0]);
            }
        }
    }
    
    // run the executable with the corresponding paths and parameters
    function runProcess(consoleOutput, appStudioPath, executable, qmlProjectPath) {
    
        consoleOutput.show();
        consoleOutput.appendLine("Starting external tool " + "\"" + appStudioPath + executable + " " + qmlProjectPath + "\"");

        // Add the necessary environment variables 
        process.env.QT_ASSUME_STDERR_HAS_CONSOLE = '1';
        process.env.QT_FORCE_STDERR_LOGGING = '1';

        let childProcess = spawn(appStudioPath + executable, [qmlProjectPath], { env: process.env});
    
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
            window.showWarningMessage('Please ensure correct path for AppStudio folder is selected.');
            consoleOutput.show();
            consoleOutput.appendLine(err);
            console.error(`exec error: ${err}`);
        })
    
        childProcess.on('exit', (code) => {
            console.log(`child process exited with code ${code}`);
            consoleOutput.appendLine("\"" + appStudioPath + executable + "\"" + " finished");
        });
    }
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

