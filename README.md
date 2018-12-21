# appstudio-vscode
AppStudio Extension for Visual Studio Code

## Features implemented so far

* QML Syntax Highlighting

* Run current app project via AppRun

* Show console output from AppRun

* AppStudio settings tool for current project via AppSetting

* Upload current project via AppUpload

* AppStudio make tool for current project via AppMake

## Installation

At the moment you can run this extension in Visual Studio Code Debug mode or by installing the extension locally

### Running in VS Code Debug Mode

Copy this repository onto your local machine and open it in VS code. Hit F5 to enter debug mode.

### Install the extension locally

Clone this repository under your local VS code extensions folder and enable the extension: 
* Windows: %USERPROFILE%\.vscode\extensions
* Mac / Linux: $HOME/.vscode/extensions

> **Note**: You must select the AppStudio bin folder path when you run the extension for the first time. You can do this by clicking on the select bin folder icon on the bottom left corner of the status bar, or setting directly in the Visual Studio Code Extension Settings.

## Extension Settings

This extension contributes the following settings:

* `AppStudio.Bin Folder`: path for the AppStudio bin folder, default to be an empty string ""
