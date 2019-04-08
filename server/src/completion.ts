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

			let controller = server.docControllers.find( controller => {
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

				for (let module of server.allQmlModules) {

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

			//connection.console.log('####### Object Found: ' + componentName);

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
			for (let prototypeComponent of server.allQmlComponents) {
				if (prototypeComponent.name === component.prototype) {
					// recursively add attributes of prototype component
					addComponenetAttributes(prototypeComponent, items, withSignal, withEnum);
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