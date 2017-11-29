const spawn = require('child_process').spawn;
const request = require('request');
const settings = require('electron-settings');
const {ipcRenderer} = require('electron')
const wifiBtnSave = document.getElementById('save_wifi')

wifiBtnSave.addEventListener('click', function () {
	var tmp = document.getElementById('ap_list');
	var res = tmp.value.split("^");
	var ssid = res[0];
	var bssid = res[1];
	var password = document.getElementById('ap_passwd');
	var useBssid = document.getElementById('use_bssid').checked;
	var uuid = document.getElementById('uuid').value;

	
	var options = { method: 'POST',
		url: settings.get('register.cs_url').replace(/https/g, 'http')+'/api/v1/deviceTasks',
		headers: 
		{
			'cache-control': 'no-cache',
			'mx-api-token': settings.get('register.cs_token'),
			'content-type': 'application/json',
			accept: 'application/json' },
		body: 
		{ deviceUUID: uuid,
			payload: { 
				method: 'GET', 
				resource: '/network/wifi/1' 
			}
	       	},
		json: true };

	request(options, function (error, response, obj) {
		if (error) throw new Error(error);
		console.log(JSON.stringify(obj));
		var taskObject = new Object();
		taskObject.deviceUUID = uuid;
		taskObject.payload = new Object(); 
		taskObject.payload.resource = "/network/wifi/1";
	       	taskObject.payload.method = "PUT";
		taskObject.payload.data = obj.data;
		taskObject.payload.enable = true;
		taskObject.payload.data.client.networks[0] = new Object();
		taskObject.payload.data.client.networks[0].ssid = ssid;
		if (useBssid === true) {
	       		taskObject.payload.data.client.networks[0].bssid = bssid;
		}
		else {
	       		delete taskObject.payload.data.client.networks[0].bssid;
		}

		if (password === "") {
		       	taskObject.payload.data.client.networks[0].wpaPsk= password;
		       	taskObject.payload.data.client.networks[0].security = "wpa";
		}
		else {
			taskObject.payload.data.client.networks[0].security = "none";
			delete taskObject.payload.data.client.networks[0].wpaPsk;
		}
		// After GET, we reuse return object data and PUT again

		var options = { method: 'POST',
			url: settings.get('register.cs_url').replace(/https/g, 'http')+'/api/v1/deviceTasks',
		headers: {
		'cache-control': 'no-cache',
		'mx-api-token': settings.get('register.cs_token'),
		'content-type': 'application/json',
		accept: 'application/json' },
		body: { deviceUUID: uuid,
		payload: taskObject },
		json: true };

		request(options, function (error, response, obj) {
			if (error) throw new Error(error);
			console.log(obj);

		}); //PUT request

		// End after GET
		var oImg = document.getElementById("scan");
		oImg.style.visibility = 'hidden';

	}); //GET request

	var oImg = document.getElementById("scan");
	oImg.style.visibility = 'visible';
})

var scanSSID = function() {
	
	var options = { method: 'POST',
		url: settings.get('register.cs_url').replace(/https/g, 'http')+'/api/v1/deviceTasks',
		headers: 
		{
			'cache-control': 'no-cache',
			'mx-api-token': settings.get('register.cs_token'),
			'content-type': 'application/json',
			accept: 'application/json' },
		body: 
		{ deviceUUID: this.id.replace(/['"]+/g, ''),
			payload: { method: 'get', resource: '/network/wifi/1/scan-networks' } },
		json: true };

	request(options, function (error, response, obj) {
		if (error) throw new Error(error);
		//console.log(obj);
		/* Clean loading page
		while (loading_div.firstChild) {
			loading_div.firstChild.remove();
		}
		*/
		var oImg = document.getElementById('scan');
		oImg.style.visibility = 'hidden';

		obj.data.forEach(function(element) {
			var option_value = JSON.stringify(element.bssid).replace(/['"]+/g, '') + '^' + JSON.stringify(element.ssid).replace(/['"]+/g, '');
			var option_menu = JSON.stringify(element.ssid).replace(/['"]+/g, '') + 
					' (' + JSON.stringify(element.bssid).replace(/['"]+/g, '') + 
					') (' + JSON.stringify(element.signal).replace(/['"]+/g, '') + ')';
			var oDropdownList = document.getElementById('ap_list');
			var option = document.createElement("option");
			option.text = option_menu;
			option.value = option_value;
			oDropdownList.add(option);
		});

	});
	var oImg = document.getElementById("scan");
	oImg.style.visibility = 'visible';

	document.getElementById('ap_list').innerText = null;
	document.getElementById('uuid').value = this.id.replace(/['"]+/g, '');

};

var deviceOffline= function() {
    alert('This device '+this.id+' is offline!');
};


function getDeviceList()
{
	var options = { method: 'GET',
		url: settings.get('register.cs_url')+'/api/v1/devices',
		qs: { limit: '20', offset: '0' },
		rejectUnauthorized: false,
		requestCert: false,
		agent: false,
		headers: 
		{ 
			'cache-control': 'no-cache',
			accept: 'application/json',
			'content-type': 'application/json',
			'mx-api-token': settings.get('register.cs_token') },
		body: 
		{},
		json: true };

	request(options, function (error, response, obj) {
		if (error) throw new Error(error);
		//console.log(obj);
		obj.data.forEach(function(element) {
			var li = document.createElement("li"); 
			li.setAttribute("class", "list-group-item");

			var container = document.createElement('div');
			container.setAttribute("class", "media-body");

			var button = document.createElement("button");
			button.setAttribute('id', JSON.stringify(element.uuid));
			button.innerHTML = JSON.stringify(element.connection.status).replace(/['",]+/g, '');
			if (JSON.stringify(element.connection.status) === '"offline"') {
				button.setAttribute("class", "btn btn-mini btn-negative");
				button.addEventListener('click', deviceOffline);
			}
			else {
				button.setAttribute("class", "btn btn-mini btn-positive");
				button.addEventListener('click', scanSSID);
			}

		var textnode = document.createTextNode(JSON.stringify(element.displayName).replace(/['",]+/g, ''));
		var strong = document.createElement("strong");
		strong.appendChild(textnode);
		container.appendChild(strong);

		textnode = document.createTextNode(JSON.stringify(element.mac).replace(/['",]+/g, ''));
		var p = document.createElement("P");
		p.appendChild(textnode);
		container.appendChild(p);

		textnode = document.createTextNode(JSON.stringify(element.uuid).replace(/['",]+/g, ''));
		var p = document.createElement("P");
		p.appendChild(textnode);
		container.appendChild(p);

		textnode = document.createTextNode(JSON.stringify(element.createdAt).replace(/['",]+/g, ''));
		var p = document.createElement("P");
		p.appendChild(textnode);
		container.appendChild(p);

		li.appendChild(button);
		li.appendChild(container);
		document.getElementById('wifi-group').appendChild(li);
		})
	});

}

ipcRenderer.on('wifi-update', (event, arg) => { 
	getDeviceList();
})

