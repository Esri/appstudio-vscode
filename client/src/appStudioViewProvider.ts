import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class appStudioTreeDataProvider implements vscode.TreeDataProvider<AppStudioProject> {

	private _onDidChangeTreeData: vscode.EventEmitter<AppStudioProject | undefined> = new vscode.EventEmitter<AppStudioProject | undefined>();
	readonly onDidChangeTreeData: vscode.Event<AppStudioProject | undefined> = this._onDidChangeTreeData.event;

	

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AppStudioProject): vscode.TreeItem {
		return element;
	}

	getChildren(element?: AppStudioProject): Thenable<AppStudioProject[]> {

		
		let r: AppStudioProject [] = [];
		return Promise.resolve(
		vscode.workspace.findFiles('**/appinfo.json').then(result => {

			if (result.length > 0) {
				for (let uri of result) {
					let projectPath = path.dirname(uri.fsPath);

					let iteminfoPath = path.join(projectPath, 'iteminfo.json');

					let data = fs.readFileSync(iteminfoPath);

					let title = JSON.parse(data.toString()).title;

					title += ' (' + path.basename(projectPath) + ')';

					data = fs.readFileSync(uri.fsPath);

					let mainFile = JSON.parse(data.toString()).mainFile;
					let mainfilePath = vscode.Uri.file(path.join(projectPath, mainFile));

					r.push( new AppStudioProject(title, vscode.TreeItemCollapsibleState.None, projectPath,
						{ command: 'openMainfile', title: 'Open Mainfile', arguments: [mainfilePath]}));
				}

			}
			return r;
		}));
	

	}


	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}


}

export class AppStudioProject extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly projectPath: string,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}`;
	}

	iconPath = {
		light: path.join(__dirname, '..', '..', 'resources', 'dark', 'folder-16-f.svg'),
		dark: path.join(__dirname, '..','..', 'resources', 'dark', 'folder-16-f.svg')
	};

	contextValue = 'appStudioProject';
}

export class AppStudioTreeView {

	private appStudioTreeView: vscode.TreeView<AppStudioProject>;
	private treeDataProvider: appStudioTreeDataProvider;

	constructor() {
		this.treeDataProvider = new appStudioTreeDataProvider();
		this.appStudioTreeView = vscode.window.createTreeView('appstudioProjects', { treeDataProvider: this.treeDataProvider});
	

		vscode.commands.registerCommand('appstudio.refresh', () => this.treeDataProvider.refresh());

	}

	get treeview() {
		return this.appStudioTreeView;
	}

	get treeData() {
		return this.treeDataProvider;
	}
	
}