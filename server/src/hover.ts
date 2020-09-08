import {
	TextDocumentPositionParams,
	Hover,
	MarkupContent
} from 'vscode-languageserver';

import { LanguageServer, QmlComponent, QmlInfo } from './server';

export function registerHoverProvider(server: LanguageServer) {

	const APPFRAMEWORK_REF_URL: string = 'https://developers.arcgis.com/appstudio/api-reference/qml-';
	const ESRI_REF_URL: string = 'https://developers.arcgis.com/qt/latest/qml/api-reference/qml-';
	const QT_REF_URL: string = 'https://doc.qt.io/qt-5/qml-';

	function constructApiRefUrl(qmlInfo: QmlInfo): string {
		let moduleNames = qmlInfo.dividedModuleName;
		let url: string;
		let html = '';
	
		if ((qmlInfo.completeModuleName) === 'QtQuick.Controls') {
			if (qmlInfo.moduleVersion.startsWith('2')) {
				qmlInfo.completeModuleName = 'QtQuick.Controls2';
			}
		}
	
		if (moduleNames[0] === 'ArcGIS.') {
			url = APPFRAMEWORK_REF_URL;
		} else if (moduleNames[0] === 'Esri.') {
			url = ESRI_REF_URL;
			html = '.html';
		} else {
			url = QT_REF_URL;
			html = '.html';
		}
		url = url + qmlInfo.completeModuleName.replace(/\./g, '-').toLowerCase() + '-' + qmlInfo.componentName.toLowerCase() + html;
		return url;
	}
	
	
	server.connection.onHover(
		(params: TextDocumentPositionParams): Hover => {
	
			let doc = server.documents.get(params.textDocument.uri);
			let pos = params.position;
			let controller = server.docControllers.find( controller => {
				return controller.getDoc() === doc;
			});
	
			let range = controller.getWordAtPosition(pos);
			let word = doc.getText(range);
	
			let urls: string[] = [];
	
			let importedComponents = controller.getImportedComponents();
			for (let component of importedComponents) {
				// Assume that the componentName of different exports statements of the same component are the same, 
				// therefore only checks the first element in the info array.
				if (component.info && word === component.info[0].componentName) {
					// compare the hovering word with the componentName, if they are the same and the url array do not already contain the url,
					// add it to the array. (Different components may contain the same componentName)
					for (let info of component.info) {
						let url = constructApiRefUrl(info);
						if (!urls.includes(url)) {
							urls.push(url);
						}
					}
				}
			}
	
			let value = '';
			if (urls.length > 1) value = 'Multiple Api reference links found for this type.\n\nYou may have imported multiple modules containing the same type.\n\nSome of the links may be deprecated.\n';
	
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

}