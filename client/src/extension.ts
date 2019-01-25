// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ChildProcess from 'child_process';
import { window, workspace, commands } from 'vscode';
import * as path from 'path';
import * as loadIniFile from 'read-ini-file';
import * as fs from 'fs';
import * as glob from 'glob';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

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

	// Function to select the AppStudio folder automatically from the AppStudio.ini file
	let autoSelectAppStudioPath = () => {

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
				window.showInformationMessage('AppStudio path updated: ' + appStudioPath);
			} else {
				manualSelectAppStudioPath();
				console.log('No such property');
			}

		}, (reason) => {
			manualSelectAppStudioPath();
			console.log("Reading .ini file failed.");
			console.log(reason);
		});
	};

	// Ask the user to select the AppStudio folder manually
	let manualSelectAppStudioPath = () => {
		window.showErrorMessage('System cannot find AppStudio installation on this machine. Select Yes above if you wish to find the installation manually.');

		commands.executeCommand('selectAppStudioPath');
	};

	// If the configuration value is a empty string, i.e. the extension is run for the first time on the machine, 
	// select the AppStudio automatically
	if (workspace.getConfiguration().get('AppStudio Path') === "") {
		window.showInformationMessage("Locating AppStudio folder...");
		autoSelectAppStudioPath();
	}

	// Array containing the paths of all qml projects in the workspace
	let qmlProjectPaths: string[] = [];
	// Console ouput for the AppStudio Apps
	let consoleOutput = window.createOutputChannel('AppStudio');

	// Function to find files 'appinfo.json' across all workspace folders,
	// and add the folder path to the qmlProjectPaths array
	let addQmlProject = () => {
		workspace.findFiles('**/appinfo.json').then(result => {
			result.forEach(uri => {
				//let folderPath = workspace.getWorkspaceFolder(uri).uri.fsPath;

				fs.readFile(uri.fsPath, (err, data) => {
					if (err) console.log(err);
					let mainFile = JSON.parse(data.toString()).mainFile;
					window.showTextDocument(vscode.Uri.file(path.join(path.dirname(uri.fsPath), mainFile)),
						{
							preview: false
						});
				});
				// use the directory name containing the appinfo.json file found as the project path
				qmlProjectPaths.push(path.dirname(uri.fsPath));
			});
		});
	};

	addQmlProject();

	// Event emitted when a workspace folder is added or removed
	// Empty the qmlProjectPaths array and call the function to add qml projects again  
	workspace.onDidChangeWorkspaceFolders(() => {
		qmlProjectPaths = [];
		addQmlProject();
	});

	let openApiRefCmd = commands.registerCommand('openApiRefLink', function () {

		commands.executeCommand('vscode.open', vscode.Uri.parse('https://doc.arcgis.com/en/appstudio/api/reference/'));

	});
	context.subscriptions.push(openApiRefCmd);

	// Command to select the AppStudio folder for executables
	let selectPathCmd = commands.registerCommand('selectAppStudioPath', function () {

		window.showQuickPick(['Yes', 'No'], {
			placeHolder: 'Would you like to select the AppStudio folder manually? NOTE: This will override the current path.',
		}).then(choice => {
			if (choice === 'Yes') {
				window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false
				}).then(folder => {
					if (folder !== undefined && folder.length === 1) {
						workspace.getConfiguration().update('AppStudio Path', folder[0].fsPath.toString(), true);
						window.showInformationMessage('AppStudio folder updated: ' + folder[0].fsPath);
					}
				});
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
		]);

	} else if (osVer === 'linux') {

		registerExecutableCommands([
			'/scripts/AppRun.sh',
			'/scripts/AppMake.sh',
			'/scripts/AppSettings.sh',
			'/scripts/AppUpload.sh'
		]);
	}


	let testCmd = commands.registerCommand('testCmd', () => {

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

	function findFilesInDir(startPath: string, filter: RegExp){

		var results: string[] = [];
	
		if (!fs.existsSync(startPath)){
			console.log("no dir ",startPath);
			return;
		}
	
		var files=fs.readdirSync(startPath);
		for(var i=0;i<files.length;i++){
			var filename=path.join(startPath,files[i]);
			var stat = fs.lstatSync(filename);
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

	// Create status bar items for the commands
	createStatusBarItem('$(file-directory)', 'selectAppStudioPath', "Select AppStudio Folder");
	createStatusBarItem('$(question)', 'openApiRefLink', 'Open Api Reference');
	createStatusBarItem('$(gear)', 'appSetting', 'appSetting(Alt+Shift+S)');
	createStatusBarItem('$(cloud-upload)', 'appUpload', 'appUpload(Alt+Shift+UpArrow)');
	createStatusBarItem('$(tools)', 'appMake', 'appMake(Alt+Shift+M)');
	createStatusBarItem('$(triangle-right)', 'appRun', 'appRun(Alt+Shift+R)');
	//createStatusBarItem('$(rocket)', 'testCmd', 'testCommand');

	// Register all the executable commands with the corresponding command names and executable paths
	function registerExecutableCommands(cmdPaths: string[]) {
		commandNames.forEach((value, index) => {
			let cmd = commands.registerCommand(value, () => {
				createCommand(cmdPaths[index], qmlProjectPaths, consoleOutput);
			});
			// Add to a list of disposables which are disposed when this extension is deactivated.
			context.subscriptions.push(cmd);
		});
	}

	function createStatusBarItem(itemText: string, itemCommand: string, itemTooltip: string) {
		const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		statusBarItem.text = itemText;
		statusBarItem.command = itemCommand;
		statusBarItem.tooltip = itemTooltip;
		statusBarItem.show();
	}

	// Create commands to run the executables
	function createCommand(executable: string, qmlProjectPaths: string[], consoleOutputs: vscode.OutputChannel) {
		let appStudioPath: string = workspace.getConfiguration().get('AppStudio Path');

		if (appStudioPath === "") {
			window.showWarningMessage("Please select the AppStudio folder first.");
			return;
		}

		if (!workspace.workspaceFolders) {
			window.showWarningMessage('No folder opened.');
		} else {

			if (qmlProjectPaths.length === 0) {
				window.showErrorMessage("No appinfo.json found.");
			} else if (qmlProjectPaths.length > 1) {
				// if there are more than one qml projects in the workspace, prompts the user to select one of them to run the command

				let file = window.activeTextEditor.document.fileName;

				if (window.activeTextEditor !== undefined && qmlProjectPaths.some(projectPath => path.dirname(file) === projectPath)) {
					runProcess(consoleOutputs, appStudioPath, executable, path.dirname(file));
				} else {
					window.showQuickPick(qmlProjectPaths, {
						placeHolder: 'Multiple qmlprojects detected in workspace, please choose one to proceed'
					}).then(folder => {
						if (folder !== undefined) {
							runProcess(consoleOutputs, appStudioPath, executable, folder);
						}
					});
				}

			} else {
				// there is one qml project in the workspace
				runProcess(consoleOutputs, appStudioPath, executable, qmlProjectPaths[0]);
			}
		}
	}

	// run the executable with the corresponding paths and parameters
	function runProcess(consoleOutput: vscode.OutputChannel, appStudioPath: string, executable: string, qmlProjectPath: string) {

		consoleOutput.show();
		consoleOutput.appendLine("Starting external tool " + "\"" + appStudioPath + executable + " " + qmlProjectPath + "\"");

		// Add the necessary environment variables 
		process.env.QT_ASSUME_STDERR_HAS_CONSOLE = '1';
		process.env.QT_FORCE_STDERR_LOGGING = '1';

		let childProcess = ChildProcess.spawn(appStudioPath + executable, [qmlProjectPath], { env: process.env });

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
		'languageServerExample',
		'Language Server Example',
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
