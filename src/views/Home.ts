import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonInput,
  IonGrid,
  IonCol,
  IonRow,
  IonLabel,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  // IonCardSubtitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  alertController,
  IonSpinner,
} from "@ionic/vue";
import { defineComponent } from "vue";
import * as PIXI from "pixi.js";
import { Layer, Group, Stage } from "@pixi/layers";
import * as convert from "color-convert";
import * as colorString from "color-string";
import { PeerContainer, PeerContainerArray } from "./PeerContainer";
import { countClassNamePrefix } from "./const";
import { DebugView } from "./DebugView";
import { Point } from "@/matrix/Point";
import {
  playSkipForwardCircleOutline,
  playCircleOutline,
  stopOutline,
  stopCircleOutline,
  playForwardCircleOutline,
} from "ionicons/icons";
import { MATRIX_TYPE } from "./matrixBuilder";

type $MatrixGenerateOptions = {
  edgeSize: number;
  maxConnectRate: number | string;
  minConnectRate: number | string;
  boardcastMatrixType: MATRIX_TYPE;
};
const BUILDIN_MATRIX_GENERATE_OPTIONS_LIST = [
  {
    label: "Default",
    options: {
      edgeSize: 15,
      maxConnectRate: 50,
      minConnectRate: 10,
      boardcastMatrixType: MATRIX_TYPE.Linear,
    } as $MatrixGenerateOptions,
  },
];

export class ViewPeer {
  constructor(
    readonly index: number,
    public readonly viewBound: ViewBound,
    public readonly x: number,
    public readonly y: number,
    public readonly edgeSize: number
  ) {}
  readonly connectedPeers = new Map<number, ViewPeer>();
  connectedPeerPath() {
    let d = "";
    for (const cpeer of this.connectedPeers.values()) {
      d += this.viewBound.p2pPath(cpeer.viewBound) + " ";
    }
    return d;
  }
}

class ViewBound {
  constructor(
    public left: number,
    public top: number,
    public width: number,
    public height: number
  ) {}
  get right() {
    return this.left + this.width;
  }
  get bottom() {
    return this.top + this.height;
  }
  get centerX() {
    return this.left + this.width / 2;
  }
  get centerY() {
    return this.top + this.height / 2;
  }
  p2pPath(target: ViewBound) {
    return `M ${this.centerX} ${this.centerY} L ${target.centerX} ${target.centerY}`;
  }
  get centerXY() {
    return [this.centerX, this.centerY] as const;
  }
}

class LogicData {
  readonly id = Math.random();
  canvasCtrl?: {
    allPc: PeerContainerArray;
    debugView: DebugView;
  };
  currentBoardcastTask?: {
    boardcastMap: Map<PeerContainer, BM.MatrixBroadcast<Point>>;
    startPc: PeerContainer;
    endPc: PeerContainer;
    finishedPc: Set<PeerContainer>;
    stepCount: number;
  };
}

