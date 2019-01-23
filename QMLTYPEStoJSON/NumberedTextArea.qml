import QtQuick 2.8
import QtQuick.Controls 1.4
import QtQuick.Controls 2.1
import QtQuick.Layouts 1.2

import ArcGIS.AppFramework 1.0

Item {
    id: numberedTextArea

    property alias text: textArea.text
    property alias font: textArea.font

    RowLayout {
        anchors.fill: parent

        Rectangle {
            id: lineColumn

            property int rowHeight: textArea.font.pixelSize + 3

            Layout.preferredWidth: 50 * AppFramework.displayScaleFactor
            Layout.fillHeight: true

            color: "#f2f2f2"
            clip: true
            focus: true

            Rectangle {
                height: parent.height
                anchors.right: parent.right
                width: 1
                color: "#ddd"
            }

            Column {
                id: column
                y: -scrollView.flickableItem.contentY + 8
                width: parent.width

                Repeater {
                    model: Math.max(textArea.lineCount, (lineColumn.height/lineColumn.rowHeight))

                    delegate: Text {
                        property bool valid: index < textArea.lineCount
                        color: "#555"
                        visible: valid
                        font: textArea.font
                        width: lineColumn.width
                        horizontalAlignment: Qt.AlignHCenter
                        verticalAlignment: Qt.AlignVCenter
                        height: lineColumn.rowHeight
                        text: index + 1
                    }
                }

                onYChanged: {
                    if (mouseArea.drag.active) {
                        scrollView.flickableItem.contentY = -y + 8;
                    }
                }
            }

            MouseArea {
                id: mouseArea

                anchors.fill: column

                cursorShape: Qt.DragMoveCursor

                onPressed: {
                    lineColumn.forceActiveFocus();
                }

                drag {
                    target: column
                    axis: Drag.YAxis
                    minimumY: -scrollView.flickableItem.height + lineColumn.height / 2
                    maximumY: 0

                    onActiveChanged: {
                        if (!mouseArea.drag.active) {
                            column.y = Qt.binding(function () { return -scrollView.flickableItem.contentY + 8; } )
                        }
                    }
                }
            }
        }

        ScrollView {
            id: scrollView

            Layout.fillWidth: true
            Layout.fillHeight: true

            TextArea {
                id: textArea

                property bool busy: false

                textFormat: TextArea.PlainText
                selectByMouse: true

                onCursorRectangleChanged: {
                    if (cursorRectangle.y + cursorRectangle.height > scrollView.flickableItem.contentY + scrollView.height - 20) {
                        scrollView.flickableItem.contentY = cursorRectangle.y - scrollView.height / 2;
                    }

                    if (cursorRectangle.y < scrollView.flickableItem.contentY) {
                        scrollView.flickableItem.contentY = Math.max(cursorRectangle.y - scrollView.height / 2, 0);
                    }

                    if (cursorRectangle.x + cursorRectangle.width > scrollView.flickableItem.contentX + scrollView.width - 20) {
                        scrollView.flickableItem.contentX = cursorRectangle.x + cursorRectangle.width - (scrollView.width - 20);
                    }

                    if (cursorRectangle.x < scrollView.flickableItem.contentX) {
                        scrollView.flickableItem.contentX = Math.max(cursorRectangle.x - scrollView.width / 2, 0);
                    }
                }
            }
        }
    }
}

