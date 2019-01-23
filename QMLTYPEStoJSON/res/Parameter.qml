import QtQuick 2.0

Item {
    property string name
    property string type
    property bool isPointer: false

    function getJson() {
        return {
            name: name,
            type: type,
            isPointer: isPointer
        }
    }
}
