const SSDPClient = require('node-ssdp').Client;
const XMLdoc = require('xmldoc');
const dgram = require('dgram');
const settings = require('electron-settings');
const URL = require('url').Url;
const spawn = require('child_process').spawn;
const {BrowserWindow} = require('electron');

function ipv62mac(ipv6) {
  const ipv6Parts = ipv6.split(':');
  const macParts = [];
  for (let idx = ipv6Parts.length - 4; idx < ipv6Parts.length; idx++) {
    let part = ipv6Parts[idx];
    while (part.length < 4) {
      part = "0" + part;
    }

    macParts.push(part.substring(0, 2));
    macParts.push(part.substring(part.length - 2, part.length));
  }

  macParts[0] = (parseInt(macParts[0], 16) ^ 2).toString(16);
  macParts[0] = ('00' + macParts[0]).slice(-2);
  macParts.splice(4, 1);
  macParts.splice(3, 1);
  return macParts.join('');
}

module.exports =
{
	getXMLFile: function ()
	{
		//console.log('getXMLFile running');
		const {net} = require('electron')

		dev = settings.getAll();
		for(key in dev) {
			if (settings.has(key+'.location') === false)
				continue;
			//console.log("has location %s", settings.has(key+'.location'));
			//console.log('###########CURL device %s', settings.get(key+'.location'));

			const request = net.request({
				method: 'GET',
			        url: settings.get(key+'.location'),
			})
			request.on('response', (response) => {
				response.on('data', (chunk) => {
					//console.log(`BODY: ${chunk}`)
					xmldoc = new XMLdoc.XmlDocument(`${chunk}`);
					var hostname = xmldoc.valueWithPath("device.presentationURL");
					var macAddress = ipv62mac(hostname.substring(1, hostname.length - 1));
					var udn = xmldoc.valueWithPath("device.UDN");
					settings.set(`${udn}`+'.firmwareVersion', xmldoc.valueWithPath("device.firmwareVersion"));
					settings.set(`${udn}`+'.modelName', xmldoc.valueWithPath("device.modelName"));
					settings.set(`${udn}`+'.modelNumber', xmldoc.valueWithPath("device.modelNumber"));
					settings.set(`${udn}`+'.serialNumber', xmldoc.valueWithPath("device.serialNumber"));
					settings.set(`${udn}`+'.location', xmldoc.valueWithPath("device.serviceList.service.URLBase")+'/device.xml');
					settings.set(`${udn}`+'.macAddress', `${macAddress}`);
					settings.set(`${udn}`+'.hostname', `${hostname}`);
					settings.set(`${udn}`+'.usn', xmldoc.valueWithPath("device.UDN"));
					settings.set(`${udn}`+'.presentationURL', xmldoc.valueWithPath("device.presentationURL"));
					/*
					settings.set(xmldoc.valueWithPath("device.UDN"), {
						firmwareVersion: xmldoc.valueWithPath("device.firmwareVersion"),
						modelName: xmldoc.valueWithPath("device.modelName"),
						modelNumber: xmldoc.valueWithPath("device.modelNumber"),
						serialNumber: xmldoc.valueWithPath("device.serialNumber"),
					       	location: xmldoc.valueWithPath("device.serviceList.service.URLBase")+'/device.xml',
						usn: xmldoc.valueWithPath("device.UDN"),
						ipv6Addr: `${ipv6addr}`,
						presentationURL: xmldoc.valueWithPath("device.presentationURL"),
						hostname: `${hostname}`,
						macAddress: `${macAddress}`,
						status: `${status}`,
					});
					*/
				})
			})
			request.end();
			request.on('abort', (response) => {
			})
			request.on('error', (response) => {
			})

		};
	},

	registerCS: function ()
	{
		const {net} = require('electron')

		if (settings.get('global.registerOPStatus') === 'stop') {
			return;
		}
		console.log('registerCS running');

		dev = settings.getAll();
		for(key in dev) {
			if (settings.has(key+'.location') === false)
				continue;

			/* state machine here CG_DEVICE_FOUND -> CG_AUTH_PASS -> CS_AUTH_PASS
			 * Electron support node-libcurl pretty bad, call spawn
			 */
			if (settings.get(key+'.status') === 'CG_DEVICE_FOUND') {
     				var hostname = settings.get(key+'.presentationURL');
				var apiEndpoint = `${hostname}/api/v1/auth/local`;
				var payload = JSON.stringify({
				      email: settings.get('register.cg_email'),
				      password: settings.get('register.cg_passwd'),
				      isKeepEmail: false
				}).replace(/"/g, '\\"');
				var options = '-s -6 -v -k -i --interface fe80::91ed:454e:d7ce:5ac8 -H "Content-Type: application/json" -X POST -d "'+`${payload}`+'" '+`${apiEndpoint}` + " -w {keyIndex:"+`${key}`+"}";

				console.log(options);
				curl = spawn('curl.exe', [`${options}`], { shell: true});

				curl.stdout.on('data', (data) => {
					var str = `${data}`;
				//	console.log(`${str}`);

					// looking for uuid
					try {
						var matches = str.match(/uuid:(.*?)\}/i);
						var keyIndex = matches[0].split('}');
					} catch (err) {
						console.log("can't find uuid");
						return;
					}

					// looking for token
					try {
						var matches = str.match(/{\"token\"(.*?)\}/i);
						var token = matches[0].match(':\"(.*?)\"');
					} catch (err) {
						console.log("can't find token");
						return;
					}

					//console.log(`TOKEN ${token[1]}`);
					settings.set(keyIndex[0]+'.status', 'CG_AUTH_PASS');
					settings.set(keyIndex[0]+'.token', `${token[1]}`);
				});

			} // CG_DEVICE_FOUND

			if ((settings.get(key+'.status') === 'CG_AUTH_PASS') ||
				       	(settings.get(key+'.status') === 'CS_AUTH_FAIL')
					) {
				console.log('Found CG_AUTH_PASS DEVICE, register to CS');
				var apiEndpoint = settings.get('register.cs_url')+'/api/v1/devices';
				var tokenHeader = "\"mx-api-token: "+settings.get('register.cs_token')+"\"";
				const payload = JSON.stringify({
				      displayName: settings.get(key+'.modelName'),
				      mac: settings.get(key+'.macAddress'),
				      serialNumber: settings.get(key+'.serialNumber'),
				}).replace(/"/g, '\\"');
				//console.log(payload);
				var options = '-s -v -k -i -H "Content-Type: application/json" -H '+`${tokenHeader}`+ ' -X POST -d "'+`${payload}`+'" '+`${apiEndpoint}` + " -w {keyIndex:"+`${key}`+"}";
				//console.log('option is %s', options);
				curl = spawn('curl.exe', [`${options}`], { shell: true});

				curl.stdout.on('data', (data) => {
					console.log(`${data}`);
					var str = `${data}`;
					var keyIndex;

					try {
						var matches = str.match(/uuid:(.*?)\}/i);
						keyIndex = matches[0].split('}');
						//console.log(`KEYINDEX#${keyIndex[0]}#`);
					} catch (err) {
						console.log("can't find keyIndex");
						return;
					}

					try {
						var psk = str.match(/\"psk\": \"(.*?)\"/i);
						settings.set(keyIndex[0]+'.psk', `${psk[1]}`);
						//console.log(`PSK#${psk[1]}#`);
					} catch (err) {
						console.log("can't find psk");
						settings.set(keyIndex[0]+'.status', 'CS_AUTH_FAIL');
						settings.set(keyIndex[0]+'.reason', 'Invalid token or mac address had been registered.');
						return;
					}

					try {
						var createdAt = str.match(/\"createdAt\": \"(.*?)\"/i);
						settings.set(keyIndex[0]+'.createdAt', `${createdAt[1]}`);
						//console.log(`CREATEAT#${createdAt[1]}#`);
					} catch (err) {
						console.log("can't find createdAt");
						return;
					}
					try {
						var uuid = str.match(/\"uuid\": \"(.*?)\"/i);
						settings.set(keyIndex[0]+'.uuid', `${uuid[1]}`);
						//console.log(`UUID#${uuid[1]}#`);
					} catch (err) {
						console.log("can't find uuid");
						return;
					}


					settings.set(keyIndex[0]+'.status', 'CS_AUTH_PASS');
					//console.log(settings.getAll());
				});
			} //CG_AUTH_PASS

			if (settings.get(key+'.status') === 'CS_AUTH_PASS') {
				console.log('Found CS_AUTH_PASS DEVICE, pass registration CS to CG');
     				var hostname = settings.get(key+'.hostname');
				var apiEndpoint = `${hostname}/api/v1/system/remotecontrol`;
				var token = settings.get(key+'.token');
				var payload = JSON.stringify({
			   	    enable: true,
				    remoteHost: settings.get('register.cs_mqtt_url'),
				    remotePort: settings.get('register.cs_mqtt_port'),
				    psk: settings.get(key+'.psk'),
				    deviceUUID: settings.get(key+'.uuid'),
				    keepalive: 60
				}).replace(/"/g, '\\"');
				var options = '-s -6 -v -k -i --interface fe80::91ed:454e:d7ce:5ac8 -H "Content-Type: application/json"'+ ' -H "Authorization: Bearer '+`${token}`+'"'+' -X PUT -d "'+`${payload}`+'" '+`${apiEndpoint}` + " -w {keyIndex:"+`${key}`+"}";
				curl = spawn('curl.exe', [`${options}`], { shell: true});

				curl.stdout.on('data', (data) => {
					//console.log(`${data}`);
					var str = `${data}`;
					var keyIndex;

					try {
						var matches = str.match(/uuid:(.*?)\}/i);
						keyIndex = matches[0].split('}');
						//console.log(`KEYINDEX#${keyIndex[0]}#`);
					} catch (err) {
						console.log("can't find keyIndex");
						return;
					}
					settings.set(keyIndex[0]+'.status', 'REGISTER_COMPLETE');
					settings.set(keyIndex[0]+'.reason', '');
				});
				//console.log(options);
			} //CS_AUTH_PASS
		}
	}
};
