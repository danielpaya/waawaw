﻿

/*
 * -------------------------------------------
 * BASE CLASS
 * -------------------------------------------
 */
var Base = Class.extend({
	init: function(x, y) {
		this.setPosition(x || 0, y || 0);
		this.clearFrames();
		this.frameCount = 0;
	},
	setPosition: function(x, y) {
		this.x = x;
		this.y = y;
	},
	getPosition: function() {
		return { x : this.x, y : this.y };
	},
	setImage: function(img, x, y) {
		this.image = {
			path : img,
			x : x,
			y : y
		};
	},
	setSize: function(width, height) {
		this.width = width;
		this.height = height;
	},
	getSize: function() {
		return { width: this.width, height: this.height };
	},
	setupFrames: function(fps, frames, rewind, id) {
		if(id) {
			if(this.frameID === id)
				return true;
			
			this.frameID = id;
		}
		
		this.currentFrame = 0;
		this.frameTick = frames ? (1000 / fps / constants.interval) : 0;
		this.frames = frames;
		this.rewindFrames = rewind;
		return false;
	},
	clearFrames: function() {
		this.frameID = undefined;
		this.frames = 0;
		this.currentFrame = 0;
		this.frameTick = 0;
	},
	playFrame: function() {
		if(this.frameTick && this.view) {
			this.frameCount++;
			
			if(this.frameCount >= this.frameTick) {			
				this.frameCount = 0;
				
				if(this.currentFrame === this.frames)
					this.currentFrame = 0;
					
				var $el = this.view;
				$el.css('background-position', '-' + (this.image.x + this.width * ((this.rewindFrames ? this.frames - 1 : 0) - this.currentFrame)) + 'px -' + this.image.y + 'px');
				this.currentFrame++;
			}
		}
	},
});

/*
 * -------------------------------------------
 * GAUGE CLASS
 * -------------------------------------------
 */
var Gauge = Base.extend({
	init: function(id, startImgX, startImgY, fps, frames, rewind) {
		this._super(0, 0);
		this.view = $('#' + id);
		this.setSize(this.view.width(), this.view.height());
		this.setImage(this.view.css('background-image'), startImgX, startImgY);
		this.setupFrames(fps, frames, rewind);
	},
});

/*
 * -------------------------------------------
 * LEVEL CLASS
 * -------------------------------------------
 */
var Level = Base.extend({
	init: function(id) {
		this.world = $('#' + id);
		this.nextCycles = 0;
		this._super(0, 0);
		this.active = false;
		this.figures = [];
		this.obstacles = [];
		this.decorations = [];
		this.items = [];
		this.coinGauge = new Gauge('coin', 0, 0, 10, 4, true);
		this.liveGauge = new Gauge('live', 0, 430, 6, 6, true);
	},
	reload: function() {
		var settings = {};
		this.pause();
		
		for(var i = this.figures.length; i--; ) {
			if(this.figures[i] instanceof Mario) {
				settings.lifes = this.figures[i].lifes - 1;
				settings.coins = this.figures[i].coins;
				break;
			}
		}
		
		this.reset();
		
		if(settings.lifes < 0) {
			this.load(definedLevels[0]);
		} else {		
			this.load(this.raw);
			
			for(var i = this.figures.length; i--; ) {
				if(this.figures[i] instanceof Mario) {
					this.figures[i].setLifes(settings.lifes || 0);
					this.figures[i].setCoins(settings.coins || 0);
					break;
				}
			}
		}
		
		this.start();
	},
	load: function(level) {
		if(this.active) {
			if(this.loop)
				this.pause();

			this.reset();
		}
			
		this.setPosition(0, 0);
		this.setSize(level.width * 32, level.height * 32);
		this.setImage(level.background);
		this.raw = level;
		this.id = level.id;
		
		this.active = true;
		var data = level.data;
	
		for(var i = 0; i < level.width; i++) {
			var t = [];
			
			for(var j = 0; j < level.height; j++) {
				t.push('');
			}
			
			this.obstacles.push(t);
		}
		
		for(var i = 0, width = data.length; i < width; i++) {
			var col = data[i];
			
			for(var j = 0, height = col.length; j < height; j++) {
				if(reflection[col[j]])
					new (reflection[col[j]])(i * 32, (height - j - 1) * 32, this);
			}
		}
	},
	next: function() {
		this.nextCycles = Math.floor(7000 / constants.interval);
	},
	nextLoad: function() {
		if(this.nextCycles)
			return;
		
		var settings = {};
		this.pause();
		
		for(var i = this.figures.length; i--; ) {
			if(this.figures[i] instanceof Mario) {
				settings.lifes = this.figures[i].lifes;
				settings.coins = this.figures[i].coins;
				settings.state = this.figures[i].state;
				settings.marioState = this.figures[i].marioState;
				break;
			}
		}
		
		this.reset();
		this.load(definedLevels[this.id + 1]);
		
		for(var i = this.figures.length; i--; ) {
			if(this.figures[i] instanceof Mario) {
				this.figures[i].setLifes(settings.lifes || 0);
				this.figures[i].setCoins(settings.coins || 0);
				this.figures[i].setState(settings.state || size_states.small);
				this.figures[i].setMarioState(settings.marioState || mario_states.normal);
				break;
			}
		}
		
		this.start();
	},
	getGridWidth: function() {
		return this.raw.width;
	},
	getGridHeight: function() {
		return this.raw.height;
	},
	setSounds: function(manager) {
		this.sounds = manager;
	},
	playSound: function(label) {
		if(this.sounds)
			this.sounds.play(label);
	},
	playMusic: function(label) {
		if(this.sounds)
			this.sounds.sideMusic(label);
	},
	reset: function() {
		this.active = false;
		this.world.empty();
		this.figures = [];
		this.obstacles = [];
		this.items = [];
		this.decorations = [];
	},
	tick: function() {
		if(this.nextCycles) {
			this.nextCycles--;
			this.nextLoad();			
			return;
		}
		
		var i = 0, j = 0, figure, opponent;

		for(i = this.figures.length; i--; ) {
			figure = this.figures[i];
			
			if(figure.dead) {
				if(!figure.death()) {
					if(figure instanceof Mario)
						return this.reload();
						
					figure.view.remove();
					this.figures.splice(i, 1);
				} else
					figure.playFrame();
			} else {
				if(i) {
					for(j = i; j--; ) {
						if(figure.dead)
							break;
							
						opponent = this.figures[j];
						
						if(!opponent.dead && q2q(figure, opponent)) {
							figure.hit(opponent);
							opponent.hit(figure);
						}
					}
				}
			}
			
			if(!figure.dead) {
				figure.move();
				figure.playFrame();
				

			}
		}
		
		for(i = this.items.length; i--; )
			this.items[i].playFrame();
		
		this.coinGauge.playFrame();
		this.liveGauge.playFrame();

		
	},
	start: function() {
		var me = this;
		me.loop = setInterval(function() {
			me.tick.apply(me);
		}, constants.interval);
	},
	pause: function() {
		clearInterval(this.loop);
		this.loop = undefined;
	},
	setPosition: function(x, y) {
		this._super(x, y);
		this.world.css('left', -x);
	},
	setImage: function(index) {
		var img = BASEPATH + 'backgrounds/' + ((index < 10 ? '0' : '') + index) + '.png';
		this.world.parent().css({
			backgroundImage : c2u(img),
			backgroundPosition : '0 -380px'
		});
		this._super(img, 0, 0);
	},
	setSize: function(width, height) {
		this._super(width, height);
	},
	setParallax: function(x) {
		this.setPosition(x, this.y);
		this.world.parent().css('background-position', '-' + Math.floor(x / 3) + 'px -380px');
	},
});


/*
 * -------------------------------------------
 * FIGURE CLASS
 * -------------------------------------------
 */
