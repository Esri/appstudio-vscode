import { window, workspace, commands } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AppStudioProjInfo } from './extension';
import { AppStudioTreeView } from './appStudioViewProvider';
import { openMainFile } from './functions';
import { SyslogServer } from './syslog';

export class ProjectController {

	private static instance: ProjectController;

	public static getInstance(): ProjectController {
		if (!ProjectController.instance) {
			ProjectController.instance = new ProjectController();
		}
		return ProjectController.instance;
	}

	private _projectInfos: AppStudioProjInfo[];
	private _activeProjectPath: string;
	private _treeView: AppStudioTreeView;
	private _syslogServer: SyslogServer;

	public consoleOutput = window.createOutputChannel('AppStudio tools stdout');
	public syslogOutput = window.createOutputChannel('AppRun Syslog Message');
	public projectStatusBar = window.createStatusBarItem();
	public hasWarnedSyslogError = false;

	private constructor() {
		this._treeView = new AppStudioTreeView(null);
		this.getAppStudioProject();
		/*
		if (this._syslogServer === undefined ) {
			this._syslogServer = createSyslogServer(this.syslogOutput);
		}
		*/
		this._syslogServer = SyslogServer.getInstance(this.syslogOutput);
		this.projectStatusBar.show();
		this.registerTreeviewChangeSelectionEvent();
	}

	get activeProjectPath() {
		return this._activeProjectPath;
	}

	get projectInfos() {
		return this._projectInfos;
	}

	get treeView() {
		return this._treeView;
	}

	get syslogServer() {
		return this._syslogServer;
	}

	set activeProjectPath(path: string) {
		this._activeProjectPath = path;
	}

	// Function to find 'appinfo.json' across all workspace folders,
	// and add the project paths to the appStudioProjectPaths array
	public async getAppStudioProject () {
		this._projectInfos = [];
		this._activeProjectPath = null;

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

				this._projectInfos.push({
					projectPath: projectPath,
					title: label,
					mainFilePath: mainFilePath,
					isActive: result.indexOf(uri) === 0
				});
				
			}
			this.projectStatusBar.text = 'Active AppStudio Project: ' + this._projectInfos[0].title;
			this._activeProjectPath = this._projectInfos[0].projectPath;
			openMainFile(this._projectInfos[0].mainFilePath, this._projectInfos[0].title);

			/* Create a syslog server 
			if (syslogServer === undefined || !syslogServer.isRunning()) {
				syslogServer = createSyslogServer(syslogOutput);
			}
			*/
		} else {
			this.projectStatusBar.text = 'No AppStudio Project found';

			/* Close the syslog server
			if (syslogServer) {
				syslogServer.stop();
			}
			*/
		}

		this._treeView.treeData.projects = this._projectInfos;
		this._treeView.treeData.refresh();

		//});
		//return {projects: appStudioProjects, path: activeProjectPath};

	}

	private registerTreeviewChangeSelectionEvent() {
		this._treeView.treeView.onDidChangeSelection( e => {

			if (e.selection.length === 1 && e.selection[0].projectPath) {
				//projectsStatus.activeProjectPath = e.selection[0].projectPath;
				this.activeProjectPath = e.selection[0].projectPath;
	
				for (let proj of this.projectInfos) {
					if (proj.projectPath === e.selection[0].projectPath) {
						proj.isActive = true;
					} else {
						proj.isActive = false;
					}
				}
				this.treeView.treeData.refresh();
	
				this.projectStatusBar.text = "Active AppStudio Project: " + e.selection[0].label;
			} /*else {
				appStudioTreeView.reveal(appStudioProjects.find( proj => { return proj.projectPath === activeProjectPath;})).then( () => {},
				reason => console.log(reason));
			} */
		});
	}

}