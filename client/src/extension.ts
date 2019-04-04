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
import { createSyslogServer } from './syslog';
import { autoSelectAppStudioPath, getAppStudioProject } from './functions';
import { registerAllCommands } from './commandController';
import { ProjectController } from './projectController';

export interface AppStudioProjInfo {
	projectPath: string;
	title: string;
	mainFilePath: string;
	isActive: boolean;
}

export interface AppStudioProjStatus {
	appStudioProjects: AppStudioProjInfo[];
	activeProjectPath: string;
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

	let projectController = new ProjectController();

	// Array containing the paths of all AppStudio projects in the workspace
	//let appStudioProjects: AppStudioProjInfo[];
	//let activeProjectPath: string;

	/*
	let projectsStatus: AppStudioProjStatus = {
		appStudioProjects: [],
		activeProjectPath: undefined
	}

	// Console ouput for the AppStudio Apps
	let consoleOutput = window.createOutputChannel('AppStudio tools stdout');
	let syslogOutput = window.createOutputChannel('AppRun Syslog Message');

	let appStudioTreeView = new AppStudioTreeView(projectsStatus.appStudioProjects);

	let syslogServer;
	if (syslogServer === undefined || !syslogServer.isRunning()) {
		syslogServer = createSyslogServer(syslogOutput);
	}
	let projectStatusBar = window.createStatusBarItem();
	projectStatusBar.show();
	*/

	projectController.treeView.treeview.onDidChangeSelection( e => {

		if (e.selection.length === 1 && e.selection[0].projectPath) {
			//projectsStatus.activeProjectPath = e.selection[0].projectPath;
			projectController.activeProjectPath = e.selection[0].projectPath;

			for (let proj of projectController.projectInfos) {
				if (proj.projectPath === e.selection[0].projectPath) {
					proj.isActive = true;
				} else {
					proj.isActive = false;
				}
			}
			projectController.treeView.treeData.refresh();

			projectController.projectStatusBar.text = "Active AppStudio Project: " + e.selection[0].label;
		} /*else {
			appStudioTreeView.reveal(appStudioProjects.find( proj => { return proj.projectPath === activeProjectPath;})).then( () => {},
			reason => console.log(reason));
		} */
	});

	/*
	// Add any AppStudio projects when the extension is activated
	getAppStudioProject(appStudioTreeView, projectStatusBar).then( result => {
		projectsStatus.appStudioProjects = result.projects;
		projectsStatus.activeProjectPath = result.path;
		//console.log(activeProjectPath);
	});
	*/


	registerAllCommands(context, projectController);

	// Event emitted when any appinfo.json file is created or deleted in the workspace
	let appinfoWatcher = workspace.createFileSystemWatcher('**/appinfo.json');
	appinfoWatcher.onDidCreate(() => {
		//getAppStudioProject();
	});
	appinfoWatcher.onDidDelete(() => {
		//getAppStudioProject();
	});

	// Event emitted when a workspace folder is added or removed
	workspace.onDidChangeWorkspaceFolders(() => {
		//getAppStudioProject();
	});

	workspace.onDidOpenTextDocument(e => {
		if (path.basename(e.fileName) === 'appinfo.json' && workspace.workspaceFolders.length === 0) {
			let uri = vscode.Uri.file(path.dirname(e.fileName));

			//workspace.updateWorkspaceFolders(0, null, {uri: uri});
			vscode.commands.executeCommand('vscode.openFolder', uri);
		}
	});

	workspace.onDidSaveTextDocument((e) => {
		//window.showInformationMessage(path.extname(e.fileName));
		if (path.extname(e.fileName) === '.qml' && path.dirname(e.fileName) !== projectController.activeProjectPath) {
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
		projectController.treeView.reveal(projectController.projectInfos.find( proj => { return proj.projectPath === projPath;})).then( () => {},
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

	//createStatusBarItem('$(rocket)', 'testCmd', 'testCommand');
	function createStatusBarItem(itemText: string, itemCommand: string, itemTooltip: string) {
		const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		statusBarItem.text = itemText;
		statusBarItem.command = itemCommand;
		statusBarItem.tooltip = itemTooltip;
		statusBarItem.show();
	}

	// Code below is for registering all the commands

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



	process.on('unhandledRejection', (reason, p) => {
		console.log(reason.stack);
		console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	});
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
