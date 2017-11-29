const settings = require('electron-settings');
const {ipcRenderer} = require('electron')
const regBtnSave = document.getElementById('register-button-save')

regBtnSave.addEventListener('click', function () {
	var data = {
		cg_email : document.getElementById('cg_email').value,
		cg_passwd : document.getElementById('cg_passwd').value,
		cs_token : document.getElementById('cs_token').value,
		cs_url : document.getElementById('cs_url').value,
		cs_mqtt_url : document.getElementById('cs_mqtt_url').value,
		cs_mqtt_port : document.getElementById('cs_mqtt_port').value,
		interface : document.getElementById('network_interfaces').value
	};
	ipcRenderer.send('asynchronous-register-form', data)
})

ipcRenderer.on('register', (event, arg) => { 

	//console.log(settings.getAll());
	var select = document.getElementById('network_interfaces');
	var networks = settings.get('Network');
	for (network in networks) {
		opt = document.createElement("option");
		opt.value = network;
		opt.textContent = network;
		if (settings.get('register.interface') === opt.value) {
			opt.selected = true;
		}
		select.appendChild(opt);
	}

	document.getElementById('cg_email').value = settings.get('register.cg_email');
	document.getElementById('cg_passwd').value = settings.get('register.cg_passwd');
	document.getElementById('cs_token').value = settings.get('register.cs_token');
	document.getElementById('cs_url').value = settings.get('register.cs_url');
	document.getElementById('cs_mqtt_url').value = settings.get('register.cs_mqtt_url');
	document.getElementById('cs_mqtt_port').value = settings.get('register.cs_mqtt_port');
})

