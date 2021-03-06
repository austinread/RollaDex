import { ipcMain, OpenDialogOptions, SaveDialogOptions, dialog } from "electron";
import { resetSafeSave, SafeToSave } from './save-tracker-main';
import { getRecentsJSON, updateRecents, updateRecentsMenu } from './recents';
const fs = require('fs');

var savePath: string = "";

ipcMain.on('send-save-json', (event: any, json: any) => {
    fs.writeFile(savePath, JSON.stringify(json), (err: any) => {
        resetSafeSave();
    });
});

ipcMain.on('check-recent-load', (event: any, arg: any) => {
    //property juggling to match focusedWindowProperties usually expected by executeLoad
    var win = event;
    win.webContents = win.sender;

    getRecentsJSON()
        .then((json: any) => {
            if (json.lastOpen){
                executeLoad(win, json.lastOpen);
            }
            
            updateRecentsMenu(json.recents)
        });
});

function updateSavePath(path: string){
    savePath = path;
    updateRecents(path)
        .then((recentsArray: any) => { updateRecentsMenu(recentsArray) });
}

export function newCharacter(window: Electron.BrowserWindow){
    if (!SafeToSave()){
        var messageBoxOptions = {
            buttons: ["Clear Without Saving", "Save Character", "Cancel"],
            defaultId: 0,
            title: "Unsaved Changes",
            message: "There are unsaved changes to this character.  Would you like to create a new one and lose all unsaved data?",
            cancelId: 2
        }
        var loadWithoutSavingDialogResponse = dialog.showMessageBoxSync(messageBoxOptions)
        switch(loadWithoutSavingDialogResponse){
            case 0:
                break;
            case 1:
                saveToJSON(window);
                return;
            case 2:
                return;
            default:
                //shouldn't reach this anyway
        }
    }

    updateSavePath("");
    resetSafeSave();
    window.reload();
}

export function saveToJSON(window: Electron.BrowserWindow){
    if (savePath) {
        window.webContents.send('request-save-json');
    }
    else{
        saveAsToJSON(window);
    }
}

export function saveAsToJSON(window: Electron.BrowserWindow){
    var saveDialogOptions: SaveDialogOptions = {
        title: "Save Character",
        defaultPath: "Untitled.json",
        filters: [
            {
                name: 'JSON',
                extensions: ['json']
            }
        ],
        properties: ["createDirectory"]
    }

    dialog.showSaveDialog(saveDialogOptions).then((result: any) => {
        if (!result.canceled){
            updateSavePath(result.filePath);
            window.webContents.send('request-save-json');
        }
    });
}

export function loadFromJSON(window: Electron.BrowserWindow, path: string){
    if (!SafeToSave()){
        var messageBoxOptions = {
            buttons: ["Load Without Saving", "Save Character", "Cancel"],
            defaultId: 0,
            title: "Unsaved Changes",
            message: "There are unsaved changes to this character.  Would you like to load a different one and lose all unsaved data?",
            cancelId: 2
        }
        var loadWithoutSavingDialogResponse = dialog.showMessageBoxSync(messageBoxOptions)
        switch(loadWithoutSavingDialogResponse){
            case 0:
                break;
            case 1:
                saveToJSON(window);
                return;
            case 2:
                return;
            default:
                //shouldn't reach this anyway
        }
    }

    if(path){
        executeLoad(window, path);
    }
    else{
        var openDialogOptions: OpenDialogOptions = { 
            title: "Load Character", 
            filters: [
                {
                    name: 'JSON',
                    extensions: ['json']
                }
            ],
            properties: ["openFile"] 
        }
    
        dialog.showOpenDialog(openDialogOptions).then((result: any) => {
            executeLoad(window, result.filePaths[0]);
        });
    }
}

function executeLoad(window: Electron.BrowserWindow, path: string){
    fs.readFile(path, 'utf-8', (error: any, data: any) => {
        updateSavePath(path);
        var json = JSON.parse(data);
        window.webContents.send('send-loaded-json', json);
        resetSafeSave();
    });
}