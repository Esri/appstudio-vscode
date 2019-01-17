"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
class DocHelper {
    constructor(doc) {
        this.doc = doc;
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
exports.DocHelper = DocHelper;
//# sourceMappingURL=docHelper.js.map