// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { window, workspace, commands } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import * as beautify from 'js-beautify';
import { autoSelectAppStudioPath, selectDefaultPlayerPath } from './functions';
import { registerAllCommands } from './commands';
import { ProjectController } from './projectController';
import { registerWorkspaceEvents } from './workspace';
import * as ChildProcess from 'child_process';

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
		window.showErrorMessage('Unsupported Operating System. AppStudio tools could not be run.');
		//return;
	}

	// If the configuration value is a empty string, i.e. the extension is run for the first time on the machine, 
	// select the AppStudio automatically
	if (workspace.getConfiguration().get('installationPath') === "") {
		//window.showInformationMessage("Locating AppStudio installation folder...");
		autoSelectAppStudioPath();
	}

	if (workspace.getConfiguration().get('installationPathPlayer') === '') {
		selectDefaultPlayerPath();
	}

	let projectController = ProjectController.getInstance();
	registerAllCommands(context, projectController);
	registerWorkspaceEvents(projectController);

	// Register the document format provider for qml language

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
		convertAllQmltoJson();
	});
	
	function convertAllQmltoJson() {
		let appStudioPath: string = workspace.getConfiguration().get('installationPath');

		let qmlTypes = findFilesInDir(process.env.USERPROFILE + '\\Applications\\ArcGIS\\AppStudio\\bin\\qml',/\.qmltypes/i);

		console.log(qmlTypes);
		let appNameArg: string [] = [path.join(__dirname,'../../QMLTYPEStoJSON')];

		let qmlTypesArgs: string[] = [];

		for (let type of qmlTypes) {
			qmlTypesArgs.push("--qmltypes");
			qmlTypesArgs.push(type);
		}

		let jsonArgs: string[] = [];
		jsonArgs.push('--json');
		jsonArgs.push(path.join(__dirname,'../..', 'QMLTypes_new.json'));
		
		let args = appNameArg.concat(qmlTypesArgs).concat(jsonArgs);
		//console.log(args);
		let str = '';
		for (let arg of args) {
			str += " " + arg;
		}
		console.log(str);
		let cp = ChildProcess.spawnSync(appStudioPath + '\\bin\\appRun.exe ',args);
	}

	createStatusBarItem('$(rocket)', 'testCmd', 'testCommand');
	function createStatusBarItem(itemText: string, itemCommand: string, itemTooltip: string) {
		const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		statusBarItem.text = itemText;
		statusBarItem.command = itemCommand;
		statusBarItem.tooltip = itemTooltip;
		statusBarItem.show();
	}

	// find all QMLTYPES file for language features 

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
	*/

	// identify sources of unhandled promise rejection
	process.on('unhandledRejection', (reason, p) => {
		//console.log(reason.stack);
		console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	});
	// Code below is for creating client for the QML language server

	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'main.js')
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
