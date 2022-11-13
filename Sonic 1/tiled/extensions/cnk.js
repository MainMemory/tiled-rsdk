var scriptpath = FileInfo.path(FileInfo.fromNativeSeparators(__filename));

var cnkMapFormat = {
    name: "RSDKv4 Chunks",
    extension: "cnk",

	//Function for reading from a cnk file
	read: function(fileName) {
		var txtfile = new TextFile(fileName, TextFile.ReadOnly);
		var folder = FileInfo.joinPaths(scriptpath, "../../Data/Stages", txtfile.readAll());

	return getChunks(folder);

	},


	write: function(map, fileName) {
		var txtfile = new TextFile(fileName, TextFile.ReadOnly);
		var folder = FileInfo.joinPaths(scriptpath, "../../Data/Stages", txtfile.readAll());
		var buffer = new ArrayBuffer(98304);
		var data = new DataView(buffer);
		var tlayer = null;
		var c1layer = null;
		var c2layer = null;
		var player = null;

		for (var lid = 0; lid < map.layerCount; ++lid) {
			var layer = map.layerAt(lid);
			switch (layer.name)
			{
				case "Tiles":
					if (layer.isTileLayer)
						tlayer = layer;
					break;
				case "Collision 1":
					if (layer.isTileLayer)
						c1layer = layer;
					break;
				case "Collision 2":
					if (layer.isTileLayer)
						c2layer = layer;
					break;
				case "Priority":
					if (layer.isTileLayer)
						player = layer;
					break;
			}
		}

		var addr = 0;
		for (var i = 0; i < 512; ++i) {
			for (var y = 0; y < 8; ++y) {
				for (var x = 0; x < 8; ++x) {
					var rx = x + ((i % 4) * 8);
					var ry = y + (Math.floor(i / 4) * 8);
					var id = 0;
					if (tlayer != null) {
						var tile = tlayer.tileAt(rx, ry);
						if (tile != null)
							id = tile.id & 0x3FF;
						id |= (tlayer.flagsAt(rx, ry) & 3) << 10;
					}
					if (player != null && player.tileAt(rx, ry) != null)
						id |= 0x1000;
					data.setUint16(addr, id, false);
					var col = 0;
					if (c1layer != null) {
						var tile = c1layer.tileAt(rx, ry);
						if (tile != null)
							col = (tile.id & 3) << 4;
						else
							col = 0x30;
					}
					if (c2layer != null) {
						var tile = c2layer.tileAt(rx, ry);
						if (tile != null)
							col |= tile.id & 3;
						else
							col |= 3;
					}
					data.setUint8(addr + 2, col);
					addr += 3;
				}
			}
		}

		var file = new BinaryFile(fileName, BinaryFile.WriteOnly);
		file.write(buffer);
		file.commit();
	}

}

tiled.registerMapFormat("cnk", cnkMapFormat);
