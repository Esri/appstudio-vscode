# appstudio-vscode
AppStudio Extension for Visual Studio Code

## Features implemented so far

* Open AppStudio project: To open AppStudio projects, simply open a folder containing a appinfo.json file. If the workspace contains more than one folders containing appinfo.json files, the extension will prompt the user to select one of them before running the executables.  

* QML Syntax Highlighting

* Run current app project via AppRun (Alt+Shift+R)

* Show console output from AppRun

* AppStudio settings tool for current project via AppSetting (Alt+Shift+S)

* Upload current project via AppUpload (Alt+Shift+UpArrow)

* AppStudio make tool for current project via AppMake (Alt+Shift+M)

* Context sensitive help: hover over a qml component to see the link to the online APi reference. Currently only supports QML types.

* Context sentitive code completion for QML: Currently supports QML types, properties, signals, methods and enumerations. Under any context, all QML types from the modules that have been imported will be provided. When inside the body block of a QML object, attributes which belong to the type of that object will also be provided. 

## Installation

At the moment you can run this extension by installing the extension locally, or in Visual Studio Code debug mode.

#### Install the extension locally 

Download the `appstudio-0.0.1.vsix` file in the repo onto your machine (you don't need to download the whole repo). Go to the path of the downloaded file and run `code --install-extension appstudio-0.0.1.vsix`.

After the extension is successfully installed, open VS code and enable the extension. You can find the extension in: extension panel on the left -> Disabled.

#### Running in VS Code debug mode

Clone this repository onto your local machine and open it in VS code. Hit F5 to enter debug mode.

## Extension Settings

This extension contributes the following settings:

* `AppStudio.AppStudio Path`: path for the AppStudio installation folder, default to empty string ""

> **Note**: When the extension is activated for the first time, it will detect the AppStudio installation automatically on your machine. You can also change the AppStudio folder manually by clicking on the 'Select folder' icon on the status bar, or directly in the Visual Studio Code Extension Settings.

> **Note**: The extension works on Windows, Mac OS and Linux.
