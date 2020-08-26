import { window, workspace, commands, Uri } from 'vscode';
import { ProjectController } from './projectController';
import * as path from 'path';

export function registerWorkspaceEvents(projectController: ProjectController) {

	// Event emitted when any appinfo.json file is created or deleted in the workspace
	let appinfoWatcher = workspace.createFileSystemWatcher('**/appinfo.json');
	appinfoWatcher.onDidCreate(() => {
		projectController.getAppStudioProject();
	});
	appinfoWatcher.onDidDelete(() => {
		projectController.getAppStudioProject();
	});

	// Event emitted when a workspace folder is added or removed
	workspace.onDidChangeWorkspaceFolders(() => {
		projectController.getAppStudioProject();
	});

	// ??
	workspace.onDidOpenTextDocument(e => {
	
		if (path.basename(e.fileName) === 'appinfo.json' && (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0)) {

			let uri = Uri.file(path.dirname(e.fileName));
			//workspace.updateWorkspaceFolders(0, null, {uri: uri});
			commands.executeCommand('vscode.openFolder', uri);
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

							window.showInformationMessage('The extension has remembered the choice you made and will not ask again. You can change this option at Settings -> Extensions -> ArcGIS AppStudio');
						}
					});
				});
			}
		}
	});

	function changeActiveProject(projPath: string) {
		projectController.treeView.reveal(projectController.projectInfos.find(proj => { return proj.projectPath === projPath; })).then(() => { },
			reason => console.log(reason));
	}

	/*
	window.onDidChangeActiveTextEditor( e => {
		//window.showInformationMessage(e.document.fileName);
		appStudioTreeView.reveal(appStudioProjects.find( proj => { return proj.projectPath === path.dirname(e.document.fileName);})).then( () => {},
		reason => console.log(reason));
	});
	*/
}