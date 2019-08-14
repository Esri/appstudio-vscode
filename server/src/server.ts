import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams
} from 'vscode-languageserver';
import { DocController } from './docController';
import * as fs from 'fs';
import * as path from 'path';

export interface QmlComponent {
	name: string;
	exports: string[];
	prototype: string;
	properties: [{
		name: string,
		type: string
	}];
	signals: [{
		name: string
	}];
	methods: [{
		name: string
	}];
	enums: [{
		name: string,
		values: {}
	}];
	info: QmlInfo[];
	attachedType: string;
}

export interface QmlInfo {
	completeModuleName: string;
	componentName: string;
	moduleVersion: string;
	dividedModuleName: string[];
}

export interface QmlModule {
	name: string;
	version: string;
	components: QmlComponent[];
}

export interface ObjectId {
	id: string;
	type: string;
}

export class LanguageServer {

	private static instance: LanguageServer;

	public static getInstance(): LanguageServer {
		if (!LanguageServer.instance) {
			//to do
			LanguageServer.instance = new LanguageServer();
		}
		return LanguageServer.instance;
	}

	private _allQmlComponents: QmlComponent[] = [];
	private _allQmlModules: QmlModule[] = [];
	private _docControllers: DocController[] = [];

	// Create a connection for the server. The connection uses Node's IPC as a transport.
	// Also include all preview / proposed LSP features.
	private _connection = createConnection(ProposedFeatures.all);

	// Create a simple text document manager. The text document manager
	// supports full document sync only
	private _documents: TextDocuments = new TextDocuments();

	private constructor() {
		this.readQmltypeJson(path.join(__dirname,'../../QMLTypes.json'));
		this.connection.onInitialize((_params: InitializeParams) => {

			return {
				capabilities: {
					textDocumentSync: this.documents.syncKind,
					// Tell the client that the server supports code completion
					completionProvider: {
						resolveProvider: false,
						triggerCharacters: ['.']
					},
					hoverProvider: true
				}
			};
		});
		// Make the text document manager listen on the connection
		// for open, change and close text document events
		this.documents.listen(this.connection);

		// Listen on the connection
		this.connection.listen();
	}

	public get connection() {
		return this._connection;
	}

	public get documents() {
		return this._documents;
	}

	public get docControllers() {
		return this._docControllers;
	}

	public get allQmlModules() {
		return this._allQmlModules;
	}

	public get allQmlComponents() {
		return this._allQmlComponents;
	}


	private readQmltypeJson(fullFilePath: string) {

		const excludedModules = ['ArcGIS.AppBuilder'];
	
		let data = fs.readFileSync(fullFilePath);
		this._allQmlComponents = JSON.parse(data.toString()).components;
	
		for (let component of this._allQmlComponents) {
			if (!component.exports) continue;
	
			component.info = [];
	
			for (let e of component.exports) {
	
				let m = e.match(/(.*)\/(\w*) (.*)/);
	
				if (!m) continue;
	
				let p = m[1].match(/\w+\.?/g);
	
				component.info.push({
					completeModuleName: m[1],
					componentName: m[2],
					moduleVersion: m[3],
					dividedModuleName: p
				});
	
				let hasModule = false;
				for (let module of this._allQmlModules) {
					let hasComponent = false;
					if (module.name === m[1] && module.version === m[3]) {
	
						for (let c of module.components) {
							if (c.name === component.name) {
								hasComponent = true;
								break;
							}
						}
						if (!hasComponent) {
							module.components.push(component);
						}
	
						hasModule = true;
						break;
					}
				}
	
				if (!hasModule && !excludedModules.includes(m[1])) {
					this._allQmlModules.push(
						{
							name: m[1],
							version: m[3],
							components: [component]
						}
					);
				}
			}
		}
	}

}