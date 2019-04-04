import * as vscode from 'vscode';
import * as ChildProcess from 'child_process';
import { window, workspace, commands } from 'vscode';
import * as path from 'path';
import * as loadIniFile from 'read-ini-file';
import * as fs from 'fs';
import { AppStudioProjInfo } from './extension';
import { AppStudioTreeView } from './appStudioViewProvider';
import { getAppStudioProject } from './functions';
import { createSyslogServer } from './syslog';

export class ProjectController {

	private _projectInfos: AppStudioProjInfo[];
	private _activeProjectPath: string;
	private _treeView: AppStudioTreeView;
	private _syslogServer: any;

	public consoleOutput = window.createOutputChannel('AppStudio tools stdout');
	public syslogOutput = window.createOutputChannel('AppRun Syslog Message');
	public projectStatusBar = window.createStatusBarItem();

	constructor() {
		this._treeView = new AppStudioTreeView(null);
		getAppStudioProject(this._treeView, this.projectStatusBar).then( result => {
			this._projectInfos = result.projects;
			this._activeProjectPath = result.path;
		});
		if (this._syslogServer === undefined || !this._syslogServer.isRunning()) {
			this._syslogServer = createSyslogServer(this.syslogOutput);
		}
		this.projectStatusBar.show();
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



}