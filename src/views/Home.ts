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
} from "@ionic/vue";
import { defineComponent } from "vue";
import * as PIXI from "pixi.js";
import { Layer, Group, Stage } from "@pixi/layers";
import * as convert from "color-convert";
import * as colorString from "color-string";
import {
  MATRIX_TYPE,
  PeerContainer,
  PeerContainerArray,
} from "./PeerContainer";
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

type $MatrixGenerateOptions = {
  edgeSize: number;
  maxConnectRate: number;
  minConnectRate: number;
};
const BUILDIN_MATRIX_GENERATE_OPTIONS_LIST = [
  {
    label: "Default",
    options: {
      edgeSize: 15,
      maxConnectRate: 50,
      minConnectRate: 10,
    } as $MatrixGenerateOptions,
  },
  {
    label: "Default",
    options: {
      edgeSize: 20,
      maxConnectRate: 5,
      minConnectRate: 2,
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

/**洗牌算法
 * @param chaos 混乱系数N意味着洗牌N次
 */
function randomArray<T>(arr: T[], chaos = Math.sqrt(arr.length)) {
  const len = arr.length;
  for (let i = 0; i < chaos; ++i) {
    const splitIndex = Math.floor(Math.random() * len);
    // 切牌, 等同于 arr.splice(0, 0, ...arr.slice(splitIndex));
    arr = arr
      .slice(splitIndex)
      .reverse()
      .concat(arr);
    arr.length = len;
  }
  return arr;
}
const logicData = {
  canvasCtrl: undefined as
    | {
        allPc: PeerContainerArray;
        debugView: DebugView;
      }
    | undefined,
  currentBoardcastTask: undefined as
    | {
        boardcastMap: Map<PeerContainer, BM.MatrixBroadcast<Point>>;
        startPc: PeerContainer;
        endPc: PeerContainer;
        finishedPc: Set<PeerContainer>;
        stepCount: number;
      }
    | undefined,
};

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
    };
  },
  data() {
    return {
      title: "矩阵广播效率指标模拟器",
      matrixGenOptions: {
        ...BUILDIN_MATRIX_GENERATE_OPTIONS_LIST[0].options,
      },
      peerMatrix: [] as ViewPeer[],
      canvasViewBox: {
        width: 1000,
        height: 1000,
      },
      boardcastMatrixType: MATRIX_TYPE.Linear,
      allBoardcastMatrixType: Object.entries(MATRIX_TYPE),
      boardcastReady: false,
      boardcastStepCount: 0,
      boardcastCount: 1, /// 广播次数，包括起点，所以默认是1
      boardcastLogs: [] as { time: string; type: string; log: string }[],
      boardcastDone: false,
      autoBoardcastStepIn: false,
      /**可否点击“广播步进”按钮 */
      get canStepInBroadcast() {
        return this.boardcastDone || this.autoBoardcastStepIn;
      },
    };
  },
  created() {
    Reflect.set(self, "ii", this);
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
    generateNetMesh() {
      // 如果现在有在进行广播任务,先进行中断,再重新生成
      this.abortBroadcast();

      const _st = performance.now();
      const peerMatrix: ViewPeer[] = [];
      const options = this.$data.matrixGenOptions;
      /// 构建节点
      {
        const { edgeSize } = options;
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
      /// 节点互联
      {
        const MAX_CONNECT_COUNT = Math.ceil(
          (options.maxConnectRate / 100) * (peerMatrix.length - 1)
        );
        const MIN_CONNECT_COUNT = Math.floor(
          (options.minConnectRate / 100) * (peerMatrix.length - 1)
        );

        for (let i = 0; i < peerMatrix.length; ++i) {
          const peer = peerMatrix[i];
          const TO_CONNECT_COUNT = Math.round(
            MIN_CONNECT_COUNT +
              Math.random() * (MAX_CONNECT_COUNT - MIN_CONNECT_COUNT)
          );

          /// 被动连接的数量已经够了
          if (peer.connectedPeers.size >= TO_CONNECT_COUNT) {
            continue;
          }
          /// 开始主动连接
          /**对除了自己以外的节点、还能继续连接的节点、自己没与之互联的节点 都进行洗牌*/
          const randomPeerList = peerMatrix.filter((cpeer) => {
            if (cpeer === peer) {
              return false;
            }
            // 这个节点已经连满了
            if (cpeer.connectedPeers.size >= MAX_CONNECT_COUNT) {
              return false;
            }
            // 这个节点已经连过了
            if (cpeer.connectedPeers.has(i)) {
              return false;
            }
            return true;
          });

          while (peer.connectedPeers.size < TO_CONNECT_COUNT) {
            /// 没有洗牌，随机挑选
            const randomPeer = randomPeerList.splice(
              Math.floor(Math.random() * randomPeerList.length),
              1
            )[0]; //.shift();
            if (!randomPeer) {
              if (peer.connectedPeers.size < MIN_CONNECT_COUNT) {
                throw new Error("主动连接失败, 连接率达不成~~");
              }
              break;
            }
            /// 双向连接
            peer.connectedPeers.set(randomPeer.index, randomPeer);
            randomPeer.connectedPeers.set(peer.index, peer);
          }
        }
      }
      this.$data.peerMatrix = peerMatrix;
      console.log((performance.now() - _st).toFixed(4) + "ms");
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

      logicData.canvasCtrl = {
        allPc: allPeerContainerList,
        debugView,
      };
    },
    generateNetMeshAndReander() {
      this.generateNetMesh();
      this.canvasRender(this.$refs.canvas as HTMLCanvasElement);
    },
    async alert(title: string, message: string) {
      const alert = await alertController.create({
        header: title,
        // subHeader: 'Subtitle',
        message: message,
        buttons: ["确定"],
      });
      await alert.present();
    },
    async prepareBroadcast() {
      const alert = (message: string) =>
        this.alert("准备广播出现异常", message);
      if (!logicData.canvasCtrl) {
        alert("等待初始化……");
        return;
      }
      const allPc = logicData.canvasCtrl.allPc;
      const selectedPeerContainers = allPc.getPeerContainersByClassName(
        "active"
      );
      if (selectedPeerContainers.size < 2) {
        alert("没有选择足够的节点，请选择两个节点");
        return;
      }
      const [startPc, endPc] = [...selectedPeerContainers];
      const data = new Date().toLocaleTimeString();
      const boardcast = await startPc.doBoardcast(
        startPc,
        endPc,
        data,
        this.$data.boardcastMatrixType
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
        time: new Date().toLocaleTimeString(),
        type,
        log,
      });
      if (this.boardcastLogs.length > 1000) {
        this.boardcastLogs.length = 1000;
      }
    },
    async stepInBroadcast() {
      const alert = (message: string) =>
        this.alert("广播步进出现异常", message);
      if (!logicData.canvasCtrl || !logicData.currentBoardcastTask) {
        alert("还未准备开始广播");
        return;
      }
      const { boardcastMatrixType } = this;
      const { currentBoardcastTask, canvasCtrl } = logicData;
      const { boardcastMap, finishedPc, startPc, endPc } = currentBoardcastTask;
      const { allPc, debugView } = canvasCtrl;

      const debug = false;
      const STEP = ++this.$data.boardcastStepCount;
      debug && console.group(`第${STEP}步`);
      let size = boardcastMap.size;
      debugView.clear();
      let i = 0;
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
        const toPc = allPc[toPoint.toNumber()];

        debug &&
          console.log(
            `${fromPoint.toReadableString()} => ${toPoint.toReadableString()}`
          );

        debugView.drawAniDashedLine(
          fromPc.peer.viewBound.centerXY,
          toPc.peer.viewBound.centerXY
        );

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
        toPoint.onData.emit(fromBoardcast.data);
        toBoardcast.resolvePoint(fromPoint);
        this.$data.boardcastCount++;
        i++;
        /// 因为一直又新的节点进入到广播列表中,所以这里根据原有数量来限制新节点不要进入这个循环
        if (--size === 0) {
          break;
        }
      }

      let boardcastDone = false;
      if (boardcastMap.size === allPc.length || i === 0) {
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
        prefix = `在(${edgeSize}✖${edgeSize})的矩阵中，节点拥有${minConnectRate.toFixed(
          2
        )}%~${maxConnectRate.toFixed(
          2
        )}%的节点覆盖率，使用[${boardcastMatrixType}]，`;
      }
      this.appendBoardcastLogs(
        `使用了${STEP}步，${prefix}达成${(progress * 100).toFixed(
          2
        )}%的覆盖率，效率：${(
          (boardcastMap.size / this.$data.boardcastCount) *
          100
        ).toFixed(2)}%`,
        boardcastDone ? "success" : "info"
      );

      debug && console.groupEnd();
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
