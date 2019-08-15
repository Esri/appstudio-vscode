# Changelog
All notable changes to this project will be documented in this file.

## [1.0.1] - 2019-08-16
### Changed
- First release to Visual Studio Code extension Marketplace

## [0.0.18] - 2019-08-14
### Fixed
- Code completion now picks up attributes from attachedType, and creates signal for each property
- Code completion now does not show signals when typing . after an id

### Changed
- qmltypes.json updated to match AppStudio 4.0.85 release

## [0.0.17] - 2019-08-12
### Changed
- Enable/disable AppStudio Player button is removed from the AppStudio project menu title
- Updated name of setting for installation path of AppStudio Player 

## [0.0.16] - 2019-08-07
### Fixed
- Cursor will not jump to the console output window when a new message appears in the console 
### Added
- Tool to run AppStudio apps in AppStudio Player
- The tool can be enabled and disabled via extension setting

## [0.0.15] - 2019-05-09
### Changed
- Update format and colour of syslog console output

## [0.0.14] - 2019-05-09
### Changed 
- Remove package-lock.json from the repository, move vsix file to Release section on Github 

## [0.0.13] - 2019-05-07
### Fixed
- Code completion works for second full stop, e.g.AppFramework.clipboard.copy 
- Code completion works for QML Component type

### Changed
- QMLTypes file updated to match AppStudio for ArcGIS 3.3 final release (AppStudio version 3.3.110)
- Colour in Syslog message console output

## [0.0.12] - 2019-04-02
### Added
- Colourisation of AppRun output based on severity using Syslog protocol
- Open the project folder automatically when appinfo.json is opened and there is no folder in workspace

## [0.0.11] - 2019-03-19
### Added
- Option to save all unsaved files in a project when the project is run

## [0.0.10] - 2019-03-05
### Added
- Format document and format selection for qml files

## [0.0.9] - 2019-02-27
### Changed
- QMLTypes file updated to match AppStudio for ArcGIS 3.3 beta release
- Language used in the extension settings page updated

## [0.0.8] - 2019-02-25
### Added
- Version number for QML modules import statements
- Option to change active project when QML files from non active projects are saved 

### Changed
- Code completion includes components from current module version and all versions below it

## [0.0.7] - 2019-02-22
### Added
- Additional options to right click menu of AppStudio Projects Explorer

### Changed
- Active project in AppStudio Projects Explorer now uses AppStudio logo as icon

## [0.0.6] - 2019-02-18
### Added
- AppStudio Projects Explorer

### Changed
- Active project is now set using the AppStudio Projects Explorer

## [0.0.5] - 2019-02-15
### Fixed
- Language server crash on Ubuntu

## [0.0.4] - 2019-02-01
### Changed
- QMLTypes recoginstion improved
- QML code colorization improved

### Added
- Context sensitive help (launches web help) 

## [0.0.3] - 2019-01-30
### Changed
- Active project now shown in the status bar

## [0.0.2] - 2019-01-29
### Fixed
- Recognition of appinfo.json

### Changed
- Improved context sensitive help
- Improved QML code completion

## [0.0.1] - 2019-01-23
### Added
- Concept of an active project
- Rudimentary context sensitive help
- Rudimentary QML code completion

## [0.0.0] - 2019-01-04
### Added
- Recognise AppStudio projects
- Settings, Upload, Make, Run tools added
- QML code colorization
