import * as vscode from 'vscode';
import * as path from 'path';
import { AppStudioProjInfo } from './extension';

export class AppStudioTreeDataProvider implements vscode.TreeDataProvider<AppStudioTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<AppStudioTreeItem | undefined> = new vscode.EventEmitter<AppStudioTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<AppStudioTreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor (private appStudioProjects: AppStudioProjInfo[]) {
	}
	
	set projects(infos: AppStudioProjInfo[]) {
		this.appStudioProjects = infos;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AppStudioTreeItem): vscode.TreeItem {
		return element;
	}

	getParent(): AppStudioTreeItem {
		return null;
	}

	getChildren(): AppStudioTreeItem[] {

		let appStudioTreeItem: AppStudioTreeItem [] = [];

		if (!this.appStudioProjects) {
			return [];
		}
		
		if (this.appStudioProjects.length > 0) {
			for (let project of this.appStudioProjects) {

				let treeItem = new AppStudioTreeItem(project.title, vscode.TreeItemCollapsibleState.None, project.projectPath, project.mainFilePath);

				if (project.isActive) {
					treeItem.iconPath = {
						dark: path.join(__dirname, '..', '..', 'resources', 'appstudio-logo.svg'),
						light: path.join(__dirname, '..','..', 'resources', 'appstudio-logo.svg')
					};
					treeItem.contextValue += 'Active';
				}

				for (let folder of vscode.workspace.workspaceFolders) {
					if (project.projectPath === folder.uri.fsPath) {
						treeItem.contextValue += 'workspace';
					}
				}

				appStudioTreeItem.push(treeItem);
					//{ command: 'openMainfile', title: 'Open Mainfile', arguments: [mainfilePath]}
			}
			return appStudioTreeItem;

		} else {
			let noProject = new AppStudioTreeItem('No AppStudio project found.', vscode.TreeItemCollapsibleState.None);
			noProject.contextValue = 'Empty';
			noProject.iconPath = null;
			return [noProject];
		}
	}

}

export class AppStudioTreeItem extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly projectPath?: string,
		public readonly mainfilePath?: string,
		public readonly title?: string,
		public readonly command?: vscode.Command,
		public readonly isActive?: boolean
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}`;
	}

	iconPath = {
		dark: path.join(__dirname, '..', '..', 'resources', 'dark', 'folder-dark.svg'),
		light: path.join(__dirname, '..','..', 'resources', 'light', 'folder-light.svg')
	};

	contextValue = 'appStudioProject';
}

export class AppStudioTreeView {

	private appStudioTreeView: vscode.TreeView<AppStudioTreeItem>;
	private treeDataProvider: AppStudioTreeDataProvider;

	constructor(private appStudioProjects: AppStudioProjInfo[]) {
		this.treeDataProvider = new AppStudioTreeDataProvider(appStudioProjects);
		this.appStudioTreeView = vscode.window.createTreeView('appstudioProjects', { treeDataProvider: this.treeDataProvider});
	

		//vscode.commands.registerCommand('appstudio.refresh', () => this.treeDataProvider.refresh());

	}

	get treeview() {
		return this.appStudioTreeView;
	}

	get treeData() {
		return this.treeDataProvider;
	}

	private getNode(project: AppStudioProjInfo): AppStudioTreeItem {

		return new AppStudioTreeItem(project.title, vscode.TreeItemCollapsibleState.None);
	}

	public reveal(project: AppStudioProjInfo): Thenable<void> {
		const node = this.getNode(project);
		if (node) {
			return this.appStudioTreeView.reveal(node);
		}
		return null;
	}
	
}