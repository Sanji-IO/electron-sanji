// {app}            Module to control application life.
// {BrowserWindow}  Module to create native browser window.
//const app = electron.app
//const BrowserWindow = electron.BrowserWindow
//const electron = require('electron')
const {app, BrowserWindow, ipcMain} = require('electron')
const settings = require('electron-settings');
const SSDPClient = require('./ssdp-client');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;
var registerWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
  process.on('uncaughtException', function (error) {
	  console.log("caughtException");
  });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1300,
		   height: 800,
		   minWidth: 500,
		   movable: true,
		   minHeight: 200,
		   acceptFirstMouse: true,
		   titleBarStyle: 'hidden',
		   frame: true
	});

	// and load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/index.html');

	// Open the DevTools.
	//mainWindow.openDevTools();

	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	/* Initialize all global setting here */
	settings.set('global', {
		registerOPStatus: 'stop'
	});

	//settings.deleteAll();
	

	/* Load all network interfaces except localhost */
	settings.delete('Network');
	networkInterfaces = require('os').networkInterfaces();
	for (var ifaceName in networkInterfaces) {
		ifaceDetails = networkInterfaces[ifaceName];
		if (ifaceDetails[0].internal !== true) {
			settings.set('Network.'+`${ifaceName}`+'.address', ifaceDetails[0].address);
			settings.set('Network.'+`${ifaceName}`+'.mac', ifaceDetails[0].mac);
			settings.set('Network.'+`${ifaceName}`+'.scopeid', ifaceDetails[0].scopeid);
		}
		/* randomly select any default interface if not exit */
		if (settings.has('register.interface') === false)
			settings.set('register.interface', `${ifaceName}`);
	}
	console.log(settings.getAll());
});

/* Ton of worker process event trigger */
ipcMain.on('asynchronous-message', (event, arg) => {

	console.log(arg) 
	if (arg == 'SCAN_WORKER_START') {
		worker = new SSDPClient.getSSDPInfo();
		event.sender.send('asynchronous-reply', 'SCAN_WORKER_COMPLETE')
	}
	else if (arg == 'CURL_WORKER_START'){
  		const HTTPClient = require('./http-client')
		worker = new HTTPClient.getXMLFile();
		event.sender.send('asynchronous-reply', 'CURL_WORKER_COMPLETE')
	}
	else if (arg == 'CS_REG_WORKER_START'){
  		const HTTPClient = require('./http-client')
		worker = new HTTPClient.registerCS();
		event.sender.send('asynchronous-reply', 'CS_REG_WORKER_COMPLETE')
	}
	else if (arg == 'MENU_REGISTER_BUTTON') {
		//console.log("MENU_REGISTER_BUTTON IS CLICK");
		// Create the browser window collect CS register information.
		registerWindow = new BrowserWindow({
			parent: mainWindow,
			       width: 900,
			       height: 750,
			       minWidth: 500,
			       minHeight: 200,
			       acceptFirstMouse: true,
			       titleBarStyle: 'hidden',
			       frame:true 
		});
		registerWindow.loadURL('file://' + __dirname + '/register.html');
  		//registerWindow.openDevTools();
		registerWindow.show();

		registerWindow.on('closed', function() {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			registerWindow = null;
		});
	}
	else if (arg == 'MENU_CLEAR_RECORD_BUTTON') {
		console.log("MENU_CLEAR_RECORD_BUTTON IS CLICK");
		settings.deleteAll();
		mainWindow.reload();
	}
	else if (arg == 'MENU_OPERATION_BUTTON') {
		if (settings.has('global.registerOPStatus') === true) {
			status = settings.get('global.registerOPStatus');
			if (status === 'start')
				settings.set('global', {
					registerOPStatus: 'stop'
				});
			else
				settings.set('global', {
					registerOPStatus: 'start'
				});
		}
		else {
			/* In case user delete record */
			settings.set('global', {
				registerOPStatus: 'stop'
			});
		}
		console.log(settings.get('global.registerOPStatus'));
	}
	else if (arg == 'MENU_WIFI_BUTTON') {
		console.log('MENU_WIFI_BUTTON');
		registerWindow = new BrowserWindow({
			parent: mainWindow,
			       width: 900,
			       height: 750,
			       minWidth: 500,
			       minHeight: 200,
			       acceptFirstMouse: true,
			       titleBarStyle: 'hidden',
			       overlayScrollbars: true,
			       frame:true 
		});
		registerWindow.loadURL('file://' + __dirname + '/wifi.html');
  		registerWindow.openDevTools();
		registerWindow.show();

		registerWindow.on('closed', function() {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			registerWindow = null;
		});
	}
	else {
		console.log('Unknown tasklet %s', arg);
	}
	event.sender.send('asynchronous-reply', 'MENU_OPERATION_COMPLETE')
})

/* Worker process event trigger with high priority */
ipcMain.on('synchronous-message', (event, arg) => {
	console.log(arg) 
	if (arg == 'SEARCHING_DEVICE') {
		var store = settings.getAll();
		var message = "";
		for (column in store) {
			if (settings.has(column+'.modelName') === true) {
				message+="<tr class='file_arq'>";
				message+="<th>"+settings.get(column+'.modelName')+"</th>";
				message+="<th>"+settings.get(column+'.ipv6Addr')+"</th>";
				message+="<th>"+settings.get(column+'.serialNumber')+"</th>";
				message+="<th>"+settings.get(column+'.firmwareVersion')+"</th>";
				message+="<th>"+settings.get(column+'.createdAt')+"</th>";
				message+="<th>"+settings.get(column+'.status')+"</th>";
				message+="<th>"+settings.get(column+'.reason')+"</th>";
				message+="</tr>";
			}
		}
		event.returnValue = message;
	}
	else if (arg == 'MENU_REGISTER_BUTTON') {
		console.log("REGISTER_BUTTON IS CLICK");

	}
	else {
		console.log('Unknown tasklet');
	}
})

/* CS register process data */
ipcMain.on('asynchronous-register-form', (event, arg) => {
	settings.set('register', arg);
	console.log(settings.get('register')); 
	event.sender.send('register', 'REGISTER_UPDATE');
	//registerWindow.close();
})

ipcMain.on('asynchronous-wifi-query', (event, arg) => {
	event.sender.send('wifi-update', 'WIFI_UPDATE');
})
