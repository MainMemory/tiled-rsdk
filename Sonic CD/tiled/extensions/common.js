var getTiles = function(folder)
{
	var tileset = new Tileset("Tiles");
	tileset.setTileSize(16, 16);
	var tsimg = FileInfo.joinPaths(folder, "16x16Tiles.gif");
	tileset.image = tsimg;
	return tileset;
}

var getChunks = function(folder)
{
	var tileset = getTiles(folder);

	var tilemap = new TileMap();
	tilemap.setSize(8 * 4, 8 * 128);
	tilemap.setTileSize(16, 16);
	tilemap.addTileset(tileset);
	var colts = tiled.tilesetFormat("tsx").read(FileInfo.joinPaths(scriptpath, "../Collision.tsx"));
	tilemap.addTileset(colts);

	var file = new BinaryFile(FileInfo.joinPaths(folder, "128x128Tiles.bin"), BinaryFile.ReadOnly);
	var data = new DataView(file.readAll());
	file.close();

	var layer = new TileLayer("Tiles");
	layer.width = 8 * 4;
	layer.height = 8 * 128;
	var fgedit = layer.edit();
	var col1layer = new TileLayer("Collision 1");
	col1layer.width = 8 * 4;
	col1layer.height = 8 * 128;
	col1layer.visible = false;
	var col1edit = col1layer.edit();
	var col2layer = new TileLayer("Collision 2");
	col2layer.width = 8 * 4;
	col2layer.height = 8 * 128;
	col2layer.visible = false;
	var col2edit = col2layer.edit();
	var prilayer = new TileLayer("Priority");
	prilayer.width = 8 * 4;
	prilayer.height = 8 * 128;
	prilayer.visible = false;
	var priedit = prilayer.edit();
	var addr = 0;
	for (var i = 0; i < 512; ++i) {
		if (addr >= data.byteLength)
			break;
		for (var y = 0; y < 8; ++y) {
			if (addr >= data.byteLength)
				break;
			for (var x = 0; x < 8; ++x) {
				if (addr >= data.byteLength)
					break;
				var rx = x + ((i % 4) * 8);
				var ry = y + (Math.floor(i / 4) * 8);
				var id = data.getUint16(addr, false);
				fgedit.setTile(rx, ry, tileset.tile(id & 0x3FF), (id >> 10) & 3);
				if (id & 0x1000)
					priedit.setTile(rx, ry, colts.tile(0));
				var col = data.getUint8(addr + 2);
				var col1 = (col >> 4) & 0xF;
				if (col1 < 3)
					col1edit.setTile(rx, ry, colts.tile(col1));
				var col2 = col & 0xF;
				if (col2 < 3)
					col2edit.setTile(rx, ry, colts.tile(col2));
				addr += 3;
			}
		}
	}
	fgedit.apply();
	tilemap.addLayer(layer);
	col1edit.apply();
	tilemap.addLayer(col1layer);
	col2edit.apply();
	tilemap.addLayer(col2layer);
	priedit.apply();
	tilemap.addLayer(prilayer);

	return tilemap;
}

var getChunkTileset = function(folder)
{
	var tileset = new Tileset("Chunks");
	tileset.setTileSize(128, 128);
	tileset.transparentColor = "#FF00FF";
	tileset.image = FileInfo.joinPaths(scriptpath, "../Chunks", folder + ".cnk");
	return tileset;
}

var getBackgrounds = function(folder, tileset)
{
	var file = new BinaryFile(FileInfo.joinPaths(folder, "Backgrounds.bin"), BinaryFile.ReadOnly);
	var data = new DataView(file.readAll());
	file.close();

	var group = new GroupLayer("Backgrounds");
	var addr = 0;
	var layerCount = data.getUint8(addr++);
	var hScrollCount = data.getUint8(addr++);
	var hScroll = new Array();
	for (var i = 0; i < hScrollCount; ++i) {
		hScroll[i] = {
			parallaxFactor: data.getUint16(addr, false) / 256,
			scrollSpeed: data.getUint8(addr + 2) / 64,
			deform: !!data.getUint8(addr + 3)
		};
		addr += 4;
	}
	var vScrollCount = data.getUint8(addr++);
	var vScroll = new Array();
	for (var i = 0; i < vScrollCount; ++i) {
		vScroll[i] = {
			parallaxFactor: data.getUint16(addr, false) / 256,
			scrollSpeed: data.getUint8(addr + 2) / 64,
			deform: !!data.getUint8(addr + 3)
		};
		addr += 4;
	}
	for (var l = 0; l < layerCount; ++l) {
		var bg = new GroupLayer("Background " + (l + 1));
		bg.className = "BackgroundLayer";
		bg.setProperty("Index", l);
		var width = data.getUint8(addr++);
		var height = data.getUint8(addr++);
		var type = data.getUint8(addr++);
		bg.setProperty("Type", tiled.propertyValue("LayerTypes", type));
		bg.setProperty("Parallax Factor", data.getUint16(addr, false) / 256);
		addr += 2;
		bg.setProperty("Scroll Speed", data.getUint8(addr++) / 64);
		var scrlayer = new ObjectGroup("BG" + (l + 1) + " Scroll Data");
		scrlayer.visible = false;
		var pos = 0;
		while (true)
		{
			var ind = data.getUint8(addr++);
			var cnt = 1;
			if (ind == 0xFF) {
				ind = data.getUint8(addr++);
				if (ind == 0xFF)
					break;
				cnt = data.getUint8(addr++) - 1;
			}
			if ((type == 1 || type == 2) && cnt > 0) {
				var obj = new MapObject();
				obj.className = "ScrollInfo";
				obj.shape = MapObject.Rectangle;
				if (type == 2)
				{
					obj.x = pos;
					obj.width = cnt;
					obj.height = height * 128;
					obj.setProperty("Parallax Factor", vScroll[ind].parallaxFactor);
					obj.setProperty("Scroll Speed", vScroll[ind].scrollSpeed);
					obj.setProperty("Deform", vScroll[ind].deform);
				}
				else
				{
					obj.y = pos;
					obj.height = cnt;
					obj.width = width * 128;
					obj.setProperty("Parallax Factor", hScroll[ind].parallaxFactor);
					obj.setProperty("Scroll Speed", hScroll[ind].scrollSpeed);
					obj.setProperty("Deform", hScroll[ind].deform);
				}
				scrlayer.addObject(obj);
				pos += cnt;
			}
		}
		var layer = new TileLayer("BG" + (l + 1) + " Layout");
		layer.width = width;
		layer.height = height;
		var fgedit = layer.edit();
		for (var y = 0; y < height; ++y) {
			for (var x = 0; x < width; ++x) {
				fgedit.setTile(x, y, tileset.tile(data.getUint16(addr, false)));
				addr += 2;
			}
		}
		fgedit.apply();
		bg.addLayer(layer);
		bg.addLayer(scrlayer);
		group.insertLayerAt(0, bg);
	}

	return group;
}