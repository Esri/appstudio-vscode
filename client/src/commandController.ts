import { window, workspace, commands } from 'vscode';
import * as vscode from 'vscode';
import { autoSelectAppStudioPath, openMainFile, checkDocIsSaved, getAppStudioProject } from './functions';
import { AppStudioTreeItem } from './appStudioViewProvider';
import * as ChildProcess from 'child_process';
import * as path from 'path';
import { AppStudioProjStatus } from './extension';
import { ProjectController } from './projectController';

export function registerAllCommands(context: vscode.ExtensionContext, projController: ProjectController) {

	const osVer = process.platform;

	// Register all the executable related commands with the appropriate paths for the operating system
	const commandNames = ['appRun', 'appMake', 'appSetting', 'appUpload'];
	const activeCommandNames = ['appRunActive', 'appMakeActive', 'appSettingActive', 'appUploadActive'];
	
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

		openMainFile(proj.mainfilePath, proj.label);

	});
	context.subscriptions.push(openMainfileCmd);

	let openAppinfoCmd = commands.registerCommand('openAppinfo', (proj: AppStudioTreeItem) => {
		let appinfoPath = vscode.Uri.file(path.join(proj.projectPath, 'appinfo.json'));
		window.showTextDocument(appinfoPath);
	});
	context.subscriptions.push(openAppinfoCmd);

	let refreshCmd = commands.registerCommand('refresh', () => {
		//getAppStudioProject();
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

			if (!projController.activeProjectPath) {
				//appStudioProjectPaths.length === 0 ||
				window.showErrorMessage("No appinfo.json found.");
			} else {
				if (projectPath) {
					runProcess(appStudioPath, executable, projectPath);
				} else {
					runProcess(appStudioPath, executable, projController.activeProjectPath);
				}
			}
		}
	}

	let hasWarnedSyslogError = false;
	// run the executable with the corresponding paths and parameters
	async function runProcess(appStudioPath: string, executable: string, appStudioProjectPath: string) {

		let isSaved = await checkDocIsSaved(appStudioProjectPath);
		if (!isSaved) return;

		let syslogPath: string;
		try {
			let syslogPort = projController.syslogServer.server().address().port;
			syslogPath = 'syslog://127.0.0.1:' + syslogPort;
		} catch {}

		if (!syslogPath && path.basename(executable, path.extname(executable)).toUpperCase() === 'APPRUN') {
			projController.consoleOutput.show();
			if (!hasWarnedSyslogError) {
				window.showErrorMessage('Syslog server failed to start, AppRun will show stdout instead');
				hasWarnedSyslogError = true;
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




