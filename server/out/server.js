"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const docController_1 = require("./docController");
const fs = require("fs");
const path = require("path");
let qmlModules = [];
let docControllers = [];
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new vscode_languageserver_1.TextDocuments();
/*
let qmltypesJsonFiles = fs.readdirSync(path.join(__dirname,'../../qml_types'));

for(let file of qmltypesJsonFiles) {
    readQmltypeJson(path.join(__dirname,'../../qml_types',file));
}
*/
readQmltypeJson(path.join(__dirname, '../../ALLQMLTypes.json'));
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
    let controller = docControllers.find(controller => {
        return controller.getDoc() === change.document;
    });
    if (controller === undefined) {
        controller = new docController_1.DocController(change.document);
        docControllers.push(controller);
    }
    controller.lookforImport(qmlModules);
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
function firstCharToUpperCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function readQmltypeJson(fullFilePath) {
    let data = fs.readFileSync(fullFilePath);
    let comps = JSON.parse(data.toString()).components;
    for (let component of comps) {
        if (!component.exports)
            continue;
        component.info = [];
        for (let e of component.exports) {
            let m = e.match(/(.*)\/(\w*) (.*)/);
            if (!m)
                continue;
            if ((m[1]) === 'QtQuick.Controls') {
                if (m[3].startsWith('2')) {
                    m[1] = 'QtQuick.Controls2';
                }
            }
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
            let item = vscode_languageserver_1.CompletionItem.create('on' + firstCharToUpperCase(s.name) + ': ');
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
    let controller = docControllers.find(controller => {
        return controller.getDoc() === doc;
    });
    let range = controller.getWordAtPosition(pos);
    let word = doc.getText(range);
    let urls = [];
    let importedComponents = controller.getImportedComponents();
    for (let component of importedComponents) {
        // Assume that the componentName of different exports statements of the same component are the same, 
        // therefore only checks the first element in the info array.
        if (component.info && word === component.info[0].componentName) {
            // compare the hovering word with the componentName, if they are the same and the url array do not already contain the url,
            // add it to the array. (Different components may contain the same componentName)
            let url = constructApiRefUrl(component.info[0]);
            if (urls.every(val => val !== url)) {
                urls.push(url);
            }
            // A component may have multiple info with different module names, or same module name with different version number,
            // add the url constructed from a different module name
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
        value = 'Multiple Api reference links found for this type.\n\nYou may have imported multiple modules containing the same type.\n\nSome of the links may be deprecated.\n';
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
    let controller = docControllers.find(controller => {
        return controller.getDoc() === doc;
    });
    let importedComponents = controller.getImportedComponents();
    if (params.context.triggerCharacter === '.') {
        let items = [];
        let componentName = controller.getFirstPrecedingWordString({ line: pos.line, character: pos.character - 1 });
        for (let c of importedComponents) {
            // Assume that the componentName part of different exports statements of the same component are the same, 
            // therefore only checks the first element in the info array.
            if (c.info && componentName === c.info[0].componentName) {
                addComponenetAttributes(c, items, importedComponents);
            }
        }
        for (let id of controller.getIds()) {
            if (componentName === id.id) {
                for (let c of importedComponents) {
                    if (c.info && id.type === c.info[0].componentName) {
                        addComponenetAttributes(c, items, importedComponents);
                    }
                }
            }
        }
        return items;
    }
    let firstPrecedingWordPos = controller.getFirstPrecedingRegex(vscode_languageserver_1.Position.create(pos.line, pos.character - 1), /\w/);
    let word = controller.getFirstPrecedingWordString(firstPrecedingWordPos);
    if (word === 'import') {
        let items = [];
        for (let module of qmlModules) {
            if (module.name === 'QtQuick.Controls2') {
                items.push(vscode_languageserver_1.CompletionItem.create('QtQuick.Controls 2'));
                continue;
            }
            items.push(vscode_languageserver_1.CompletionItem.create(module.name));
        }
        return items;
    }
    if (word === 'id') {
        return null;
    }
    let componentName = controller.getQmlType(pos);
    connection.console.log('####### Object Found: ' + componentName);
    //isInPropertyOrSignal(doc, Position.create(pos.line, pos.character-1), pos);
    //addBuiltinKeyword(completionItem);
    if (componentName !== null) {
        let items = [];
        for (let c of importedComponents) {
            // Assume that the componentName part of different exports statements of the same component are the same, 
            // therefore only checks the first element in the info array.
            if (c.info && componentName === c.info[0].componentName) {
                addComponenetAttributes(c, items, importedComponents);
            }
        }
        return items.concat(controller.getCompletionItem());
    }
    return controller.getCompletionItem();
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map