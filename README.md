# Built-In Extensions


Disable built-in extension features in Visual Studio Code by cloning the built-in extension into the local extension folder and disable the features you don't need.

> **WARNING**: Disabling built-in extension features can have unexpected side effects. Please be always aware of it!

## Index

1. [How to use](#how-to-use)
1. [Available Commands](#available-commands)
1. [Available Settings](#available-settings)
1. [Recommended Extensions](#recommended-extensions)

## How to use

> **INFO**: It is recommended to disable every built-in extension which is not required instead of disabling its features. This is also a huge performance boost for Visual Studio Code.

1. Open the command palette on macOS with `Cmd + Shift + P` or Windows/Linux with `Ctrl + Shift + P`.
1. Search for the command `Disable Built-In Extension Features` and press `Enter`.
1. Select a build-in extension from the list you want to modify and press `Enter`.
1. Select the features you want to enable or disable and press `Ok`. Snippets are disabled by default.
1. Click the button in the info message `Show Built-In Extensions`  or open the extension view and type `@builtin`.
1. Disable the native built-in extension you have modified, because the modfied version was copied to your local extension folder and is now available as a regular extension.
1. Please reload the window to enable the new modified built-in extension.

## Available Commands

* `Disable Built-In Extension Features` - Opens a dialog with active built-in extensions which allows to disable specific features of a built-in extension.

## Available Settings

* `l13BuiltInExtensions.autoUpdateModifiedBuiltInExtensions` - If true the modified built-in extensions will be automatically updated if something has changed.

## Recommended Extensions

- [Extension Pack](https://marketplace.visualstudio.com/items?itemName=L13RARY.l13-extension-pack)