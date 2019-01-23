import QtQuick 2.0

Item {
    property string name
    property string type : null
    property bool isList : false
    property bool isReadonly : false
    property bool isPointer: false
    property int revision

    function getJson() {
        return {
            name: name,
            type: type,
            isList: isList,
            isReadonly: isReadonly,
            isPointer: isPointer,
            revision: revision
        };
    }
}
