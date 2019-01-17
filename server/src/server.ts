/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	TextDocument,
	ProposedFeatures,
	InitializeParams,
	CompletionItem,
	CompletionParams,
	Position,
	TextDocumentPositionParams,
	Hover,
	MarkupContent
} from 'vscode-languageserver';
import { DocHelper } from './docHelper';
import  * as fs from 'fs';
import * as path from 'path';

interface QmlComponent {
	name: string;
	exports: string [];
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

interface QmlInfo {
	completeModuleName: string;
	componentName: string;
	moduleVersion: string;
	dividedModuleName: string[];
}

interface QmlModule {
	name: string;
	components: QmlComponent [];
}

let importedModules: QmlModule [] = [];
let importedComponents: QmlComponent [] = [];
let qmlModules: QmlModule [] = [];
let completionItem: CompletionItem [] = [];

readQmltypeJson('AppFrameworkPlugin.json');
readQmltypeJson('AppFrameworkPositioningPlugin.json');
readQmltypeJson('AppFrameworkAuthentication.json');
readQmltypeJson('QtQml.json');
readQmltypeJson('QtLocation.json');
readQmltypeJson('QtPositioning.json');
readQmltypeJson('QtQuick.2.json');
readQmltypeJson('QtQuick.Controls.2.json');
readQmltypeJson('QtQuick.Controls.json');
readQmltypeJson('QtQuick.Layouts.json');
readQmltypeJson('QtQuick.Window.2.json');
readQmltypeJson('ArcGISRuntimePlugin.json');


// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

connection.onInitialize((_params: InitializeParams) => {

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: false,
				triggerCharacters: ['.',',']
			},
			hoverProvider: true
		}
	};
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.

documents.onDidChangeContent(change => {
	
	lookforImport( change.document);
});

