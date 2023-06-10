class Game {
  constructor(canvas) {
    this.context = canvas.getContext('2d');
    this.canvas = canvas;


    // loading resources need for the game to run
    this.assets = new AssetsManager();
    this.assets.loadAll();
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
    this.background = new Background(this.canvas, this.assets);
    this.spaceship = new SpaceShip(this.canvas, this.inputController, this.assets);
    this.powerUps = [];
    this.aliens = [];

    this.collisionManager = new CollisionManager(this);
    this.scorePanel = new ScorePanel(this);
    this.gameplayManager = new GamePlayManager(this);
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

    // drawing the aliens and adding powerups
    for (let i = 0; i < this.aliens.length; i++) {
      this.aliens[i].draw(this.context);
    }
  }

  update(delta) {
    this.background.update();
    this.spaceship.update(delta);
    this.gameplayManager.update(delta);


    for (let i = 0; i < this.aliens.length; i++) {
      this.aliens[i].update(delta);
  }
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

    this.radius = this.width / 2;
    this.xCentre = this.x + this.radius;
    this.yCentre = this.y + this.radius;


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
    for (var i = 0; i < this.bullets.length; i++) {
      this.bullets[i].draw(ctx);
    }

    ctx.drawImage(this.assets.images["spaceship"], this.x,
      this.y, this.width, this.height);
  }

  update(delta) {
    this.slowDown(); 
    this.newPos();

    this.y += (this.yv / 10);
    this.x += (this.xv / 10);

    this.radius = this.width / 2;
    this.xCentre = this.x + this.radius;
    this.yCentre = this.y + this.radius;

    // fire normal bullet every second, powered up bullet every 0.3 second
    this.bulletDelayTimer += delta;

    if (!this.isBoltPower && this.bulletDelayTimer > 1000) {
      this.shoot("blue");
      this.bulletDelayTimer = 0;
    } else if (this.isBoltPower && this.bulletDelayTimer > 300) {
      this.shoot("green");
      this.bulletDelayTimer = 0;
    }

    for (let i = 0; i < this.bullets.length; i++) {
      this.bullets[i].update(delta);
    }

    // every 10 seconds remove bullets that are off the screen
    this.bulletCleanUpDelayTimer += delta;

    if (this.bulletCleanUpDelayTimer > 10000) {
      for (var i = 0; i < this.bullets.length; i++) {
        if (this.bullets[i].y < -50 || this.bullets[i].isExploded) {
          this.bullets.splice(i, 1);
          i--;
        }
      }

      this.bulletCleanUpDelayTimer = 0;
    }

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

  shoot(color) {
    if (color === "blue" || color === "green") {
      this.bullets.push(new Bullet(this.x + (this.width / 2) - (14 / 2),
        this.y, color, this.assets));

      this.assets.sounds["laserPlayer"].play();
      this.assets.sounds["laserPlayer"].currentTime = 0;
    } else {
      console.error(color + " is not an appropriate color to fire a bullet!");
    }
  }

}


class Bullet {
  constructor(x, y, color, assets) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.assets = assets;
    this.speed = this.getSpeed(this.color);
    this.width = 13;
    this.height = 37;

    this.isExploding = false;
    this.explosionTimer = 0;
    this.isExploded = false;
    this.explosionIndex = 1;
  }

  getSpeed(color) {
    if (color === "blue" || color === "red") {
      return 50;
    } else if (color === "green") {
      return 100;
    } else {
      console.error(color + " is not a valid color to determine bullet speed");
      return NaN;
    }
  }

  explode() {
    this.isExploding = true;
  }

  impact() {
    this.isExploded || this.isExploding
  }


  update() {
    if (this.isExploded) {
      return;
    }

    if (!this.isExploded && !this.isExploding) {
      if (this.color === "blue" || this.color === "green") {
        this.y -= (this.speed / 10);
      } else {
        this.y += (this.speed / 10);
      }
    }

    if (this.isExploding) {
      this.explosionTimer += delta;

      if (this.explosionTimer > 100) {
        this.explosionIndex++;
        this.explosionTimer = 0;
      }

      if (this.explosionIndex > 2) {
        this.isExploded = true;
        this.isExploding = false;
      }
    }
  }

  draw(ctx) {
    if (!this.isExploded && !this.isExploding) {
      if (this.color === "blue") {
        ctx.drawImage(this.assets.images["laserBlue1"],
          this.x, this.y);
        ctx.drawImage(this.assets.images["laserBlue2"],
          this.x, this.y);
      } else if (this.color === "green") {
        ctx.drawImage(this.assets.images["laserGreen1"],
          this.x, this.y);
        ctx.drawImage(this.assets.images["laserGreen2"],
          this.x, this.y);
      } else if (this.color === "red") {
        ctx.drawImage(this.assets.images["laserRed1"],
          this.x, this.y);
        ctx.drawImage(this.assets.images["laserRed2"],
          this.x, this.y);
      } else {
        console.error(this.color + " is not a valid color!");
      }
    } else if (this.isExploding) {
      // draw explosion
      if (this.color === "blue") {
        ctx.drawImage(this.assets.images["laserBlueExplosion" + this.explosionIndex],
          this.x - this.width, this.y);
      } else if (this.color === "green") {
        ctx.drawImage(this.assets.images["laserGreenExplosion" + this.explosionIndex],
          this.x - this.width, this.y);
      } else if (this.color === "red") {
        ctx.drawImage(this.assets.images["laserRedExplosion" + this.explosionIndex],
          this.x - this.width, this.y + this.height);
      } else {
        console.error(this.color + " is not a valid color!");
      }
    }
  }
}


