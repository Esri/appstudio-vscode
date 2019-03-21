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
import * as beautify from 'js-beautify';

export interface AppStudioProjInfo {
	projectPath: string;
	title: string;
	mainFilePath: string;
	isActive: boolean;
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
	if (workspace.getConfiguration().get('installationPath') === "") {
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

			for (let proj of appStudioProjects) {
				if (proj.projectPath === e.selection[0].projectPath) {
					proj.isActive = true;
				} else {
					proj.isActive = false;
				}
			}
			appStudioTreeView.treeData.refresh();

			projectStatusBar.text = "Active AppStudio Project: " + e.selection[0].label;
		} /*else {
			appStudioTreeView.reveal(appStudioProjects.find( proj => { return proj.projectPath === activeProjectPath;})).then( () => {},
			reason => console.log(reason));
		} */
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

	workspace.onDidSaveTextDocument((e) => {
		//window.showInformationMessage(path.extname(e.fileName));
		if (path.extname(e.fileName) === '.qml' && path.dirname(e.fileName) !== activeProjectPath) {
			if (workspace.getConfiguration().get('changeActiveProjectRemember')) {
				if (workspace.getConfiguration().get('changeActiveProject')) {
					changeActiveProject(path.dirname(e.fileName));
				}
			} else {
				window.showInformationMessage('Do you want to change the active project when a QML file is saved?', { modal: true }, 'Yes', 'No').then(choice => {
					if (choice === 'Yes') {
						changeActiveProject(path.dirname(e.fileName));
					}
					if (!choice) return;

					window.showInformationMessage('Do you want to remember this choice for next time?', { modal: true }, 'Yes', 'No').then(choice2 => {

						if (choice2 === 'Yes') {
							workspace.getConfiguration().update('changeActiveProjectRemember', true, true);

							workspace.getConfiguration().update('changeActiveProject', choice === 'Yes', true);

							window.showInformationMessage('The extension has remembered the choice you made and will not ask again. You can change this option at Settings -> Extensions -> AppStudio for ArcGIS');
						}
					});
				});
			}
		}
	});

	function changeActiveProject(projPath: string) {
		appStudioTreeView.reveal(appStudioProjects.find( proj => { return proj.projectPath === projPath;})).then( () => {},
		reason => console.log(reason));
	}
	/*
	window.onDidChangeActiveTextEditor( e => {
		//window.showInformationMessage(e.document.fileName);
		appStudioTreeView.reveal(appStudioProjects.find( proj => { return proj.projectPath === path.dirname(e.document.fileName);})).then( () => {},
		reason => console.log(reason));
	});
	*/

	// Create status bar items for all commands
	let projectStatusBar = window.createStatusBarItem();
	projectStatusBar.show();
	//createStatusBarItem('$(rocket)', 'testCmd', 'testCommand');
	function createStatusBarItem(itemText: string, itemCommand: string, itemTooltip: string) {
		const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		statusBarItem.text = itemText;
		statusBarItem.command = itemCommand;
		statusBarItem.tooltip = itemTooltip;
		statusBarItem.show();
	}

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
						workspace.getConfiguration().update('installationPath', folder[0].fsPath.toString(), true);
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
	let activeCommandNames = ['appRunActive', 'appMakeActive', 'appSettingActive', 'appUploadActive'];

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

	function openMainFile (mainfilePath: string, title: string) {
		if (mainfilePath) {
			window.showTextDocument(vscode.Uri.file(mainfilePath), {preview: false}).then(null, (reason) => {
				window.showErrorMessage('Cannot open main file for project ' + title + ', please check if the "mainFile" property is correct in appinfo.json');
				window.showErrorMessage(reason.toString());
			});
		} else {
			window.showErrorMessage('Cannot open main file for project ' + title + ', no "mainFile" property in appinfo.json');
		}
	}

	let openMainfileCmd =  commands.registerCommand('openMainfile', (proj: AppStudioTreeItem) => {

		openMainFile(proj.mainfilePath, proj.label);

	});
	context.subscriptions.push(openMainfileCmd);

	let openAppinfoCmd = commands.registerCommand('openAppinfo', (proj: AppStudioTreeItem) => {
		let appinfoPath = vscode.Uri.file(path.join(proj.projectPath, 'appinfo.json'));
		window.showTextDocument(appinfoPath);
	});
	context.subscriptions.push(openAppinfoCmd);

	let refreshCmd = commands.registerCommand('refresh', () => {
		getAppStudioProject();
	});
	context.subscriptions.push(refreshCmd);

	let removeCmd = commands.registerCommand('removeProject', (proj: AppStudioTreeItem) => {
		for (let folder of workspace.workspaceFolders) {
			if (proj.projectPath === folder.uri.fsPath) {

				window.showQuickPick(['Yes', 'No'], {
					placeHolder: 'Do you want to remove the workspace folder?',
				}).then(choice => {
					if (choice === 'Yes') {
						
						//removeAppStudioProject(proj.projectPath);
						workspace.updateWorkspaceFolders(folder.index, 1);
					}
				});
			}
		}
	});
	context.subscriptions.push(removeCmd);

