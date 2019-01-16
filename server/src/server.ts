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
	Range,
	Position,
	TextDocumentPositionParams,
	Hover,
	MarkupContent
} from 'vscode-languageserver';

import  * as fs from 'fs';
import * as path from 'path';

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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.

documents.onDidChangeContent(change => {
	//validateTextDocument(change.document);
	
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

				// !!!!!  concat does not add to the original array calling the methods !!!
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

	//importedModules = newimportedModules;
	//importedComponents = newimportedComponents;
	//completionItem = newcompletionItem;
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function firstCharToUpperCase( str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

let importedModules: QmlModule [] = [];
let importedComponents: QmlComponent [] = [];
let qmlModules: QmlModule [] = [];
let completionItem: CompletionItem [] = [];


//let data = fs.readFileSync(path.join(__dirname, 'AppFrameworkPlugin.json'));
//let json = JSON.parse(data.toString());
//let importedComponents: QmlComponent []; //= json.components;

function readQmltypeJson(filePath: string) {

	let data = fs.readFileSync(path.join(__dirname, filePath));
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

		/*
		let m = component.exports[0].match(/(.*)\/(\w*) (.*)/);
		// the module name after removing 'ArcGIS.AppFramework'
		if (!m) continue;
		
		if(!completeModuleNames) completeModuleNames = m[1];

		let appFrameworkModuleName = m[1].replace(/ArcGIS.AppFramework/,'');
		if(appFrameworkModuleName.charAt(0) === '.') {
			appFrameworkModuleName = '-' + appFrameworkModuleName.slice(1);
		}
	
		component.info = {
			moduleName: appFrameworkModuleName,
			componentName: m[2],
			moduleVersion: m[3]
		};
		*/
	}

	/*
	qmlModules.push({
		names: completeModuleNames,
		components: comps	
	});
	*/
}

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


/*
for (let component of importedComponents) {
	//completionItem.push(CompletionItem.create(component.name));

	if (!component.exports || component.exports.length !== 1) continue;
	let m = component.exports[0].match(/(.*)\/(\w*) (.*)/);
	// the module name after removing 'ArcGIS.AppFramework'
	let appFrameworkModuleName = m[1].replace(/ArcGIS.AppFramework/,'');
	if(appFrameworkModuleName.charAt(0) === '.') {
		appFrameworkModuleName = '-' + appFrameworkModuleName.slice(1);
	}

	if (!m) continue;

	component.info = {
		moduleName: appFrameworkModuleName,
		componentName: m[2],
		moduleVersion: m[3]
	};

	completionItem.push(CompletionItem.create(component.info.componentName));
}
*/

function getWordAtPosition(doc: TextDocument, pos: Position): Range {
	
	let range = Range.create(pos, Position.create(pos.line, pos.character+1));
	let i = 0 , j = 0;

	if (/\w/.test(doc.getText(range))) {
		while  (/\w/.test(getTextInRange(doc, pos.line, pos.character - i - 1, pos.line, pos.character - i))) {
			i++; 
		}
		while (/\w/.test(getTextInRange(doc, pos.line, pos.character + j, pos.line, pos.character + j + 1))) {
			j++;
		}
	}

	return Range.create(Position.create(pos.line, pos.character - i), Position.create(pos.line, pos.character + j));
	//return getTextInRange(doc, pos.line, pos.character - i, pos.line, pos.character + j);

}

function getFirstPrecedingWordString (doc: TextDocument, pos: Position): string {

	let i = 0;
	let char = doc.getText(Range.create(Position.create(pos.line, pos.character - 1), pos));
	// {start: {line: pos.line, character: pos.character - 1}, end: pos}
	
	while (/^\w/.test(char) && pos.character - i !== 0) {
		i++;
		char = getTextInRange(doc, pos.line, pos.character - i - 1, pos.line, pos.character - i);
		// { start: {line: pos.line, character: pos.character - i - 1}, end: {line: pos.line, character: pos.character - i}}
	}

	return doc.getText( { start: { line: pos.line, character: pos.character -i }, end: pos});
}

function getFirstPrecedingRegex (doc: TextDocument, pos: Position, regex: RegExp): Position{

	for (let lineOffset = pos.line; lineOffset >= 0; --lineOffset) {
		
		for( let charOffset = (lineOffset === pos.line) ? pos.character : getLineLength(doc, lineOffset); charOffset > 0; --charOffset) {
			let char = getTextInRange(doc, lineOffset, charOffset - 1, lineOffset, charOffset);
			if (regex.test(char)) {
				return Position.create(lineOffset, charOffset);
			}
		}
	}
	return Position.create(0,0);
}

// return true if position A is greater than B, false if A is equal or less than B
function comparePosition (posA: Position, posB: Position): boolean {
	if (posA.line > posB.line) {
		return true;
	} else if (posA.line < posB.line) {
		return false;
	} else {
		if (posA.character > posB.character) {
			return true;
		} else {
			return false;
		}
	}
}

function getTextInRange(doc: TextDocument ,startLine: number, startChac: number, endLine: number, endChar: number): string {
	return doc.getText(Range.create(Position.create(startLine, startChac), Position.create(endLine, endChar)));
}

function getLineLength(doc: TextDocument, line: number ) {

	let i = 0;
	let char = getTextInRange(doc, line, i, line, i+1);
	while(char !== '' && char !== '\n' && char !== '\r' && char !=='\r\n') {
		i++;
		char = getTextInRange(doc, line, i, line, i+1);
	}

	return i;
}

function getFirstCharOutsideBracketPairs (doc: TextDocument, pos: Position, regex: RegExp):Position {
	let closingCount = 0;
	for (let lineOffset = pos.line; lineOffset >= 0; --lineOffset) {
		for (let charOffset = (lineOffset === pos.line) ? pos.character: getLineLength(doc, lineOffset); charOffset>0; --charOffset) {

			let char = getTextInRange(doc, lineOffset, charOffset-1, lineOffset, charOffset);

			if (regex.test(char)) {
				if (closingCount === 0 ) {
					return Position.create(lineOffset, charOffset);
				}
			}

			if (char === '}') {
				closingCount++;
			}
			if (char === '{') {
				if (closingCount > 0){
					closingCount--;
				} 
				/*else {
					return Position.create(lineOffset, charOffset);	
				}*/
			}
		}
	}
	return Position.create(0, 0);
}

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

function getQmlType (doc: TextDocument, pos: Position): string {

	let firstPrecedingWordPos = getFirstPrecedingRegex(doc, getFirstCharOutsideBracketPairs(doc, pos, /\{/), /\w/);
	let result = getFirstPrecedingWordString(doc, firstPrecedingWordPos);

	if (!result) { return null;}

	if (isValidComponent(result, importedComponents)) {
		return result;
	} else {
		return getQmlType(doc, firstPrecedingWordPos);
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


connection.onHover(
	(params: TextDocumentPositionParams): Hover => {

		let doc = documents.get(params.textDocument.uri);
		let pos = params.position;

		let range = getWordAtPosition(doc, pos);
		let word = doc.getText(range);

		for (let component of importedComponents) {
			// WARNING
			if (component.info && word === component.info[0].componentName) {

				let moduleNames = component.info[0].dividedModuleName;
				//connection.console.log(component.m);
				let url: string;
				let html = '';
				if (moduleNames[0] === 'ArcGIS.') {
					url = 'https://doc.arcgis.com/en/appstudio/api/reference/framework/qml-';

					/*
					for (let i=0; i<moduleNames.length; i++) {
						if (moduleNames[i].charAt(moduleNames.length - 1) === '.') {
							moduleNames[i] = moduleNames[i].replace('.','-');
						} else {
							moduleNames[i] = moduleNames[i] + '-';
						}
						url = url + moduleNames[i];
					} */
				} else if (moduleNames[0] === 'Esri.') {
					url = 'https://developers.arcgis.com/qt/latest/qml/api-reference/qml-';
					html = '.html';
				} else {
					url = 'https://doc.qt.io/qt-5/qml-';
					html = '.html';
				}
				url = url + component.info[0].completeModuleName.replace(/\./g,'-').toLowerCase() + '-' + component.info[0].componentName.toLowerCase() + html;


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
				/*
					let simpleModuleName = m[1].replace(/ArcGIS.AppFramework/,'');
					if (simpleModuleName.charAt(0) === '.') {
						simpleModuleName = '-' + simpleModuleName.slice(1);
					}
					*/
			}
		}
	}
);

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(params: CompletionParams): CompletionItem[] => {
		//connection.console.log('trigger: ' + params.context.triggerKind);

		let doc = documents.get(params.textDocument.uri);
		let pos = params.position;

		if (params.context.triggerCharacter === '.') {

			let items: CompletionItem [] = [];

			let componentName = getFirstPrecedingWordString(doc, { line: pos.line, character: pos.character-1 });
			
			for (let c of importedComponents) {
				// WARNING
				if (c.info && componentName === c.info[0].componentName ) {
					addComponenetAttributes(c, items, importedComponents);
				}
			}

			return items;
		}

		let firstPrecedingWordPos = getFirstPrecedingRegex(doc, Position.create(pos.line, pos.character - 1), /\w/);
		let word = getFirstPrecedingWordString(doc, firstPrecedingWordPos);
		connection.console.log('###  Preceding: ' + word);

		if (word === 'import') {
			let items: CompletionItem [] = [];

			for (let module of qmlModules) {
				items.push(CompletionItem.create(module.name));
			}

			return items;
		}

		let componentName = getQmlType(doc, pos);
		
		connection.console.log('####### Object Found: ' + componentName);

		//isInPropertyOrSignal(doc, Position.create(pos.line, pos.character-1), pos);
		
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

		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return completionItem;
	}
);


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();