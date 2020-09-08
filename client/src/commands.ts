import { window, workspace, commands, Uri, ExtensionContext } from 'vscode';
import { autoSelectAppStudioPath, openMainFile, checkDocIsSaved } from './functions';
import { AppStudioTreeItem } from './appStudioViewProvider';
import * as ChildProcess from 'child_process';
import * as path from 'path';
import { ProjectController } from './projectController';
import * as fs from 'fs';

export function registerAllCommands(context: ExtensionContext, projController: ProjectController) {

	const osVer = process.platform;
	
	let openApiRefCmd = commands.registerCommand('openApiRefLink', function () {

		commands.executeCommand('vscode.open', Uri.parse('https://developers.arcgis.com/appstudio/api-reference/'));

	});
	context.subscriptions.push(openApiRefCmd);

	let manualSelectPlayerPathCmd = commands.registerCommand('manualSelectPlayerPath', () => {
		window.showQuickPick(['Yes', 'No'], {
			placeHolder: 'Would you like to select the installation path of AppStudio Player manually?',
		}).then(choice => {
			if (choice === 'Yes') {
				window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false
				}).then(folder => {
					if (folder !== undefined && folder.length === 1) {
						workspace.getConfiguration().update('installationPathPlayer', folder[0].fsPath.toString(), true);
						window.showInformationMessage('AppStudio Player installation path updated: ' + folder[0].fsPath);
					}
				});
			}
		});
	});
	context.subscriptions.push(manualSelectPlayerPathCmd);

	// Command to manually select the AppStudio installation path
	let manualSelectPathCmd = commands.registerCommand('manualSelectAppStudioPath', function () {

		window.showQuickPick(['Yes', 'No'], {
			placeHolder: 'Would you like to select the installation path of AppStudio manually?',
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

	let openMainfileCmd =  commands.registerCommand('openMainfile', (proj: AppStudioTreeItem) => {

		openMainFile(proj.mainfilePath, proj.label);

	});
	context.subscriptions.push(openMainfileCmd);

	let openAppinfoCmd = commands.registerCommand('openAppinfo', (proj: AppStudioTreeItem) => {
		let appinfoPath = Uri.file(path.join(proj.projectPath, 'appinfo.json'));
		window.showTextDocument(appinfoPath);
	});
	context.subscriptions.push(openAppinfoCmd);

	let refreshCmd = commands.registerCommand('refresh', () => {
		projController.getAppStudioProject();
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

	// Register all the executable related commands with the appropriate paths for the operating system
	const commandNames = ['appRun', 'appMake', 'appSetting', 'appUpload'];
	const activeCommandNames = ['appRunActive', 'appMakeActive', 'appSettingActive', 'appUploadActive'];

	if (osVer === 'darwin') {

		registerExecutableCommands([
			'/AppRun.app/Contents/MacOS/AppRun',
			'/AppMake.app/Contents/MacOS/AppMake',
			'/AppSettings.app/Contents/MacOS/AppSettings',
			'/AppUpload.app/Contents/MacOS/AppUpload'
		],
		'/AppStudioPlayer.app/Contents/MacOS/AppStudioPlayer');

	} else if (osVer === 'win32') {

		registerExecutableCommands([
			'\\bin\\appRun.exe',
			'\\bin\\appMake.exe',
			'\\bin\\appSettings.exe',
			'\\bin\\appUpload.exe'
		],
		'\\AppStudioPlayer.exe');

	} else if (osVer === 'linux') {

		registerExecutableCommands([
			'/scripts/AppRun.sh',
			'/scripts/AppMake.sh',
			'/scripts/AppSettings.sh',
			'/scripts/AppUpload.sh'
		],
		'/scripts/Application.sh');
	}
		
	// Register all the executable commands with the corresponding command names and executable paths
	function registerExecutableCommands(appStudioExecutable: string[], playerExecutable: string) {

		commandNames.forEach((value, index) => {

			let cmd = commands.registerCommand(value, (proj: AppStudioTreeItem) => {
				runAppStudioCommand(appStudioExecutable[index], proj.projectPath);
			});
			context.subscriptions.push(cmd);
		});

		activeCommandNames.forEach((value, index) => {

			let cmd = commands.registerCommand(value, () => {
				runAppStudioCommand(appStudioExecutable[index]);
			});
			context.subscriptions.push(cmd);
		});

		let cmd = commands.registerCommand('appPlayer', (proj: AppStudioTreeItem) => {
			runAppPlayer(playerExecutable, proj.projectPath);
		});
		context.subscriptions.push(cmd);

		let cmd2 = commands.registerCommand('appPlayerActive', () => {
			runAppPlayer(playerExecutable);
		});
		context.subscriptions.push(cmd2);
	}

	// Run commands to run the executables
	function runAppStudioCommand(executable: string, projectPath?: string) {
		let appStudioPath: string = workspace.getConfiguration().get('installationPath');

		if (appStudioPath === "") {
			window.showWarningMessage("Please select the AppStudio folder first.");
			return;
		}

		if (!projController.activeProjectPath) {
			window.showErrorMessage("No AppStudio project found.");
		} else {
			if (projectPath) {
				runProcess(appStudioPath, executable, projectPath);
			} else {
				runProcess(appStudioPath, executable, projController.activeProjectPath);
			}
		}
	}

	function runAppPlayer(playerExecutable: string, projectPath?:string) {
		let playerPath: string = workspace.getConfiguration().get('installationPathPlayer') + playerExecutable;

		if (!fs.existsSync(playerPath)) {
			window.showErrorMessage('Cannot find AppStudio Player installation on the default path. Select Yes above if you wish to find the installation manually.');
			commands.executeCommand('manualSelectPlayerPath');
			return;
		} 
		let syslogPath: string;
		try {
			let syslogPort = projController.syslogServer.port;
			syslogPath = 'syslog://127.0.0.1:' + syslogPort;
		} catch {}

		if (!projController.activeProjectPath) {
			window.showErrorMessage("No AppStudio project found.");
		} else {
			if (projectPath) {
				ChildProcess.spawn(playerPath, ['--app', projectPath, '-L', syslogPath]);
			} else {
				ChildProcess.spawn(playerPath, ['--app', projController.activeProjectPath, '-L', syslogPath]);
			}
		}
	}

	// run the executable with the corresponding paths and parameters
	async function runProcess(appStudioPath: string, executable: string, appStudioProjectPath: string) {

		let isSaved = await checkDocIsSaved(appStudioProjectPath);
		if (!isSaved) return;

		let syslogPath: string;
		try {
			let syslogPort = projController.syslogServer.port;
			syslogPath = 'syslog://127.0.0.1:' + syslogPort;
		} catch {}

		if (!syslogPath && path.basename(executable, path.extname(executable)).toUpperCase() === 'APPRUN') {
			projController.consoleOutput.show();
			if (!projController.hasWarnedSyslogError) {
				window.showErrorMessage('Syslog server failed to start, AppRun will show stdout instead');
				projController.hasWarnedSyslogError = true;
			}			
		}

		projController.consoleOutput.appendLine("Starting external tool " + "\"" + appStudioPath + executable + " " + appStudioProjectPath + "\"");

		// Add the necessary environment variables 
		process.env.QT_ASSUME_STDERR_HAS_CONSOLE = '1';
		process.env.QT_FORCE_STDERR_LOGGING = '1';

		let childProcess = ChildProcess.spawn(appStudioPath + executable, [appStudioProjectPath, '-L', syslogPath], { env: process.env });

		childProcess.stdout.on('data', data => {
			projController.consoleOutput.show();
			projController.consoleOutput.append(data.toString());
		});

		childProcess.stderr.on('data', data => {
			//consoleOutput.show();
			projController.consoleOutput.append(data.toString());
		});

		childProcess.on('error', err => {
			window.showErrorMessage('Error occured during execution, see console output for more details.');
			window.showWarningMessage('Please ensure correct path for AppStudio folder is selected.');
			projController.consoleOutput.show();
			projController.consoleOutput.appendLine(err.name + ': ' + err.message);
			console.error(`exec error: ${err}`);
		});

		childProcess.on('exit', (code) => {
			console.log(`child process exited with code ${code}`);
			projController.consoleOutput.appendLine("\"" + appStudioPath + executable + "\"" + " finished");
		});
	}

}