	vscode.languages.registerDocumentRangeFormattingEditProvider({ scheme: 'file', language: 'qml' }, {
		provideDocumentRangeFormattingEdits(doc, range): vscode.TextEdit[] {

			let startLine = range.start.line;
			let endLine = range.end.line;
			while (doc.lineAt(startLine).text.match(/^\s*$/)) {
				startLine++;
			}
			while (doc.lineAt(endLine).text.match(/^\s*$/)) {
				endLine--;
			}

			let startPos = doc.lineAt(startLine).range.start;
			let endPos = doc.lineAt(endLine).range.end;
			range = doc.validateRange(new vscode.Range(startPos, endPos));
			
			let newText = doc.getText(range).replace(/property\s+var/g, 'propertyvar');
			newText = beautify.js(newText).replace(/propertyvar/g, 'property var');

			return [vscode.TextEdit.replace(range, newText)];
		}
	});
	
	/*
	let testCmd = commands.registerCommand('testCmd', () => {
	});
	function convertAllQmltoJson() {
		let appStudioPath: string = workspace.getConfiguration().get('installationPath');

		let qmlTypes = findFilesInDir(process.env.USERPROFILE + '\\Applications\\ArcGIS\\AppStudio2\\bin\\qml',/\.qmltypes/i);

		console.log(qmlTypes);
		let appNameArg: string [] = [path.join(__dirname,'../../QMLTYPEStoJSON')];

		let qmlTypesArgs: string[] = [];

		for (let type of qmlTypes) {
			qmlTypesArgs.push("--qmltypes");
			qmlTypesArgs.push(type);
		}

		let jsonArgs: string[] = [];
		jsonArgs.push('--json');
		jsonArgs.push(path.join(__dirname,'../..', 'QMLTypes2.json'));
		
		let args = appNameArg.concat(qmlTypesArgs).concat(jsonArgs);
		console.log(args);
		let cp = ChildProcess.spawnSync(appStudioPath + '\\bin\\appRun.exe ',args);
	}
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

					let label: string;
					try {
						let data = fs.readFileSync(path.join(projectPath, 'iteminfo.json')).toString();
						let title = JSON.parse(data).title;
						if (title) {
							label = title + ' (' + path.basename(projectPath) + ')';
						} else {
							label = path.basename(projectPath);
						}
					} catch {
						label = path.basename(projectPath);

					}

					let data = fs.readFileSync(uri.fsPath).toString();
					let mainFile = JSON.parse(data).mainFile;
					let mainFilePath: string;
					if (mainFile) {
						mainFilePath = path.join(projectPath, mainFile);
					}

					appStudioProjects.push({
						projectPath: projectPath,
						title: label,
						mainFilePath: mainFilePath,
						isActive: result.indexOf(uri) === 0
					});
					
				}
				projectStatusBar.text = 'Active AppStudio Project: ' + appStudioProjects[0].title;
				activeProjectPath = appStudioProjects[0].projectPath;
			} else {
				projectStatusBar.text = 'No AppStudio Project found';
			}

			appStudioTreeView.treeData.projects = appStudioProjects;
			appStudioTreeView.treeData.refresh();

			openMainFile(appStudioProjects[0].mainFilePath, appStudioProjects[0].title);
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
				workspace.getConfiguration().update('installationPath', appStudioPath, true);
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

	// Register all the executable commands with the corresponding command names and executable paths
	function registerExecutableCommands(cmdPaths: string[]) {

		commandNames.forEach((value, index) => {

			let cmd = commands.registerCommand(value, (proj: AppStudioTreeItem) => {
				runAppStudioCommand(cmdPaths[index], proj.projectPath);
			});
			context.subscriptions.push(cmd);
		});

		activeCommandNames.forEach((value, index) => {

			let cmd = commands.registerCommand(value, () => {
				runAppStudioCommand(cmdPaths[index]);
			});
			context.subscriptions.push(cmd);
		});
	}

	// Run commands to run the executables
	function runAppStudioCommand(executable: string, projectPath?: string) {
		let appStudioPath: string = workspace.getConfiguration().get('installationPath');

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
	async function runProcess(appStudioPath: string, executable: string, appStudioProjectPath: string) {

		let willRun = await checkUnsavedDoc(appStudioProjectPath);

		if (!willRun) return;

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

	async function checkUnsavedDoc (activeProjectPath: string) {
		let unsavedDocsInActiveProj = workspace.textDocuments.filter(doc => { return path.dirname(doc.fileName) === activeProjectPath && doc.isDirty;});
		if (unsavedDocsInActiveProj.length > 0) {
			
			if (workspace.getConfiguration().get('saveFilesOnRunRemember')) {
				if (workspace.getConfiguration().get('saveFilesOnRun')) {
					for (let doc of unsavedDocsInActiveProj) {
						doc.save();
					}
				}
			} else {
				let message = 'The following files in the AppStudio project that you want to run have unsaved changes :\n\n';
				for (let doc of unsavedDocsInActiveProj) {
					message += doc.fileName + '\n';
				}
				const choice = await window.showInformationMessage(message, { modal: true }, 'Save All', 'Do Not Save');
				if (choice === 'Save All') {
					for (let doc of unsavedDocsInActiveProj) {
						doc.save();
					}
				}
				if (!choice) return false;

				const choice2 = await window.showInformationMessage('Do you want to remember this choice for next time?', { modal: true }, 'Yes', 'No'); //.then(choice2 => {
				if (choice2 === 'Yes') {
					workspace.getConfiguration().update('saveFilesOnRunRemember', true, true);

					workspace.getConfiguration().update('saveFilesOnRun', choice === 'Save All', true);

					window.showInformationMessage('The extension has remembered the choice you made and will not ask again. You can change this option at Settings -> Extensions -> AppStudio for ArcGIS');
				}
			}
		}
		return true;
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
