# tiled-rsdk
Tiled extensions for RSDK map formats, with projects for Sonic games.
![image](https://user-images.githubusercontent.com/6082665/201398084-5211d3e9-29ae-4338-a8d6-a4476fd28bfb.png)

Simply take the `tiled` folder for the game you want to edit and place it in the same folder as an extracted `Data.rsdk` (not inside the `Data` folder itself), then open the `.tiled-project` file in Tiled.

As Tiled cannot read the GameConfig.bin to get the level list, I have created a set of files for each level and chunk set. The `.scn` files are JSON files that can be edited in any text editor, and contain the stage folder and scene ID for the level; the `.cnk` files are plain text files that contain only the stage folder name. Currently, the addon will only work if the `16x16Tiles.gif`, `128x128Tiles.bin`, and scene file all exist within the same folder (`TileConfig.bin` and `StageConfig.bin` cannot be edited). Support for a fallback folder may be possible in the future to better support mods.
