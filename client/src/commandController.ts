import { window, workspace, commands } from 'vscode';
import * as vscode from 'vscode';

export function registerAllCommands(context: vscode.ExtensionContext) {
	
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

}

