class Game {
  constructor(canvas) {
    this.context = canvas.getContext('2d');
    this.canvas = canvas;


    // loading resources need for the game to run
    this.assetsManager = new AssetsManager();
    this.assetsManager.loadAll();
    // game controls 
    this.inputController = new InputController();

    // game loop variables
    this.fps = 60;
    this.interval = 1000 / this.fps;
    this.lastTime = new Date().getTime();
    this.currentTime = 0;
    this.delta = 0;

    this.frameId = 0;
    this.isPaused = false;
  }

  new() {
    this.background = new Background(this.canvas, this.assetsManager);
    this.spaceship = new SpaceShip(this.canvas, this.inputController, this.assetsManager);
    this.powerUps = [];
    this.enemies = [];

    this.collisionManager = new CollisionManager(this);
    this.scorePanel = new ScorePanel(this);


    this.inputController.keyListener();
  }

  run() {
    this.frameId = window.requestAnimationFrame(this.run.bind(this));

    this.currentTime = new Date().getTime();
    this.delta = this.currentTime - this.lastTime;

    if (this.delta > this.interval) {
      if (!this.isPaused) {
        this.update(this.delta);
        this.collisionManager.resolveCollision(this.delta);
      }

      if (this.spaceship.livesRemaining < 0) {
        this.gameOver();
      }

      this.render();

      this.lastTime = this.currentTime - (this.delta % this.interval);
    }
  };

  render() {
    this.background.draw(this.context);
    this.spaceship.draw(this.context);
    this.scorePanel.draw(this.context);
  }

  update(delta) {
    this.background.update();
    this.spaceship.update(delta);
  }
}


class SpaceShip {
  constructor(canvas, controller, assets) {
    this.canvas = canvas;
    this.controller = controller;

    this.assets = assets;

    this.width = 60;
    this.height = 90;
    this.x = 300 - (this.width / 2);
    this.y = 600;
    this.mass = 100;
    this.xv = 0;
    this.yv = 0;
    this.maxVelocity = 100;
    this.accelerateFactor = 2;


    // collisions with walls detection
    this.isLeftWall = false;
    this.isRightWall = false;
    this.isUpWall = false;
    this.isDownWall = false;

    this.bulletDelayTimer = 0;
    this.bullets = [];
    this.isBoltPower = false;
    this.boltDuration = 15000;
    this.boltTimer = 0;
    this.bulletCleanUpDelayTimer = 0;

    this.isShieldAnimating = false;
    this.isShieldUp = false;
    this.shieldDuriation = 15000;
    this.shieldDelayTimer = 0;
    this.shieldIndex = 0;
    this.isShieldUpAudio = false;
    this.isShieldDownAudio = false;

    this.livesRemaining = 3;
    this.score = 0;
  }

  draw(ctx) {
    ctx.drawImage(this.assets.images["spacecraft"], this.x,
      this.y, this.width, this.height);
  }

  update() {
    this.slowDown();
    this.newPos();

    this.y += (this.yv / 10);
    this.x += (this.xv / 10);
  }

  slowDown() {
    // prevents the bug where spacecraft would not stop after a collision
    if (this.xv > -2 && this.xv < 2) {
      this.xv = 0;
    }

    if (this.yv > -2 && this.yv < 2) {
      this.yv = 0;
    }

    // slow down when going up
    if (this.yv < 0 && !this.controller.keys.ArrowUp) {
      this.yv += this.accelerateFactor;
    }

    // slow down when going down
    if (this.yv > 0 && !this.controller.keys.ArrowDown) {
      this.yv -= this.accelerateFactor;
    }

    // slow down when going right
    if (this.xv > 0 && !this.controller.keys.ArrowRight) {
      this.xv -= this.accelerateFactor;
    }

    // slow down when going left
    if (this.xv < 0 && !this.controller.keys.ArrowLeft) {
      this.xv += this.accelerateFactor;
    }
  }

