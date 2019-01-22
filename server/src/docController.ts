
import {
	TextDocument,
	Position,
	Range,
	CompletionItem
} from 'vscode-languageserver';
import { QmlComponent, QmlInfo, QmlModule } from './server';

export class DocController {

	private doc: TextDocument;
	private importedModules: QmlModule[];
	private importedComponents: QmlComponent[];
	private completionItem: CompletionItem[];

	constructor(doc: TextDocument) {
		this.doc = doc;
	}

	public getDoc() {
		return this.doc;
	}

	public getImportedComponents(): QmlComponent[] {
		return this.importedComponents;
	}

	public getCompletionItem(): CompletionItem[] {
		return this.completionItem;
	}

	public addCompletionItems(items: CompletionItem[]) {
		this.completionItem = this.completionItem.concat(items);
	}

	public async lookforImport(allModules: QmlModule[]): Promise<void> {

		this.importedModules = [];
		this.importedComponents = [];
		this.completionItem = [];
	
		let text = this.doc.getText();
		let pattern = /import\s+((\w+\.?)+)/g;
		let m: RegExpExecArray | null;
	
		while ((m = pattern.exec(text))) {
	
			for (let module of allModules) {
	
				if (module.name === m[1] && this.importedModules.every(module => { return module.name !== m[1]; })) {
					this.importedModules.push(module);
	
					// NOTE: concat does not add to the original array calling the method !
					this.importedComponents = this.importedComponents.concat(module.components);
	
					for (let c of module.components) {
						if (c.info) {
							// DEFAULT to add the component name in the first export array
							let item = CompletionItem.create(c.info[0].componentName);
							item.kind = 7;
							item.detail = 'Imported from ' + c.info[0].completeModuleName + '/' + c.info[0].componentName + ' ' + c.info[0].moduleVersion;
							this.completionItem.push(item);
						}
					}
				}
			}
		}
		this.addBuiltinKeyword(this.completionItem);
	}

	public getQmlType(pos: Position): string {

		let firstPrecedingWordPos = this.getFirstPrecedingRegex(this.getFirstCharOutsideBracketPairs(pos, /\{/), /\w/);
		let result = this.getFirstPrecedingWordString(firstPrecedingWordPos);
	
		if (!result) { return null; }
	
		if (this.isValidComponent(result)) {
			return result;
		} else {
			return this.getQmlType(firstPrecedingWordPos);
		}
	
	}
	
	public isValidComponent(str: string): boolean {
	
		for (let c of this.importedComponents) {
			// DEFAULT to compare with component name in first exports array
			if (c.info && str === c.info[0].componentName) {
				return true;
			}
		}
	
		return false;
	}

	public addBuiltinKeyword(completionItem: CompletionItem[]) {
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

	public getWordAtPosition(pos: Position): Range {

		let range = Range.create(pos, Position.create(pos.line, pos.character + 1));
		let i = 0, j = 0;

		if (/\w/.test(this.doc.getText(range))) {
			while (/\w/.test(this.getTextInRange(pos.line, pos.character - i - 1, pos.line, pos.character - i))) {
				i++;
			}
			while (/\w/.test(this.getTextInRange(pos.line, pos.character + j, pos.line, pos.character + j + 1))) {
				j++;
			}
		}

		return Range.create(Position.create(pos.line, pos.character - i), Position.create(pos.line, pos.character + j));
		//return getTextInRange(doc, pos.line, pos.character - i, pos.line, pos.character + j);

	}

	public getFirstPrecedingWordString(pos: Position): string {

		let i = 0;
		let char = this.doc.getText(Range.create(Position.create(pos.line, pos.character - 1), pos));
		// {start: {line: pos.line, character: pos.character - 1}, end: pos}

		while (/^\w/.test(char) && pos.character - i !== 0) {
			i++;
			char = this.getTextInRange(pos.line, pos.character - i - 1, pos.line, pos.character - i);
			// { start: {line: pos.line, character: pos.character - i - 1}, end: {line: pos.line, character: pos.character - i}}
		}

		return this.doc.getText({ start: { line: pos.line, character: pos.character - i }, end: pos });
	}

	public getFirstPrecedingRegex(pos: Position, regex: RegExp): Position {

		for (let lineOffset = pos.line; lineOffset >= 0; --lineOffset) {

			for (let charOffset = (lineOffset === pos.line) ? pos.character : this.getLineLength(this.doc, lineOffset); charOffset > 0; --charOffset) {
				let char = this.getTextInRange(lineOffset, charOffset - 1, lineOffset, charOffset);
				if (regex.test(char)) {
					return Position.create(lineOffset, charOffset);
				}
			}
		}
		return Position.create(0, 0);
	}

	// return true if position A is greater than B, false if A is equal or less than B
	public comparePosition(posA: Position, posB: Position): boolean {
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

	public getTextInRange(startLine: number, startChac: number, endLine: number, endChar: number): string {
		return this.doc.getText(Range.create(Position.create(startLine, startChac), Position.create(endLine, endChar)));
	}

	public getLineLength(doc: TextDocument, line: number) {

		let i = 0;
		let char = this.getTextInRange(line, i, line, i + 1);
		while (char !== '' && char !== '\n' && char !== '\r' && char !== '\r\n') {
			i++;
			char = this.getTextInRange(line, i, line, i + 1);
		}

		return i;
	}

	public getFirstCharOutsideBracketPairs(pos: Position, regex: RegExp): Position {
		let closingCount = 0;
		for (let lineOffset = pos.line; lineOffset >= 0; --lineOffset) {
			for (let charOffset = (lineOffset === pos.line) ? pos.character : this.getLineLength(this.doc, lineOffset); charOffset > 0; --charOffset) {

				let char = this.getTextInRange(lineOffset, charOffset - 1, lineOffset, charOffset);

				if (regex.test(char)) {
					if (closingCount === 0) {
						return Position.create(lineOffset, charOffset);
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
		return Position.create(0, 0);
	}

}

