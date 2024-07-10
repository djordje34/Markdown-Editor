const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { readdir, stat } = require('fs').promises;

const main = 'static/index.html';

async function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(main);
  const contextMenu = (await import('electron-context-menu')).default;
  
  contextMenu({
    window: mainWindow,
    prepend: (defaultActions, params, browserWindow) => [
      {
        label: 'Open',
        click: () => {
          dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
              { name: 'Markdown Files', extensions: ['md'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          }).then(file => {
            if (!file.canceled) {
              const filePath = file.filePaths[0];
              fs.stat(filePath).then(stats => {
                if (stats.isDirectory()) {
                  console.error('Selected path is a directory, not a file.');
                } else {
                  fs.readFile(filePath, 'utf-8').then(data => {
                    mainWindow.webContents.send('open-file', data, path.dirname(filePath), filePath);
                  }).catch(err => {
                    console.log('Error reading file:', err);
                  });
                }
              }).catch(err => {
                console.log('Error getting file stats:', err);
              });
            }
          }).catch(err => {
            console.log('Error opening dialog:', err);
          });
        }
      },
      {
        label: 'Save',
        click: () => {
          mainWindow.webContents.send('save-file');
        }
      }
    ]
  });

  // Define menu template
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open',
          click: () => {
            dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [
                { name: 'Markdown Files', extensions: ['md'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            }).then(file => {
              if (!file.canceled) {
                const filePath = file.filePaths[0];
                fs.stat(filePath).then(stats => {
                  if (stats.isDirectory()) {
                    console.error('Selected path is a directory, not a file.');
                  } else {
                    fs.readFile(filePath, 'utf-8').then(data => {
                      mainWindow.webContents.send('open-file', data, path.dirname(filePath));
                      mainWindow.webContents.send('update-file-tree', path.dirname(filePath));
                    }).catch(err => {
                      console.log('Error reading file:', err);
                    });
                  }
                }).catch(err => {
                  console.log('Error getting file stats:', err);
                });
              }
            }).catch(err => {
              console.log('Error opening dialog:', err);
            });
          }
        },
        {
          label: 'Save',
          click: () => {
            mainWindow.webContents.send('save-file');
          }
        },
        { role: 'quit' }
      ]
    }
  ];


  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('save-content', (event, content) => {
  dialog.showSaveDialog({
    title: 'Save Markdown',
    defaultPath: path.join(__dirname, 'untitled.md'),
    filters: [
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(file => {
    if (!file.canceled) {
      fs.writeFile(file.filePath.toString(), content, (err) => {
        if (err) throw err;
        console.log('File successfully saved.');
      });
    }
  }).catch(err => {
    console.log(err);
  });
});


ipcMain.on('get-directory-structure', async (event, directory) => {
  try {
    const structure = await getDirectoryStructure(directory);
    event.sender.send('directory-structure', structure);
  } catch (error) {
    console.error('Error fetching directory structure:', error);
  }
});

async function getDirectoryStructure(directory) {
  try {
    const items = await readdir(directory);
    const structure = [];

    console.log('Processing directory:', directory);

    for (const item of items) {
      const itemPath = path.join(directory, item);
      const itemStat = await stat(itemPath);

      console.log(itemPath+" "+item)

      if (itemStat.isDirectory()) {
        const contents = await getDirectoryStructure(itemPath);
        structure.push({
          name: item,
          type: 'directory',
          contents: contents
        });
      } else {
        structure.push({
          name: item,
          type: 'file',
          path: itemPath
        });
      }
    }

    return structure;
  } catch (error) {
    console.error('Error in getDirectoryStructure:', error);
    throw error;
}
}