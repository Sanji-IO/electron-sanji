const settings = require('electron-settings');
const menuRegBtn = document.getElementById('menu-register-button');
const menuClearRecordBtn = document.getElementById('menu-clear-record-button');
const menuOperationBtn = document.getElementById('menu-operation-button');
const menuWifiBtn = document.getElementById('menu-wifi-setting');

menuWifiBtn.addEventListener('click', function () {
  ipcRenderer.send('asynchronous-message', 'MENU_WIFI_BUTTON')
})


menuRegBtn.addEventListener('click', function () {
  ipcRenderer.send('asynchronous-message', 'MENU_REGISTER_BUTTON')
})

menuClearRecordBtn.addEventListener('click', function () {
  ipcRenderer.send('asynchronous-message', 'MENU_CLEAR_RECORD_BUTTON')
})

menuOperationBtn.addEventListener('click', function () {
  ipcRenderer.send('asynchronous-message', 'MENU_OPERATION_BUTTON')
	ipcRenderer.on('asynchronous-reply', (event, arg) => { 
		if (arg == 'MENU_OPERATION_COMPLETE') {
			//console.log(settings.get('global.registerOPStatus'));
			if (settings.get('global.registerOPStatus') === 'start') {
				document.getElementById('menu-operation-string').innerHTML = "Stop Registration";
				document.getElementById('menu-operation-icon').className = "icon icon-stop";
			}
			else {
				document.getElementById('menu-operation-string').innerHTML = "Start Registration";
				document.getElementById('menu-operation-icon').className = "icon icon-play";
			}
		}
	});
})
