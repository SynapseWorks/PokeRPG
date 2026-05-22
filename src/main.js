// Monster League RPG - v7
// Battle move system added

const TILE_SIZE = 32;

const MOVES = {
  leafJab: {
    name: "Leaf Jab",
    type: "Leaf",
    power: 8,
    accuracy: 0.95
  },

  vineWhip: {
    name: "Vine Whip",
    type: "Leaf",
    power: 11,
    accuracy: 0.90
  },

  ember: {
    name: "Ember",
    type: "Flame",
    power: 9,
    accuracy: 0.95
  },

  flameBurst: {
    name: "Flame Burst",
    type: "Flame",
    power: 12,
    accuracy: 0.85
  },

  splash: {
    name: "Splash Jet",
    type: "Water",
    power: 8,
    accuracy: 0.96
  },

  bubbleShot: {
    name: "Bubble Shot",
    type: "Water",
    power: 11,
    accuracy: 0.90
  },

  tackle: {
    name: "Tackle",
    type: "Normal",
    power: 7,
    accuracy: 0.98
  }
};

const STARTERS = [
  {
    id: "sproutle",
    name: "Sproutle",
    type: "Leaf",
    color: 0x7ddf64,
    maxHP: 32,
    moves: ["leafJab", "vineWhip"],
    level: 5
  },

  {
    id: "emberbun",
    name: "Emberbun",
    type: "Flame",
    color: 0xff6f61,
    maxHP: 28,
    moves: ["ember", "flameBurst"],
    level: 5
  },

  {
    id: "bubblit",
    name: "Bubblit",
    type: "Water",
    color: 0x66ccff,
    maxHP: 35,
    moves: ["splash", "bubbleShot"],
    level: 5
  }
];

const WILD_MONSTERS = [
  {
    name: "Mossling",
    type: "Leaf",
    color: 0x2ecc71,
    maxHP: 24,
    level: 3,
    moves: ["leafJab", "tackle"]
  },

  {
    name: "Ashkit",
    type: "Flame",
    color: 0xff9f43,
    maxHP: 22,
    level: 4,
    moves: ["ember", "tackle"]
  },

  {
    name: "Puddlefin",
    type: "Water",
    color: 0x48dbfb,
    maxHP: 26,
    level: 3,
    moves: ["splash", "tackle"]
  }
];

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
  playerY: 2,
  starter: null
};

function saveGame() {
  localStorage.setItem("monsterLeagueSave", JSON.stringify(gameState));
}

function loadGame() {
  const save = localStorage.getItem("monsterLeagueSave");

  if (!save) return;

  Object.assign(gameState, JSON.parse(save));
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    loadGame();

    if (gameState.starter) {
      this.scene.start("OverworldScene");
    } else {
      this.scene.start("StarterScene");
    }
  }
}

class StarterScene extends Phaser.Scene {
  constructor() {
    super("StarterScene");
  }