var Figure = Base.extend({
	init: function(x, y, level) {
		this.view = $(DIV).addClass(CLS_FIGURE).appendTo(level.world);
		this.dx = 0;
		this.dy = 0;
		this.dead = false;
		this.onground = true;
		this.setState(size_states.small);
		this.setVelocity(0, 0);
		this.direction = directions.none;
		this.level = level;
		this._super(x, y);
		level.figures.push(this);
	},
	setState: function(state) {
		this.state = state;
	},
	setImage: function(img, x, y) {
		this.view.css({
			backgroundImage : img ? c2u(img) : 'none',
			backgroundPosition : '-' + (x || 0) + 'px -' + (y || 0) + 'px',
		});
		this._super(img, x, y);
	},
	setOffset: function(dx, dy) {
		this.dx = dx;
		this.dy = dy;
		this.setPosition(this.x, this.y);
	},
	setPosition: function(x, y) {
		this.view.css({
			left: x,
			bottom: y,
			marginLeft: this.dx,
			marginBottom: this.dy,
		});
		this._super(x, y);
		this.setGridPosition(x, y);
	},
	setSize: function(width, height) {
		this.view.css({
			width: width,
			height: height
		});
		this._super(width, height);
	},
	setGridPosition: function(x, y) {
		this.i = Math.floor((x + 16) / 32);
		this.j = Math.ceil(this.level.getGridHeight() - 1 - y / 32);
		
		if(this.j > this.level.getGridHeight())
			this.die();
	},
	getGridPosition: function(x, y) {
		return { i : this.i, j : this.j };
	},
	setVelocity: function(vx, vy) {
		this.vx = vx;
		this.vy = vy;
		
		if(vx > 0)
			this.direction = directions.right;
		else if(vx < 0)
			this.direction = directions.left;
	},
	getVelocity: function() {
		return { vx : this.vx, vy : this.vy };
	},
	hit: function(opponent) {
		
	},
	collides: function(is, ie, js, je, blocking) {
		var isHero = this instanceof Hero;
		
		if(is < 0 || ie >= this.level.obstacles.length)
			return true;
			
		if(js < 0 || je >= this.level.getGridHeight())
			return false;
			
		for(var i = is; i <= ie; i++) {
			for(var j = je; j >= js; j--) {
				var obj = this.level.obstacles[i][j];
				
				if(obj) {
					if(obj instanceof Item && isHero && (blocking === ground_blocking.bottom || obj.blocking === ground_blocking.none))
						obj.activate(this);
					
					if((obj.blocking & blocking) === blocking)
						return true;
				}
			}
		}
		
		return false;
	},
	move: function() {
		var vx = this.vx;
		var vy = this.vy - constants.gravity;
		
		var s = this.state;
		
		var x = this.x;
		var y = this.y;
		
		var dx = Math.sign(vx);
		var dy = Math.sign(vy);
		
		var is = this.i;
		var ie = is;
		
		var js = Math.ceil(this.level.getGridHeight() - s - (y + 31) / 32);
		var je = this.j;
		
		var d = 0, b = ground_blocking.none;
		var onground = false;
		var t = Math.floor((x + 16 + vx) / 32);
		
		if(dx > 0) {
			d = t - ie;
			t = ie;
			b = ground_blocking.left;
		} else if(dx < 0) {
			d = is - t;
			t = is;
			b = ground_blocking.right;
		}
		
		x += vx;
		
		for(var i = 0; i < d; i++) {
			if(this.collides(t + dx, t + dx, js, je, b)) {
				vx = 0;
				x = t * 32 + 15 * dx;
				break;
			}
			
			t += dx;
			is += dx;
			ie += dx;
		}
		
		if(dy > 0) {
			t = Math.ceil(this.level.getGridHeight() - s - (y + 31 + vy) / 32);
			d = js - t;
			t = js;
			b = ground_blocking.bottom;
		} else if(dy < 0) {
			t = Math.ceil(this.level.getGridHeight() - 1 - (y + vy) / 32);
			d = t - je;
			t = je;
			b = ground_blocking.top;
		} else
			d = 0;
		
		y += vy;
		
		for(var i = 0; i < d; i++) {
			if(this.collides(is, ie, t - dy, t - dy, b)) {
				onground = dy < 0;
				vy = 0;
				y = this.level.height - (t + 1) * 32 - (dy > 0 ? (s - 1) * 32 : 0);
				break;
			}
			
			t -= dy;
		}
		
		this.onground = onground;
		this.setVelocity(vx, vy);
		this.setPosition(x, y);
	},
	death: function() {
		return false;
	},
	die: function() {
		this.dead = true;
	},
});

/*
 * -------------------------------------------
 * MATTER CLASS
 * -------------------------------------------
 */
var Matter = Base.extend({
	init: function(x, y, blocking, level) {
		this.blocking = blocking;
		this.view = $(DIV).addClass(CLS_MATTER).appendTo(level.world);
		this.level = level;
		this._super(x, y);
		this.setSize(32, 32);
		this.addToGrid(level);
	},
	addToGrid: function(level) {
		level.obstacles[this.x / 32][this.level.getGridHeight() - 1 - this.y / 32] = this;
	},
	setImage: function(img, x, y) {
		this.view.css({
			backgroundImage : img ? c2u(img) : 'none',
			backgroundPosition : '-' + (x || 0) + 'px -' + (y || 0) + 'px',
		});
		this._super(img, x, y);
	},
	setPosition: function(x, y) {
		this.view.css({
			left: x,
			bottom: y
		});
		this._super(x, y);
	},
});

/*
 * -------------------------------------------
 * GROUND CLASS
 * -------------------------------------------
 */
var Ground = Matter.extend({
	init: function(x, y, blocking, level) {
		this._super(x, y, blocking, level);
	},
});


/*
 * -------------------------------------------
 * GRASS CLASSES
 * -------------------------------------------
 */
var TopGrass = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 888, 404);
	},
}, 'grass_top');
var TopRightGrass = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top + ground_blocking.right;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 922, 404);
	},
}, 'grass_top_right');
var TopLeftGrass = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.left + ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 854, 404);
	},
}, 'grass_top_left');
var RightGrass = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.right;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 922, 438);
	},
}, 'grass_right');
var LeftGrass = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.left;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 854, 438);
	},
}, 'grass_left');
var TopRightRoundedGrass = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 922, 506);
	},
}, 'grass_top_right_rounded');
var TopLeftRoundedGrass = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 854, 506);
	},
}, 'grass_top_left_rounded');

/*
 * -------------------------------------------
 * STONE CLASSES
 * -------------------------------------------
 */
var Stone = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 550, 160);
	},
}, 'stone');
var BrownBlock = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 514, 194);
	},
}, 'brown_block');

/*
 * -------------------------------------------
 * PIPE CLASSES
 * -------------------------------------------
 */
var RightTopPipe = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 36, 358);
	},
}, 'pipe_top_right');
var LeftTopPipe = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 2, 358);
	},
}, 'pipe_top_left');
var RightPipe = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.right + ground_blocking.bottom;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 36, 390);
	},
}, 'pipe_right');
var LeftPipe = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.left + ground_blocking.bottom;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 2, 390);
	},
}, 'pipe_left');

/*
 * -------------------------------------------
 * DECORATION CLASS
 * -------------------------------------------
 */
var Decoration = Matter.extend({
	init: function(x, y, level) {
		this._super(x, y, ground_blocking.none, level);
		level.decorations.push(this);
	},
	setImage: function(img, x, y) {
		this.view.css({
			backgroundImage : img ? c2u(img) : 'none',
			backgroundPosition : '-' + (x || 0) + 'px -' + (y || 0) + 'px',
		});
		this._super(img, x, y);
	},
	setPosition: function(x, y) {
		this.view.css({
			left: x,
			bottom: y
		});
		this._super(x, y);
	},
});

/*
 * -------------------------------------------
 * DECORATION GRASS CLASSES
 * -------------------------------------------
 */
var TopRightCornerGrass = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 612, 868);
	},
}, 'grass_top_right_corner');
var TopLeftCornerGrass = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 648, 868);
	},
}, 'grass_top_left_corner');

/*
 * -------------------------------------------
 * SOIL CLASSES
 * -------------------------------------------
 */
var Soil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 888, 438);
	},
}, 'soil');
var RightSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 922, 540);
	},
}, 'soil_right');
var LeftSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 854,540);
	},
}, 'soil_left');
/*
 * -------------------------------------------
 * DOOR CLASSES
 * -------------------------------------------
 */
var RightDoor = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 192, 1);
	},
}, 'Door_right');
var LeftDoor = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 192, 32);
	},
}, 'Door_left');

/*
 * -------------------------------------------
 * NOTE CLASSES
 * -------------------------------------------
 */
var LeftTopNote = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 997, 2);
	},
}, 'LeftTopNote');
var RightTopNote = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 1032, 2);
	},
}, 'RightTopNote');
var LeftNote = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 997, 36);
	},
}, 'LeftNote');
var RightNote = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 1032, 36);
	},
}, 'RightNote');
/*
 * -------------------------------------------
 * BUSH CLASSES
 * -------------------------------------------
 */
var RightBush = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 382, 928);
	},
}, 'bush_right');
var RightMiddleBush = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 314, 928);
	},
}, 'bush_middle_right');
var MiddleBush = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 348, 928);
	},
}, 'bush_middle');
var LeftMiddleBush = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 212, 928);
	},
}, 'bush_middle_left');
var LeftBush = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 178, 928);
	},
}, 'bush_left');

/*
 * -------------------------------------------
 * GRASS-SOIL CLASSES
 * -------------------------------------------
 */
var TopRightGrassSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 990, 506);
	},
}, 'grass_top_right_rounded_soil');
var TopLeftGrassSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 956, 506);
	},
}, 'grass_top_left_rounded_soil');

/*
 * -------------------------------------------
 * PLANTED SOIL CLASSES
 * -------------------------------------------
 */
var RightPlantedSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 782, 832);
	},
}, 'planted_soil_right');
var MiddlePlantedSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 748, 832);
	},
}, 'planted_soil_middle');
var LeftPlantedSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 714, 832);
	},
}, 'planted_soil_left');

/*
 * -------------------------------------------
 * PIPE DECORATION
 * -------------------------------------------
 */
var RightPipeGrass = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 36, 424);
	},
}, 'pipe_right_grass');
var LeftPipeGrass = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 2, 424);
	},
}, 'pipe_left_grass');
var RightPipeSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 36, 458);
	},
}, 'pipe_right_soil');
var LeftPipeSoil = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 2, 458);
	},
}, 'pipe_left_soil');

/*
 * -------------------------------------------
 * ITEM CLASS
 * -------------------------------------------
 */
