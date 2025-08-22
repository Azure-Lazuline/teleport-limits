sc.PlayerModel.inject({
	isTeleportCooldown(){
		return this.teleportCooldown != null;
	},
	teleportCooldownMaxTime(){
		return [0, 15, 30, 60, 90][sc.options.get("teleport-cooldown")] * 60;
	},
	setTeleportCooldown(){
		if (this.nextTeleportFree)
		{
			this.nextTeleportFree = null;
		}
		else
		{
			this.teleportCooldown = 1.0;
		}
	},
	setNextTeleportFree(a){
		this.nextTeleportFree = a;
	},
	getTeleportCooldownString(){
		if (this.teleportCooldown == null) return "0:00";
		
		var time = this.teleportCooldown * this.teleportCooldownMaxTime() / 60;
		var minutes = Math.trunc(time);
		var seconds = time - minutes;
		seconds = Math.trunc(seconds * 60);
		
		var minuteshours;
		if (minutes >= 60)
		{
			var hours = Math.trunc(minutes / 60);
			minutes = Math.trunc(minutes % 60);
			
			if (minutes < 10) minuteshours = hours + ":0" + minutes;
			else minuteshours = hours + ":" + minutes;
		}
		else
			minuteshours = minutes;
		
		if (seconds < 10) return minuteshours + ":0" + seconds;
		else return minuteshours + ":" + seconds;
	},
	reset(){
		this.parent();
		this.teleportCooldown = null;
	},
	getSaveData(){
		var ret = this.parent();
		ret.teleportCooldown = this.teleportCooldown;
		return ret;
	},
	preLoad(a){
		this.parent(a);
		if (a.teleportCooldown)
			this.teleportCooldown = a.teleportCooldown;
	},
	updateChapter(a){
		var old = this.chapter;
		this.parent(a);
		if (this.chapter == old + 1)
		{ //advanced to a new chapter, reset cooldown
			this.teleportCooldown = null;
		}
	}
});

ig.Game.inject({
	update(){
		this.parent();
				
		if (!ig.loading && sc.model.player.isTeleportCooldown())
		{
			//if(Math.random() < 0.05)
			//	console.warn(sc.model.player.getTeleportCooldownString());

			sc.model.player.teleportCooldown -= ig.system.tick / sc.model.player.teleportCooldownMaxTime();
			if(sc.model.player.teleportCooldown <= 0 || sc.options.get("teleport-cooldown") == 0)
			{
				sc.model.player.teleportCooldown = null;
				//console.warn("OK!");				
			}
		}
	}
});

sc.MapModel.inject({
	startTeleport(a){
		sc.model.player.setTeleportCooldown();
		this.parent(a);
	}
});

sc.MapAreaContainer.inject({
	setCooldownTime(){
		if (sc.menu.mapMapFocus != null && sc.menu.mapMapFocus.onCooldown && sc.model.player.isTeleportCooldown() != null)
		{
			var name = this.basename ? this.basename : "???";
			
			var timeremaining = sc.model.player.getTeleportCooldownString();
						
			name += "\n\\c[1](\\c[3]" + timeremaining + "\\c[1] remaining)";
			
			this.mapNameGui.setText(name);
			
			this.lastMapFocus = sc.menu.mapMapFocus;
		}
		else if(sc.menu.mapMapFocus != null && sc.menu.mapMapFocus.notAtLandmark)
		{
			var name = this.basename ? this.basename : "???";
			
			name += "\n\\c[1](\\c[3]blocked\\c[1]: not at landmark)";
			
			this.mapNameGui.setText(name);			
		}
		else if(sc.menu.mapMapFocus != null && sc.menu.mapMapFocus.freeTeleport)
		{
			var name = this.basename ? this.basename : "???";
			
			name += "\n(free teleport)";
			
			this.mapNameGui.setText(name);			
		}
		else 
		{
			if (this.lastMapFocus != null && this.lastMapFocus == sc.menu.mapMapFocus) //just ran out
			{
				var name = this.basename ? this.basename : "???";
				this.mapNameGui.setText(name);
			}
			this.lastMapFocus = null;
		}
	},
	update(){
		this.parent();
		this.setCooldownTime();
	},
	showLandmarkName(a){
		this.basename = a;
		this.parent(a);
		
		this.setCooldownTime();
	},
	onLandmarkPressed(a){
		sc.model.player.setNextTeleportFree(a.freeTeleport);
		return this.parent(a);
	}
});

