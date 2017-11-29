const SSDPClient = require('node-ssdp').Client;
const XMLdoc = require('xmldoc');
const dgram = require('dgram');
const URL = require('url').URL;
const settings = require('electron-settings');

module.exports = 
{
	getSSDPInfo: function ()
	{
		var select = settings.get('register.interface');
		var address = settings.get('Network.'+`${select}`+'.address');
		var scopeid = settings.get('Network.'+`${select}`+'.scopeid');
		const client = new SSDPClient({
		      ssdpSig: 'ThingsPro Utils',
		      unicastHost: `::%${scopeid}`,
		      ssdpIp: `ff02::c%${scopeid}`,
		      ssdpInterface: `${address}%${scopeid}`,
		      ssdpTtl: 20
		}, dgram.createSocket({type: 'udp6', reuseAddr: true}));

		// Or maybe if you want to stop for everything after 5 seconds
		setTimeout(function() {
			client.search('ssdp:all')
		}, 3000)

		// And after 10 seconds, you want to stop
		setTimeout(function () {
			client.stop()
		}, 5000)


		client.on('response', (headers, code, rinfo) => {
			if (headers.ST === 'upnp:rootdevice') {
				return;
			}
  			//console.log(`get ssdp response`, headers, rinfo);
			// save URL for later getXMLFile query
			if (settings.has(headers.ST) === false)
				settings.set(headers.ST, {
					usn: headers.USN,
					location: headers.LOCATION,
					ipv6Addr: rinfo.address,
					status: 'CG_DEVICE_FOUND',
					regDate: 'N/A',
				});
		})
		client.search('ssdp:all');
	}

};