var Item = Matter.extend({
	init: function(x, y, isBlocking, level) {
		this.isBouncing = false;
		this.bounceCount = 0;
		this.bounceFrames = Math.floor(50 / constants.interval);
		this.bounceStep = Math.ceil(10 / this.bounceFrames);
		this.bounceDir = 1;
		this.isBlocking = isBlocking;
		this._super(x, y, isBlocking ? ground_blocking.all : ground_blocking.none, level);
		this.activated = false;
		this.addToLevel(level);
	},
	addToLevel: function(level) {
		level.items.push(this);
	},
	activate: function(from) {
		this.activated = true;
	},
	bounce: function() {
		this.isBouncing = true;
		
		for(var i = this.level.figures.length; i--; ) {
			var fig = this.level.figures[i];
			
			if(fig.y === this.y + 32 && fig.x >= this.x - 16 && fig.x <= this.x + 16) {
				if(fig instanceof ItemFigure)
					fig.setVelocity(fig.vx, constants.bounce);
				else
					fig.die();
			}
		}
	},
	playFrame: function() {
		if(this.isBouncing) {
			this.view.css({ 'bottom' : (this.bounceDir > 0 ? '+' : '-') + '=' + this.bounceStep + 'px' });
			this.bounceCount += this.bounceDir;
			
			if(this.bounceCount === this.bounceFrames)
				this.bounceDir = -1;
			else if(this.bounceCount === 0) {
				this.bounceDir = 1;
				this.isBouncing = false;
			}
		}
		
		this._super();
	},
});

/*
 * -------------------------------------------
 * COIN CLASSES
 * -------------------------------------------
 */
var Coin = Item.extend({
	init: function(x, y, level) {
		this._super(x, y, false, level);
		this.setImage(images.objects, 0, 0);
		this.setupFrames(10, 4, true);
	},
	activate: function(from) {
		if(!this.activated) {
			this.level.playSound('coin');
			from.addCoin();
			this.remove();
		}
		this._super(from);
	},
	remove: function() {
		this.view.remove();
	},
}, 'coin');
var CoinBoxCoin = Coin.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 96, 0);
		this.clearFrames();
		this.view.hide();
		this.count = 0;
		this.frames = Math.floor(150 / constants.interval);
		this.step = Math.ceil(30 / this.frames);
	},
	remove: function() { },
	addToGrid: function() { },
	addToLevel: function() { },
	activate: function(from) {
		this._super(from);
		this.view.show().css({ 'bottom' : '+=8px' });
	},
	act: function() {
		this.view.css({ 'bottom' : '+=' + this.step + 'px' });
		this.count++;
		return (this.count === this.frames);
	},
});
var CoinBox = Item.extend({
	init: function(x, y, level, amount) {
		this._super(x, y, true, level);
		this.setImage(images.objects, 346, 328);
		this.setAmount(amount || 1);
	},
	setAmount: function(amount) {
		this.items = [];
		this.actors = [];
		
		for(var i = 0; i < amount; i++)
			this.items.push(new CoinBoxCoin(this.x, this.y, this.level));
	},
	activate: function(from) {
		if(!this.isBouncing) {
			if(this.items.length) {
				this.bounce();
				var coin = this.items.pop();
				coin.activate(from);
				this.actors.push(coin);
				
				if(!this.items.length)
					this.setImage(images.objects, 514, 194);
			}
		}
			
		this._super(from);
	},
	playFrame: function() {
		for(var i = this.actors.length; i--; ) {
			if(this.actors[i].act()) {
				this.actors[i].view.remove();
				this.actors.splice(i, 1);
			}
		}
		
		this._super();
	},
}, 'coinbox');
var MultipleCoinBox = CoinBox.extend({
	init: function(x, y, level) {
		this._super(x, y, level, 8);
	},
}, 'multiple_coinbox');

/*
 * -------------------------------------------
 * ITEMFIGURE CLASS
 * -------------------------------------------
 */
var ItemFigure = Figure.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
	},
});

/*
 * -------------------------------------------
 * STARBOX CLASS
 * -------------------------------------------
 */
var StarBox = Item.extend({
	init: function(x, y, level) {
		this._super(x, y, true, level);
		this.setImage(images.objects, 96, 33);
		this.star = new Star(x, y, level);
		this.setupFrames(8, 4, false);
	},
	activate: function(from) {
		if(!this.activated) {
			this.star.release();
			this.clearFrames();
			this.bounce();
			this.setImage(images.objects, 514, 194);
		}
		
		this._super(from);
	},
}, 'starbox');
var Star = ItemFigure.extend({
	init: function(x, y, level) {
		this._super(x, y + 32, level);
		this.active = false;
		this.setSize(32, 32);
		this.setImage(images.objects, 32, 69);
		this.view.hide();
	},
	release: function() {
		this.taken = 4;
		this.active = true;
		this.level.playSound('mushroom');
		this.view.show();
		this.setVelocity(constants.star_vx, constants.star_vy);
		this.setupFrames(10, 2, false);
	},
	collides: function(is, ie, js, je, blocking) {
		return false;
	},
	move: function() {
		if(this.active) {
			this.vy += this.vy <= -constants.star_vy ? constants.gravity : constants.gravity / 2;
			this._super();
		}
		
		if(this.taken)
			this.taken--;
	},
	hit: function(opponent) {
		if(!this.taken && this.active && opponent instanceof Mario) {
			opponent.invincible();
			this.die();
		}
	},
});

/*
 * -------------------------------------------
 * MUSHROOMBOX CLASS
 * -------------------------------------------
 */
var MushroomBox = Item.extend({
	init: function(x, y, level) {
		this._super(x, y, true, level);
		this.setImage(images.objects, 96, 33);
		this.max_mode = mushroom_mode.plant;
		this.mushroom = new Mushroom(x, y, level);
		this.setupFrames(8, 4, false);
	},
	activate: function(from) {
		if(!this.activated) {
			if(from.state === size_states.small || this.max_mode === mushroom_mode.mushroom)
				this.mushroom.release(mushroom_mode.mushroom);
			else
				this.mushroom.release(mushroom_mode.plant);
			
			this.clearFrames();
			this.bounce();
			this.setImage(images.objects, 514, 194);
		}
			
		this._super(from);
	},
}, 'mushroombox');
var Mushroom = ItemFigure.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.active = false;
		this.setSize(32, 32);
		this.setImage(images.objects, 582, 60);
		this.released = 0;
		this.view.css('z-index', 94).hide();
	},
	release: function(mode) {
		this.released = 4;
		this.level.playSound('mushroom');
		
		if(mode === mushroom_mode.plant)
			this.setImage(images.objects, 548, 60);
			
		this.mode = mode;
		this.view.show();
	},
	move: function() {
		if(this.active) {
			this._super();
		
			if(this.mode === mushroom_mode.mushroom && this.vx === 0)
				this.setVelocity(this.direction === directions.right ? -constants.mushroom_v : constants.mushroom_v, this.vy);
		} else if(this.released) {
			this.released--;
			this.setPosition(this.x, this.y + 8);
			
			if(!this.released) {
				this.active = true;
				this.view.css('z-index', 99);
				
				if(this.mode === mushroom_mode.mushroom)
					this.setVelocity(constants.mushroom_v, constants.gravity);
			}
		}
	},
	hit: function(opponent) {
		if(this.active && opponent instanceof Mario) {
			if(this.mode === mushroom_mode.mushroom)
				opponent.grow();
			else if(this.mode === mushroom_mode.plant)
				opponent.shooter();
				
			this.die();
		}
	},
});

/*
 * -------------------------------------------
 * BULLET CLASS
 * -------------------------------------------
 */
var Bullet = Figure.extend({
	init: function(parent) {
		this._super(parent.x + 31, parent.y + 14, parent.level);
		this.parent = parent;
		this.setImage(images.sprites, 191, 366);
		this.setSize(16, 16);
		this.direction = parent.direction;
		this.vy = 0;
		this.life = Math.ceil(2000 / constants.interval);
		this.speed = constants.bullet_v;
		this.vx = this.direction === directions.right ? this.speed : -this.speed;
	},
	setVelocity: function(vx, vy) {
		this._super(vx, vy);
	
		if(this.vx === 0) {
			var s = this.speed * Math.sign(this.speed);
			this.vx = this.direction === directions.right ? -s : s;
		}
		
		if(this.onground)
			this.vy = constants.bounce;
	},
	move: function() {
		if(--this.life)
			this._super();
		else
			this.die();
	},
	hit: function(opponent) {
		if(!(opponent instanceof Mario)) {
			opponent.die();
			this.die();
		}
	},
});

/*
 * -------------------------------------------
 * HERO CLASS
 * -------------------------------------------
 */
var Hero = Figure.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
	},
});

/*
 * -------------------------------------------
 * MARIO CLASS
 * -------------------------------------------
 */