sc.CurrentTeleportCooldownDisplay = sc.MenuPanel.extend({
	transitions: {
		DEFAULT: {
			state: {},
			time: 0.2,
			timeFunction: KEY_SPLINES.LINEAR
		},
		HIDDEN: {
			state: {
				alpha: 0,
				offsetX: 0
			},
			time: 0.2,
			timeFunction: KEY_SPLINES.LINEAR
		}
	},
	text: null,
	init: function () {
		this.parent(sc.MenuPanelType.SQUARE);
		if(sc.options.get("teleport-cooldown"))
			this.setPos(2, 24);
		else
			this.setPos(-9999, -9999); //disabled
		this.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_BOTTOM);
		this.text = new sc.TextGui("", {
			font: sc.fontsystem.tinyFont
		});
		this.text.setPos(0, 1);
		this.text.setAlign(ig.GUI_ALIGN.X_CENTER, ig.GUI_ALIGN.Y_TOP);
		this.addChildGui(this.text)
	},
	addObservers: function () {
		sc.Model.addObserver(sc.menu, this)
	},
	removeObservers: function () {
		sc.Model.removeObserver(sc.menu,
			this)
	},
	setCooldownTime: function(){
		var timeremaining = sc.model.player.getTeleportCooldownString();
		
		if (sc.model.player.isTeleportCooldown())
			this.text.setText("teleport cooldown: \\c[1]" + timeremaining);
		else if(sc.options.get("teleport-landmarkonly") && ig.game.playerEntity && !ig.game.playerEntity.atLandmarkTeleport)
			this.text.setText("teleport cooldown: 0:00");
		else
			this.text.setText("\\c[2]teleport ok!");

		var a = this.text.hook;
		this.setSize(a.size.x + 6, a.size.y + 2);
	},
	showMenu: function () {
		this.setCooldownTime();
		var a = this.text.hook;

		this.setStateValue("HIDDEN", "offsetX",  - (a.size.x + 2));
		this.doStateTransition("DEFAULT")
	},
	exitMenu: function () {
		this.doStateTransition("HIDDEN")
	},
	modelChanged: function (a, b, c) {
		a == sc.menu && (b == sc.MENU_EVENT.MAP_WORLDMAP_STATE ? c ? this.exitMenu() : this.showMenu() : b == sc.MENU_EVENT.MAP_AREA_LOAD_DONE && this.showMenu())
	}
});

sc.MapMenu.inject({
	init(){
		this.parent();
		if (sc.options.get("teleport-cooldown"))
			this.curArea.setPos(2, 24 + 13); //make room fort he other one
		this.teleportCooldown = new sc.CurrentTeleportCooldownDisplay;
		this.addChildGui(this.teleportCooldown);
	},
	update(){
		this.parent();
		this.teleportCooldown.setCooldownTime();
	},
	addObservers(){
		this.parent();
		this.teleportCooldown.addObservers();
	},
	removeObservers(){
		this.parent();
		this.teleportCooldown.removeObservers();
	},
	showMenu(){
		this.parent();
		this.teleportCooldown.showMenu();
	},
	exitMenu(){
		this.parent();
		this.teleportCooldown.exitMenu();
	}
});

sc.LandmarkGui.inject({
	init(a, b, c, d, i){
		this.parent(a, b, c, d, i);
		this.onCooldown = false;
		this.notAtLandmark = sc.options.get("teleport-landmarkonly") && ig.game.playerEntity && !ig.game.playerEntity.atLandmarkTeleport;
		
		//console.warn("a " + a);
		//console.warn("i " + i);
		
		this.freeTeleport = false;
		if (i == "autumn-area" && a == "guilds" && ig.vars.get("plot.line") >= 4210) this.freeTeleport = true;
		if (i == "evo-village") this.freeTeleport = true;
		if (i == "cargo-ship") this.freeTeleport = true;
		
		if (sc.model.player.isTeleportCooldown() && !this.freeTeleport && this.activated)
		{
			this.onCooldown = true;
			this.activated = false;
		}
		else if (this.notAtLandmark)
		{
			this.activated = false;			
		}
	},
	update(){
		if(this.onCooldown && !sc.model.player.isTeleportCooldown())
		{ //cooldown ran out on the map menu
			this.onCooldown = false;
			if (!this.notAtLandmark)
				this.activated = true;
		}
		this.parent();
	}
});

ig.ENTITY.TeleportCentral.inject({
	update(){
		this.parent();
		if (sc.options.get("teleport-landmarkonly") && this.landmark) {
			var b = ig.CollTools.getGroundDistance(this.coll, ig.game.playerEntity.coll) <= 160 && !sc.model.isCombatMode();
			if (sc.options.get("teleport-landmarkonly") && b !== this.closePlayerState.isTeleport)
			{
				if (this.closePlayerState.isTeleport = b) {
					if(this.landmarkDetectDelay <= 0.01)
					{
						b = new ig.GUI.ARBox(ig.game.playerEntity, "Teleport ready!", 1, sc.AR_BOX_MODE.NO_LINE, this.color);
						ig.gui.addGuiElement(b);
						this.closePlayerState.arGui = b;
					}
					ig.game.playerEntity.atLandmarkTeleport = ig.game.playerEntity.atLandmarkTeleport + 1
				} else {
					if (this.closePlayerState.arGui != null)
						this.closePlayerState.arGui.remove();
					ig.game.playerEntity.atLandmarkTeleport = ig.game.playerEntity.atLandmarkTeleport - 1
				}
			}
		}
	}
});

sc.NewGamePlusModel.inject({
	get(b){
		if (b == "waypoints-teleport") return false; //handled elsewhere; override the NG+ option
		
		return this.parent(b);
	}
});

sc.TELEPORT_COOLDOWN = {
	OFF: 0,
	M15: 1,
	M30: 2,
	M60: 3,
	M90: 4
};

let options = {};
for (let [key, value] of Object.entries(sc.OPTIONS_DEFINITION)) {
    options[key] = value;
    switch (key) {
        case "game-sense":			
            options["teleport-cooldown"] = {
				type: "BUTTON_GROUP",
				data: sc.TELEPORT_COOLDOWN,
				init: sc.TELEPORT_COOLDOWN.M30,
				cat: sc.OPTION_CATEGORY.GENERAL,
				hasDivider: true,
				header: "teleport-limits"
            };
            options["teleport-landmarkonly"] = {
				type: "CHECKBOX",
				init: false,
				cat: sc.OPTION_CATEGORY.GENERAL,
				header: "teleport-limits"
            };
            break;
    }
}

sc.OPTIONS_DEFINITION = options;
