/* Copyright 2018 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */


// You can run your app in Qt Creator by pressing Alt+Shift+R.
// Alternatively, you can run apps through UI using Tools > External > AppStudio > Run.
// AppStudio users frequently use the Ctrl+A and Ctrl+I commands to
// automatically indent the entirety of the .qml file.


import QtQuick 2.7
import QtQuick.Controls 2.4
import QtQuick.Layouts 1.3
import QtQuick.Dialogs 1.2

import ArcGIS.AppFramework 1.0

App {
    id: app

    width: 800 * AppFramework.displayScaleFactor
    height: 640 * AppFramework.displayScaleFactor

    property url fileUrl
    property string filePath: ""
    property string fileText: ""
    property var outputJson
    property string jsonText: ""
    property url defaultUrl: AppFramework.resolvedPathUrl("~/Applications/ArcGIS/AppStudio/bin/qml/ArcGIS/AppFramework/AppFrameworkPlugin.qmltypes")
    property string errorString: ""
    property string notifyString: ""

    ColumnLayout {
        anchors.fill: parent

        MenuBar {

            Menu {
                title: qsTr("&File")

                Action { text: qsTr("&Open ..."); onTriggered: fileOpen() }
                Action { text: qsTr("&Export ..."); onTriggered: fileExport() }
                MenuSeparator { }
                Action { text: qsTr("&Quit"); onTriggered: Qt.quit() }
            }

            Menu {
                title: qsTr("&Edit")

                Action { text: qsTr("&Copy JSON"); onTriggered: editCopy() }
            }

        }

        TabBar {
            id: tabBar

            Layout.fillWidth: true

            TabButton {
                text: qsTr("qmltypes")

                width: implicitWidth
            }

            TabButton {
                text: qsTr("json")

                width: implicitWidth
            }
        }

        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true

            currentIndex: tabBar.currentIndex

            NumberedTextArea {
                anchors.fill: parent

                text: fileText
            }

            NumberedTextArea {
                anchors.fill: parent

                text: jsonText
            }

        }

        Text {
            Layout.fillWidth: true

            wrapMode: Text.WrapAtWordBoundaryOrAnywhere

            text: notifyString
        }

        Text {
            Layout.fillWidth: true

            wrapMode: Text.WrapAtWordBoundaryOrAnywhere

            text: errorString
            color: "red"
        }

        Text {
            Layout.fillWidth: true

            text: filePath
            wrapMode: Text.WrapAtWordBoundaryOrAnywhere
        }
    }

    FileDialog {
        id: openDialog

        folder: shortcuts.home + "/Applications/ArcGIS/AppStudio/bin/qml/ArcGIS/AppFramework"
        selectExisting: true

        nameFilters: [
            "QML Types Files (*.qmltypes)", "All Files (*.*)"
        ]

        onAccepted: openFileUrl(fileUrls[0]);
    }

    FileDialog {
        id: saveDialog

        folder: shortcuts.documents
        selectExisting: false

        nameFilters: [
            "JSON Type Files (*.json)", "All Files (*.*)"
        ]

        onAccepted: saveFileUrl(fileUrls[0]);
    }

    FileFolder {
        id: tempFolder

        path: AppFramework.temporaryFolder.filePath("xyz")
    }

    FileFolder {
        id: resFolder

        url: "res"
    }

    Item {
        id: qmlTypesItem
    }

    Timer {
        id: quitTimer

        interval: 100
        running: false
        repeat: false

        onTriggered: Qt.quit()
    }

    function openFileUrl(url) {
        errorString = "";
        notifyString = "";

        fileText = "";
        fileUrl = url;
        filePath = AppFramework.resolvedPath(fileUrl);
        fileText = AppFramework.userHomeFolder.readTextFile(filePath);
        jsonText = "";

        var _fileText = fileText.replace(/import QtQuick.tooling/, "// import QtQuick.tooling");
        _fileText = _fileText.replace(/Component {/g, "QmlTypesComponent {");

        tempFolder.makeFolder();

        var resFiles = resFolder.fileNames("*.qml");
        resFiles.forEach(function (resFile) {
            if (tempFolder.fileExists(resFile)) {
                tempFolder.removeFile(resFile);
            }
            resFolder.copyFile(resFile, tempFolder.filePath(resFile));
        } );

        if (tempFolder.fileExists("Dummy.qml")) {
            tempFolder.removeFile("Dummy.qml");
        }

        tempFolder.writeTextFile("Dummy.qml", _fileText);

        AppFramework.clearComponentCache();

        var dummy = Qt.createComponent(tempFolder.fileUrl("Dummy.qml"));
        if (!dummy)
        {
            return;
        }

        var qmlModule = dummy.createObject(qmlTypesItem);
        if (!qmlModule)
        {
            errorString = dummy.errorString();
            return;
        }

        try {
            outputJson = qmlModule.getJson();
            jsonText = JSON.stringify(outputJson, undefined, 2);
        }
        catch (err) {
            errorString = qsTr("%1:%2 %3 %4")
                .arg(err.fileName)
                .arg(err.lineNumber)
                .arg(err.name)
                .arg(err.message);
        }

    }

    function saveFileUrl(fileUrl) {
        errorString = "";
        notifyString = "";

        var saveFileUrl = AppFramework.resolvedUrl(fileUrl);
        var saveFilePath = AppFramework.resolvedPath(saveFileUrl);

        var ok = AppFramework.userHomeFolder.writeTextFile(saveFilePath, jsonText);

        if (!ok) {
            errorString = qsTr("Unable to write to %1").arg(saveFilePath);
            return;
        }

        notifyString = qsTr("Exported to %1").arg(saveFilePath);
    }

    function fileOpen() {
        openDialog.open();
    }

    function fileExport() {
        saveDialog.open();
    }

    function editCopy() {
        errorString = "";
        notifyString = "";

        AppFramework.clipboard.copy(jsonText);

        notifyString = qsTr("%1 bytes of JSON copied").arg(jsonText.length);
    }

    property FileInfo _fileInfo: FileInfo { }
    property FileFolder _fileFolder: FileFolder { }

    Component.onCompleted: {
        var qmlTypesFilePath;
        var qmlTypesFileUrl = defaultUrl;
        var outputFilePath;
        var outputFileUrl;

        console.log(JSON.stringify(Qt.application.arguments, undefined, 2));
        for (var i = 1; i < Qt.application.arguments.length; i++) {
            var arg = Qt.application.arguments[i];

            if (arg.match(/^--/)) {
                if (arg.match(/^--qmltypes/)) {
                    qmlTypesFilePath = Qt.application.arguments[++i];
                    qmlTypesFileUrl = AppFramework.resolvedPathUrl(qmlTypesFilePath);
                    console.log("Parameter %1 set to %2".arg(arg).arg(qmlTypesFilePath));
                    continue;
                }

                if (arg.match(/^--json/)) {
                    outputFilePath = Qt.application.arguments[++i];
                    outputFileUrl = AppFramework.resolvedPathUrl(outputFilePath);
                    console.log("Parameter %1 set to %2".arg(arg).arg(outputFilePath));
                    continue;
                }
            }

        }

        console.log("qmlTypesFilePath: ", qmlTypesFilePath);
        console.log("qmlTypesFileUrl: ", qmlTypesFileUrl);
        console.log("outputFilePath: ", outputFilePath);
        console.log("outputFileUrl: ", outputFileUrl);

        openFileUrl(qmlTypesFileUrl);

        if (outputFilePath) {
            var outputFileInfo = AppFramework.fileInfo(outputFileUrl);
            var outputFileName = outputFileInfo.fileName;
            console.log("outputFileName: ", outputFileName);
            //var outputFileUrl = AppFramework.resolvedUrl(outputFilePath);
            var outputFileFolder = outputFileInfo.folder;
            console.log("outputFileFolder.path: ", outputFileFolder.path);
            outputFilePath = outputFileFolder.filePath(outputFileName);
            if (outputFileFolder.fileExists(outputFileName)) {
                outputFileFolder.removeFile(outputFileName);
            }
            console.log("outputFileUrl: ", outputFileUrl);
            console.log("Saving %1 chars to %2"
                        .arg(jsonText.length)
                        .arg(outputFileFolder.filePath(outputFileName)));
            //var ok = outputFileFolder.writeTextFile(outputFilePath, jsonText);
            if (!outputFileFolder.exists) {
                outputFileFolder.makeFolder();
            }
            var ok = outputFileFolder.writeTextFile(outputFileName, jsonText);
            //var ok = outputFileFolder.writeJsonFile(outputFileName, outputJson);
            console.log(ok);
            quitTimer.start();
        }
    }

}

