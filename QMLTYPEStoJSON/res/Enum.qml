import QtQuick 2.0

Item {
    property string name
    property var values

    function getJson() {
        return {
            name: name,
            values: values
        };
    }

}