var Mario = Hero.extend({
	init: function(x, y, level) {
		this.standSprites = [
			[[{ x : 0, y : 81},{ x: 481, y : 83}],[{ x : 81, y : 0},{ x: 561, y : 83}]],
			[[{ x : 0, y : 162},{ x: 481, y : 247}],[{ x : 81, y : 243},{ x: 561, y : 247}]]
		];
		this.crouchSprites = [
			[{ x : 241, y : 0},{ x: 161, y : 0}],
			[{ x : 241, y : 162},{ x: 241, y : 243}]
		];
		this.deadly = 0;
		this.invulnerable = 0;
		this.width = 80;
		this._super(x, y, level);
		this.blinking = 0;
		this.setOffset(-24, 0);
		this.setSize(80, 80);
		this.cooldown = 0;
		this.setMarioState(mario_states.normal);
		this.setLifes(constants.start_lives);
		this.setCoins(0);
		this.deathBeginWait = Math.floor(700 / constants.interval);
		this.deathEndWait = 0;
		this.deathFrames = Math.floor(600 / constants.interval);
		this.deathStepUp = Math.ceil(200 / this.deathFrames);
		this.deathDir = 1;
		this.deathCount = 0;
		this.direction = directions.right;
		this.setImage(images.sprites, 81, 0);
		this.crouching = false;
		this.fast = false;
	},
	setMarioState: function(state) {
		this.marioState = state;
	},
	setState: function(state) {
		if(state !== this.state) {
			this.setMarioState(mario_states.normal);
			this._super(state);
		}
	},
	setPosition: function(x, y) {
		this._super(x, y);
		var r = this.level.width - 640;
		var w = (this.x <= 210) ? 0 : ((this.x >= this.level.width - 230) ? r : r / (this.level.width - 440) * (this.x - 210));		
		this.level.setParallax(w);

		if(this.onground && this.x >= this.level.width - 128)
			this.victory();
	},
	input: function(keys) {
		this.fast = keys.accelerate;
		this.crouching = keys.down;
		
		if(!this.crouching) {
			if(this.onground && keys.up)
				this.jump();
				
			if(keys.accelerate && this.marioState === mario_states.fire)
				this.shoot();
				
			if(keys.right || keys.left)
				this.walk(keys.left, keys.accelerate);
			else
				this.vx = 0;
		}
	},
	victory: function() {
		this.level.playMusic('success');
		this.clearFrames();
		this.view.show();
		this.setImage(images.sprites, this.state === size_states.small ? 241 : 161, 81);
		this.level.next();
	},
	shoot: function() {
		if(!this.cooldown) {
			this.cooldown = constants.cooldown;
			this.level.playSound('shoot');
			new Bullet(this);
		}
	},
	setVelocity: function(vx, vy) {
		if(this.crouching) {
			vx = 0;
			this.crouch();
		} else {
			if(this.onground && vx > 0)
				this.walkRight();
			else if(this.onground && vx < 0)
				this.walkLeft();
			else
				this.stand();
		}
	
		this._super(vx, vy);
	},
	blink: function(times) {
		this.blinking = Math.max(2 * times * constants.blinkfactor, this.blinking || 0);
	},
	invincible: function() {
		this.level.playMusic('invincibility');
		this.deadly = Math.floor(constants.invincible / constants.interval);
		this.invulnerable = this.deadly;
		this.blink(Math.ceil(this.deadly / (2 * constants.blinkfactor)));
	},
	grow: function() {
		if(this.state === size_states.small) {
			this.level.playSound('grow');
			this.setState(size_states.big);
			this.blink(3);
		}
	},
	shooter: function() {
		if(this.state === size_states.small)
			this.grow();
		else
			this.level.playSound('grow');
			
		this.setMarioState(mario_states.fire);
	},
	walk: function(reverse, fast) {
		this.vx = constants.walking_v * (fast ? 2 : 1) * (reverse ? - 1 : 1);
	},
	walkRight: function() {
		if(this.state === size_states.small) {
			if(!this.setupFrames(8, 2, true, 'WalkRightSmall'))
				this.setImage(images.sprites, 0, 0);
		} else {
			if(!this.setupFrames(9, 2, true, 'WalkRightBig'))
				this.setImage(images.sprites, 0, 243);
		}
	},
	walkLeft: function() {
		if(this.state === size_states.small) {
			if(!this.setupFrames(8, 2, false, 'WalkLeftSmall'))
				this.setImage(images.sprites, 80, 81);
		} else {
			if(!this.setupFrames(9, 2, false, 'WalkLeftBig'))
				this.setImage(images.sprites, 81, 162);
		}
	},
	stand: function() {
		var coords = this.standSprites[this.state - 1][this.direction === directions.left ? 0 : 1][this.onground ? 0 : 1];
		this.setImage(images.sprites, coords.x, coords.y);
		this.clearFrames();
	},
	crouch: function() {
		var coords = this.crouchSprites[this.state - 1][this.direction === directions.left ? 0 : 1];
		this.setImage(images.sprites, coords.x, coords.y);
		this.clearFrames();
	},
	jump: function() {
		this.level.playSound('jump');
		this.vy = constants.jumping_v;
	},
	move: function() {
		this.input(keys);		
		this._super();
	},
	addCoin: function() {
		this.setCoins(this.coins + 1);
	},
	playFrame: function() {		
		if(this.blinking) {
			if(this.blinking % constants.blinkfactor === 0)
				this.view.toggle();
				
			this.blinking--;
		}
		
		if(this.cooldown)
			this.cooldown--;
		
		if(this.deadly)
			this.deadly--;
		
		if(this.invulnerable)
			this.invulnerable--;
		
		this._super();
	},
	setCoins: function(coins) {
		this.coins = coins;
		
		if(this.coins >= constants.max_coins) {
			this.addLife()
			this.coins -= constants.max_coins;
		}
				
		this.level.world.parent().children('#coinNumber').text(this.coins);
	},
	addLife: function() {
		this.level.playSound('liveupgrade');
		this.setLifes(this.lifes + 1);
	},
	setLifes : function(lifes) {
		this.lifes = lifes;
		this.level.world.parent().children('#liveNumber').text(this.lifes);
	},
	death: function() {
		if(this.deathBeginWait) {
			this.deathBeginWait--;
			return true;
		}
		
		if(this.deathEndWait)
			return --this.deathEndWait;
		
		this.view.css({ 'bottom' : (this.deathDir > 0 ? '+' : '-') + '=' + (this.deathDir > 0 ? this.deathStepUp : this.deathStepDown) + 'px' });
		this.deathCount += this.deathDir;
		
		if(this.deathCount === this.deathFrames)
			this.deathDir = -1;
		else if(this.deathCount === 0)
			this.deathEndWait = Math.floor(1800 / constants.interval);
			
		return true;
	},
	die: function() {
		this.setMarioState(mario_states.normal);
		this.deathStepDown = Math.ceil(240 / this.deathFrames);
		this.setupFrames(9, 2, false);
		this.setImage(images.sprites, 81, 324);
		this.level.playMusic('die');
		this._super();
	},
	hurt: function(from) {
		if(this.deadly)
			from.die();
		else if(this.invulnerable)
			return;
		else if(this.state === size_states.small) {
			this.die();
		} else {
			this.invulnerable = Math.floor(constants.invulnerable / constants.interval);
			this.blink(Math.ceil(this.invulnerable / (2 * constants.blinkfactor)));
			this.setState(size_states.small);
			this.level.playSound('hurt');			
		}
	},
}, 'mario');

/*
 * -------------------------------------------
 * ENEMY CLASS
 * -------------------------------------------
 */
var Enemy = Figure.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.speed = 0;
	},
	hide: function() {
		this.invisible = true;
		this.view.hide();
	},
	show: function() {	
		this.invisible = false;
		this.view.show();
	},
	move: function() {
		if(!this.invisible) {
			this._super();
		
			if(this.vx === 0) {
				var s = this.speed * Math.sign(this.speed);
				this.setVelocity(this.direction === directions.right ? -s : s, this.vy);
			}
		}
	},
	collides: function(is, ie, js, je, blocking) {
		if(this.j + 1 < this.level.getGridHeight()) {
			for(var i = is; i <= ie; i++) {
				if(i < 0 || i >= this.level.getGridWidth())
					return true;
					
				var obj = this.level.obstacles[i][this.j + 1];
				
				if(!obj || (obj.blocking & ground_blocking.top) !== ground_blocking.top)
					return true;
			}
		}
		
		return this._super(is, ie, js, je, blocking);
	},
	setSpeed: function(v) {
		this.speed = v;
		this.setVelocity(-v, 0);
	},
	hurt: function(from) {
		this.die();
	},
	hit: function(opponent) {
		if(this.invisible)
			return;
			
		if(opponent instanceof Mario) {
			if(opponent.vy < 0 && opponent.y - opponent.vy >= this.y + this.state * 32) {
				opponent.setVelocity(opponent.vx, constants.bounce);
				this.hurt(opponent);
			} else {
				opponent.hurt(this);
			}
		}
	},
});

/*
 * -------------------------------------------
 * GUMPA CLASS
 * -------------------------------------------
 */
