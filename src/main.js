const TILE = 32;

const MAP = [
  "WWWWWWWWWWWWWWWWWWWW",
  "W..................W",
  "W..GGGG............W",
  "W..GGGG....TTT.....W",
  "W..........T.T.....W",
  "W..........TTT.....W",
  "W..................W",
  "W.....GGGGGG.......W",
  "W.....GGGGGG.......W",
  "W..................W",
  "W.............BBBB.W",
  "W.............B..B.W",
  "W.............BBBB.W",
  "W..................W",
  "WWWWWWWWWWWWWWWWWWWW",
];

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.encounterCooldown = 0;
    this.blockedTiles = new Set();
    this.grassTiles = new Set();

    this.drawMap();
    this.createPlayer();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");

    this.cameras.main.setBounds(0, 0, MAP[0].length * TILE, MAP.length * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  drawMap() {
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        const tile = MAP[y][x];
        const px = x * TILE;
        const py = y * TILE;
        const key = `${x},${y}`;

        let color = 0x66bb6a;

        if (tile === "W") {
          color = 0x263238;
          this.blockedTiles.add(key);
        }

        if (tile === "G") {
          color = 0x2e7d32;
          this.grassTiles.add(key);
        }

        if (tile === "T") {
          color = 0x1b5e20;
          this.blockedTiles.add(key);
        }

        if (tile === "B") {
          color = 0x8d6e63;
          this.blockedTiles.add(key);
        }

        this.add.rectangle(px, py, TILE, TILE, color)
          .setOrigin(0)
          .setStrokeStyle(1, 0x000000, 0.15);
      }
    }
  }

  createPlayer() {
    this.player = this.add.rectangle(2 * TILE + 16, 2 * TILE + 16, 22, 26, 0xfff176);
    this.player.setStrokeStyle(3, 0x3e2723);
    this.player.gridX = 2;
    this.player.gridY = 2;
    this.player.isMoving = false;
  }

  createUI() {
    this.infoText = this.add.text(12, 12, "Arrow keys / WASD to move", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#000000aa",
      padding: { x: 8, y: 6 }
    });

    this.infoText.setScrollFactor(0);
  }

  update(time, delta) {
    if (this.encounterCooldown > 0) this.encounterCooldown -= delta;

    if (!this.player.isMoving) {
      let dx = 0;
      let dy = 0;

      if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
      else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

      if (dx !== 0 || dy !== 0) this.tryMove(dx, dy);
    }
  }

  tryMove(dx, dy) {
    const nextX = this.player.gridX + dx;
    const nextY = this.player.gridY + dy;
    const nextKey = `${nextX},${nextY}`;

    if (this.blockedTiles.has(nextKey)) {
      this.flashMessage("Blocked!");
      return;
    }

    this.player.gridX = nextX;
    this.player.gridY = nextY;
    this.player.isMoving = true;

    this.tweens.add({
      targets: this.player,
      x: nextX * TILE + TILE / 2,
      y: nextY * TILE + TILE / 2,
      duration: 140,
      ease: "Linear",
      onComplete: () => {
        this.player.isMoving = false;
        this.checkGrassEncounter();
      }
    });
  }

  checkGrassEncounter() {
    const key = `${this.player.gridX},${this.player.gridY}`;

    if (this.grassTiles.has(key) && this.encounterCooldown <= 0) {
      if (Math.random() < 0.18) {
        this.encounterCooldown = 1200;
        this.scene.start("BattleScene");
      }
    }
  }

  flashMessage(message) {
    this.infoText.setText(message);

    this.time.delayedCall(900, () => {
      this.infoText.setText("Arrow keys / WASD to move");
    });
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  create() {
    this.playerHP = 30;
    this.enemyHP = 24;

    this.add.rectangle(0, 0, 640, 480, 0x1a1a2e).setOrigin(0);

    this.add.text(30, 24, "A wild Emberbun appeared!", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffffff"
    });

    this.enemy = this.add.rectangle(455, 135, 80, 80, 0xff6f61);
    this.enemy.setStrokeStyle(4, 0xffffff);

    this.hero = this.add.rectangle(170, 310, 90, 90, 0x7dd3fc);
    this.hero.setStrokeStyle(4, 0xffffff);

    this.enemyText = this.add.text(340, 210, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff"
    });

    this.playerText = this.add.text(60, 380, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff"
    });

    this.message = this.add.text(30, 420, "Choose: [F]ight or [R]un", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
      backgroundColor: "#000000aa",
      padding: { x: 10, y: 8 }
    });

    this.input.keyboard.on("keydown-F", () => this.fight());
    this.input.keyboard.on("keydown-R", () => this.run());

    this.updateHPText();
  }

  updateHPText() {
    this.enemyText.setText(`Emberbun HP: ${this.enemyHP}/24`);
    this.playerText.setText(`Sproutle HP: ${this.playerHP}/30`);
  }

  fight() {
    const playerDamage = Phaser.Math.Between(5, 10);
    this.enemyHP = Math.max(0, this.enemyHP - playerDamage);

    this.message.setText(`Sproutle attacked! ${playerDamage} damage!`);
    this.updateHPText();

    this.tweens.add({
      targets: this.enemy,
      x: this.enemy.x + 10,
      yoyo: true,
      duration: 60,
      repeat: 3
    });

    if (this.enemyHP <= 0) {
      this.time.delayedCall(700, () => {
        this.message.setText("Emberbun fainted! Returning to route...");
      });

      this.time.delayedCall(1600, () => {
        this.scene.start("GameScene");
      });

      return;
    }

    this.time.delayedCall(800, () => this.enemyTurn());
  }

  enemyTurn() {
    const enemyDamage = Phaser.Math.Between(3, 8);
    this.playerHP = Math.max(0, this.playerHP - enemyDamage);

    this.message.setText(`Emberbun tackled! ${enemyDamage} damage!`);
    this.updateHPText();

    this.tweens.add({
      targets: this.hero,
      x: this.hero.x - 10,
      yoyo: true,
      duration: 60,
      repeat: 3
    });

    if (this.playerHP <= 0) {
      this.time.delayedCall(900, () => {
        this.message.setText("Sproutle fainted! Returning to route...");
      });

      this.time.delayedCall(1900, () => {
        this.scene.start("GameScene");
      });
    }
  }

  run() {
    this.message.setText("You ran away safely!");

    this.time.delayedCall(900, () => {
      this.scene.start("GameScene");
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 640,
  height: 480,
  pixelArt: true,
  backgroundColor: "#000000",
  scene: [GameScene, BattleScene]
};

new Phaser.Game(config);
