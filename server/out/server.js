"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const docHelper_1 = require("./docHelper");
const fs = require("fs");
const path = require("path");
let importedModules = [];
let importedComponents = [];
let qmlModules = [];
let completionItem = [];
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
let connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new vscode_languageserver_1.TextDocuments();
connection.onInitialize((_params) => {
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ['.', ',']
            },
            hoverProvider: true
        }
    };
});
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    lookforImport(change.document);
    //documents.all().forEach(doc => connection.console.log(doc.uri));
});
function lookforImport(doc) {
    return __awaiter(this, void 0, void 0, function* () {
        importedModules = [];
        importedComponents = [];
        completionItem = [];
        let text = doc.getText();
        let pattern = /import\s+((\w+\.?)+)/g;
        let m;
        while ((m = pattern.exec(text))) {
            for (let module of qmlModules) {
                if (module.name === m[1] && importedModules.every(module => { return module.name !== m[1]; })) {
                    importedModules.push(module);
                    // NOTE: concat does not add to the original array calling the method !
                    importedComponents = importedComponents.concat(module.components);
                    for (let c of module.components) {
                        if (c.info) {
                            // DEFAULT to add the component name in the first export array
                            let item = vscode_languageserver_1.CompletionItem.create(c.info[0].componentName);
                            item.kind = 7;
                            item.detail = 'Imported from ' + c.info[0].completeModuleName + '/' + c.info[0].componentName + ' ' + c.info[0].moduleVersion;
                            completionItem.push(item);
                        }
                    }
                }
            }
        }
    });
}
connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VSCode
    connection.console.log('We received an file change event');
});
function firstCharToUpperCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function readQmltypeJson(fileName) {
    let data = fs.readFileSync(path.join(__dirname, '../qml_types', fileName));
    let comps = JSON.parse(data.toString()).components;
    for (let component of comps) {
        if (!component.exports)
            continue;
        component.info = [];
        for (let e of component.exports) {
            let m = e.match(/(.*)\/(\w*) (.*)/);
            if (!m)
                continue;
            let p = m[1].match(/\w+\.?/g);
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
                qmlModules.push({
                    name: m[1],
                    components: [component]
                });
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
function getQmlType(docHelper, pos) {
    let firstPrecedingWordPos = docHelper.getFirstPrecedingRegex(docHelper.getFirstCharOutsideBracketPairs(pos, /\{/), /\w/);
    let result = docHelper.getFirstPrecedingWordString(firstPrecedingWordPos);
    if (!result) {
        return null;
    }
    if (isValidComponent(result, importedComponents)) {
        return result;
    }
    else {
        return getQmlType(docHelper, firstPrecedingWordPos);
    }
}
function isValidComponent(str, importedComponents) {
    for (let c of importedComponents) {
        // DEFAULT to compare with component name in first exports array
        if (c.info && str === c.info[0].componentName) {
            return true;
        }
    }
    return false;
}
function addBuiltinKeyword(completionItem) {
    let keywords = [
        'import', 'property', 'signal', 'id: ', 'states: '
    ];
    let qmlTypes = [
        'bool', 'double', 'enumeration', 'int', 'list', 'real', 'string', 'url', 'var'
    ];
    for (let keyword of keywords) {
        let item = vscode_languageserver_1.CompletionItem.create(keyword);
        item.kind = 14;
        completionItem.push(item);
    }
    for (let type of qmlTypes) {
        let item = vscode_languageserver_1.CompletionItem.create(type);
        item.kind = 21;
        completionItem.push(item);
    }
}
function addComponenetAttributes(component, items, importedComponents) {
    if (component.properties !== undefined) {
        for (let p of component.properties) {
            let item = vscode_languageserver_1.CompletionItem.create(p.name);
            item.kind = 10;
            items.push(item);
        }
    }
    if (component.methods !== undefined) {
        for (let m of component.methods) {
            let item = vscode_languageserver_1.CompletionItem.create(m.name);
            item.kind = 2;
            items.push(item);
        }
    }
    if (component.signals !== undefined) {
        for (let s of component.signals) {
            let item = vscode_languageserver_1.CompletionItem.create('on' + firstCharToUpperCase(s.name));
            item.kind = 23;
            items.push(item);
        }
    }
    if (component.enums !== undefined) {
        for (let e of component.enums) {
            let values = e.values;
            for (let key in values) {
                let item = vscode_languageserver_1.CompletionItem.create(key);
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
function constructApiRefUrl(qmlInfo) {
    let moduleNames = qmlInfo.dividedModuleName;
    let url;
    let html = '';
    if (moduleNames[0] === 'ArcGIS.') {
        url = 'https://doc.arcgis.com/en/appstudio/api/reference/framework/qml-';
    }
    else if (moduleNames[0] === 'Esri.') {
        url = 'https://developers.arcgis.com/qt/latest/qml/api-reference/qml-';
        html = '.html';
    }
    else {
        url = 'https://doc.qt.io/qt-5/qml-';
        html = '.html';
    }
    url = url + qmlInfo.completeModuleName.replace(/\./g, '-').toLowerCase() + '-' + qmlInfo.componentName.toLowerCase() + html;
    return url;
}
connection.onHover((params) => {
    let doc = documents.get(params.textDocument.uri);
    let pos = params.position;
    let docHelper = new docHelper_1.DocHelper(doc);
    let range = docHelper.getWordAtPosition(pos);
    let word = doc.getText(range);
    let urls = [];
    for (let component of importedComponents) {
        // Assume that the componentName part of different exports statements of the same component are the same, 
        // therefore only checks the first element in the info array.
        if (component.info && word === component.info[0].componentName) {
            let url = constructApiRefUrl(component.info[0]);
            if (urls.every(val => val !== url)) {
                urls.push(url);
            }
            if (component.info.length > 1) {
                for (let i = 1; i < component.info.length; i++) {
                    if (component.info[i].completeModuleName !== component.info[0].completeModuleName) {
                        urls.push(constructApiRefUrl(component.info[i]));
                    }
                }
            }
        }
    }
    let value = '';
    if (urls.length > 1)
        value = 'Multiple Api reference links found for this component.\n\nYou may have imported multiple modules containing the component with the same name, or some of the links may be deprecated.\n';
    for (let url of urls) {
        value = value + '\n' + url + '\n';
    }
    let markup = {
        kind: "markdown",
        value: value
    };
    let result = {
        contents: markup,
        range: range
    };
    return result;
});
// This handler provides the initial list of the completion items.
connection.onCompletion((params) => {
    let doc = documents.get(params.textDocument.uri);
    let pos = params.position;
    let docHelper = new docHelper_1.DocHelper(doc);
    if (params.context.triggerCharacter === '.') {
        let items = [];
        let componentName = docHelper.getFirstPrecedingWordString({ line: pos.line, character: pos.character - 1 });
        for (let c of importedComponents) {
            // Assume that the componentName part of different exports statements of the same component are the same, 
            // therefore only checks the first element in the info array.
            if (c.info && componentName === c.info[0].componentName) {
                addComponenetAttributes(c, items, importedComponents);
            }
        }
        return items;
    }
    let firstPrecedingWordPos = docHelper.getFirstPrecedingRegex(vscode_languageserver_1.Position.create(pos.line, pos.character - 1), /\w/);
    let word = docHelper.getFirstPrecedingWordString(firstPrecedingWordPos);
    if (word === 'import') {
        let items = [];
        for (let module of qmlModules) {
            items.push(vscode_languageserver_1.CompletionItem.create(module.name));
        }
        return items;
    }
    let componentName = getQmlType(docHelper, pos);
    connection.console.log('####### Object Found: ' + componentName);
    //isInPropertyOrSignal(doc, Position.create(pos.line, pos.character-1), pos);
    addBuiltinKeyword(completionItem);
    if (componentName !== null) {
        let items = [];
        for (let c of importedComponents) {
            // Assume that the componentName part of different exports statements of the same component are the same, 
            // therefore only checks the first element in the info array.
            if (c.info && componentName === c.info[0].componentName) {
                addComponenetAttributes(c, items, importedComponents);
            }
        }
        return items.concat(completionItem);
    }
    return completionItem;
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map