  newPos() {
    // start moving up
    if (this.controller.keys.ArrowUp && this.yv === 0 && !this.isUpWall) {
      this.yv -= this.accelerateFactor;
      this.isDownWall = false;
    }

    // accelerate further up
    if (this.controller.keys.ArrowUp && (Math.abs(this.yv) <= this.maxVelocity)) {
      this.yv -= this.accelerateFactor;
    }

    // start moving down
    if (this.controller.keys.ArrowDown && this.yv === 0 && !this.isDownWall) {
      this.yv += this.accelerateFactor;
      this.isUpWall = false;
    }

    // accelerate further down
    if (this.controller.keys.ArrowDown && (Math.abs(this.yv) <= this.maxVelocity)) {
      this.yv += this.accelerateFactor;
    }

    // start moving right
    if (this.controller.keys.ArrowRight && this.xv === 0 && !this.isRightWall) {
      this.xv += this.accelerateFactor;
      this.isLeftWall = false;
    }

    // accelerate further right
    if (this.controller.keys.ArrowRight && (Math.abs(this.xv) <= this.maxVelocity)) {
      this.xv += this.accelerateFactor;
    }

    // start moving left
    if (this.controller.keys.ArrowLeft && this.xv === 0 && !this.isLeftWall) {
      this.xv -= this.accelerateFactor;
      this.isRightWall = false;
    }

    // accelerate further left
    if (this.controller.keys.ArrowLeft && (Math.abs(this.xv) <= this.maxVelocity)) {
      this.xv -= this.accelerateFactor;
    }
  }

}


class ScorePanel {

  constructor(game) {
    this.game = game;
    this.assetsManager = game.assetsManager;
    this.spaceship = game.spaceship;
  }

  draw(ctx) {
    ctx.fillStyle = "#f2f2f2";
    ctx.font = "20px kenvector_future_thin";
    ctx.fillText(this.spaceship.livesRemaining, 540, 30);
    ctx.drawImage(this.assetsManager.images["livesRemaining"], 555, 10);

    ctx.fillText("Score: " + this.spaceship.score, 10, 28);

    if (this.game.isPaused) {
      ctx.drawImage(this.assetsManager.images["resumeIcon"], 5, 670);
      ctx.font = "50px kenvector_future_thin";
      ctx.fillText("Paused", 200, 300);
    } else {
      ctx.drawImage(this.assetsManager.images["pauseIcon"], 5, 670);
    }
  }
};



class Background {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.assets = assets

    this.ySpeed = 2;
    this.x = 0;
    this.y = 0;
  }

  update() {
    this.y += this.ySpeed;

    if (this.y >= this.canvas.height) {
      this.y = 0 // resettinng to the top if the image pass the canvas height
    }
  }

  draw(ctx) {
    ctx.drawImage(this.assets.images['background'], this.x, this.y);
    ctx.drawImage(this.assets.images['background'], this.x, this.y - this.canvas.height)
  }
};


class InputController {
  constructor() {
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    }
  }

  keyListener() {
    // For key press down
    document.addEventListener('keydown', (event) => {
      const key = event.key
      this.keys[key] = true;
    });

    document.addEventListener('keyup', (event) => {
      const key = event.key;
      this.keys[key] = false;
    })
  }
}


class AssetsManager {
  constructor() {
    this.images = [];
    this.sounds = []
  }

