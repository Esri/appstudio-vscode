import QtQuick 2.0

Item {
    id: qmlComponent

    default property alias children: qmlComponent.items
    property list<Item> items

    property string name
    property string prototype : ""
    property var exports
    property var exportMetaObjectRevisions
    property string defaultProperty
    property list<Enum> enums
    property list<Property> properties
    property list<Method> methods
    property list<Signal> signals
    property string exportName
    property string exportModule
    property string exportVersion
    property int exportVersionMajor
    property int exportVersionMinor
    property bool isCreatable : true
    property bool isComposite : false
    property bool isSingleton : false
    property string attachedType

    function getJson() {
        var obj = {
            name: name,
            prototype: prototype,
            exports: exports,
            exportMetaObjectRevisions: exportMetaObjectRevisions,
            defaultProperty: defaultProperty,
            exportName: exportName,
            exportModule: exportModule,
            exportVersion: exportVersion,
            exportVersionMajor: exportVersionMajor,
            exportVersionMinor: exportVersionMinor,
            isCreatable: isCreatable,
            isCompsite: isComposite,
            isSingleton: isSingleton,
            attachedType: attachedType,
            enums: [ ],
            properties: [ ],
            methods: [ ],
            signals: [ ]
        }

        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            if (item instanceof Enum) {
                obj.enums.push(item.getJson());
                continue;
            }

            if (item instanceof Method) {
                obj.methods.push(item.getJson());
                continue;
            }

            if (item instanceof Property) {
                obj.properties.push(item.getJson());
                continue;
            }

            if (item instanceof Signal) {
                obj.signals.push(item.getJson());
                continue;
            }

        }

        return obj;
    }

}