var Gumpa = Enemy.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setSize(34, 32);
		this.setSpeed(constants.ballmonster_v);
		this.death_mode = death_modes.normal;
		this.deathCount = 0;
	},
	setVelocity: function(vx, vy) {
		this._super(vx, vy);
		
		if(this.direction === directions.left) {
			if(!this.setupFrames(6, 2, false, 'LeftWalk'))
				this.setImage(images.enemies, 34, 188);
		} else {
			if(!this.setupFrames(6, 2, true, 'RightWalk'))
				this.setImage(images.enemies, 0, 228);
		}
	},
	death: function() {
		if(this.death_mode === death_modes.normal)
			return --this.deathCount;
		
		this.view.css({ 'bottom' : (this.deathDir > 0 ? '+' : '-') + '=' + this.deathStep + 'px' });
		this.deathCount += this.deathDir;
		
		if(this.deathCount === this.deathFrames)
			this.deathDir = -1;
		else if(this.deathCount === 0)
			return false;
			
		return true;
	},
	die: function() {
		this.clearFrames();
		
		if(this.death_mode === death_modes.normal) {
			this.level.playSound('enemy_die');
			this.setImage(images.enemies, 102, 228);
			this.deathCount = Math.ceil(600 / constants.interval);
		} else if(this.death_mode === death_modes.shell) {
			this.level.playSound('shell');
			this.setImage(images.enemies, 68, this.direction === directions.right ? 228 : 188);
			this.deathFrames = Math.floor(250 / constants.interval);
			this.deathDir = 1;
			this.deathStep = Math.ceil(150 / this.deathFrames);
		}
		
		this._super();
	},
}, 'ballmonster');

/*
 * -------------------------------------------
 * TURTLESHELL CLASS
 * -------------------------------------------
 */
var TurtleShell = Enemy.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setSize(34, 32);
		this.speed = 0;
		this.setImage(images.enemies, 0, 494);
	},
	activate: function(x, y) {
		this.setupFrames(6, 4, false)
		this.setPosition(x, y);
		this.show();
	},
	takeBack: function(where) {
		if(where.setShell(this))
			this.clearFrames();
	},
	hit: function(opponent) {
		if(this.invisible)
			return;
			
		if(this.vx) {
			if(this.idle)
				this.idle--;
			else if(opponent instanceof Mario)
				opponent.hurt(this);
			else {
				opponent.deathMode = death_modes.shell;
				opponent.die();
			}
		} else {
			if(opponent instanceof Mario) {
				this.setSpeed(opponent.direction === directions.right ? -constants.shell_v : constants.shell_v);
				opponent.setVelocity(opponent.vx, constants.bounce);
				this.idle = 2;
			} else if(opponent instanceof GreenTurtle && opponent.state === size_states.small)
				this.takeBack(opponent);
		}
	},
	collides: function(is, ie, js, je, blocking) {		
		if(is < 0 || ie >= this.level.obstacles.length)
			return true;
			
		if(js < 0 || je >= this.level.getGridHeight())
			return false;
			
		for(var i = is; i <= ie; i++) {
			for(var j = je; j >= js; j--) {
				var obj = this.level.obstacles[i][j];
				
				if(obj && ((obj.blocking & blocking) === blocking))
					return true;
			}
		}
		
		return false;
	},
}, 'shell');

/*
 * -------------------------------------------
 * GREENTURTLE CLASS
 * -------------------------------------------
 */
var GreenTurtle = Enemy.extend({
	init: function(x, y, level) {
		this.walkSprites = [
			[{ x : 34, y : 382 },{ x : 0, y : 437 }],
			[{ x : 34, y : 266 },{ x : 0, y : 325 }]
		];
		this._super(x, y, level);
		this.wait = 0;
		this.deathMode = death_modes.normal;
		this.deathFrames = Math.floor(250 / constants.interval);
		this.deathStepUp = Math.ceil(150 / this.deathFrames);
		this.deathStepDown = Math.ceil(182 / this.deathFrames);
		this.deathDir = 1;
		this.deathCount = 0;
		this.setSize(34, 54);
		this.setShell(new TurtleShell(x, y, level));
	},
	setShell: function(shell) {
		if(this.shell || this.wait)
			return false;
			
		this.shell = shell;
		shell.hide();
		this.setState(size_states.big);
		return true;
	},
	setState: function(state) {
		this._super(state);
		
		if(state === size_states.big)
			this.setSpeed(constants.big_turtle_v);
		else
			this.setSpeed(constants.small_turtle_v);
	},
	setVelocity: function(vx, vy) {
		this._super(vx, vy);
		var rewind = this.direction === directions.right;
		var coords = this.walkSprites[this.state - 1][rewind ? 1 : 0];
		var label = Math.sign(vx) + '-' + this.state;
		
		if(!this.setupFrames(6, 2, rewind, label))
			this.setImage(images.enemies, coords.x, coords.y);
	},
	die: function() {
		this._super();
		this.clearFrames();
		
		if(this.deathMode === death_modes.normal) {
			this.deathFrames = Math.floor(600 / constants.interval);
			this.setImage(images.enemies, 102, 437);
		} else if(this.deathMode === death_modes.shell) {
			this.level.playSound('shell');
			this.setImage(images.enemies, 68, (this.state === size_states.small ? (this.direction === directions.right ? 437 : 382) : 325));
		}
	},
	death: function() {
		if(this.deathMode === death_modes.normal)
			return --this.deathFrames;
			
		this.view.css({ 'bottom' : (this.deathDir > 0 ? '+' : '-') + '=' + (this.deathDir > 0 ? this.deathStepUp : this.deathStepDown) + 'px' });
		this.deathCount += this.deathDir;
		
		if(this.deathCount === this.deathFrames)
			this.deathDir = -1;
		else if(this.deathCount === 0)
			return false;
			
		return true;
	},
	move: function() {
		if(this.wait)
			this.wait--;
			
		this._super();
	},
	hurt: function(opponent) {	
		this.level.playSound('enemy_die');
		
		if(this.state === size_states.small)
			return this.die();
		
		this.wait = constants.shell_wait
		this.setState(size_states.small);
		this.shell.activate(this.x, this.y);
		this.shell = undefined;
	},
}, 'greenturtle');

/*
 * -------------------------------------------
 * SPIKEDTURTLE CLASS
 * -------------------------------------------
 */
var SpikedTurtle = Enemy.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setSize(34, 32);
		this.setSpeed(constants.spiked_turtle_v);
		this.deathFrames = Math.floor(250 / constants.interval);
		this.deathStepUp = Math.ceil(150 / this.deathFrames);
		this.deathStepDown = Math.ceil(182 / this.deathFrames);
		this.deathDir = 1;
		this.deathCount = 0;
	},
	setVelocity: function(vx, vy) {
		this._super(vx, vy);
		
		if(this.direction === directions.left) {
			if(!this.setupFrames(4, 2, true, 'LeftWalk'))
				this.setImage(images.enemies, 0, 106);
		} else {
			if(!this.setupFrames(6, 2, false, 'RightWalk'))
				this.setImage(images.enemies, 34, 147);
		}
	},
	death: function() {
		this.view.css({ 'bottom' : (this.deathDir > 0 ? '+' : '-') + '=' + (this.deathDir > 0 ? this.deathStepUp : this.deathStepDown) + 'px' });
		this.deathCount += this.deathDir;
		
		if(this.deathCount === this.deathFrames)
			this.deathDir = -1;
		else if(this.deathCount === 0)
			return false;
			
		return true;
	},
	die: function() {
		this.level.playSound('shell');
		this.clearFrames();
		this._super();
		this.setImage(images.enemies, 68, this.direction === directions.left ? 106 : 147);
	},
	hit: function(opponent) {
		if(this.invisible)
			return;
			
		if(opponent instanceof Mario) {
			opponent.hurt(this);
		}
	},
}, 'spikedturtle');

/*
 * -------------------------------------------
 * PLANT CLASS
 * -------------------------------------------
 */
var Plant = Enemy.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setSize(34, 42);
		this.setupFrames(5, 2, true);
		this.setImage(images.enemies, 0, 3);
	},
	setVelocity: function(vx, vy) {
		this._super(0, 0);
	},
	die: function() {
		this.level.playSound('shell');
		this.clearFrames();
		this._super();
	},
	hit: function(opponent) {
		if(this.invisible)
			return;
			
		if(opponent instanceof Mario) {
			opponent.hurt(this);
		}
	},
});

/*
 * -------------------------------------------
 * STATICPLANT CLASS
 * -------------------------------------------
 */
var StaticPlant = Plant.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.deathFrames = Math.floor(250 / constants.interval);
		this.deathStepUp = Math.ceil(100 / this.deathFrames);
		this.deathStepDown = Math.ceil(132 / this.deathFrames);
		this.deathDir = 1;
		this.deathCount = 0;
	},
	die: function() {
		this._super();
		this.setImage(images.enemies, 68, 3);
	},
	death: function() {
		this.view.css({ 'bottom' : (this.deathDir > 0 ? '+' : '-') + '=' + (this.deathDir > 0 ? this.deathStepUp : this.deathStepDown) + 'px' });
		this.deathCount += this.deathDir;
		
		if(this.deathCount === this.deathFrames)
			this.deathDir = -1;
		else if(this.deathCount === 0)
			return false;
			
		return true;
	},
}, 'staticplant');

/*
 * -------------------------------------------
 * PIPEPLANT CLASS
 * -------------------------------------------
 */
