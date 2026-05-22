const TILE_SIZE = 32;

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

const gameState = {
  playerX: 2,
  playerY: 2
};

class OverworldScene extends Phaser.Scene {
  constructor() {
    super("OverworldScene");
  }

  create() {
    this.blockedTiles = new Set();
    this.grassTiles = new Set();

    this.drawMap();
    this.createPlayer();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");

    this.playerMoving = false;
    this.encounterCooldown = false;

    this.cameras.main.setBounds(
      0,
      0,
      MAP[0].length * TILE_SIZE,
      MAP.length * TILE_SIZE
    );

    this.cameras.main.startFollow(this.player);
  }

  drawMap() {
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {

        const tile = MAP[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        let color = 0x66bb6a;

        const key = `${x},${y}`;

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

        this.add.rectangle(
          px,
          py,
          TILE_SIZE,
          TILE_SIZE,
          color
        )
        .setOrigin(0)
        .setStrokeStyle(1, 0x000000, 0.15);
      }
    }
  }

  createPlayer() {
    this.player = this.add.rectangle(
      gameState.playerX * TILE_SIZE + TILE_SIZE / 2,
      gameState.playerY * TILE_SIZE + TILE_SIZE / 2,
      22,
      26,
      0xfff176
    );

    this.player.setStrokeStyle(3, 0x3e2723);
  }

  createUI() {
    this.infoText = this.add.text(
      12,
      12,
      "Move: WASD or Arrow Keys",
      {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: {
          x: 8,
          y: 6
        }
      }
    );

    this.infoText.setScrollFactor(0);
  }

  update() {
    if (this.playerMoving) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      this.tryMove(dx, dy);
    }
  }

  tryMove(dx, dy) {

    const nextX = gameState.playerX + dx;
    const nextY = gameState.playerY + dy;

    const key = `${nextX},${nextY}`;

    if (this.blockedTiles.has(key)) {
      return;
    }

    gameState.playerX = nextX;
    gameState.playerY = nextY;

    this.playerMoving = true;

    this.tweens.add({
      targets: this.player,
      x: nextX * TILE_SIZE + TILE_SIZE / 2,
      y: nextY * TILE_SIZE + TILE_SIZE / 2,
      duration: 140,
      onComplete: () => {

        this.playerMoving = false;

        this.checkEncounter();
      }
    });
  }

  checkEncounter() {

    if (this.encounterCooldown) return;

    const key = `${gameState.playerX},${gameState.playerY}`;

    if (!this.grassTiles.has(key)) return;

    const roll = Math.random();

    if (roll < 0.18) {

      this.encounterCooldown = true;

      this.cameras.main.flash(300, 255, 255, 255);

      this.time.delayedCall(350, () => {

        this.scene.start("BattleScene");

      });

      this.time.delayedCall(1200, () => {

        this.encounterCooldown = false;

      });
    }
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  create() {

    this.playerHP = 30;
    this.enemyHP = 24;

    this.add.rectangle(
      0,
      0,
      640,
      480,
      0x1a1a2e
    ).setOrigin(0);

    this.add.text(
      30,
      24,
      "A wild Emberbun appeared!",
      {
        fontSize: "22px",
        color: "#ffffff"
      }
    );

    this.enemy = this.add.rectangle(
      470,
      150,
      90,
      90,
      0xff6f61
    );

    this.enemy.setStrokeStyle(4, 0xffffff);

    this.hero = this.add.rectangle(
      180,
      320,
      100,
      100,
      0x7dd3fc
    );

    this.hero.setStrokeStyle(4, 0xffffff);

    this.enemyText = this.add.text(
      350,
      240,
      "",
      {
        fontSize: "18px",
        color: "#ffffff"
      }
    );

    this.playerText = this.add.text(
      40,
      390,
      "",
      {
        fontSize: "18px",
        color: "#ffffff"
      }
    );

    this.messageText = this.add.text(
      30,
      430,
      "Press F to Fight or R to Run",
      {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: {
          x: 10,
          y: 8
        }
      }
    );

    this.updateText();

    this.input.keyboard.on("keydown-F", () => {
      this.playerAttack();
    });

    this.input.keyboard.on("keydown-R", () => {
      this.runAway();
    });
  }

  updateText() {
    this.enemyText.setText(`Emberbun HP: ${this.enemyHP}/24`);
    this.playerText.setText(`Sproutle HP: ${this.playerHP}/30`);
  }

  playerAttack() {

    const damage = Phaser.Math.Between(5, 10);

    this.enemyHP -= damage;

    if (this.enemyHP < 0) {
      this.enemyHP = 0;
    }

    this.updateText();

    this.messageText.setText(
      `Sproutle dealt ${damage} damage!`
    );

    this.tweens.add({
      targets: this.enemy,
      x: this.enemy.x + 12,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    if (this.enemyHP <= 0) {

      this.time.delayedCall(900, () => {

        this.messageText.setText(
          "Enemy defeated!"
        );

      });

      this.time.delayedCall(1700, () => {

        this.scene.start("OverworldScene");

      });

      return;
    }

    this.time.delayedCall(900, () => {
      this.enemyAttack();
    });
  }

  enemyAttack() {

    const damage = Phaser.Math.Between(3, 7);

    this.playerHP -= damage;

    if (this.playerHP < 0) {
      this.playerHP = 0;
    }

    this.updateText();

    this.messageText.setText(
      `Emberbun dealt ${damage} damage!`
    );

    this.tweens.add({
      targets: this.hero,
      x: this.hero.x - 12,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    if (this.playerHP <= 0) {

      this.time.delayedCall(900, () => {

        this.messageText.setText(
          "You fainted!"
        );

      });

      this.time.delayedCall(1700, () => {

        this.scene.start("OverworldScene");

      });
    }
  }

  runAway() {

    this.messageText.setText(
      "You ran away safely!"
    );

    this.time.delayedCall(1000, () => {

      this.scene.start("OverworldScene");

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
  scene: [
    OverworldScene,
    BattleScene
  ]
};

new Phaser.Game(config);
