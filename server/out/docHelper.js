"use strict";
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
class DocController {
    constructor(doc) {
        this.doc = doc;
    }
    getDoc() {
        return this.doc;
    }
    getImportedComponents() {
        return this.importedComponents;
    }
    getCompletionItem() {
        return this.completionItem;
    }
    addCompletionItems(items) {
        this.completionItem = this.completionItem.concat(items);
    }
    lookforImport(allModules) {
        return __awaiter(this, void 0, void 0, function* () {
            this.importedModules = [];
            this.importedComponents = [];
            this.completionItem = [];
            let text = this.doc.getText();
            let pattern = /import\s+((\w+\.?)+)/g;
            let m;
            while ((m = pattern.exec(text))) {
                for (let module of allModules) {
                    if (module.name === m[1] && this.importedModules.every(module => { return module.name !== m[1]; })) {
                        this.importedModules.push(module);
                        // NOTE: concat does not add to the original array calling the method !
                        this.importedComponents = this.importedComponents.concat(module.components);
                        for (let c of module.components) {
                            if (c.info) {
                                // DEFAULT to add the component name in the first export array
                                let item = vscode_languageserver_1.CompletionItem.create(c.info[0].componentName);
                                item.kind = 7;
                                item.detail = 'Imported from ' + c.info[0].completeModuleName + '/' + c.info[0].componentName + ' ' + c.info[0].moduleVersion;
                                this.completionItem.push(item);
                            }
                        }
                    }
                }
            }
            this.addBuiltinKeyword(this.completionItem);
        });
    }
    getQmlType(pos) {
        let firstPrecedingWordPos = this.getFirstPrecedingRegex(this.getFirstCharOutsideBracketPairs(pos, /\{/), /\w/);
        let result = this.getFirstPrecedingWordString(firstPrecedingWordPos);
        if (!result) {
            return null;
        }
        if (this.isValidComponent(result)) {
            return result;
        }
        else {
            return this.getQmlType(firstPrecedingWordPos);
        }
    }
    isValidComponent(str) {
        for (let c of this.importedComponents) {
            // DEFAULT to compare with component name in first exports array
            if (c.info && str === c.info[0].componentName) {
                return true;
            }
        }
        return false;
    }
    addBuiltinKeyword(completionItem) {
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
    getWordAtPosition(pos) {
        let range = vscode_languageserver_1.Range.create(pos, vscode_languageserver_1.Position.create(pos.line, pos.character + 1));
        let i = 0, j = 0;
        if (/\w/.test(this.doc.getText(range))) {
            while (/\w/.test(this.getTextInRange(pos.line, pos.character - i - 1, pos.line, pos.character - i))) {
                i++;
            }
            while (/\w/.test(this.getTextInRange(pos.line, pos.character + j, pos.line, pos.character + j + 1))) {
                j++;
            }
        }
        return vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(pos.line, pos.character - i), vscode_languageserver_1.Position.create(pos.line, pos.character + j));
        //return getTextInRange(doc, pos.line, pos.character - i, pos.line, pos.character + j);
    }
    getFirstPrecedingWordString(pos) {
        let i = 0;
        let char = this.doc.getText(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(pos.line, pos.character - 1), pos));
        // {start: {line: pos.line, character: pos.character - 1}, end: pos}
        while (/^\w/.test(char) && pos.character - i !== 0) {
            i++;
            char = this.getTextInRange(pos.line, pos.character - i - 1, pos.line, pos.character - i);
            // { start: {line: pos.line, character: pos.character - i - 1}, end: {line: pos.line, character: pos.character - i}}
        }
        return this.doc.getText({ start: { line: pos.line, character: pos.character - i }, end: pos });
    }
    getFirstPrecedingRegex(pos, regex) {
        for (let lineOffset = pos.line; lineOffset >= 0; --lineOffset) {
            for (let charOffset = (lineOffset === pos.line) ? pos.character : this.getLineLength(this.doc, lineOffset); charOffset > 0; --charOffset) {
                let char = this.getTextInRange(lineOffset, charOffset - 1, lineOffset, charOffset);
                if (regex.test(char)) {
                    return vscode_languageserver_1.Position.create(lineOffset, charOffset);
                }
            }
        }
        return vscode_languageserver_1.Position.create(0, 0);
    }
    // return true if position A is greater than B, false if A is equal or less than B
    comparePosition(posA, posB) {
        if (posA.line > posB.line) {
            return true;
        }
        else if (posA.line < posB.line) {
            return false;
        }
        else {
            if (posA.character > posB.character) {
                return true;
            }
            else {
                return false;
            }
        }
    }
    getTextInRange(startLine, startChac, endLine, endChar) {
        return this.doc.getText(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(startLine, startChac), vscode_languageserver_1.Position.create(endLine, endChar)));
    }
    getLineLength(doc, line) {
        let i = 0;
        let char = this.getTextInRange(line, i, line, i + 1);
        while (char !== '' && char !== '\n' && char !== '\r' && char !== '\r\n') {
            i++;
            char = this.getTextInRange(line, i, line, i + 1);
        }
        return i;
    }
    getFirstCharOutsideBracketPairs(pos, regex) {
        let closingCount = 0;
        for (let lineOffset = pos.line; lineOffset >= 0; --lineOffset) {
            for (let charOffset = (lineOffset === pos.line) ? pos.character : this.getLineLength(this.doc, lineOffset); charOffset > 0; --charOffset) {
                let char = this.getTextInRange(lineOffset, charOffset - 1, lineOffset, charOffset);
                if (regex.test(char)) {
                    if (closingCount === 0) {
                        return vscode_languageserver_1.Position.create(lineOffset, charOffset);
                    }
                }
                if (char === '}') {
                    closingCount++;
                }
                if (char === '{') {
                    if (closingCount > 0) {
                        closingCount--;
                    }
                    /*else {
                        return Position.create(lineOffset, charOffset);
                    }*/
                }
            }
        }
        return vscode_languageserver_1.Position.create(0, 0);
    }
}
exports.DocController = DocController;
//# sourceMappingURL=docHelper.js.map