var PipePlant = Plant.extend({
	init: function(x, y, level) {
		this.bottom = y - 48;
		this.top = y - 6;
		this._super(x + 16, y - 6, level);
		this.setDirection(directions.down);
		this.setImage(images.enemies, 0, 56);
		this.deathFrames = Math.floor(250 / constants.interval);
		this.deathFramesExtended = 6;
		this.deathFramesExtendedActive = false;
		this.deathStep = Math.ceil(100 / this.deathFrames);
		this.deathDir = 1;
		this.deathCount = 0;
		this.view.css('z-index', 95);
	},
	setDirection: function(dir) {
		this.direction = dir;
	},
	setPosition: function(x, y) {
		if(y === this.bottom || y === this.top) {
			this.minimum = constants.pipeplant_count;
			this.setDirection(this.direction === directions.up ? directions.down : directions.up);
		}
		
		this._super(x, y);
	},
	blocked: function() {
		if(this.y === this.bottom) {
			var state = false;
			this.y += 48;
			
			for(var i = this.level.figures.length; i--; ) {
				if(this.level.figures[i] != this && q2q(this.level.figures[i], this)) {
					state = true;
					break;
				}
			}
			
			this.y -= 48;
			return state;
		}
		
		return false;
	},
	move: function() {
		if(this.minimum === 0) {
			if(!this.blocked())
				this.setPosition(this.x, this.y - (this.direction - 3) * constants.pipeplant_v);
		} else
			this.minimum--;
	},
	die: function() {		
		this._super();
		this.setImage(images.enemies, 68, 56);
	},
	death: function() {
		if(this.deathFramesExtendedActive) {
			this.setPosition(this.x, this.y - 8);
			return --this.deathFramesExtended;
		}
		
		this.view.css({ 'bottom' : (this.deathDir > 0 ? '+' : '-') + '=' + this.deathStep + 'px' });
		this.deathCount += this.deathDir;
		
		if(this.deathCount === this.deathFrames)
			this.deathDir = -1;
		else if(this.deathCount === 0)
			this.deathFramesExtendedActive = true;
			
		return true;
	},
}, 'pipeplant');

/*
 * -------------------------------------------
 * TORTUGA VOLADORA
 * -------------------------------------------
 */
var FlyingTurtle = Enemy.extend({
	init: function(x, y, level) {
		this.walkSprites = [
			[{ x: 173, y: 282 }, { x: 227, y: 282 }]
		];

		this._super(x, y, level);
		this.setSize(54, 38);
		this.setState(1);
		this.setPosition(x, y);

		this.view.css({
			'transform': 'scale(1.2)',
			'transform-origin': 'bottom left'
		})
		this.originX = x;
		this.speed = 2;
		this.direction = directions.right;
		this.range = 200;

		this.bombTimer = 0;

		this.setVelocity(this.speed, 0);
	},

	setVelocity: function(vx, vy) {
		this._super(vx, vy);

		let rewind = false;
		let sprite = this.walkSprites[0][rewind ? 0 : 1];
		let label = 'FlyingTurtleAnim';

		if (!this.setupFrames(8, 2, rewind, label)) {
			this.setImage(images.enemies_2, sprite.x, sprite.y);
		}
	},

	move: function() {
		this.x += this.speed * (this.direction === directions.right ? 1 : -1);
		this.setPosition(this.x, this.y);

		if (Math.abs(this.x - this.originX) >= this.range) {
			this.direction = this.direction === directions.right ? directions.left : directions.right;
			this.setVelocity(this.speed * (this.direction === directions.right ? 1 : -1), 0);
		}
	},

	act: function() {
		this.move();

		this.bombTimer++;
		if (this.bombTimer >= 15) {
			this.bombTimer = 0;
			let bomb = new TurtleBomb(this);
			this.level.figures.push(bomb);
		}
		console.log("🐢 La tortuga está viva y activa", this.x, this.y);

	}
}, 'flyingturtle');

/*
 * -------------------------------------------
 * BOMBA
 * -------------------------------------------
 */

var TurtleBomb = Figure.extend({
	init: function(parent) {
		this._super(parent.x + parent.width / 2 - 12, parent.y - 5, parent.level);
		this.setSize(24, 31);
		this.setImage(images.enemies_2, 409, 344);

		this.vx = 0;
		this.vy = 0;
		this.gravity = true;
		this.exploding = false;
		this.explodeTimer = 0;
		this.frameTick = 0;
		this.state = 'falling';
	},

	move: function() {
		if (this.exploding) return;

		if (this.gravity) {
			this.vy -= 0.1; // aceleración gravitacional
		}
		this.y += this.vy;
		this.setPosition(this.x, this.y);

		// animación alterna de caída
		this.frameTick++;
		if (this.frameTick % 15 === 0) {
			let pos = this.view.css('backgroundPosition');
			if (pos === '-409px -344px') {
				this.view.css('backgroundPosition', '-435px -344px');
			} else {
				this.view.css('backgroundPosition', '-409px -344px');
			}
		}

		const tileBelow = this.level.getTile(this.x + this.width / 2, this.y);
		if (tileBelow !== 0) {
			this.triggerExplosion();
		}
	},

	hit: function(opponent) {
		if (this.exploding) return;
		if (opponent instanceof Mario) {
			if (opponent.state === size_states.big) {
				opponent.setState(size_states.small);
			} else {
				opponent.die();
			}
			this.triggerExplosion();
		}
	},

	triggerExplosion: function() {
		this.exploding = true;
		this.setSize(16, 17);
		this.setImage(images.enemies_2, 278, 241); // pequeña
		this.explodeTimer = 15;
	},

	act: function() {
		if (this.exploding) {
			this.explodeTimer--;
			if (this.explodeTimer === 0) {
				this.setSize(32, 32);
				this.setImage(images.enemies_2, 242, 235); // grande
				this.explodeTimer = 20;
			} else if (this.explodeTimer < 0) {
				this.die();
			}
		} else {
			this.move();
		}
	}
}, 'bomba');

/*
 * -------------------------------------------
 * EXTRUCTURA CLASSES
 * -------------------------------------------
 */
var ext_derecha = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.enemies_2, 578, 76);
		this.setSize(11, 11);
	},
}, 'ext_derecha');

var ext_medio = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.enemies_2, 610, 76);
	},
}, 'ext_medio');

var ext_izquierda = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.enemies_2, 626, 76);
	},
}, 'ext_izquierda');

/*
 * -------------------------------------------
 * CENIZA CLASSES
 * -------------------------------------------
 */
var ceniza_derecha = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 314, 1074);
		this.setSize(11, 11);
	},
}, 'ceniza_derecha');

var ceniza_medio = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 348, 1074);
	},
}, 'ceniza_medio');

var ceniza_izquierda = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 382, 1074);
	},
}, 'ceniza_izquierda');

var ceniza_centri = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 348, 1108);
	},
}, 'ceniza_centro');

/*
 * -------------------------------------------
 * BAJADA
 * -------------------------------------------
 */

var bajada = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 172, 222);
	},
}, 'bajada');

/*
 * -------------------------------------------
 * GRABA
 * -------------------------------------------
 */
var graba_medio = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 106, 546);
	},
}, 'graba_medio');

/*
 * -------------------------------------------
 * COLUMNAS
 * -------------------------------------------
 */
var columna = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 648, 938);
	},
}, 'columna');

var tope_columna = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 648, 904);
	},
}, 'tope_columna');

var media_columna = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 682, 938);
	},
}, 'media_columna');

var media_columna = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 716, 938);
	},
}, 'media_columna_derecha');

var techo_columna = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 614, 938);
	},
}, 'techo_columna');

/*
 * -------------------------------------------
 * VIGA METALICA
 * -------------------------------------------
 */


var viga_derecha = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 212, 996);
	},
}, 'viga_derecha');

var viga_medio = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 246, 996);
	},
}, 'viga_medio');

var viga_izquierda = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 314, 996);
	},
}, 'viga_izquierda');

/*
 * -------------------------------------------
 * ESTACA
 * -------------------------------------------
 */


var estaca = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 648, 332);
	},
}, 'estaca');

var estaca_punta = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 650, 394);
	},
}, 'estaca_punta');

var estaca_invertida = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 616, 330);
	},
}, 'estaca_invertida');

/*
 * -------------------------------------------
 * SEÑAL
 * -------------------------------------------
 */
var señal1_1 = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 372, 54);
	},
}, 'señal1_1');

var señal1_2 = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 406, 54);
	},
}, 'señal1_2');

var señal2_1 = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 372, 88);
	},
}, 'señal2_1');

var señal2_2 = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 406, 88);
	},
}, 'señal2_2');

/*
 * -------------------------------------------
 * PUAS
 * -------------------------------------------
 */
var puas_abajo = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 104, 452);
	},
}, 'puas_abajo');

/*
 * -------------------------------------------
 * CUBO ROSA
 * -------------------------------------------
 */
var rosa1_1 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 854, 610);
	},
}, 'rosa1_1');

var rosa1_2 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 888, 610);
	},
}, 'rosa1_2');

var rosa1_3 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 922, 610);
	},
}, 'rosa1_3');

var rosa2_1 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 854, 644);
	},
}, 'rosa2_1');

var rosa2_2 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 888, 644);
	},
}, 'rosa2_2');

var rosa2_3 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 922, 644);
	},
}, 'rosa2_3');

var rosa3_1 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 854, 678);
	},
}, 'rosa3_1');

var rosa3_2 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 888, 678);
	},
}, 'rosa3_2');

var rosa3_3 = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.all;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 922, 678);
	},
}, 'rosa3_3');

/*
 * -------------------------------------------
 * PUENTE
 * -------------------------------------------
 */
