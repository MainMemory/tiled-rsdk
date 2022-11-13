var scriptpath = FileInfo.path(FileInfo.fromNativeSeparators(__filename));

var scnMapFormat = {
    name: "RSDKv4 Scene",
    extension: "scn",

	//Function for reading from a scn file
	read: function(fileName) {
		var txtfile = new TextFile(fileName, TextFile.ReadOnly);
		var stginf = JSON.parse(txtfile.readAll());
		var folder = FileInfo.joinPaths(scriptpath, "../../Data/Stages", stginf.folder);
		var file = new BinaryFile(FileInfo.joinPaths(folder, "Act" + stginf.scene + ".bin"), BinaryFile.ReadOnly);
		var data = new DataView(file.readAll());
		file.close();

		var tilemap = new TileMap();
		tilemap.setTileSize(128, 128);
		var namelen = data.getUint8(0);
		var lvlname = '';
		for (var i = 0; i < namelen; i++)
			lvlname += String.fromCharCode(data.getUint8(i + 1));
		tilemap.setProperty("Title", lvlname);
		var addr = namelen + 1;
		var activelayers = new Array();
		for (var i = 0; i < 4; ++i)
			activelayers[i] = data.getUint8(addr++);
		tilemap.setProperty("Active Layer 0", tiled.propertyValue("ActiveLayers", activelayers[0]));
		tilemap.setProperty("Active Layer 1", tiled.propertyValue("ActiveLayers", activelayers[1]));
		tilemap.setProperty("Active Layer 2", tiled.propertyValue("ActiveLayers", activelayers[2]));
		tilemap.setProperty("Active Layer 3", tiled.propertyValue("ActiveLayers", activelayers[3]));
		tilemap.setProperty("Layer Midpoint", tiled.propertyValue("LayerMidpoints", data.getUint8(addr++)));

		var tileset = getChunkTileset(stginf.folder);
		tilemap.addTileset(tileset);

		var backgrounds = getBackgrounds(folder, tileset);

		var width = data.getUint8(addr++);
		++addr;
		var height = data.getUint8(addr++);
		++addr;
		var maxwidth = width;
		var maxheight = height;
		for (var i = 0; i < backgrounds.layerCount; ++i) {
			var layer = backgrounds.layerAt(i).layerAt(0);
			if (layer.width > maxwidth)
				maxwidth = layer.width;
			if (layer.height > maxheight)
				maxheight = layer.height;
			layer.visible = activelayers.indexOf(7 - i + 1) != -1;
		}
		tilemap.setSize(maxwidth, maxheight);
		tilemap.addLayer(backgrounds);
		var layer = new TileLayer("Foreground");
		layer.visible = activelayers.indexOf(0) != -1;
		layer.width = width;
		layer.height = height;
		var fgedit = layer.edit();
		for (var y = 0; y < height; ++y) {
			for (var x = 0; x < width; ++x) {
				fgedit.setTile(x, y, tileset.tile(data.getUint16(addr, true)));
				addr += 2;
			}
		}
		fgedit.apply();
		tilemap.addLayer(layer);

		var entcnt = data.getUint16(addr, true);
		addr += 2;
		var layer = new ObjectGroup("Entities");
		for (var i = 0; i < entcnt; ++i) {
			var obj = new MapObject();
			obj.className = "Entity";
			obj.shape = MapObject.Point;
			var flags = data.getUint16(addr, true);
			addr += 2;
			obj.setProperty("type", data.getUint8(addr++));
			obj.setProperty("propertyValue", data.getUint8(addr++));
			obj.x = data.getInt32(addr, true) / 0x10000;
			obj.y = data.getInt32(addr + 4, true) / 0x10000;
			addr += 8;
			if (flags & 1) {
				obj.setProperty("state", data.getInt32(addr, true));
				addr += 4;
			}
			if (flags & 2)
				obj.setProperty("direction", tiled.propertyValue("Directions", data.getUint8(addr++)));
			if (flags & 4) {
				obj.setProperty("scale", data.getInt32(addr, true) / 0x200);
				addr += 4;
			}
			if (flags & 8) {
				obj.setProperty("rotation", data.getInt32(addr, true));
				addr += 4;
			}
			if (flags & 0x10)
				obj.setProperty("drawOrder", data.getUint8(addr++));
			if (flags & 0x20)
				obj.setProperty("priority", tiled.propertyValue("Priorities", data.getUint8(addr++)));
			if (flags & 0x40)
				obj.setProperty("alpha", data.getUint8(addr++));
			if (flags & 0x80)
				obj.setProperty("animation", data.getUint8(addr++));
			if (flags & 0x100) {
				obj.setProperty("animationSpeed", data.getInt32(addr, true));
				addr += 4;
			}
			if (flags & 0x200)
				obj.setProperty("frame", data.getUint8(addr++));
			if (flags & 0x400)
				obj.setProperty("inkEffect", tiled.propertyValue("InkEffects", data.getUint8(addr++)));
			if (flags & 0x800) {
				obj.setProperty("value0", data.getInt32(addr, true));
				addr += 4;
			}
			if (flags & 0x1000) {
				obj.setProperty("value1", data.getInt32(addr, true));
				addr += 4;
			}
			if (flags & 0x2000) {
				obj.setProperty("value2", data.getInt32(addr, true));
				addr += 4;
			}
			if (flags & 0x4000) {
				obj.setProperty("value3", data.getInt32(addr, true));
				addr += 4;
			}
			layer.addObject(obj);
		}
		tilemap.addLayer(layer);

		return tilemap;

	},


	write: function(map, fileName) {
		var txtfile = new TextFile(fileName, TextFile.ReadOnly);
		var stginf = JSON.parse(txtfile.readAll());
		var folder = FileInfo.joinPaths(scriptpath, "../../Data/Stages", stginf.folder);
		var file = new BinaryFile(FileInfo.joinPaths(folder, "Act" + stginf.scene + ".bin"), BinaryFile.WriteOnly);

		var lvlname = map.property("Title") ?? '';
		var namelen = Math.min(lvlname.length, 255);
		var buffer = new ArrayBuffer(namelen + 1);
		var data = new Uint8Array(buffer);
		data[0] = namelen;
		for (var i = 0; i < namelen; i++)
			data[i + 1] = lvlname.charCodeAt(i);
		file.write(buffer);

		var buffer = new ArrayBuffer(5);
		var data = new Uint8Array(buffer);
		data[0] = map.property("Active Layer 0").value;
		data[1] = map.property("Active Layer 1").value;
		data[2] = map.property("Active Layer 2").value;
		data[3] = map.property("Active Layer 3").value;
		data[4] = map.property("Layer Midpoint").value;
		file.write(buffer);

		var fglayer = null;
		var bglayer = null;
		var entlayer = null;
		for (var lid = 0; lid < map.layerCount; ++lid) {
			var layer = map.layerAt(lid);
			switch (layer.name)
			{
				case "Foreground":
					if (layer.isTileLayer)
						fglayer = layer;
					break;
				case "Backgrounds":
					if (layer.isGroupLayer)
						bglayer = layer;
					break;
				case "Entities":
					if (layer.isObjectLayer)
						entlayer = layer;
					break;
			}
		}

		var buffer = new ArrayBuffer(4);
		var data = new Uint8Array(buffer);
		if (fglayer != null) {
			var rect = fglayer.region().boundingRect;
			var width = Math.min(rect.x + rect.width, 255);
			var height = Math.min(rect.y + rect.height, 255);
			data[0] = width;
			data[2] = height;
			file.write(buffer);
			buffer = new ArrayBuffer(width * height * 2);
			data = new DataView(buffer);
			for (var y = rect.y; y < height; ++y) {
				for (var x = rect.x; x < width; ++x) {
					var tile = fglayer.tileAt(x, y);
					if (tile != null)
						data.setUint16(((y * width) + x) * 2, tile.id, true);
				}
			}
		}
		file.write(buffer);

		var buffer = new ArrayBuffer(2);
		if (entlayer != null) {
			var data = new DataView(buffer);
			data.setUint16(0, entlayer.objectCount, true);
			file.write(buffer);
			for (var oid = 0; oid < entlayer.objectCount; oid++) {
				var obj = entlayer.objectAt(oid);
				var flags = 0;
				if (obj.property("state") != null)
					flags |= 1;
				if (obj.property("direction") != null)
					flags |= 2;
				if (obj.property("scale") != null)
					flags |= 4;
				if (obj.property("rotation") != null)
					flags |= 8;
				if (obj.property("drawOrder") != null)
					flags |= 0x10;
				if (obj.property("priority") != null)
					flags |= 0x20;
				if (obj.property("alpha") != null)
					flags |= 0x40;
				if (obj.property("animation") != null)
					flags |= 0x80;
				if (obj.property("animationSpeed") != null)
					flags |= 0x100;
				if (obj.property("frame") != null)
					flags |= 0x200;
				if (obj.property("inkEffect") != null)
					flags |= 0x400;
				if (obj.property("value0") != null)
					flags |= 0x800;
				if (obj.property("value1") != null)
					flags |= 0x1000;
				if (obj.property("value2") != null)
					flags |= 0x2000;
				if (obj.property("value3") != null)
					flags |= 0x4000;
				var buffer = new ArrayBuffer(12);
				var data = new DataView(buffer);
				data.setUint16(0, flags);
				data.setUint8(2, obj.resolvedProperty("type") ?? 0);
				data.setUint8(3, obj.resolvedProperty("propertyValue") ?? 0);
				data.setInt32(4, obj.x * 0x10000, true);
				data.setInt32(8, obj.y * 0x10000, true);
				file.write(buffer);
				if (flags & 1) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.setInt32(0, obj.property("state"), true);
					file.write(buffer);
				}
				if (flags & 2) {
					buffer = new ArrayBuffer(1);
					data = new Uint8Array(buffer);
					data[0] = obj.property("direction").value;
					file.write(buffer);
				}
				if (flags & 4) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.setInt32(0, obj.property("scale") * 0x200, true);
					file.write(buffer);
				}
				if (flags & 8) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.setInt32(0, obj.property("rotation"), true);
					file.write(buffer);
				}
				if (flags & 0x10) {
					buffer = new ArrayBuffer(1);
					data = new Uint8Array(buffer);
					data[0] = obj.property("drawOrder");
					file.write(buffer);
				}
				if (flags & 0x20) {
					buffer = new ArrayBuffer(1);
					data = new Uint8Array(buffer);
					data[0] = obj.property("priority").value;
					file.write(buffer);
				}
				if (flags & 0x40) {
					buffer = new ArrayBuffer(1);
					data = new Uint8Array(buffer);
					data[0] = obj.property("alpha");
					file.write(buffer);
				}
				if (flags & 0x80) {
					buffer = new ArrayBuffer(1);
					data = new Uint8Array(buffer);
					data[0] = obj.property("animation");
					file.write(buffer);
				}
				if (flags & 0x100) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.setInt32(0, obj.property("animationSpeed"), true);
					file.write(buffer);
				}
				if (flags & 0x200) {
					buffer = new ArrayBuffer(1);
					data = new Uint8Array(buffer);
					data[0] = obj.property("frame");
					file.write(buffer);
				}
				if (flags & 0x400) {
					buffer = new ArrayBuffer(1);
					data = new Uint8Array(buffer);
					data[0] = obj.property("inkEffect").value;
					file.write(buffer);
				}
				if (flags & 0x800) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.getInt32(0, obj.property("value0"), true);
					file.write(buffer);
				}
				if (flags & 0x1000) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.getInt32(0, obj.property("value1"), true);
					file.write(buffer);
				}
				if (flags & 0x2000) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.getInt32(0, obj.property("value2"), true);
					file.write(buffer);
				}
				if (flags & 0x4000) {
					buffer = new ArrayBuffer(4);
					data = new DataView(buffer);
					data.getInt32(0, obj.property("value3"), true);
					file.write(buffer);
				}
			}
		}
		else
			file.write(buffer);

		file.commit();

		var file = new BinaryFile(FileInfo.joinPaths(folder, "Backgrounds.bin"), BinaryFile.WriteOnly);

		var bglayers = new Array();
		if (bglayer != null) {
			for (var i = 0; i < bglayer.layerCount; ++i) {
				var layer = bglayer.layerAt(i);
				if (layer.isGroupLayer && layer.className == "BackgroundLayer") {
					var ind = layer.property("Index");
					if (ind != null)
						bglayers[ind] = layer;
				}
			}
		}

		var buffer = new ArrayBuffer(1);
		var data = new Uint8Array(buffer);
		data[0] = bglayers.length;
		file.write(buffer);

		var hScroll = [ { parallaxFactor: 0, scrollSpeed: 0, deform: false } ];
		var vScroll = [ { parallaxFactor: 0, scrollSpeed: 0, deform: false } ];
		var scrollInds = new Array();
		for (var bgi = 0; bgi < bglayers.length; ++bgi) {
			var group = bglayers[bgi];
			if (group != null) {
				var type = group.resolvedProperty("Type").value;
				var scrolldata = null;
				var getpos = null;
				var sortfunc = null;
				switch (type)
				{
					case 1:
						scrolldata = hScroll;
						getpos = a => a.y;
						sortfunc = (a, b) => a.y - b.y;
						break;
					case 2:
						scrolldata = vScroll;
						getpos = a => a.x;
						sortfunc = (a, b) => a.x - b.x;
						break;
					default:
						continue;
				}
				var objs = new Array();
				for (var li = 0; li < group.layerCount; ++li) {
					var layer = group.layerAt(li);
					if (layer.isObjectLayer) {
						for (var oid = 0; oid < layer.objectCount; oid++) {
							var obj = layer.objectAt(oid);
							if (obj.className == "ScrollInfo")
								objs.push(obj);
						}
					}
				}
				objs.sort(sortfunc);
				var scrollList = new Array();
				var pos = 0;
				var ind = 0;
				if (getpos(objs[0]) == 0) {
					var obj = objs.shift();
					var sd = {
						parallaxFactor: Math.round(obj.resolvedProperty("Parallax Factor") * 256),
						scrollSpeed: Math.round(obj.resolvedProperty("Scroll Speed") * 64),
						deform: obj.resolvedProperty("Deform")
					};
					ind = scrolldata.findIndex(a => a.parallaxFactor == sd.parallaxFactor && a.scrollSpeed == sd.scrollSpeed && a.deform == sd.deform);
					if (ind == -1) {
						ind = scrolldata.length;
						scrolldata.push(sd);
					}
				}
				while (objs.length > 0) {
					var obj = objs.shift();
					scrollList.push({ index: ind, length: getpos(obj) - pos });
					pos = getpos(obj);
					var sd = {
						parallaxFactor: Math.round(obj.resolvedProperty("Parallax Factor") * 256),
						scrollSpeed: Math.round(obj.resolvedProperty("Scroll Speed") * 64),
						deform: obj.resolvedProperty("Deform")
					};
					ind = scrolldata.findIndex(a => a.parallaxFactor == sd.parallaxFactor && a.scrollSpeed == sd.scrollSpeed && a.deform == sd.deform);
					if (ind == -1) {
						ind = scrolldata.length;
						scrolldata.push(sd);
					}
				}
				var length = null;
				switch (type)
				{
					case 1:
						length = obj.height;
						break;
					case 2:
						length = obj.width;
						break;
					default:
						continue;
				}
				scrollList.push({ index: ind, length: length });
				scrollInds[bgi] = scrollList;
			}
		}

		var len = Math.min(hScroll.length, 255);
		var buffer = new ArrayBuffer(1);
		var data = new Uint8Array(buffer);
		data[0] = len;
		file.write(buffer);
		var buffer = new ArrayBuffer(4);
		var data = new DataView(buffer);
		for (var i = 0; i < len; ++i) {
			data.setUint16(0, hScroll[i].parallaxFactor, true);
			data.setUint8(2, hScroll[i].scrollSpeed);
			data.setUint8(3, hScroll[i].deform ? 1 : 0);
			file.write(buffer);
		}

		var len = Math.min(vScroll.length, 255);
		var buffer = new ArrayBuffer(1);
		var data = new Uint8Array(buffer);
		data[0] = len;
		file.write(buffer);
		var buffer = new ArrayBuffer(4);
		var data = new DataView(buffer);
		for (var i = 0; i < len; ++i) {
			data.setUint16(0, vScroll[i].parallaxFactor, true);
			data.setUint8(2, vScroll[i].scrollSpeed);
			data.setUint8(3, vScroll[i].deform ? 1 : 0);
			file.write(buffer);
		}

		for (var bgi = 0; bgi < bglayers.length; ++bgi) {
			var group = bglayers[bgi];
			if (group != null) {
				var rect;
				var width = 0;
				var height = 0;
				var layer = null;
				for (var li = 0; li < group.layerCount; ++li) {
					layer = group.layerAt(li);
					if (layer.isTileLayer) {
						rect = layer.region().boundingRect;
						width = Math.min(rect.x + rect.width, 255);
						height = Math.min(rect.y + rect.height, 255);
						break;
					}
				}
				var buffer = new ArrayBuffer(8);
				var data = new DataView(buffer);
				data.setUint8(0, width);
				data.setUint8(2, height);
				data.setUint8(4, group.resolvedProperty("Type").value);
				data.setUint16(5, Math.round(group.resolvedProperty("Parallax Factor") * 256), true);
				data.setUint8(7, Math.round(group.resolvedProperty("Scroll Speed") * 64));
				file.write(buffer);
				var scrollList = scrollInds[bgi];
				if (scrollList != null) {
					for (var i = 0; i < scrollList.length; ++i) {
						var ind = scrollList[i].index;
						var cnt = scrollList[i].length;
						while (cnt >= 255) {
							var buffer = new ArrayBuffer(3);
							var data = new Uint8Array(buffer);
							data[0] = 0xFF;
							data[1] = ind;
							data[2] = 0xFF;
							file.write(buffer);
							cnt -= 254;
						}
						switch (cnt)
						{
							case 1:
								var buffer = new ArrayBuffer(1);
								var data = new Uint8Array(buffer);
								data[0] = ind;
								file.write(buffer);
								break;
							case 2:
								var buffer = new ArrayBuffer(2);
								var data = new Uint8Array(buffer);
								data[0] = ind;
								data[1] = ind;
								file.write(buffer);
								break;
							default:
								var buffer = new ArrayBuffer(3);
								var data = new Uint8Array(buffer);
								data[0] = 0xFF;
								data[1] = ind;
								data[2] = cnt + 1;
								file.write(buffer);
								break;
						}
					}
				}
				var buffer = new ArrayBuffer(2);
				var data = new Uint8Array(buffer);
				data[0] = 0xFF;
				data[1] = 0xFF;
				file.write(buffer);
				var buffer = new ArrayBuffer(width * height * 2);
				var data = new DataView(buffer);
				if (layer != null) {
					for (var y = rect.y; y < height; ++y) {
						for (var x = rect.x; x < width; ++x) {
							var tile = layer.tileAt(x, y);
							if (tile != null)
								data.setUint16(((y * width) + x) * 2, tile.id, true);
						}
					}
				}
				file.write(buffer);
			}
			else {
				var buffer = new ArrayBuffer(10);
				var data = new Uint8Array(buffer);
				data[8] = 0xFF;
				data[9] = 0xFF;
				file.write(buffer);
			}
		}

		file.commit();
	}

}

tiled.registerMapFormat("scn", scnMapFormat);
