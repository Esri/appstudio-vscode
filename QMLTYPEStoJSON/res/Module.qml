import QtQuick 2.0

Item {
    id: qmlModule

    default property alias children: qmlModule.items
    property list<Item> items

    property var dependencies

    function getJson() {
        var obj = {
            components: [ ],
            dependencies: qmlModule.dependencies
        }

        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            if (item instanceof QmlTypesComponent) {
                obj.components.push(item.getJson());
                continue;
            }
        }

        return obj;
    }
}
