import QtQuick 2.0

Item {
    id: thisSignal

    default property alias children : thisSignal.items
    property list<Item> items

    property string name
    property int revision
    property string type

    QtObject {
        id: internal
        property Parameter theParameter
    }

    function getJson() {
        var obj = {
            name: name,
            revision: revision,
            type: type,
            parameters: [ ]
        };

        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            if (item instanceof Parameter) {
                obj.parameters.push(item.getJson());
                continue;
            }
        }

        return obj;
    }

}