class ScorePanel {

  constructor(game) {
    this.game = game;
    this.assets = game.assets;
    this.spaceship = game.spaceship;
  }

  draw(ctx) {
    ctx.fillStyle = "#f2f2f2";
    ctx.font = "20px kenvector_future_thin";
    ctx.fillText(this.spaceship.livesRemaining, 540, 30);
    ctx.drawImage(this.assets.images["livesRemaining"], 555, 10);

    ctx.fillText("Score: " + this.spaceship.score, 10, 28);

    if (this.game.isPaused) {
      ctx.drawImage(this.assets.images["resumeIcon"], 5, 670);
      ctx.font = "50px kenvector_future_thin";
      ctx.fillText("Paused", 200, 300);
    } else {
      ctx.drawImage(this.assets.images["pauseIcon"], 5, 670);
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
    this.images["spaceship"] = new Image();
    this.images["spaceship"].src = "assets/PNG/playership.png";

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
    this.images["enemyBlue"].src = "assets/PNG/Enemies/purple.png";
    this.images["enemyRed"] = new Image();
    this.images["enemyRed"].src = "assets/PNG/Enemies/red.png";
    this.images["enemyGreen"] = new Image();
    this.images["enemyGreen"].src = "assets/PNG/Enemies/green.png";
    this.images["enemyBlack"] = new Image();
    this.images["enemyBlack"].src = "assets/PNG/Enemies/yellow.png";

    // score panel
    this.images["livesRemaining"] = new Image();
    this.images["livesRemaining"].src = "assets/PNG/UI/playerLife.png";

    // icons by Gregor Črešnar
    this.images["pauseIcon"] = new Image();
    this.images["pauseIcon"].src = "assets/PNG/UI/pauseButton.png";
    this.images["resumeIcon"] = new Image();
    this.images["resumeIcon"].src = "assets/PNG/UI/resumeButton.png";

    this.loadSounds()
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


class GamePlayManager {
  constructor(game) {
    this.canvas = game.canvas;
    this.assets = game.assets;
    this.aliens = game.aliens;
    this.spaceship = game.spaceship;

    this.aliensSpawnDelay = 5000;
    this.aliensSpawnDelayMin = 1000; // max difficulty
    this.aliensSpawnDelayTimer = 0;

    this.powerUpsSpawnDelay = 20000;
    this.powerUpsSpawnDelayTimer = 0;

    this.cleanUpDelay = 15000;
    this.cleanUpDelayTimer = 0;

    this.difficultyDelay = 30000;
    this.difficultyDelayTimer = 0;
  }

  update(delta) {
    this.spawnEnemies(delta);

    // clean up every 15 seconds 
    this.cleanUpDelayTimer += delta;

    if (this.cleanUpDelayTimer > this.cleanUpDelay) {
      for (let i = 0; i < this.aliens.length; i++) {
        if (this.outOfCanvas(this.aliens[i])) {
          this.aliens.splice(i, 1);
          i--;
        }
      }

      this.cleanUpDelayTimer = 0;
    }

    this.increaseDifficulty(delta);
  }

  spawnEnemies(delta) {
    this.aliensSpawnDelayTimer += delta;

    if (this.aliensSpawnDelayTimer > this.aliensSpawnDelay) {
      this.aliens.push(new Alien(this.getAlienXPosition(), this.getAlienYPosition(),
        this.getAlienType(), this.assets, this.spaceship));

      this.aliensSpawnDelayTimer = 0;
    }
  }

  increaseDifficulty(delta) {
    this.difficultyDelayTimer += delta;

    if (this.difficultyDelayTimer > this.difficultyDelay) {

      if (this.aliensSpawnDelay > this.aliensSpawnDelayMin) {
        this.aliensSpawnDelay -= 200;
      }

      this.difficultyDelayTimer = 0;
    }
  }

  getAlienXPosition(){
    return this.getRandom(100, this.canvas.width - 100);
  }

  getAlienYPosition(){
    return this.getRandom(-60, -50);
  }

  getRandom(min, max){
      return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  outOfCanvas(entity){
    return entity.x < -300 || entity.x > this.canvas.width + 300
    || entity.y < -300 || entity.y > this.canvas.height + 300;
  }

  getAlienType(){
    let choice = this.getRandom(0, 3);

    if (choice === 0) {
        return "enemyBlue"
    } else if (choice === 1) {
        return "enemyRed";
    } else if (choice === 2) {
        return "enemyGreen";
    } else {
        return "enemyBlack";
    }
  }
}

class Alien {
  constructor(x, y, type, assets, spaceship) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.assets = assets;
    this.spaceship = spaceship;
    this.width = 55;
    this.height = 56;

    this.xv = 0;
    this.yv = 0;
    this.mass = 200;

    this.radius = this.width / 2;
    this.xCentre = this.x + this.radius;
    this.yCentre = this.y + this.radius;

    if (this.type === "enemyBlue" || this.type === "enemyGreen") {
      this.accelerateFactor = 1;
      this.maxVelocity = 7;
    } else {
      this.accelerateFactor = 1;
      this.maxVelocity = 20;
    }

    this.behaviourStarted = false;

    // for blue and red behaviour (also last bit of black behaviour)
    if (this.type === "enemyBlue" || this.type === "enemyRed" || this.type === "enemyBlack") {
      // random value <100, 600>
      this.initialDescentDistance = Math.floor(Math.random() * (600 - 100 + 1)) + 100;
    }

    // green and black
    if (this.type === "enemyGreen" || this.type === "enemyBlack") {
      this.bulletDelayTimer = 0;
      this.bullets = [];
      this.startFire = false;
      this.bulletCleanUpDelayTimer = 0;
    }

    // black behaviour
    this.flewToPlayer = false;
    this.flewFromPlayer = false;
    this.flyingToLeftWall = false;
    this.flyingToRightWall = false;

    this.goDown = false;
    this.goUp = false;
    this.goRight = false;
    this.goLeft = false;

    this.isExploding = false;
    this.explosionTimer = 0;
    this.isExploded = false;
    this.explosionIndex = 0;
  }


  update() {
    if (this.isExploded && (this.type === "enemyBlue" || this.type === "enemyRed")) {
      return;
    } else if (this.isExploded && this.bullets.length !== 0) {
      // make sure bullets move even after enemy blew up
      for (var i = 0; i < this.bullets.length; i++) {
        this.bullets[i].update(delta);
      }

      // run bullet clean up code
      this.bulletsCleanUp(delta);
      return;
    } else if (this.isExploded) {
      return;
    }
    this.doBehaviour();
    this.slowDown();
    this.updateDirection();

    this.y += (this.yv / 10);
    this.x += (this.xv / 10);

    this.radius = this.width / 2;
    this.xCentre = this.x + this.radius;
    this.yCentre = this.y + this.radius;

    if ((this.type === "enemyGreen" || this.type === "enemyBlack") && this.startFire) {
      this.bulletDelayTimer += delta;

      if (this.bulletDelayTimer > 1000) {
        this.fire();
        this.bulletDelayTimer = 0;
      }

      for (var i = 0; i < this.bullets.length; i++) {
        this.bullets[i].update(delta);
      }

      this.bulletsCleanUp(delta);
    }

    if (this.isExploding) {
      this.explosionTimer += delta;

      if (this.explosionTimer > 50) {
        this.explosionIndex++;
        this.explosionTimer = 0;
      }

      if (this.explosionIndex > 20) {
        // end enemy's life :)
        this.isExploded = true;
        this.isExploding = false;
      }
    }
  }

  draw(ctx) {
    if (!this.isExploded && !this.isExploding) {
      ctx.drawImage(this.assets.images[this.type], this.x, this.y,
        this.width, this.height);
    } else if (this.isExploding) {
      ctx.drawImage(this.assets.images["explosion" + this.explosionIndex],
        this.xCentre - this.radius, this.yCentre - this.radius, this.radius * 2,
        this.radius * 2);
    }

    if (this.type === "enemyGreen" || this.type === "enemyBlack") {
      for (let i = 0; i < this.bullets.length; i++) {
        this.bullets[i].draw(ctx);
      }
    }
  }


  updateDirection() {
    // start moving up
    if (this.goUp && this.yv === 0) {
      this.yv -= this.accelerateFactor;
    }

    // accelerate further up
    if (this.goUp && (Math.abs(this.yv) < this.maxVelocity)) {
      this.yv -= this.accelerateFactor;
    }

    // start moving down
    if (this.goDown && this.yv === 0) {
      console.log('going down ')
      this.yv += this.accelerateFactor;
    }

    // accelerate further down
    if (this.goDown && (Math.abs(this.yv) < this.maxVelocity)) {
      this.yv += this.accelerateFactor;
    }

    // start moving right
    if (this.goRight && this.xv === 0) {
      this.xv += this.accelerateFactor;
    }

    // accelerate further right
    if (this.goRight && (Math.abs(this.xv) < this.maxVelocity)) {
      this.xv += this.accelerateFactor;
    }

    // start moving left
    if (this.goLeft && this.xv === 0) {
      this.xv -= this.accelerateFactor;
    }

    // accelerate further left
    if (this.goLeft && (Math.abs(this.xv) < this.maxVelocity)) {
      this.xv -= this.accelerateFactor;
    }
  }


  slowDown() {
    // slow down when going up
    if (this.yv < 0 && this.goDown) {
      this.yv += this.accelerateFactor;
    }

    // slow down when going down
    if (this.yv > 0 && this.goUp) {
      this.yv -= this.accelerateFactor;
    }

    // slow down when going right
    if (this.xv > 0 && this.goLeft) {
      this.xv -= this.accelerateFactor;
    }

    // slow down when going left
    if (this.xv < 0 && this.goRight) {
      this.xv += this.accelerateFactor;
    }
  }

  bulletsCleanUp() {
    // every 10 seconds remove bullets that are off the screen
    this.bulletCleanUpDelayTimer += delta;

    if (this.bulletCleanUpDelayTimer > 10000) {
      //console.log("Before: " + this.bullets.length);
      for (var i = 0; i < this.bullets.length; i++) {
        if (this.bullets[i].y > 1000 || this.bullets[i].isExploded) {
          this.bullets.splice(i, 1);
          i--;
        }
      }

      //console.log("After: " + this.bullets.length);
      this.bulletCleanUpDelayTimer = 0;
    }
  }

  doBehaviour(){
    if (this.type === "enemyBlue") {
      this.doBlueBehaviour();
  } else if (this.type === "enemyRed") {
      this.doRedBehaviour();
  } else if (this.type === "enemyGreen") {
      this.doGreenBehaviour();
  } else if (this.type === "enemyBlack") {
      this.doBlackBehaviour();
  }
  }

  doBlueBehaviour(){
    if (!this.behaviourStarted) {
      this.goDown = true;
      this.behaviourStarted = true;
  } else {
      if (this.y < this.initialDescentDistance) {
          return;
      }

      if (this.xCentre < this.spaceship.xCentre) {
          this.goLeft = false;
          this.goRight = true;
      } else if (this.xCentre > this.spaceship.xCentre) {
          this.goLeft = true;
          this.goRight = false;
      } else {
          this.goLeft = false;
          this.goRight = false;
      }
  }
  }

  doRedBehaviour(){
    if (!this.behaviourStarted) {
      this.goDown = true;
      this.behaviourStarted = true;
  } else {
      if (this.yPosition < this.initialDescentDistance) {
          return;
      }

      if (this.xCentre < this.spaceship.xCentre) {
          this.goLeft = false;
          this.goRight = true;
      } else if (this.xCentre > this.spaceship.xCentre) {
          this.goLeft = true;
          this.goRight = false;
      } else {
          this.goLeft = false;
          this.goRight = false;
      }
  }
  }

  doGreenBehaviour(){
    if (!this.behaviourStarted) {
      this.goDown = true;
      this.behaviourStarted = true;
  } else if (this.yPosition > 0) {
      // stop shooting after leaving the screen
      if (this.yPosition >= 700) {
          this.startFire = false;
      } else {
          this.startFire = true;
      }
  }
  }

  doBlackBehaviour(){
    if (!this.behaviourStarted){
      this.goDown = true;
      this.behaviourStarted = true;
  } else {
      if (this.yPosition > 0) {
          this.startFire = true;
      }

      if (this.y > 10 && !this.flewToPlayer && !this.flewFromPlayer) {
          this.goDown = false;
          this.yv = 0;

          if (this.xCentre > this.spaceship.x && this.xCentre < this.spaceship.x + this.spaceship.width) {
              this.flewToPlayer = true;
          } else if (this.xCentre < this.spaceship.xCentre) {
              this.goLeft = false;
              this.goRight = true;
          } else  {
              this.goLeft = true;
              this.goRight = false;
          }
      } else if (this.flewToPlayer && !this.flewFromPlayer) {

          if (this.xCentre > 300 && !this.flyingToRightWall) {
              this.goLeft = true;
              this.goRight = false;
              this.flyingToLeftWall = true;
          } else if (!this.flyingToLeftWall){
              this.goLeft = false;
              this.goRight = true;
              this.flyingToRightWall = true;
          }

          // check if next to wall
          if (this.x < 50 || this.x > 500) {
              this.goDown = true;
              this.goLeft = false;
              this.goRight = false;
              this.xv = 0;
              this.flewFromPlayer = true;
          }
      } else if (this.flewFromPlayer && this.flewToPlayer) {
          // final bit, do red behaviour
          if (this.y < this.initialDescentDistance) {
              return;
          }

          if (this.xCentre < this.spaceship.xCentre) {
              this.goLeft = false;
              this.goRight = true;
          } else if (this.x > this.spaceship.xCentre) {
              this.goLeft = true;
              this.goRight = false;
          } else {
              this.goLeft = false;
              this.goRight = false;
          }

          // stop shooting after leaving the screen
          if (this.y >= 700) {
              this.startFire = false;
          }
      }
  }
  }

  shoot() {
    this.bullets.push(new Bullet(this.x + (this.width / 2) - (14 / 2),
      this.y + this.height / 2, "red", this.assets));

    this.assets.audios["laserEnemy"].play();
    this.assets.audios["laserEnemy"].currentTime = 0;
  }

  explode(){
    this.isExploding = true;
    this.startFire = false;

    this.assets.audios["explosion"].play();
    this.assets.audios["explosion"].currentTime = 0;
  }

  isHit(){
    return this.isExploded || this.isExploding;
  }
}