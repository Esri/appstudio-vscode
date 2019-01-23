import QtQuick 2.0

Item {
    id: thisMethod

    default property alias children : thisMethod.items
    property list<Item> items

    property string name
    property string type
    property int revision

    QtObject {
        id: internal

        property Parameter theParameter
    }

    function getJson() {
        var obj = {
            name: name,
            type: type,
            revision: revision,
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
