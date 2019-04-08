
import { LanguageServer } from './server';
import { registerCompletionProvider } from './completion';
import { registerHoverProvider } from './hover';
import { registerDocumentsEvents } from './documents';

let server = LanguageServer.getInstance();

registerCompletionProvider(server);
registerHoverProvider(server);
registerDocumentsEvents(server);