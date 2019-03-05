
import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	CompletionItem,
	CompletionParams,
	Position,
	TextDocumentPositionParams,
	Hover,
	MarkupContent
} from 'vscode-languageserver';
import { DocController } from './docController';
import * as fs from 'fs';
import * as path from 'path';

export interface QmlComponent {
	name: string;
	exports: string[];
	prototype: string;
	properties: [{
		name: string
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

let allQmlComponents: QmlComponent[] = [];
let allQmlModules: QmlModule[] = [];
let docControllers: DocController[] = [];

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

/*
let qmltypesJsonFiles = fs.readdirSync(path.join(__dirname,'../../qml_types'));

for(let file of qmltypesJsonFiles) {
	readQmltypeJson(path.join(__dirname,'../../qml_types',file));
}
*/

readQmltypeJson(path.join(__dirname,'../../QMLTypes.json'));

connection.onInitialize((_params: InitializeParams) => {

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: false,
				triggerCharacters: ['.', '?']
			},
			hoverProvider: true
		}
	};
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.

documents.onDidChangeContent(change => {

	let controller = docControllers.find(controller => {
		return controller.getDoc() === change.document;
	});

	if (controller === undefined) {
		controller = new DocController(change.document);
		docControllers.push(controller);
	}
	controller.lookforImport(allQmlModules);
	controller.lookforId(change.document);
	//documents.all().forEach(doc => connection.console.log(doc.uri));
});

documents.onDidClose(close => {
	let index = docControllers.findIndex(controller => {
		return controller.getDoc() === close.document;
	});
	if (index > -1) {
		docControllers.splice(index, 1);
	}
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function firstCharToUpperCase(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function readQmltypeJson(fullFilePath: string) {

	let data = fs.readFileSync(fullFilePath);
	allQmlComponents = JSON.parse(data.toString()).components;

	for (let component of allQmlComponents) {
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
			for (let module of allQmlModules) {
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

			if (!hasModule) {
				allQmlModules.push(
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

/*
function isInPropertyOrSignal (doc: TextDocument, startPos: Position, endPos: Position) {

	let regex = /\:\s*\{/;
	let openingBracket = getFirstCharOutsideBracketPairs(doc, startPos, /\{/);
	let firstPrecedingColonPos = getFirstCharOutsideBracketPairs(doc, openingBracket, /\:/);
	let firstPrecedingWordPos = getFirstCharOutsideBracketPairs(doc, openingBracket, /\w/);

	connection.console.log('COLON pos: ' + firstPrecedingColonPos.line + ':' + firstPrecedingColonPos.character);
	connection.console.log('word pos: ' + firstPrecedingWordPos.line + ':' + firstPrecedingWordPos.character);
	if (comparePosition(firstPrecedingColonPos, firstPrecedingWordPos)) {
		connection.console.log(': GREATER');
	} else {
		connection.console.log('\\w GREATER');
	}
}
*/
export function hasCompletionItem(label: string, kind: number, completionItems: CompletionItem[]): boolean {
	for (let item of completionItems) {
		if (item.label === label && item.kind === kind) {
			return true;
		}
	}
	return false;
}

function addComponenetAttributes(component: QmlComponent, items: CompletionItem[], withSignal:boolean, withEnum: boolean) {
	if (component.properties !== undefined) {
		for (let p of component.properties) {
			if (!hasCompletionItem(p.name, 10, items)) {
				let item = CompletionItem.create(p.name);
				item.kind = 10;
				items.push(item);
			}
		}
	}
	if (component.methods !== undefined) {
		for (let m of component.methods) {
			if (!hasCompletionItem(m.name, 2, items)) {
				let item = CompletionItem.create(m.name);
				item.kind = 2;
				items.push(item);
			}
		}
	}
	if (withSignal && component.signals !== undefined) {
		for (let s of component.signals) {
			let label = 'on' + firstCharToUpperCase(s.name) + ': ';
			if (!hasCompletionItem(label, 23, items)) {
				let item = CompletionItem.create('on' + firstCharToUpperCase(s.name) + ': ');
				item.kind = 23;
				items.push(item);
			}
		}
	}
	if (withEnum && component.enums !== undefined) {
		for (let e of component.enums) {
			let values = e.values;
			for (let key in values) {
				if (!hasCompletionItem(key, 13,items)) {
					let item = CompletionItem.create(key);
					item.kind = 13;
					items.push(item);
				}
			}
		}
	}

	if (component.prototype !== undefined) {
		for (let prototypeComponent of allQmlComponents) {
			if (prototypeComponent.name === component.prototype) {
				// recursively add attributes of prototype component
				addComponenetAttributes(prototypeComponent, items, withSignal, withEnum);
			}
		}
	}
}

function constructApiRefUrl(qmlInfo: QmlInfo): string {
	let moduleNames = qmlInfo.dividedModuleName;
	let url: string;
	let html = '';

	if ((qmlInfo.completeModuleName) === 'QtQuick.Controls') {
		if (qmlInfo.moduleVersion.startsWith('2')) {
			qmlInfo.completeModuleName = 'QtQuick.Controls2';
		}
	}

	if (moduleNames[0] === 'ArcGIS.') {
		url = 'https://doc.arcgis.com/en/appstudio/api/reference/framework/qml-';
	} else if (moduleNames[0] === 'Esri.') {
		url = 'https://developers.arcgis.com/qt/latest/qml/api-reference/qml-';
		html = '.html';
	} else {
		url = 'https://doc.qt.io/qt-5/qml-';
		html = '.html';
	}
	url = url + qmlInfo.completeModuleName.replace(/\./g, '-').toLowerCase() + '-' + qmlInfo.componentName.toLowerCase() + html;
	return url;
}


connection.onHover(
	(params: TextDocumentPositionParams): Hover => {

		let doc = documents.get(params.textDocument.uri);
		let pos = params.position;
		let controller = docControllers.find( controller => {
			return controller.getDoc() === doc;
		});

		let range = controller.getWordAtPosition(pos);
		let word = doc.getText(range);

		let urls: string[] = [];

		let importedComponents = controller.getImportedComponents();
		for (let component of importedComponents) {
			// Assume that the componentName of different exports statements of the same component are the same, 
			// therefore only checks the first element in the info array.
			if (component.info && word === component.info[0].componentName) {
				// compare the hovering word with the componentName, if they are the same and the url array do not already contain the url,
				// add it to the array. (Different components may contain the same componentName)
				for (let info of component.info) {
					let url = constructApiRefUrl(info);
					if (!urls.includes(url)) {
						urls.push(url);
					}
				}
			}
		}

		let value = '';
		if (urls.length > 1) value = 'Multiple Api reference links found for this type.\n\nYou may have imported multiple modules containing the same type.\n\nSome of the links may be deprecated.\n';

		for (let url of urls) {
			value = value + '\n' + url + '\n';
		}

		let markup: MarkupContent = {
			kind: "markdown",
			value: value
		};
		let result: Hover = {
			contents: markup,
			range: range
		};
		return result;
	}
);

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(params: CompletionParams): CompletionItem[] => {

		let doc = documents.get(params.textDocument.uri);
		let pos = params.position;

		let controller = docControllers.find( controller => {
			return controller.getDoc() === doc;
		});

		let importedComponents = controller.getImportedComponents();

		if (params.context.triggerCharacter === '.') {

			let items: CompletionItem[] = [];

			let componentName = controller.getFirstPrecedingWordString({ line: pos.line, character: pos.character - 1 });

			for (let c of importedComponents) {
				// Assume that the componentName part of different exports statements of the same component are the same, 
				// therefore only checks the first element in the info array.
				if (c.info && componentName === c.info[0].componentName) {
					addComponenetAttributes(c, items, false, true);
				}
			}

			for (let id of controller.getIds()) {
				if (componentName === id.id) {

					for (let c of importedComponents) {
						if (c.info && id.type === c.info[0].componentName) {
							addComponenetAttributes(c, items, false, true);
						}
					}
				}
			}

			return items;
		}

		let firstPrecedingWordPos = controller.getFirstPrecedingRegex(Position.create(pos.line, pos.character - 1), /\w/);
		let word = controller.getFirstPrecedingWordString(firstPrecedingWordPos);

		if (word === 'import') {
			let items: CompletionItem[] = [];

			for (let module of allQmlModules) {

				if (module.name === 'QtQuick.Controls2') {
					items.push(CompletionItem.create('QtQuick.Controls 2'));
					continue;
				}
				items.push(CompletionItem.create(module.name + ' ' + module.version));
			}

			return items;
		}

		if (word === 'id') { return null;}

		let componentName = controller.getQmlType(pos);

		connection.console.log('####### Object Found: ' + componentName);

		//isInPropertyOrSignal(doc, Position.create(pos.line, pos.character-1), pos);

		//addBuiltinKeyword(completionItem);

		if (componentName !== null) {

			let items: CompletionItem[] = [];

			for (let c of importedComponents) {
				// Assume that the componentName part of different exports statements of the same component are the same, 
				// therefore only checks the first element in the info array.
				if (c.info && componentName === c.info[0].componentName) {
					addComponenetAttributes(c, items, true, false);
				}
			}

			return items.concat(controller.getCompletionItem());
		}

		return controller.getCompletionItem();
	}
);


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