  loadAll() {
    this.images["spacecraft"] = new Image();
    this.images["spacecraft"].src = "assets/PNG/playerShip2_blue.png";

    this.images["spacecraftSmallDamage"] = new Image();
    this.images["spacecraftSmallDamage"].src = "assets/PNG/Damage/playerShip2_damage1.png";
    this.images["spacecraftMediumDamage"] = new Image();
    this.images["spacecraftMediumDamage"].src = "assets/PNG/Damage/playerShip2_damage2.png";
    this.images["spacecraftBigDamage"] = new Image();
    this.images["spacecraftBigDamage"].src = "assets/PNG/Damage/playerShip2_damage3.png";

    this.images["shield1"] = new Image();
    this.images["shield1"].src = "assets/PNG/Effects/shield1.png";
    this.images["shield2"] = new Image();
    this.images["shield2"].src = "assets/PNG/Effects/shield2.png";
    this.images["shield3"] = new Image();
    this.images["shield3"].src = "assets/PNG/Effects/shield3.png";

    this.images["background"] = new Image();
    this.images["background"].src = "assets/Backgrounds/blueBig.png";

    this.images["laserBlue1"] = new Image();
    this.images["laserBlue1"].src = "assets/PNG/Lasers/laserBlue02.png";
    this.images["laserBlue2"] = new Image();
    this.images["laserBlue2"].src = "assets/PNG/Lasers/laserBlue06.png";
    this.images["laserGreen1"] = new Image();
    this.images["laserGreen1"].src = "assets/PNG/Lasers/laserGreen04.png";
    this.images["laserGreen2"] = new Image();
    this.images["laserGreen2"].src = "assets/PNG/Lasers/laserGreen12.png";
    this.images["laserRed1"] = new Image();
    this.images["laserRed1"].src = "assets/PNG/Lasers/laserRed02.png";
    this.images["laserRed2"] = new Image();
    this.images["laserRed2"].src = "assets/PNG/Lasers/laserRed06.png";

    // power ups
    this.images["shieldPower"] = new Image();
    this.images["shieldPower"].src = "assets/PNG/Power-ups/powerupYellow_shield.png";
    this.images["boltPower"] = new Image();
    this.images["boltPower"].src = "assets/PNG/Power-ups/powerupGreen_bolt.png";

    // explosions by Ville Seppanen, http://villeseppanen.com
    for (var i = 0; i < 21; i++) {
      this.images["explosion" + i] = new Image();
      this.images["explosion" + i].src = "assets/PNG/Effects/explosion" + i + ".png";
    }

    this.images["laserBlueExplosion1"] = new Image();
    this.images["laserBlueExplosion1"].src = "assets/PNG/Lasers/laserBlue09.png";
    this.images["laserBlueExplosion2"] = new Image();
    this.images["laserBlueExplosion2"].src = "assets/PNG/Lasers/laserBlue08.png";

    this.images["laserGreenExplosion1"] = new Image();
    this.images["laserGreenExplosion1"].src = "assets/PNG/Lasers/laserGreen15.png";
    this.images["laserGreenExplosion2"] = new Image();
    this.images["laserGreenExplosion2"].src = "assets/PNG/Lasers/laserGreen14.png";

    this.images["laserRedExplosion1"] = new Image();
    this.images["laserRedExplosion1"].src = "assets/PNG/Lasers/laserRed09.png";
    this.images["laserRedExplosion2"] = new Image();
    this.images["laserRedExplosion2"].src = "assets/PNG/Lasers/laserRed08.png";

    // enemies
    this.images["enemyBlue"] = new Image();
    this.images["enemyBlue"].src = "assets/PNG/Enemies/enemyBlue4.png";
    this.images["enemyRed"] = new Image();
    this.images["enemyRed"].src = "assets/PNG/Enemies/enemyRed4.png";
    this.images["enemyGreen"] = new Image();
    this.images["enemyGreen"].src = "assets/PNG/Enemies/enemyGreen3.png";
    this.images["enemyBlack"] = new Image();
    this.images["enemyBlack"].src = "assets/PNG/Enemies/enemyBlack3.png";

    // score panel
    this.images["livesRemaining"] = new Image();
    this.images["livesRemaining"].src = "assets/PNG/UI/playerLife2_blue.png";

    // icons by Gregor Črešnar
    this.images["pauseIcon"] = new Image();
    this.images["pauseIcon"].src = "assets/PNG/UI/pauseButton.png";
    this.images["resumeIcon"] = new Image();
    this.images["resumeIcon"].src = "assets/PNG/UI/resumeButton.png";

  }

  loadSounds() {
    this.sounds["shieldUp"] = new Audio("assets/Bonus/sfx_shieldUp.ogg");
    this.sounds["shieldDown"] = new Audio("assets/Bonus/sfx_shieldDown.ogg");
    this.sounds["laserPlayer"] = new Audio("assets/Bonus/sfx_laser1.ogg");
    this.sounds["laserEnemy"] = new Audio("assets/Bonus/sfx_laser2.ogg");
    this.sounds["gameOver"] = new Audio("assets/Bonus/sfx_lose.ogg");

    //Sound (c) by Michel Baradari apollo-music.de
    this.sounds["explosion"] = new Audio("assets/Bonus/explodemini.wav");
  }


}


class CollisionManager {
  constructor(game) {
    this.game = game;
    this.spaceship = game.spaceship;
    this.collisionDelayTimer = 0;
  }

  resolveCollision(delta) {
    this.collisionDelayTimer += delta;
    this.shipWithWall();
  }

  shipWithWall() {
    if (this.spaceship.x < 5) {
      this.spaceship.xv = 0;
      this.spaceship.isLeftWall = true;
      this.spaceship.x = 5;
    }

    if (this.spaceship.x + this.spaceship.width + 5 > this.game.canvas.width) {
      this.spaceship.xv = 0;
      this.spaceship.isRightWall = true;
      this.spaceship.x = this.game.canvas.width - this.spaceship.width - 5;
    }

    if (this.spaceship.y < 5) {
      this.spaceship.yv = 0;
      this.spaceship.isUpWall = true;
      this.spaceship.y = 5;
    }

    if (this.spaceship.y + this.spaceship.height + 5 > this.game.canvas.height) {
      this.spaceship.yv = 0;
      this.spaceship.isDownWall = true;
      this.spaceship.y = this.game.canvas.height - this.spaceship.height - 5;
    }
  }

}