var puente = Ground.extend({
	init: function(x, y, level) {
		var blocking = ground_blocking.top;
		this._super(x, y, blocking, level);
		this.setImage(images.objects, 172, 376);
	},
}, 'puente');

var agarradera = Decoration.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setImage(images.objects, 138, 344);
	},
}, 'agarradera');
  
/*
 * -------------------------------------------
 * Dragon CLASS
 * -------------------------------------------
 */
var blue_dragon = Enemy.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setSize(20, 33);
		this.setSpeed(constants.ballmonster_v);
		this.death_mode = death_modes.normal;
		this.deathCount = 0;
		this.animTick = 0;
		this.animFrame = 0;
		this.deathFrame = 0;      // frame actual de la animación de muerte
		this.deathAnimTick = 0;   // contador para cambiar de sprite

	
		this.view.css({
			'transform': 'scale(2)',
			'transform-origin': 'bottom left'
		});
	},	
	playFrame: function() {
		this.animTick++;
	
		if (this.animTick >= 10) { // cada 10 ticks cambia de sprite
			this.animTick = 0;
			this.animFrame = (this.animFrame + 1) % 2;
	
			if (this.direction === directions.right) {
				if (this.animFrame === 0)
					this.setImage(images.enemies_2, 612, 226); // primer sprite de caminar a la derecha
				else
					this.setImage(images.enemies_2, 614, 262); // segundo sprite de caminar a la derecha
			} else if (this.direction === directions.left) {
				if (this.animFrame === 0)
					this.setImage(images.enemies_2, 5, 60);// primer sprite de caminar a la izquierda
				else
					this.setImage(images.enemies_2, 26, 61); // segundo sprite de caminar a la izquierda
			}
		}
	},	
	
	death: function() {
		if (this.death_mode === death_modes.normal) {
			this.deathAnimTick++;
	
			if (this.deathAnimTick === 8) {
				this.setImage(images.enemies_2, 572, 226); // segundo sprite
			} else if (this.deathAnimTick === 16) {
				this.setImage(images.enemies_2, 551, 226); // tercer sprite
			}
	
			return --this.deathCount; // seguirá vivo hasta que expire
		}
	
		// Para muerte tipo shell
		this.view.css({ 'bottom' : (this.deathDir > 0 ? '+' : '-') + '=' + this.deathStep + 'px' });
		this.deathCount += this.deathDir;
	
		if (this.deathCount === this.deathFrames)
			this.deathDir = -1;
		else if (this.deathCount === 0)
			return false;
	
		return true;
	},
	
	die: function() {
		this.clearFrames();
	
		if (this.death_mode === death_modes.normal) {
			this.level.playSound('enemy_die');
			this.deathCount = Math.ceil(600 / constants.interval); // duración total
			this.deathFrame = 0;
			this.deathAnimTick = 0;
			this.setImage(images.enemies_2, 592, 226); // primer sprite
		} else if (this.death_mode === death_modes.shell) {
			this.level.playSound('shell');
			this.setImage(images.enemies, 68, this.direction === directions.right ? 228 : 188);
			this.deathFrames = Math.floor(250 / constants.interval);
			this.deathDir = 1;
			this.deathStep = Math.ceil(150 / this.deathFrames);
		}
	
		this._super();
	},
	
}, 'blue_dragon');

/*
 * -------------------------------------------
 * FUEGO EN Y CLASS
 * -------------------------------------------
 */
var FireBounce = Enemy.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setSize(16, 16);
		this.setPosition(x, y);
		this.startY = y;

		this.jumpHeight = 500 + Math.floor(Math.random() * 150); // entre 50 y 200
		this.vy = 10;
		this.direction = 'up'; // puede ser 'up' o 'down'

		this.animTick = 0;
		this.animFrame = 0;

		this.setImage(images.enemies_2, 9, 187); // primer frame subida
	},

	move: function() {
		// Movimiento vertical
		if (this.direction === 'up') {
			this.y += this.vy;
			

			if (this.y >= this.startY + this.jumpHeight) {
				this.direction = 'down';
			}
		} else {
			this.y -= this.vy;

			if (this.y <= this.startY) {
				this.direction = 'up';
				// Nueva altura para el siguiente salto
				this.jumpHeight = 250 + Math.floor(Math.random() * 150);
			}
		}

		this.setPosition(this.x, this.y);
		this.animate();
	},

	animate: function() {
		this.animTick++;

		if (this.animTick % 10 === 0) { // cada ~160 ms
			this.animFrame = (this.animFrame + 1) % 2;

			if (this.direction === 'up') {
				// Fase de subida
				if (this.animFrame === 0)
					this.setImage(images.enemies_2, 9, 187);
				else
					this.setImage(images.enemies_2, 28, 187);
			} else {
				// Fase de bajada
				if (this.animFrame === 0)
					this.setImage(images.enemies_2, 531, 267);
				else
					this.setImage(images.enemies_2, 550, 267);
			}
		}
	},

	hit: function(opponent) {
		if (opponent instanceof Mario) {
			opponent.hurt(this);
		}
	},
},'bola1_fuego');


/*
 * -------------------------------------------
 * FUEGO EN X CLASS
 * -------------------------------------------
 */

var FireBounce = Enemy.extend({
    init: function(x, y, level) {
        this._super(x, y, level);
        this.setSize(16, 16);
        this.setPosition(x, y);
        this.startX = x;
        
        // Configuración para movimiento horizontal
        this.moveRange = 100 + Math.floor(Math.random() * 80); // rango entre 100-180px
        this.vx = 6; // velocidad horizontal
        this.direction = 'right'; // puede ser 'right' o 'left'
        
        this.animTick = 0;
        this.animFrame = 0;
        
        this.setImage(images.enemies_2, 9, 187); // primer frame
    },
    
    move: function() {
        // Movimiento horizontal
        if (this.direction === 'right') {
            this.x += this.vx;
            
            if (this.x >= this.startX + this.moveRange) {
                this.direction = 'left';
            }
        } else {
            this.x -= this.vx;
            
            if (this.x <= this.startX - this.moveRange) {
                this.direction = 'right';
                // Nuevo rango para el siguiente ciclo
                this.moveRange = 100 + Math.floor(Math.random() * 80);
            }
        }
        
        this.setPosition(this.x, this.y);
        this.animate();
    },
    
    animate: function() {
        this.animTick++;
        
        if (this.animTick % 10 === 0) { // cada ~160 ms
            this.animFrame = (this.animFrame + 1) % 2; // 4 frames para rotación completa
            
            // Rotar entre los 4 frames para dar efecto de giro
            switch(this.animFrame) {
                case 0:
                    this.setImage(images.enemies_2, 9, 187);
                    break;
                case 1:
                    this.setImage(images.enemies_2, 28, 187);
                    break;
                case 2:
                    this.setImage(images.enemies_2, 531, 267);
                    break;
                case 3:
                    this.setImage(images.enemies_2, 550, 267);
                    break;
            }
        }
    },
    
    hit: function(opponent) {
        if (opponent instanceof Mario) {
            opponent.hurt(this);
        }
    },
},'bola2_fuego');
/*
 * -------------------------------------------
 * FUEGO3 CLASS
 * -------------------------------------------
 */

var FireBounce = Enemy.extend({
    init: function(x, y, level) {
        this._super(x, y, level);
        this.setSize(16, 16);
        this.setPosition(x, y);
        this.startX = x;
        this.startY = y;

        // Configuración para el movimiento en ambos ejes
        this.xRange = 100 + Math.floor(Math.random() * 200); // Rango horizontal entre 100-180px
        this.yRange = 50 + Math.floor(Math.random() * 100); // Rango vertical entre 50-200px
        
        // Velocidades en ambos ejes
        this.vx = 2;
        this.vy = 2;
        
        // Direcciones
        this.directionX = 'right'; // 'right' o 'left'
        this.directionY = 'up';    // 'up' o 'down'

        this.animTick = 0;
        this.animFrame = 0;
        
        // Imágenes para cada dirección vertical
        this.upImage1 = {sheet: images.enemies_2, x: 9, y: 187};
        this.upImage2 = {sheet: images.enemies_2, x: 28, y: 187};
        this.downImage1 = {sheet: images.enemies_2, x: 531, y: 267};
        this.downImage2 = {sheet: images.enemies_2, x: 550, y: 267};
        
        // Establecer imagen inicial
        this.setImage(this.upImage1.sheet, this.upImage1.x, this.upImage1.y);
        
        // Guardar la última dirección vertical para saber cuándo cambia
        this.lastDirectionY = this.directionY;
    },

    move: function() {
        // Guardar la dirección vertical anterior
        this.lastDirectionY = this.directionY;
        
        // Movimiento horizontal
        if (this.directionX === 'right') {
            this.x += this.vx;
            
            if (this.x >= this.startX + this.xRange) {
                this.directionX = 'left';
            }
        } else {
            this.x -= this.vx;
            
            if (this.x <= this.startX - this.xRange) {
                this.directionX = 'right';
            }
        }
        
        // Movimiento vertical
        if (this.directionY === 'up') {
            this.y += this.vy;
            
            if (this.y >= this.startY + this.yRange) {
                this.directionY = 'down';
            }
        } else {
            this.y -= this.vy;
            
            if (this.y <= this.startY - this.yRange) {
                this.directionY = 'up';
                // Nuevas alturas para el siguiente ciclo
                this.yRange = 50 + Math.floor(Math.random() * 150);
            }
        }

        this.setPosition(this.x, this.y);
        this.animate();
    },

    animate: function() {
        this.animTick++;

        // Solo cambiar la animación si hay cambio en la dirección vertical
        if (this.directionY !== this.lastDirectionY || this.animTick % 10 === 0) {
            // Si ha cambiado la dirección, resetear animFrame
            if (this.directionY !== this.lastDirectionY) {
                this.animFrame = 0;
            } else {
                this.animFrame = (this.animFrame + 1) % 2;
            }
            
            // Aplicar la imagen correspondiente a la dirección vertical
            if (this.directionY === 'up') {
                if (this.animFrame === 0) {
                    this.setImage(this.upImage1.sheet, this.upImage1.x, this.upImage1.y);
                } else {
                    this.setImage(this.upImage2.sheet, this.upImage2.x, this.upImage2.y);
                }
            } else { // 'down'
                if (this.animFrame === 0) {
                    this.setImage(this.downImage1.sheet, this.downImage1.x, this.downImage1.y);
                } else {
                    this.setImage(this.downImage2.sheet, this.downImage2.x, this.downImage2.y);
                }
            }
        }
    },

    hit: function(opponent) {
        if (opponent instanceof Mario) {
            opponent.hurt(this);
        }
    },
},'bola3_fuego');