  create() {
    this.add.rectangle(0, 0, 640, 480, 0x101820).setOrigin(0);

    this.add.text(45, 35, "Choose Your First Creature", {
      fontSize: "30px",
      color: "#ffffff",
      fontFamily: "monospace"
    });

    STARTERS.forEach((starter, index) => {
      const x = 130 + index * 190;
      const y = 210;

      const card = this.add.rectangle(x, y, 145, 190, 0x1f2937)
        .setStrokeStyle(3, starter.color)
        .setInteractive({ useHandCursor: true });

      this.add.rectangle(x, y - 45, 70, 70, starter.color)
        .setStrokeStyle(4, 0xffffff);

      this.add.text(x, y + 10, starter.name, {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "monospace"
      }).setOrigin(0.5);

      this.add.text(x, y + 38, starter.type, {
        fontSize: "15px",
        color: "#dddddd",
        fontFamily: "monospace"
      }).setOrigin(0.5);

      card.on("pointerdown", () => {
        gameState.starter = {
          ...starter,
          currentHP: starter.maxHP,
          xp: 0,
          xpToNext: 20
        };

        saveGame();
        this.scene.start("OverworldScene");
      });
    });
  }
}

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

    this.playerMoving = false;
  }

  drawMap() {
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {

        const tile = MAP[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        const key = `${x},${y}`;

        let color = 0x69b96a;

        if (tile === "W") {
          color = 0x246b9f;
          this.blockedTiles.add(key);
        }

        if (tile === "G") {
          color = 0x2e7d32;
          this.grassTiles.add(key);
        }

        if (tile === "T") {
          color = 0x145a32;
          this.blockedTiles.add(key);
        }

        if (tile === "B") {
          color = 0xb06f3c;
          this.blockedTiles.add(key);
        }

        this.add.rectangle(
          px,
          py,
          TILE_SIZE,
          TILE_SIZE,
          color
        ).setOrigin(0);
      }
    }
  }

  createPlayer() {
    this.player = this.add.rectangle(
      gameState.playerX * TILE_SIZE + 16,
      gameState.playerY * TILE_SIZE + 16,
      18,
      22,
      0xfff176
    ).setStrokeStyle(2, 0x000000);
  }

  createUI() {
    this.info = this.add.text(
      12,
      12,
      `${gameState.starter.name} Lv.${gameState.starter.level} HP ${gameState.starter.currentHP}/${gameState.starter.maxHP}`,
      {
        fontSize: "16px",
        backgroundColor: "#000000bb",
        color: "#ffffff",
        padding: { x: 8, y: 5 },
        fontFamily: "monospace"
      }
    );
  }

  update() {
    if (this.playerMoving) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      this.tryMove(dx, dy);
    }
  }

  tryMove(dx, dy) {
    const nextX = gameState.playerX + dx;
    const nextY = gameState.playerY + dy;

    const key = `${nextX},${nextY}`;

    if (this.blockedTiles.has(key)) return;

    gameState.playerX = nextX;
    gameState.playerY = nextY;

    saveGame();

    this.playerMoving = true;

    this.tweens.add({
      targets: this.player,
      x: nextX * TILE_SIZE + 16,
      y: nextY * TILE_SIZE + 16,
      duration: 120,
      onComplete: () => {
        this.playerMoving = false;
        this.checkEncounter();
      }
    });
  }

  checkEncounter() {
    const key = `${gameState.playerX},${gameState.playerY}`;

    if (!this.grassTiles.has(key)) return;

    if (Math.random() < 0.18) {
      this.scene.start("BattleScene");
    }
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  create() {
    this.playerMonster = gameState.starter;
    this.enemyMonster = {
      ...Phaser.Utils.Array.GetRandom(WILD_MONSTERS)
    };

    this.playerHP = this.playerMonster.currentHP;
    this.enemyHP = this.enemyMonster.maxHP;

    this.turnLocked = false;

    this.add.rectangle(0, 0, 640, 480, 0x1a1a2e).setOrigin(0);

    this.add.text(
      28,
      20,
      `Wild ${this.enemyMonster.name}!`,
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "monospace"
      }
    );

    this.enemySprite = this.add.rectangle(
      470,
      150,
      90,
      90,
      this.enemyMonster.color
    ).setStrokeStyle(4, 0xffffff);

    this.playerSprite = this.add.rectangle(
      180,
      320,
      100,
      100,
      this.playerMonster.color
    ).setStrokeStyle(4, 0xffffff);

    this.enemyText = this.add.text(
      340,
      240,
      "",
      {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 6 },
        fontFamily: "monospace"
      }
    );

    this.playerText = this.add.text(
      35,
      360,
      "",
      {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 6 },
        fontFamily: "monospace"
      }
    );

    this.messageText = this.add.text(
      25,
      410,
      "Choose a move:",
      {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "monospace"
      }
    );

    this.moveButtons = [];

    this.createMoveButtons();
    this.updateUI();
  }

  createMoveButtons() {
    this.playerMonster.moves.forEach((moveKey, index) => {

      const move = MOVES[moveKey];

      const x = 360 + (index % 2) * 130;
      const y = 390 + Math.floor(index / 2) * 40;

      const button = this.add.rectangle(
        x,
        y,
        120,
        34,
        0xffffff
      )
      .setStrokeStyle(2, 0x111111)
      .setInteractive({ useHandCursor: true });

      const label = this.add.text(
        x,
        y,
        move.name,
        {
          fontSize: "14px",
          color: "#111111",
          fontFamily: "monospace"
        }
      ).setOrigin(0.5);

      button.on("pointerdown", () => {
        this.usePlayerMove(moveKey);
      });

      this.moveButtons.push(button, label);
    });
  }

  updateUI() {
    this.enemyText.setText(
      `${this.enemyMonster.name} Lv.${this.enemyMonster.level}\nHP ${this.enemyHP}/${this.enemyMonster.maxHP}`
    );

    this.playerText.setText(
      `${this.playerMonster.name} Lv.${this.playerMonster.level}\nHP ${this.playerHP}/${this.playerMonster.maxHP}`
    );
  }

  usePlayerMove(moveKey) {

    if (this.turnLocked) return;

    this.turnLocked = true;

    const move = MOVES[moveKey];

    if (Math.random() > move.accuracy) {

      this.messageText.setText(
        `${this.playerMonster.name}'s ${move.name} missed!`
      );

      this.time.delayedCall(900, () => {
        this.enemyTurn();
      });

      return;
    }

    const damage =
      move.power +
      Phaser.Math.Between(0, 4) +
      Math.floor(this.playerMonster.level / 2);

    this.enemyHP = Math.max(0, this.enemyHP - damage);

    this.messageText.setText(
      `${this.playerMonster.name} used ${move.name}!`
    );

    this.tweens.add({
      targets: this.enemySprite,
      x: this.enemySprite.x + 12,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    this.updateUI();

    if (this.enemyHP <= 0) {

      const xpGain = Phaser.Math.Between(8, 14);

      this.time.delayedCall(800, () => {

        this.messageText.setText(
          `${this.enemyMonster.name} fainted! +${xpGain} XP`
        );

        this.playerMonster.xp += xpGain;

        if (this.playerMonster.xp >= this.playerMonster.xpToNext) {

          this.playerMonster.xp -= this.playerMonster.xpToNext;
          this.playerMonster.level += 1;
          this.playerMonster.xpToNext =
            Math.floor(this.playerMonster.xpToNext * 1.4);

          this.playerMonster.maxHP += 5;
          this.playerMonster.currentHP =
            this.playerMonster.maxHP;

          this.time.delayedCall(1000, () => {

            this.messageText.setText(
              `${this.playerMonster.name} grew to Lv.${this.playerMonster.level}!`
            );

          });
        }

        saveGame();
      });

      this.time.delayedCall(2600, () => {
        this.scene.start("OverworldScene");
      });

      return;
    }

    this.time.delayedCall(900, () => {
      this.enemyTurn();
    });
  }

  enemyTurn() {

    const moveKey =
      Phaser.Utils.Array.GetRandom(this.enemyMonster.moves);

    const move = MOVES[moveKey];

    if (Math.random() > move.accuracy) {

      this.messageText.setText(
        `${this.enemyMonster.name}'s ${move.name} missed!`
      );

      this.time.delayedCall(1000, () => {
        this.turnLocked = false;
        this.messageText.setText("Choose a move:");
      });

      return;
    }

    const damage =
      move.power +
      Phaser.Math.Between(0, 3);

    this.playerHP = Math.max(0, this.playerHP - damage);

    this.playerMonster.currentHP = this.playerHP;

    saveGame();

    this.messageText.setText(
      `${this.enemyMonster.name} used ${move.name}!`
    );

    this.tweens.add({
      targets: this.playerSprite,
      x: this.playerSprite.x - 12,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    this.updateUI();

    if (this.playerHP <= 0) {

      this.time.delayedCall(900, () => {

        this.messageText.setText(
          `${this.playerMonster.name} fainted!`
        );

      });

      this.time.delayedCall(2000, () => {

        this.playerMonster.currentHP =
          this.playerMonster.maxHP;

        gameState.playerX = 2;
        gameState.playerY = 2;

        saveGame();

        this.scene.start("OverworldScene");
      });

      return;
    }

    this.time.delayedCall(1000, () => {
      this.turnLocked = false;
      this.messageText.setText("Choose a move:");
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
    BootScene,
    StarterScene,
    OverworldScene,
    BattleScene
  ]
};

new Phaser.Game(config);
