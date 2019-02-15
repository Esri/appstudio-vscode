// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ChildProcess from 'child_process';
import { window, workspace, commands } from 'vscode';
import * as path from 'path';
import * as loadIniFile from 'read-ini-file';
import * as fs from 'fs';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import { AppStudioTreeItem, AppStudioTreeView } from './appStudioViewProvider';

export interface AppStudioProjInfo {
	projectPath: string;
	title: string;
	mainFile: string;
}

let client: LanguageClient;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "appstudio" is now active!');
	const osVer = process.platform;

	if (osVer !== 'darwin' && osVer !== 'win32' && osVer !== 'linux') {
		window.showErrorMessage('Unsupported Operating System. Abort.');
		return;
	}

	// If the configuration value is a empty string, i.e. the extension is run for the first time on the machine, 
	// select the AppStudio automatically
	if (workspace.getConfiguration().get('AppStudio Path') === "") {
		window.showInformationMessage("Locating AppStudio folder...");
		autoSelectAppStudioPath();
	}

	// Array containing the paths of all AppStudio projects in the workspace
	let appStudioProjects: AppStudioProjInfo[];

	let activeProjectPath: string;

	// Console ouput for the AppStudio Apps
	let consoleOutput = window.createOutputChannel('AppStudio');

	let appStudioTreeView = new AppStudioTreeView(appStudioProjects);

	appStudioTreeView.treeview.onDidChangeSelection( e => {

		if (e.selection.length === 1 && e.selection[0].projectPath) {
			activeProjectPath = e.selection[0].projectPath;
			projectStatusBar.text = "Active Project: " + e.selection[0].title;
		}
	});

	// Add any AppStudio projects when the extension is activated
	getAppStudioProject();

	// Event emitted when any appinfo.json file is created or deleted in the workspace
	let appinfoWatcher = workspace.createFileSystemWatcher('**/appinfo.json');
	appinfoWatcher.onDidCreate(() => {
		getAppStudioProject();
	});
	appinfoWatcher.onDidDelete(() => {
		getAppStudioProject();
	});

	// Event emitted when a workspace folder is added or removed
	workspace.onDidChangeWorkspaceFolders(() => {
		getAppStudioProject();
	});

	// Create status bar items for all commands
	createStatusBarItem('$(question)', 'openApiRefLink', 'Open Api Reference');
	let projectStatusBar = window.createStatusBarItem();
	projectStatusBar.show();
	//createStatusBarItem('$(rocket)', 'testCmd', 'testCommand');

	// Code below is for registering all the commands

	let openApiRefCmd = commands.registerCommand('openApiRefLink', function () {

		commands.executeCommand('vscode.open', vscode.Uri.parse('https://doc.arcgis.com/en/appstudio/api/reference/'));

	});
	context.subscriptions.push(openApiRefCmd);

	// Command to manually select the AppStudio installation path
	let manualSelectPathCmd = commands.registerCommand('manualSelectAppStudioPath', function () {

		window.showQuickPick(['Yes', 'No'], {
			placeHolder: 'Would you like to select the installation path of AppStudio manually? NOTE: This will override the current path.',
		}).then(choice => {
			if (choice === 'Yes') {
				window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false
				}).then(folder => {
					if (folder !== undefined && folder.length === 1) {
						workspace.getConfiguration().update('AppStudio Path', folder[0].fsPath.toString(), true);
						window.showInformationMessage('AppStudio installation path updated: ' + folder[0].fsPath);
					}
				});
			}
		});

	});
	context.subscriptions.push(manualSelectPathCmd);

	let autoSelectAppStudioPathCmd = commands.registerCommand('autoSelectAppStudioPath', () => {

		window.showQuickPick(['Yes', 'No'], {
			placeHolder: 'Would you like the extension to find the AppStudio installation path for you?',
		}).then(choice => {
			if (choice == 'Yes') {
				autoSelectAppStudioPath();
			}
		});
	});
	context.subscriptions.push(autoSelectAppStudioPathCmd);

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
		]);

	} else if (osVer === 'linux') {

		registerExecutableCommands([
			'/scripts/AppRun.sh',
			'/scripts/AppMake.sh',
			'/scripts/AppSettings.sh',
			'/scripts/AppUpload.sh'
		]);
	}

	let openMainfileCmd =  commands.registerCommand('openMainfile', (proj: AppStudioTreeItem) => {
		let mainfilePath = vscode.Uri.file(proj.mainfilePath);
		window.showTextDocument(mainfilePath);
	});
	context.subscriptions.push(openMainfileCmd);

	let openAppinfoCmd = commands.registerCommand('openAppinfo', (proj: AppStudioTreeItem) => {
		let appinfoPath = vscode.Uri.file(path.join(proj.projectPath, 'appinfo.json'));
		window.showTextDocument(appinfoPath);
	});
	context.subscriptions.push(openAppinfoCmd);

	let refreshCmd = vscode.commands.registerCommand('appstudio.refresh', () => {
		getAppStudioProject();
	});
	context.subscriptions.push(refreshCmd);

	/*
	let testCmd = commands.registerCommand('testCmd', () => {

	});
	*/

	// code below is all the helper functions 

	function findFilesInDir(startPath: string, filter: RegExp) {

		let results: string[] = [];
	
		if (!fs.existsSync(startPath)){
			console.log("no dir ",startPath);
			return;
		}
	
		let files=fs.readdirSync(startPath);
		for(let i=0;i<files.length;i++){
			let filename=path.join(startPath,files[i]);
			let stat = fs.lstatSync(filename);
			if (stat.isDirectory()){
				results = results.concat(findFilesInDir(filename,filter)); //recurse
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
	function getAppStudioProject () {
		appStudioProjects = [];
		activeProjectPath = undefined;

		workspace.findFiles('**/appinfo.json').then(result => {

			if (result.length > 0) {
				for (let uri of result) {
					let projectPath = path.dirname(uri.fsPath);

					let data = fs.readFileSync(path.join(projectPath, 'iteminfo.json'));
					let title = JSON.parse(data.toString()).title;

					data = fs.readFileSync(uri.fsPath);
					let mainFile = JSON.parse(data.toString()).mainFile;

					appStudioProjects.push({
						projectPath: projectPath,
						title: title,
						mainFile: mainFile
					});

					window.showTextDocument(vscode.Uri.file(path.join(projectPath, mainFile)), {preview: false});
				}

				projectStatusBar.text = "Active Project: " + appStudioProjects[0].title;
				activeProjectPath = appStudioProjects[0].projectPath;
				//window.showTextDocument(vscode.Uri.file(path.join(activeProjectPath, appStudioProjects[0].mainFile)), {preview: false});

			} else {
				projectStatusBar.text = 'No AppStudio Project found';
			}

			appStudioTreeView.treeData.projects = appStudioProjects;
			appStudioTreeView.treeData.refresh();
		});
	}

	// Function to select the AppStudio folder automatically from the AppStudio.ini file
	function autoSelectAppStudioPath () {

		let filePath: string;

		if (osVer === 'darwin' || osVer === 'linux') {
			let HOME = process.env.HOME;
			filePath = HOME + '/.config/Esri/AppStudio.ini';
		} else if (osVer === 'win32') {
			let appData = process.env.APPDATA;
			filePath = path.join(appData, '\\Esri\\AppStudio.ini');
		}

		loadIniFile(filePath).then(data => {

			let appStudioPath = data.General.installDir;
			if (appStudioPath !== undefined) {
				workspace.getConfiguration().update('AppStudio Path', appStudioPath, true);
				window.showInformationMessage('AppStudio installation path updated: ' + appStudioPath);
			} else {
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
	function manualSelectAppStudioPath () {
		window.showErrorMessage('System cannot find AppStudio installation on this machine. Select Yes above if you wish to find the installation manually.');

		commands.executeCommand('manualSelectAppStudioPath');
	}

	function createStatusBarItem(itemText: string, itemCommand: string, itemTooltip: string) {
		const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		statusBarItem.text = itemText;
		statusBarItem.command = itemCommand;
		statusBarItem.tooltip = itemTooltip;
		statusBarItem.show();
		return statusBarItem;
	}

	// Register all the executable commands with the corresponding command names and executable paths
	function registerExecutableCommands(cmdPaths: string[]) {

		commandNames.forEach((value, index) => {

			let cmd = commands.registerCommand(value, (proj?: AppStudioTreeItem) => {

				if (proj) {
					runAppStudioCommand(cmdPaths[index], proj.projectPath);
				} else {
					runAppStudioCommand(cmdPaths[index]);
				}

			});
			// Add to a list of disposables which are disposed when this extension is deactivated.
			context.subscriptions.push(cmd);
		});
	}

	// Run commands to run the executables
	function runAppStudioCommand(executable: string, projectPath?: string) {
		let appStudioPath: string = workspace.getConfiguration().get('AppStudio Path');

		if (appStudioPath === "") {
			window.showWarningMessage("Please select the AppStudio folder first.");
			return;
		}

		if (!workspace.workspaceFolders) {
			window.showWarningMessage('No folder opened.');
		} else {

			if (!activeProjectPath) {
				//appStudioProjectPaths.length === 0 ||
				window.showErrorMessage("No appinfo.json found.");
			} else {
				if (projectPath) {
					runProcess(appStudioPath, executable, projectPath);
				} else {
					runProcess(appStudioPath, executable, activeProjectPath);
				}
			}
		}
	}

	// run the executable with the corresponding paths and parameters
	function runProcess(appStudioPath: string, executable: string, appStudioProjectPath: string) {

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
			window.showErrorMessage('Error occured during execution, see console output for more details.');
			window.showWarningMessage('Please ensure correct path for AppStudio folder is selected.');
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

	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'qml' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'AppStudioLanguageServer',
		'AppStudio Language Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
