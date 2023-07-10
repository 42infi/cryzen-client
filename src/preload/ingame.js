const {ipcRenderer} = require('electron');
const fs = require('fs');
const path = require('path');

const documents = ipcRenderer.sendSync('docs');
let scriptFolder = documents + "\\cryzen-client\\scripts";

if (!fs.existsSync(scriptFolder)) {
    fs.mkdirSync(scriptFolder, {recursive: true});
}
try {
    fs.readdirSync(scriptFolder).filter(file => path.extname(file).toLowerCase() === '.js').forEach(filename => {
        try {
            require(`${scriptFolder}/${filename}`);
        } catch (e) {
            console.error("an error occurred while executing userscript: " + filename + " error: " + e);
        }
    });
} catch (e) {
    console.error("an error occurred while loading userscripts: " + e);
}

window.addEventListener = new Proxy(window.addEventListener, {
    apply(target, thisArg, argArray) {
        if(argArray[0] && argArray[0] === "beforeunload") return;
        return Reflect.apply(target, thisArg, argArray);
    }
});
