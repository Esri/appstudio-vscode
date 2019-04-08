import { LanguageServer } from './server';
import { DocController } from './docController';

export function registerDocumentsEvents(server: LanguageServer) {

	let documents = server.documents;
	let docControllers = server.docControllers;
	let allQmlModules = server.allQmlModules;
	
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
}