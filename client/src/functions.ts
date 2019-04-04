import * as vscode from 'vscode';
import * as ChildProcess from 'child_process';
import { window, workspace, commands } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as loadIniFile from 'read-ini-file';
import { AppStudioTreeView } from './appStudioViewProvider';
import { AppStudioProjStatus } from './extension';

// Function to select the AppStudio folder automatically from the AppStudio.ini file
export function autoSelectAppStudioPath () {

	const osVer = process.platform;
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
export function manualSelectAppStudioPath () {
	window.showErrorMessage('System cannot find AppStudio installation on this machine. Select Yes above if you wish to find the installation manually.');

	commands.executeCommand('manualSelectAppStudioPath');
}

export function openMainFile (mainfilePath: string, title: string) {
	if (mainfilePath) {
		window.showTextDocument(vscode.Uri.file(mainfilePath), {preview: false}).then(null, (reason) => {
			window.showErrorMessage('Cannot open main file for project ' + title + ', please check if the "mainFile" property is correct in appinfo.json');
			window.showErrorMessage(reason.toString());
		});
	} else {
		window.showErrorMessage('Cannot open main file for project ' + title + ', no "mainFile" property in appinfo.json');
	}
}

// Function to find 'appinfo.json' across all workspace folders,
// and add the project paths to the appStudioProjectPaths array
export async function getAppStudioProject (appStudioTreeView: AppStudioTreeView, projectStatusBar: vscode.StatusBarItem) {
	let appStudioProjects = [];
	let activeProjectPath = undefined;

	let result = await workspace.findFiles('**/appinfo.json'); //then(result => {

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
			openMainFile(appStudioProjects[0].mainFilePath, appStudioProjects[0].title);

			/* Create a syslog server 
			if (syslogServer === undefined || !syslogServer.isRunning()) {
				syslogServer = createSyslogServer(syslogOutput);
			}
			*/
		} else {
			projectStatusBar.text = 'No AppStudio Project found';

			/* Close the syslog server
			if (syslogServer) {
				syslogServer.stop();
			}
			*/
		}

		appStudioTreeView.treeData.projects = appStudioProjects;
		appStudioTreeView.treeData.refresh();

	//});
	return {projects: appStudioProjects, path: activeProjectPath};

}

export async function checkDocIsSaved (activeProjectPath: string) {
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