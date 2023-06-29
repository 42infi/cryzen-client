const {app, BrowserWindow, clipboard, ipcMain, session, protocol} = require('electron');
const fs = require('fs');
const shortcuts = require('electron-localshortcut');
const Store = require('electron-store');
const url = require("url");

function checkCreateFolder(folder) {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, {recursive: true});
    }
    return folder;
}

let swapperFolder = app.getPath('documents') + "\\cryzen-client\\swapper";
checkCreateFolder(app.getPath('documents') + "\\cryzen-client\\swapper\\assets");

Store.initRenderer();

const settings = new Store();

app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('disable-gpu-vsync');

app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.allowRendererProcessReuse = true;


ipcMain.on('docs', (event) => event.returnValue = app.getPath('documents'));

const createWindow = () => {

    const win = new BrowserWindow({
        width: 1900,
        height: 1000,
        title: `giga gamer client`,
        backgroundColor: '#000000',
        icon: __dirname + "/icon.ico",
        webPreferences: {
            preload: __dirname + '/preload/ingame.js',
            nodeIntegration: false,
            enableRemoteModule: false,
            webSecurity: false
        },
    });

    win.removeMenu();

    if (settings.get('fullScreen') === undefined) settings.set('fullScreen', true);

    win.setFullScreen(settings.get('fullScreen'));

    shortcuts.register(win, "Escape", () => win.webContents.executeJavaScript('document.exitPointerLock()', true));
    shortcuts.register(win, "F4", () => win.loadURL('https://cryzen.io/'));
    shortcuts.register(win, "F5", () => win.reload());
    shortcuts.register(win, "F6", () => win.loadURL(clipboard.readText()));
    shortcuts.register(win, 'F11', () => {
        win.setFullScreen(!win.isFullScreen());
        settings.set('fullScreen', win.isFullScreen());
    });
    shortcuts.register(win, 'F12', () => win.webContents.openDevTools());

    protocol.registerFileProtocol('file', (request, callback) => {
        const pathname = decodeURIComponent(request.url.replace('file:///', ''));
        callback(pathname);
    });
    initResourceSwapper();

    win.loadURL('https://cryzen.io/');

    win.webContents.on('new-window', (e, url) => {
        e.preventDefault();
        win.loadURL(url);
    });

    win.on('page-title-updated', (e) => {
        e.preventDefault();
    });

}

app.on('ready', createWindow);

app.on('window-all-closed', app.quit);


//modified swapper from here https://github.com/McSkinnerOG/Min-Client/blob/main/src/main.js#L194
const initResourceSwapper = () => {
    let swap = {filter: {urls: []}, files: {}};
    const allFilesSync = (dir) => {
        fs.readdirSync(dir).forEach(file => {
            const filePath = dir + '/' + file
            let useAssets = !(/cryzen-client\\swapper\\/.test(dir));
            if (fs.statSync(filePath).isDirectory()) {
                allFilesSync(filePath);
            } else {
                let kirk = '*://' + (useAssets ? 'cryzen.io' : '') + filePath.replace(swapperFolder, '').replace(/\\/g, '/') + '*';
                swap.filter.urls.push(kirk);
                swap.files[kirk.replace(/\*/g, '')] = url.format({
                    pathname: filePath,
                    protocol: '',
                    slashes: false
                });
            }
        });
    };
    allFilesSync(swapperFolder);
    if (swap.filter.urls.length) {
        session.defaultSession.webRequest.onBeforeRequest(swap.filter, (details, callback) => {
            let redirect = swap.files[details.url.replace(/https|http|(\?.*)|(#.*)/gi, '')] || details.url;
            callback({cancel: false, redirectURL: redirect});
        });
    }
}