export default defineComponent({
  name: "Home",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonItem,
    IonInput,
    IonGrid,
    IonCol,
    IonRow,
    IonLabel,
    IonButton,
    IonButtons,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    // IonCardSubtitle,
    IonCardContent,
    IonSelect,
    IonSelectOption,
    IonSpinner,
  },
  setup() {
    return {
      icon: {
        playSkipForwardCircleOutline,
        playCircleOutline,
        stopOutline,
        stopCircleOutline,
        playForwardCircleOutline,
      },
      logicData: new LogicData(),
      log_uid: 0,
    };
  },
  data() {
    return {
      title: "?????????????????????????????????",
      matrixGenOptions: {
        ...BUILDIN_MATRIX_GENERATE_OPTIONS_LIST[0].options,
        ...JSON.parse(localStorage.getItem("matrixGenOptions") || "{}"),
      } as $MatrixGenerateOptions,
      peerMatrix: [] as ViewPeer[],
      canvasViewBox: {
        width: 1000,
        height: 1000,
      },
      waitting: {
        generateNetMesh: false,
        stepInBroadcast: false,
      },
      allBoardcastMatrixType: Object.entries(MATRIX_TYPE),
      boardcastReady: false,
      boardcastStepCount: 0,
      boardcastCount: 1, /// ?????????????????????????????????????????????1
      boardcastLogs: [] as {
        uid: number;
        time: string;
        type: string;
        log: string;
      }[],
      boardcastDone: false,
      autoBoardcastStepIn: false,
      /**???????????????????????????????????? */
      get canStepInBroadcast() {
        return (
          this.boardcastDone ||
          this.autoBoardcastStepIn ||
          this.waitting.stepInBroadcast
        );
      },
    };
  },
  created() {
    Reflect.set(self, "ii", this);
    this.$watch(
      "matrixGenOptions",
      () => {
        const matrixGenOptionsJson = JSON.stringify(this.matrixGenOptions);
        localStorage.setItem("matrixGenOptions", matrixGenOptionsJson);
        return matrixGenOptionsJson;
      },
      { deep: true }
    );

    this.generateNetMesh();
  },
  mounted() {
    const tryRender = () => {
      const { canvas } = this.$refs;
      if (canvas instanceof HTMLCanvasElement) {
        const styleMap = getComputedStyle(canvas);
        if (styleMap.getPropertyValue("--ion-color-primary")) {
          this.canvasRender(canvas);
          return;
        }
      }
      requestAnimationFrame(tryRender);
    };
    tryRender();
  },
  methods: {
    async generateNetMesh() {
      if (this.waitting.generateNetMesh) {
        return;
      }
      try {
        this.waitting.generateNetMesh = true;
        await this._generateNetMesh();
      } finally {
        this.waitting.generateNetMesh = false;
      }
    },
    async _generateNetMesh() {
      // ????????????????????????????????????,???????????????,???????????????
      this.abortBroadcast();

      const _st = performance.now();
      const peerMatrix: ViewPeer[] = [];
      const options = this.$data.matrixGenOptions;
      /// ????????????
      {
        const { edgeSize } = options;
        if (edgeSize * edgeSize > 1000) {
          if (
            false ===
            (await this.confirm(
              "??????????????????",
              `????????????${edgeSize *
                edgeSize}????????????????????????????????????????????????????????????`
            ))
          ) {
            return false;
          }
        }
        /**view port width */
        const V_W = this.$data.canvasViewBox.width;
        /**view port height */
        const V_H = this.$data.canvasViewBox.height;
        const GRID_SPAN_X = Math.min(
          V_W / 5,
          Math.max(V_W / edgeSize / 3, V_W / 500)
        );
        const GRID_SPAN_Y = Math.min(
          V_H / 5,
          Math.max(V_H / edgeSize / 3, V_H / 500)
        );
        const UNIT_W = (V_W - GRID_SPAN_X * (edgeSize - 1)) / edgeSize;
        const UNIT_H = (V_H - GRID_SPAN_Y * (edgeSize - 1)) / edgeSize;
        const UNIT_LEFT = UNIT_W + GRID_SPAN_X;
        const UNIT_TOP = UNIT_H + GRID_SPAN_Y;

        for (let y = 0; y < edgeSize; y++) {
          for (let x = 0; x < edgeSize; x++) {
            const index = y * edgeSize + x;
            peerMatrix[index] = new ViewPeer(
              index,
              new ViewBound(UNIT_LEFT * x, UNIT_TOP * y, UNIT_W, UNIT_H),
              x,
              y,
              edgeSize
            );
          }
        }
      }
      /// ????????????
      {
        const MAX_CONNECT_COUNT = Math.ceil(
          (+options.maxConnectRate / 100) * (peerMatrix.length - 1)
        );
        const MIN_CONNECT_COUNT = Math.floor(
          (+options.minConnectRate / 100) * (peerMatrix.length - 1)
        );

        for (let i = 0; i < peerMatrix.length; ++i) {
          const peer = peerMatrix[i];
          const TO_CONNECT_COUNT = Math.round(
            MIN_CONNECT_COUNT +
              Math.random() * (MAX_CONNECT_COUNT - MIN_CONNECT_COUNT)
          );

          /// ?????????????????????????????????
          if (peer.connectedPeers.size >= TO_CONNECT_COUNT) {
            continue;
          }
          /// ??????????????????
          /**????????????????????????????????????????????????????????????????????????????????????????????? ???????????????*/
          const randomPeerList = peerMatrix.filter((cpeer) => {
            if (cpeer === peer) {
              return false;
            }
            // ???????????????????????????
            if (cpeer.connectedPeers.size >= MAX_CONNECT_COUNT) {
              return false;
            }
            // ???????????????????????????
            if (cpeer.connectedPeers.has(i)) {
              return false;
            }
            return true;
          });

          while (peer.connectedPeers.size < TO_CONNECT_COUNT) {
            /// ???????????????????????????
            const randomPeer = randomPeerList.splice(
              Math.floor(Math.random() * randomPeerList.length),
              1
            )[0]; //.shift();
            if (!randomPeer) {
              if (peer.connectedPeers.size < MIN_CONNECT_COUNT) {
                // throw new Error("??????????????????, ??????????????????~~");
                this.alert(
                  "??????????????????",
                  "??????????????????, ???????????????????????????????????????????????????????????????????????????"
                );
                return false;
              }
              break;
            }
            /// ????????????
            peer.connectedPeers.set(randomPeer.index, randomPeer);
            randomPeer.connectedPeers.set(peer.index, peer);
          }
        }
      }
      this.$data.peerMatrix = peerMatrix;
      console.log((performance.now() - _st).toFixed(4) + "ms");
      return true;
    },
    canvasRender(canvas: HTMLCanvasElement) {
      const _st = performance.now();
      const { peerMatrix, canvasViewBox, matrixGenOptions } = this.$data;
      PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
      const app = new PIXI.Application({
        view: canvas,
        width: canvasViewBox.width,
        height: canvasViewBox.height,
        resolution: 1,
        backgroundAlpha: 0,
        antialias: true,
      });
      app.ticker.maxFPS = 30;
      const oldApp = Reflect.get(self, "app");
      if (oldApp instanceof PIXI.Application) {
        oldApp.destroy();
      }
      Reflect.set(self, "app", app);
      // const rootContainer =  new Stage();
      // app.stage.addChild(rootContainer);
      const rootContainer = (app.stage = new Stage());

      const styleMap = getComputedStyle(canvas);
      const parseColor = (value: string) => {
        let rgba: colorString.Color = [0, 0, 0, 1];
        const colorDesp = colorString.get(value);
        if (!colorDesp) {
          return rgba;
        }
        const colorValue = colorDesp.value;
        if (colorDesp.model === "rgb") {
          rgba = colorValue;
        } else if (colorDesp.model === "hsl") {
          rgba = [
            ...convert.hsl.rgb([colorValue[0], colorValue[1], colorValue[2]]),
            colorValue[3],
          ];
        } else if (colorDesp.model === "hwb") {
          rgba = [
            ...convert.hwb.rgb([colorValue[0], colorValue[1], colorValue[2]]),
            colorValue[3],
          ];
        }
        return rgba;
      };
      const colorToFill = (color: colorString.Color) => {
        return (color[0] << 16) + (color[1] << 8) + color[2];
      };

      const PEER_VIEW_FILL = colorToFill(
        parseColor(
          styleMap.getPropertyValue("--ion-color-primary").trim() || "#f0f"
        )
      );
      const MESH_STYLE = {
        FILL: colorToFill(
          parseColor(
            styleMap.getPropertyPriority("--ion-color-secondary").trim() ||
              "#d0d"
          )
        ),
        HOVER_FILL: 0xffffff,

        ALPHA: 0.2,
        HOVER_ALPHA: 0.5,
      };

      const peerGroup = new Group(2, false);
      const meshGroup = new Group(1, false);
      const topMeshGroup = new Group(4, false);
      const topPeerGroup = new Group(3, false);
      const debugGroup = new Group(6, false);
      rootContainer.sortableChildren = true;
      rootContainer.addChild(new Layer(peerGroup));
      rootContainer.addChild(new Layer(meshGroup));
      rootContainer.addChild(new Layer(topMeshGroup));
      rootContainer.addChild(new Layer(topPeerGroup));
      rootContainer.addChild(new Layer(debugGroup));

      const allPeerContainerList = new PeerContainerArray();
      const peerContainerOpts = {
        allPeerContainerList,
        PEER_VIEW_FILL,
        MESH_STYLE,
        peerGroup,
        meshGroup,
        topPeerGroup,
        topMeshGroup,
      };
      for (const peer of peerMatrix) {
        const peerContainer = new PeerContainer(peer, peerContainerOpts);
        rootContainer.addChild(peerContainer);
      }
      const debugView = new DebugView(app);
      debugView.parentGroup = debugGroup;
      rootContainer.addChild(debugView);

      // app.ticker.minFPS = 0;
      app.ticker.maxFPS = 30;
      console.log(
        PIXI.settings.TARGET_FPMS,
        (performance.now() - _st).toFixed(4) + "ms"
      );

      this.logicData.canvasCtrl = {
        allPc: allPeerContainerList,
        debugView,
      };
      return new Promise((cb) => requestAnimationFrame(cb));
    },
    async generateNetMeshAndReander() {
      if (this.waitting.generateNetMesh) {
        return;
      }
      try {
        this.waitting.generateNetMesh = true;
        if (await this._generateNetMesh()) {
          await this.canvasRender(this.$refs.canvas as HTMLCanvasElement);
        }
      } finally {
        this.waitting.generateNetMesh = false;
      }
    },
    async alert(title: string, message: string) {
      const alert = await alertController.create({
        header: title,
        // subHeader: 'Subtitle',
        message: message,
        buttons: ["??????"],
      });
      await alert.present();
    },
    async confirm(title: string, message: string) {
      const alert = await alertController.create({
        header: title,
        // subHeader: 'Subtitle',
        message: message,
        buttons: [
          { text: "??????", role: "cancel" },
          { text: "??????", role: "ok" },
        ],
      });
      await alert.present();
      return alert.onDidDismiss().then((value) => {
        return value.role === "ok";
      });
    },
    async prepareBroadcast() {
      const alert = (message: string) =>
        this.alert("????????????????????????", message);
      const { logicData } = this;
      if (!logicData.canvasCtrl) {
        alert("?????????????????????");
        return;
      }
      const allPc = logicData.canvasCtrl.allPc;
      const selectedPeerContainers = allPc.getPeerContainersByClassName(
        "active"
      );
      if (selectedPeerContainers.size < 2) {
        alert("???????????????????????????????????????????????????");
        return;
      }
      const [startPc, endPc] = [...selectedPeerContainers];
      const data = new Date().toLocaleTimeString();
      const boardcast = await startPc.doBoardcast(
        startPc,
        endPc,
        data,
        this.matrixGenOptions.boardcastMatrixType
      );
      startPc.toPoint().onData.emit(data);

      logicData.currentBoardcastTask = {
        finishedPc: new Set(),
        startPc,
        endPc,
        boardcastMap: new Map([[startPc, boardcast]]),
        stepCount: 0,
      };
      this.$data.boardcastReady = true;
      this.$data.boardcastStepCount = 0;
      this.$data.boardcastCount = 1;
      // this.$data.boardcastLogs = [];

      // boardcast.getNextPoint();
    },
    appendBoardcastLogs(log: string, type = "info") {
      this.boardcastLogs.unshift({
        uid: this.log_uid++,
        time: new Date().toTimeString().split(" ", 1)[0],
        type,
        log,
      });
      if (this.boardcastLogs.length > 1000) {
        this.boardcastLogs.length = 1000;
      }
    },
    async stepInBroadcast() {
      try {
        this.waitting.stepInBroadcast = true;
        await this._stepInBroadcast();
      } finally {
        this.waitting.stepInBroadcast = false;
      }
    },
    async _stepInBroadcast() {
      const alert = (message: string) =>
        this.alert("????????????????????????", message);
      const { logicData } = this;
      if (!logicData.canvasCtrl || !logicData.currentBoardcastTask) {
        alert("????????????????????????");
        return;
      }
      const { boardcastMatrixType } = this.matrixGenOptions;
      const { currentBoardcastTask, canvasCtrl } = logicData;
      const { boardcastMap, finishedPc, startPc, endPc } = currentBoardcastTask;
      const { allPc, debugView } = canvasCtrl;

      const STEP = ++this.$data.boardcastStepCount;
      let size = boardcastMap.size;
      debugView.clear();
      let loopCount = 0;
      for (const [fromPc, fromBoardcast] of boardcastMap) {
        if (finishedPc.has(fromPc)) {
          continue;
        }
        const fromPoint = fromPc.toPoint();
        const toPoint = await fromBoardcast.getNextPoint();
        if (!toPoint) {
          finishedPc.add(fromPc);
          continue;
        }
        /// ????????????
        toPoint.onData.emit(fromBoardcast.data);

        /// ???????????????????????????
        const toPc = allPc[toPoint.toNumber()];
        debugView.drawAniDashedLine(
          fromPc.peer.viewBound.centerXY,
          toPc.peer.viewBound.centerXY
        );

        /// ??????
        let toBoardcast = boardcastMap.get(toPc);
        if (!toBoardcast) {
          toBoardcast = await toPc.doBoardcast(
            startPc,
            endPc,
            fromBoardcast.data,
            boardcastMatrixType
          );
          boardcastMap.set(toPc, toBoardcast);
        }
        toBoardcast.resolvePoint(fromPoint);

        if (boardcastMap.size !== allPc.length) {
          this.$data.boardcastCount++;
          loopCount++;
        }
        /// ???????????????????????????????????????????????????,????????????????????????????????????????????????????????????????????????
        if (--size === 0) {
          break;
        }
      }

      let boardcastDone = false;
      if (boardcastMap.size === allPc.length || loopCount === 0) {
        boardcastDone = this.$data.boardcastDone = true;
      }

      const progress = boardcastMap.size / allPc.length;
      let prefix = "";
      if (boardcastDone) {
        const {
          edgeSize,
          minConnectRate,
          maxConnectRate,
        } = this.matrixGenOptions;
        prefix = `???(${edgeSize}???${edgeSize})???????????????????????????${(+minConnectRate).toFixed(
          2
        )}%~${(+maxConnectRate).toFixed(
          2
        )}%???????????????????????????[${boardcastMatrixType}]???`;
      }
      this.appendBoardcastLogs(
        `${prefix}?????????${STEP}????????????${(progress * 100).toFixed(
          2
        )}%????????????????????????${(
          (boardcastMap.size / this.$data.boardcastCount) *
          100
        ).toFixed(2)}%`,
        boardcastDone ? "success" : "info"
      );
    },
    startAutoBoardcastStepIn() {
      this.autoBoardcastStepIn = true;
      const auto = async () => {
        await this.stepInBroadcast();
        if (this.boardcastDone || !this.autoBoardcastStepIn) {
          this.stopAutoBoardcastStepIn();
          return;
        }
        requestAnimationFrame(auto);
      };
      auto();
    },
    stopAutoBoardcastStepIn() {
      this.autoBoardcastStepIn = false;
    },
    abortBroadcast() {
      const { logicData } = this;
      if (!logicData.canvasCtrl) {
        return;
      }
      for (const pc of logicData.canvasCtrl.allPc) {
        pc.classList.remove("boardcasted");
        const ccn = pc.classList.find((c) =>
          c.startsWith(countClassNamePrefix)
        );
        if (ccn) {
          pc.classList.remove(ccn);
        }
      }
      logicData.currentBoardcastTask = undefined;
      this.$data.boardcastReady = false;
      this.$data.boardcastStepCount = 0;
      this.$data.boardcastCount = 1;
      this.$data.boardcastDone = false;
      this.$data.autoBoardcastStepIn = false;
      logicData.canvasCtrl.debugView.clear();
    },
  },
});