/*
 * -------------------------------------------
 * BOMBA CLASS
 * -------------------------------------------
 */
var BombEnemy = Enemy.extend({
	init: function(x, y, level) {
		this._super(x, y, level);
		this.setSize(24, 40);
		this.setSpeed(2);

		this.exploding = false;
		this.lit = false;
		this.timer = 100;
		this.maxTimer = 0;

		this.animTick = 0;
		this.animFrame = 0;

		this.explosionDuration = 0; // cuánto lleva explotando
		this.maxExplosionFrames = 10; // frames totales (~10 × 16ms ≈ 160ms)


		this.spriteMap = {
			off: {
				left:  [[415, 373], [448, 374]],
				right: [[287, 385], [254, 386]]
			},
			on: {
				left:  [[417, 308], [450, 307]],
				right: [[285, 334], [252, 333]]
			},
			explosion: [
				[242, 235], [276, 239] // ajusta según tu spritesheet
			]
		};

		this.updateImage();
	},

	move: function() {
		this._super();

		if (this.lit && !this.exploding) {
			this.timer++;
			if (this.timer >= this.maxTimer) {
				this.explode();
			}
		}

		this.animate();
	},

	hit: function(opponent) {
		if (opponent instanceof Mario && !this.lit && !this.exploding) {
			this.lit = true;
			this.timer = 0;
			this.maxTimer = Math.floor(Math.random() * (5000 / constants.interval));
			this.setSpeed(5);
			this.updateImage();
		}
	},

	animate: function() {
		this.animTick++;

		if (this.exploding) {
			if (this.animTick % 5 === 0) {
				this.animFrame = (this.animFrame + 1) % 2;
				const [x, y] = this.spriteMap.explosion[this.animFrame];
				this.setSize(32, 32);
				this.setImage(images.enemies_2, x, y);
				this.view.css({
					'transform': 'scale(2)',
					'transform-origin': 'center center'
				});
			}
			return;
		}

		if (this.animTick % 10 === 0) {
			this.animFrame = (this.animFrame + 1) % 2;
			this.updateImage();
		}
	},

	updateImage: function() {
		const state = this.lit ? 'on' : 'off';
		const dir = this.direction === directions.right ? 'right' : 'left';
		const [x, y] = this.spriteMap[state][dir][this.animFrame];
		this.setImage(images.enemies_2, x, y);
	},

	explode: function() {
		this.exploding = true;
		this.animTick = 0;
		this.animFrame = 0;
		this.explosionDuration = 10;
		const range = 64; // área de daño

		for (let fig of this.level.figures) {
			if (fig instanceof Mario) {
				let dx = Math.abs(fig.x - this.x);
				let dy = Math.abs(fig.y - this.y);
				if (dx < range && dy < range) {
					fig.hurt(this);
				}
			}
		}

	}
}, 'bomb_enemy');

/*
 * -------------------------------------------
 * GOOMBA VOLADOR
 * -------------------------------------------
 */
var FlyingGoomba = Enemy.extend({
	init: function(x, y, level) {
		this.walkSprites = {
			left: [
				[9, 244], [9, 304], [7, 363], [17, 424]
			],
			right: [
				[101, 250], [98, 300], [99, 359], [98, 414]
			]
		};
		
		this._super(x, y, level);
		this.setSize(64, 50);
		this.setState(1);
		this.setPosition(x, y);
	
		
		this.originX = x;
		this.speed = 5;
		this.range = 160;
		this.direction = directions.right;
		this.animTick = 0;
		this.animFrame = 0;

		this.setVelocity(this.speed, 0);
	},

	setVelocity: function(vx, vy) {
		this._super(vx, vy);
		this.animTick = 0;
		this.animFrame = 0;

		const [x, y] = this.walkSprites[this.getDirectionLabel()][0];
		this.setImage(images.enemies_2, x, y);
	},

	getDirectionLabel: function() {
		return this.direction === directions.right ? 'right' : 'left';
	},

	move: function() {
		this.x += this.speed * (this.direction === directions.right ? 1 : -1);
		this.setPosition(this.x, this.y);

		if (Math.abs(this.x - this.originX) >= this.range) {
			this.direction = this.direction === directions.right ? directions.left : directions.right;
			this.setVelocity(this.speed * (this.direction === directions.right ? 1 : -1), 0);
		}

		this.animate();
	},

	animate: function() {
		this.animTick++;
		if (this.animTick % 8 === 0) {
			this.animFrame = (this.animFrame + 1) % 4;

			const [x, y] = this.walkSprites[this.getDirectionLabel()][this.animFrame];
			this.setImage(images.enemies_2, x, y);
		}
	},

	die: function() {
		this.clearFrames();
		this.setImage(images.enemies_2, 130, 235);
		this.deathCount = Math.ceil(600 / constants.interval);
		this.level.playSound('enemy_die');
	},
	
	death: function() {
		return --this.deathCount;
	},

	act: function() {
		this.move();
		console.log("🍄 El goomba volador está activo", this.x, this.y);
	}
}, 'flyinggoomba');

/*
 * -------------------------------------------
 * SUPER TORTUGA
 * -------------------------------------------
 */
var SuperTortuga = Enemy.extend({
	init: function(x, y, level) {
		this.walkSprites = {
			left: [
				[580, 343], [584, 310]
			],
			right: [
				[513, 343], [509, 310]
			]
		};

		this._super(x, y, level);
		this.setSize(46, 38);
		this.setState(1);
		this.setPosition(x, y);

		this.originX = x;
		this.speed = 10;         // puedes ajustar la velocidad
		this.range = 300;       // distancia máxima antes de devolverse
		this.direction = directions.right;

		this.animTick = 0;
		this.animFrame = 0;

		this.view.css({
			'transform': 'scale(1.0)',
			'transform-origin': 'bottom center'
		});

		this.setVelocity(this.speed, 0);
	},

	setVelocity: function(vx, vy) {
		this._super(vx, vy);
		this.animTick = 0;
		this.animFrame = 0;

		const [x, y] = this.walkSprites[this.getDirectionLabel()][0];
		this.setImage(images.enemies_2, x, y);
	},

	getDirectionLabel: function() {
		return this.direction === directions.right ? 'right' : 'left';
	},

	move: function() {
		this.x += this.speed * (this.direction === directions.right ? 1 : -1);
		this.setPosition(this.x, this.y);

		if (Math.abs(this.x - this.originX) >= this.range) {
			this.direction = this.direction === directions.right ? directions.left : directions.right;
			this.setVelocity(this.speed * (this.direction === directions.right ? 1 : -1), 0);
		}

		this.animate();
	},

	animate: function() {
		this.animTick++;
		if (this.animTick % 10 === 0) {
			this.animFrame = (this.animFrame + 1) % 2;

			const [x, y] = this.walkSprites[this.getDirectionLabel()][this.animFrame];
			this.setImage(images.enemies_2, x, y);
		}
	},

	hit: function(opponent) {
		if (opponent instanceof Mario) {
			if (opponent.vy > 0 && opponent.y + opponent.height <= this.y + 10) {
				opponent.setVelocity(opponent.vx, constants.bounce);
				this.die();
			} else {
				opponent.hurt(this);
			}
		}
	},

	die: function() {
		this.clearFrames();
		this.setImage(images.enemies_2, 130, 235); // sprite aplastado
		this.deathCount = Math.ceil(600 / constants.interval);
		this.level.playSound('enemy_die');
		this._super();
	},

	death: function() {
		return --this.deathCount;
	},

	act: function() {
		this.move();
	}
}, 'super_tortuga');



/*
 * -------------------------------------------
 * DOCUMENT READY STARTUP METHOD
 * -------------------------------------------
 */
$(document).ready(function() {
	var level = new Level('world');
	level.load(definedLevels[0]);
	level.start();
	keys.bind();
});