async function lookforImport( doc: TextDocument): Promise<void> {

	importedModules = [];
	importedComponents = [];
	completionItem = [];

	let text = doc.getText();
	let pattern = /import\s+((\w+\.?)+)/g;
	//let pattern = /import\s+(.*) .*/g;
	let m: RegExpExecArray | null;

	while ((m = pattern.exec(text))) {
		//connection.console.log('Regex match: ' + m[0] + '|  ' + m[1] + '  |' + m[2]);
		//importedModules.push(m[1]);

		for (let module of qmlModules) {

			if (module.name === m[1] && importedModules.every( module => { return module.name !== m[1];})) {
				importedModules.push(module);

				// !!!!!  concat does not add to the original array calling the methods !
				importedComponents = importedComponents.concat(module.components);
				
				for (let c of module.components) {
					if (c.info) {
						// DEFAULT to add the component name in the first export array
						let item = CompletionItem.create(c.info[0].componentName);
						item.kind = 7;
						item.detail = c.info[0].completeModuleName + '/' + c.info[0].componentName + ' ' + c.info[0].moduleVersion + '\n' + c.name;
						completionItem.push(item);
					}
				}
			}
		}
	}

}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function firstCharToUpperCase( str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function readQmltypeJson(fileName: string) {

	let data = fs.readFileSync(path.join(__dirname, '../qml_types', fileName));
	let comps: QmlComponent[] = JSON.parse(data.toString()).components;
	//let completeModuleNames: string[] = [];

	for (let component of comps) {
		//completionItem.push(CompletionItem.create(component.name));
	
		if (!component.exports) continue;
		component.info = [];

		for (let e of component.exports) {
			//connection.console.log('###: ' + e);
			let m = e.match(/(.*)\/(\w*) (.*)/);
			if (!m) continue;

			let p = m[1].match(/\w+\.?/g);

			if(p[0] === 'ArcGIS.') {
				let simpleModuleName = m[1].replace(/ArcGIS.AppFramework/,'');
				if (simpleModuleName.charAt(0) === '.') {
					simpleModuleName = '-' + simpleModuleName.slice(1);
				}
			}

			component.info.push({
				completeModuleName: m[1],
				componentName: m[2],
				moduleVersion: m[3],
				dividedModuleName: p
			});

			let hasModule = false;
			for (let module of qmlModules) {
				let hasComponent = false;
				if (module.name === m[1]) {

					for ( let c of module.components) {
						if (c.name === component.name) {
							hasComponent = true;
							break;
						}
					}
					if (!hasComponent){
						module.components.push(component);
					}

					hasModule = true;
					break;
				}
			}

			if(!hasModule) {
				qmlModules.push(
					{
						name: m[1],
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

function getQmlType (docHelper: DocHelper, pos: Position): string {

	let firstPrecedingWordPos = docHelper.getFirstPrecedingRegex(docHelper.getFirstCharOutsideBracketPairs(pos, /\{/), /\w/);
	let result = docHelper.getFirstPrecedingWordString(firstPrecedingWordPos);

	if (!result) { return null;}

	if (isValidComponent(result, importedComponents)) {
		return result;
	} else {
		return getQmlType(docHelper, firstPrecedingWordPos);
	}

}

function isValidComponent (str: string, importedComponents: QmlComponent[]): boolean {

	for (let c of importedComponents) {
		// DEFAULT to compare with component name in first exports array
		if (c.info && str === c.info[0].componentName ) {
			return true;
		}
	}
	
	return false;
}

function addBuiltinKeyword (completionItem: CompletionItem[]) {
	let keywords = [
		'import', 'property', 'signal', 'id: ', 'states: '
	];
	let qmlTypes = [
		'bool', 'double', 'enumeration', 'int', 'list', 'real', 'string', 'url', 'var'
	];

	for (let keyword of keywords) {
		let item = CompletionItem.create(keyword);
		item.kind = 14;
		completionItem.push(item);
	}

	for (let type of qmlTypes) {
		let item = CompletionItem.create(type);
		item.kind = 21;
		completionItem.push(item);
	}

}

function addComponenetAttributes (component: QmlComponent, items: CompletionItem[], importedComponents: QmlComponent[]) {
	if (component.properties !== undefined) {
		for (let p of component.properties) {
			let item = CompletionItem.create(p.name);
			item.kind = 10;
			items.push(item);
		}
	}
	if (component.methods !== undefined) {
		for (let m of component.methods) {
			let item = CompletionItem.create(m.name);
			item.kind = 2;
			items.push(item);
		}
	}
	if (component.signals !== undefined) {
		for (let s of component.signals) {
			let item = CompletionItem.create('on' + firstCharToUpperCase(s.name));
			item.kind = 23;
			items.push(item);
		}
	}
	if (component.enums !== undefined) {
		for (let e of component.enums) {
			let values = e.values;
			for (let key in values) {
				let item = CompletionItem.create(key);
				item.kind = 13;
				items.push(item);
			}
		}
	}

	if (component.prototype !== undefined) {
		for (let prototypeComponent of importedComponents) {
			if (prototypeComponent.name === component.prototype) {
				// recursively add attributes of prototype component
				addComponenetAttributes(prototypeComponent, items, importedComponents);
			}
		}
	}
}

function constructApiRefUrl(qmlInfo: QmlInfo): string {
	let moduleNames = qmlInfo.dividedModuleName;
	let url: string;
	let html = '';
	if (moduleNames[0] === 'ArcGIS.') {
		url = 'https://doc.arcgis.com/en/appstudio/api/reference/framework/qml-';
	} else if (moduleNames[0] === 'Esri.') {
		url = 'https://developers.arcgis.com/qt/latest/qml/api-reference/qml-';
		html = '.html';
	} else {
		url = 'https://doc.qt.io/qt-5/qml-';
		html = '.html';
	}
	url = url + qmlInfo.completeModuleName.replace(/\./g,'-').toLowerCase() + '-' + qmlInfo.componentName.toLowerCase() + html;
	return url;
}


connection.onHover(
	(params: TextDocumentPositionParams): Hover => {

		let doc = documents.get(params.textDocument.uri);
		let pos = params.position;
		let docHelper = new DocHelper(doc);

		let range = docHelper.getWordAtPosition(pos);
		let word = doc.getText(range);

		let urls: string[] = [];

		for (let component of importedComponents) {
			// WARNING
			if (component.info && word === component.info[0].componentName) {
				/*
				if (component.info.length > 1 && !component.info.every( (val, i, arr) => val.completeModuleName === arr[0].completeModuleName )) {
					url = '';
					for (let info of component.info){
						url = url + info.completeModuleName.replace(/\./g,'-').toLowerCase() + '-' + info.componentName.toLowerCase() + html + 'n';
					}
				}*/

				let urlz = constructApiRefUrl(component.info[0]);
				if ( urls.every( val => val !== urlz )) {
					urls.push(urlz);
				}

				if (component.info.length > 1) {
					for (let i = 1; i < component.info.length; i++) {
						if (component.info[i].completeModuleName !== component.info[0].completeModuleName) {
							urls.push(constructApiRefUrl(component.info[i]));
						}
					}
				}
				/*
				let markup: MarkupContent = {
					kind: "markdown",
					// WARNING
					value: url
					//value: `[${component.info[0].componentName}](https://doc.arcgis.com/en/appstudio/api/reference/framework/qml-arcgis-appframework${component.info[0].dividedModuleName[0]}-${component.info[0].componentName} "Component found!")`
				};
				let result: Hover = {
					contents: markup,
					range: range
				}; 
				return result;
				*/
			
			}
		}

		let value = '';
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

		let docHelper = new DocHelper(doc);

		if (params.context.triggerCharacter === '.') {

			let items: CompletionItem [] = [];

			let componentName = docHelper.getFirstPrecedingWordString({ line: pos.line, character: pos.character-1 });
			
			for (let c of importedComponents) {
				// WARNING
				if (c.info && componentName === c.info[0].componentName ) {
					addComponenetAttributes(c, items, importedComponents);
				}
			}

			return items;
		}

		let firstPrecedingWordPos = docHelper.getFirstPrecedingRegex(Position.create(pos.line, pos.character - 1), /\w/);
		let word = docHelper.getFirstPrecedingWordString(firstPrecedingWordPos);

		if (word === 'import') {
			let items: CompletionItem [] = [];

			for (let module of qmlModules) {
				items.push(CompletionItem.create(module.name));
			}

			return items;
		}

		let componentName = getQmlType(docHelper, pos);
		
		connection.console.log('####### Object Found: ' + componentName);

		//isInPropertyOrSignal(doc, Position.create(pos.line, pos.character-1), pos);

		addBuiltinKeyword(completionItem);
		
		if( componentName !== null) {

			let items: CompletionItem [] = [];
			
			for (let c of importedComponents) {
				// WARNING
				if (c.info && componentName === c.info[0].componentName ) {
					addComponenetAttributes (c, items, importedComponents);
				}
			}

			return items.concat(completionItem);
		}

		return completionItem;
	}
);


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
