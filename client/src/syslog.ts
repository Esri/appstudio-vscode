import { OutputChannel } from 'vscode';

export function createSyslogServer(syslogChannel: OutputChannel) {

	const SyslogServer = require('syslog-server');
	const syslogServer = new SyslogServer();

	//let server = dgram.createSocket('udp4');

	let kVersion = /<\d{1,3}>(.{0,3})\s/;
	let kRFC3164 = /<(\d{1,3})>(?:(\d)?\s?)([A-Z][a-z][a-z]\s{1,2}\d{1,2}\s\d{2}[:]\d{2}[:]\d{2})\s([\w][\w\d\.@-]*)\s([\w][\w\d\.@-]*):?\s*([\S\s]*)$/;
	let kRFC5424 = /<(\d{1,3})>(\d{1,3})\s?(?:(\d{4}[-]\d{2}[-]\d{2}[T]\d{2}[:]\d{2}[:]\d{2}(?:\.\d{1,6})?(?:[+-]\d{2}[:]\d{2}|Z)?)|-)\s(\S+)\s(\S+)\s(\S+)\s(\S+)\s(?:(?:\[(.*)\])|-)\s([\S\s]*)$/;

	//--------------------------------------------------------------------------

	function parse(messageData: any, address: string) {
		//console.log("messageData:", messageData);

		let priority = 11;
		let timestamp = "";
		let hostname = "";
		let appName = "";
		let processId = "";
		let messageId = "";
		let structuredData = "";
		let message: any;

		let tokens = messageData.match(kVersion);
		if (!tokens) {
			message = messageData;
		} else {

			let version = isFinite(tokens[1]) ? Number(tokens[1]) : 0;

			if (version < 1) {
				tokens = messageData.match(kRFC3164);

				if (tokens && tokens.length > 6) {
					priority = tokens[1];
					timestamp = tokens[3];
					hostname = tokens[4];
					appName = tokens[5];
					message = tokens[6];
				} else {
					message = messageData;
				}
			} else {
				tokens = messageData.match(kRFC5424);

				if (tokens && tokens.length > 9) {
					priority = tokens[1];
					timestamp = tokens[3];
					hostname = tokens[4];
					appName = tokens[5];
					processId = tokens[6];
					messageId = tokens[7];
					structuredData = tokens[8];
					message = tokens[9];
				} else {
					message = messageData;
				}
			}
		}

		//console.log("tokens:", JSON.stringify(tokens, undefined, 2));

		let facility = Math.floor(priority / 8);
		let severity = priority - facility * 8;

		if (appName == "-") appName = "";
		if (processId == "-") processId = "";
		if (messageId == "-") messageId = "";
		if (structuredData == "-") structuredData = "";


		return {
			messageData: messageData,
			dateTime: new Date(),
			address: address,
			timestamp: timestamp,
			facility: facility,
			severity: severity,
			hostname: hostname,
			appName: appName,
			processId: processId,
			messageId: messageId,
			structuredData: structuredData,
			message: message
		};
	}

	syslogServer.on('message', value => {
		//console.log(value.date);     // the date/time the message was received
		//console.log(value.host);     // the IP address of the host that sent the message
		//console.log(value.protocol); // the version of the IP protocol ("IPv4" or "IPv6")
		//console.log(value.message);

		let m = parse(value.message, value.host);

		//syslogOutput.appendLine(value.date.toString());
		//syslogOutput.appendLine(value.host.toString());
		//syslogOutput.appendLine(value.protocol.toString());
		let severityCode: string;
		if (m.severity === 0) {
			severityCode = '[emerg]';
		} else if (m.severity === 1) {
			severityCode = '[alert]';
		} else if (m.severity === 2) {
			severityCode = '[crit]';
		} else if (m.severity === 3) {
			severityCode = '[err]';
		} else if (m.severity === 4) {
			severityCode = '[warning]';
		} else if (m.severity === 5) {
			severityCode = '[notice]';
		} else if (m.severity === 6) {
			severityCode = '[info]';
		} else if (m.severity === 7) {
			severityCode = '[debug]';
		}
		//syslogOutput.appendLine(`${severityCode} [${m.hostname}] [${m.appName}] <${m.severity}> ${m.message} <${m.severity}>`);
		syslogChannel.appendLine(`${severityCode} [${m.hostname}] [${m.appName}] <${m.severity}> ${m.message}`);
		syslogChannel.show();
	});

	syslogServer.on('error', err => {
		console.log(err);
		syslogServer.start({port: 0});
	});

	syslogServer.on('start', () => {
		console.log('Syslog Server started: ', syslogServer.server().address().address, syslogServer.server().address().port);
		
	});


	syslogServer.start();
		/*
		(cb)=> {
		console.log('1',cb.err);
		console.log('2',cb.message);

	}).then(value => {
		console.log('3',value.err);
		console.log('4',value.message);
	});
	*/

	return syslogServer;

}

/*
export class syslogServer {

	private syslogServer: SyslogServer;

	constructor(port: Number, address: String) {
		this.syslogServer = new SyslogServer();
	}

	public parse(messageData: any, address: string) {
		//console.log("messageData:", messageData);

		let kVersion = /<\d{1,3}>(.{0,3})\s/;
		let kRFC3164 = /<(\d{1,3})>(?:(\d)?\s?)([A-Z][a-z][a-z]\s{1,2}\d{1,2}\s\d{2}[:]\d{2}[:]\d{2})\s([\w][\w\d\.@-]*)\s([\w][\w\d\.@-]*):?\s*([\S\s]*)$/;
		let kRFC5424 = /<(\d{1,3})>(\d{1,3})\s?(?:(\d{4}[-]\d{2}[-]\d{2}[T]\d{2}[:]\d{2}[:]\d{2}(?:\.\d{1,6})?(?:[+-]\d{2}[:]\d{2}|Z)?)|-)\s(\S+)\s(\S+)\s(\S+)\s(\S+)\s(?:(?:\[(.*)\])|-)\s([\S\s]*)$/;

		let priority = 11;
		let timestamp = "";
		let hostname = "";
		let appName = "";
		let processId = "";
		let messageId = "";
		let structuredData = "";
		let message: any;

		let tokens = messageData.match(kVersion);
		if (!tokens) {
			message = messageData;
		} else {

			let version = isFinite(tokens[1]) ? Number(tokens[1]) : 0;

			if (version < 1) {
				tokens = messageData.match(kRFC3164);

				if (tokens && tokens.length > 6) {
					priority = tokens[1];
					timestamp = tokens[3];
					hostname = tokens[4];
					appName = tokens[5];
					message = tokens[6];
				} else {
					message = messageData;
				}
			} else {
				tokens = messageData.match(kRFC5424);

				if (tokens && tokens.length > 9) {
					priority = tokens[1];
					timestamp = tokens[3];
					hostname = tokens[4];
					appName = tokens[5];
					processId = tokens[6];
					messageId = tokens[7];
					structuredData = tokens[8];
					message = tokens[9];
				} else {
					message = messageData;
				}
			}
		}

		//console.log("tokens:", JSON.stringify(tokens, undefined, 2));

		let facility = Math.floor(priority / 8);
		let severity = priority - facility * 8;

		if (appName == "-") appName = "";
		if (processId == "-") processId = "";
		if (messageId == "-") messageId = "";
		if (structuredData == "-") structuredData = "";


		return {
			messageData: messageData,
			dateTime: new Date(),
			address: address,
			timestamp: timestamp,
			facility: facility,
			severity: severity,
			hostname: hostname,
			appName: appName,
			processId: processId,
			messageId: messageId,
			structuredData: structuredData,
			message: message
		};
	}
}
*/