import {
	CompletionItem,
	CompletionParams,
	Position
} from 'vscode-languageserver';
import { LanguageServer, QmlComponent } from './server';

export function registerCompletionProvider(server: LanguageServer) {

	// This handler provides the initial list of the completion items.
	server.connection.onCompletion(
		(params: CompletionParams): CompletionItem[] => {

			let doc = server.documents.get(params.textDocument.uri);
			let pos = params.position;
			let items: CompletionItem[] = [];

			let controller = server.docControllers.find( controller => {
				return controller.getDoc() === doc;
			});

			let importedComponents = controller.getImportedComponents();

			let firstPrecedingWordPos = controller.getFirstPrecedingRegex(Position.create(pos.line, pos.character - 1), /\w/);
			let word = controller.getFirstPrecedingWordString(firstPrecedingWordPos).word;
			let secondword = controller.getSecondPrecedingWordString(pos, firstPrecedingWordPos);
			let firstNonSpace = controller.getFirstPrecedingNonSpaceString(Position.create(pos.line, pos.character - 1));

			// return only qml modules for import
			if (word === 'import' || secondword === 'import') {

				for (let module of server.allQmlModules) {
					items.push(CompletionItem.create(module.name + ' ' + module.version));
				}
				return items;
			}

			// return nothing after id
			if (word === 'id') { return null;}

			// return the attributes of the component after .
			if (params.context.triggerCharacter === '.' || firstNonSpace.char === '.') {

				let componentName = controller.getFirstPrecedingWordString({ line: pos.line, character: pos.character - 1}).word;
				// When the first preceding non space character is .
				if (firstNonSpace.char === '.') {
					componentName = controller.getFirstPrecedingWordString(firstNonSpace.pos).word;
				}
				let p = controller.getStringBeforeFullstop(Position.create(pos.line, pos.character-1));
				if (p) {
					for (let c of importedComponents) {
						if (c.info && p.component === c.info[0].componentName) {
							addAttributesFromProperties(p.property, c, items);
							return items;
						}
					}
				}
					
				for (let c of importedComponents) {
					// Assume that the componentName part of different exports statements of the same component are the same, 
					// therefore only checks the first element in the info array.
					if (c.info && componentName === c.info[0].componentName) {
						addComponenetAttributes(c, items, true, true);
					}
				}

				for (let id of controller.getIds()) {
					if (componentName === id.id) {

						for (let c of importedComponents) {
							if (c.info && id.type === c.info[0].componentName) {
								addComponenetAttributes(c, items, true, true);
							}
						}
					}
				}

				return items;
			}

			// return the attributes of the component inside a block 
			let componentName = controller.getQmlType(pos);

			if (componentName !== null) {

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
	
		if (component.prototype) {
			for (let prototypeComponent of server.allQmlComponents) {
				if (prototypeComponent.name === component.prototype) {
					// recursively add attributes of prototype component
					addComponenetAttributes(prototypeComponent, items, withSignal, withEnum);
				}
			}
		}
	}

	function addAttributesFromProperties(keyword: String ,component: QmlComponent, items: CompletionItem[]) {
		if (component.properties !== undefined) {
			for (let p of component.properties) {
				//server.connection.console.log(p.name + ' ' + p.type);
				if (keyword === p.name) {
					
					for (let c of server.allQmlComponents) {
						if (c.name === p.type) {
							addComponenetAttributes(c, items, true, true);
						}
					}
				}
			}
		}
	}
}


export function hasCompletionItem(label: string, kind: number, completionItems: CompletionItem[]): boolean {
	for (let item of completionItems) {
		if (item.label === label && item.kind === kind) {
			return true;
		}
	}
	return false;
}

function firstCharToUpperCase(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}