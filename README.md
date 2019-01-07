# appstudio-vscode
AppStudio Extension for Visual Studio Code

## Features implemented so far

* Open QML project: To open QML projects, simply open a folder containing a .qmlproject file. The extension would select the directory containing the .qmlproject file as the path for runing the different executables. If the workspace contains more than one folders containing .qmlproject files, the extension will prompt the user to select one of them before running the executables.  

* QML Syntax Highlighting

* Run current app project via AppRun (Alt+Shift+R)

* Show console output from AppRun

* AppStudio settings tool for current project via AppSetting (Alt+Shift+S)

* Upload current project via AppUpload (Alt+Shift+UpArrow)

* AppStudio make tool for current project via AppMake (Alt+Shift+M)

## Installation

At the moment you can run this extension in Visual Studio Code Debug mode or by installing the extension locally

### Running in VS Code Debug Mode

Copy this repository onto your local machine and open it in VS code. Hit F5 to enter debug mode.

### Install the extension locally

Clone this repository under your local VS code extensions folder and enable the extension: 
* Windows: `%USERPROFILE%\.vscode\extensions`
* Mac / Linux: `$HOME/.vscode/extensions`

> **Note**: When the extension is activated for the first time, it will detect the AppStudio installation automatically on your machine. You can also change the AppStudio folder manually by clicking on the 'Select folder' icon on the status bar, or directly in the Visual Studio Code Extension Settings.

> **Note**: The extension works on Windows, Mac OS and Linux at the moment.

## Extension Settings

This extension contributes the following settings:

* `AppStudio.AppStudio Path`: path for the AppStudio installation folder, default to be an empty string ""
