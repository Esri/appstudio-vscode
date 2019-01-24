import QtQuick 2.0

Item {
    property string name
    property string type
    property bool isPointer: false
    property bool isList: false

    function getJson() {
        return {
            name: name,
            type: type,
            isList: isList,
            isPointer: isPointer
        }
    }
}
