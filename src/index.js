const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DHT = require('hyperdht');
const goodbye = require('graceful-goodbye');
const b4a = require('b4a');

let server;
let clientConn;
let connectedClient;

const startClient = (keyInput = process.argv[2]) => {
  console.log('Connecting to:', keyInput)
  if(keyInput instanceof Uint8Array) {
      const textDecoder = new TextDecoder('utf-8');
      keyInput = textDecoder.decode(keyInput);
  }
  const publicKey = b4a.from(keyInput, 'hex');

  const dht = new DHT()
  clientConn = dht.connect(publicKey)
  clientConn.once('open', () => console.log('got connection!'))

  process.stdin.pipe(clientConn).pipe(process.stdout);
}


const startServer = (mainWindow) => {
  const dht = new DHT();

  const keyPair = DHT.keyPair();
  
  server = dht.createServer(conn => {
      console.log('got connection!')
      // process.stdin.pipe(conn).pipe(process.stdout)
      connectedClient = conn;
  })
  
  server.listen(keyPair).then(() => {
      console.log('listening on:', b4a.toString(keyPair.publicKey, 'hex'))
      mainWindow.webContents.send('serverKey', b4a.toString(keyPair.publicKey, 'hex'))
  })
  
  goodbye(() => server.close())
}


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Enable hot-reloading in development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    forceHardReset: true,
    hardResetMethod: 'exit',
  });
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    minWidth: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // then start the server
  startServer(mainWindow);

  let shouldServeData = true;

  ipcMain.on('connect-to-server', (event, keyInput) => {
    shouldServeData = true;
    console.log('Connecting to a server');
    console.log('Here is the keyInput:', keyInput);
    startClient(keyInput);
  });

  ipcMain.on('disconnect-from-server', (event) => {
    shouldServeData = false;
  });

  ipcMain.on('localVideoFrame', (event, frame) => {
    if(shouldServeData) {
      // now serve the video
      console.log('Here is the video frame:', frame);
      console.log(server);
      console.log(Object.getOwnPropertyNames(server));
      
      // ipcMain.on('send-stream-to-renderer', (event) => {
      //   event.sender.send('stream-data', { stream: readableStream });
      // });
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
if (require.main === module) {
  startClient();
} 
