<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ title }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-card>
        <ion-grid id="controller-panel">
          <ion-card-header>
            <ion-card-title>矩阵定制面板</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-row>
              <ion-col size="12" size-sm>
                <ion-item>
                  <ion-label position="fixed">矩阵大小</ion-label>
                  <ion-input type="number"> </ion-input>
                </ion-item>
              </ion-col>
              <ion-col size="12" size-sm>
                <ion-item>
                  <ion-label position="fixed">最大互连率</ion-label>
                  <ion-input
                    class="text-right"
                    type="number"
                    inputmode="decimal"
                    max="100"
                    step="0.1"
                    min="1"
                  ></ion-input>
                  <span slot="end">%</span>
                </ion-item>
                <ion-item>
                  <ion-label position="fixed">最小互连率</ion-label>
                  <ion-input
                    class="text-right"
                    type="number"
                    inputmode="decimal"
                    max="100"
                    step="0.1"
                    min="1"
                  ></ion-input>
                  <span slot="end">%</span>
                </ion-item>
              </ion-col>
            </ion-row>

            <ion-button @click="generateNetMesh()">生成网络</ion-button>
          </ion-card-content>
        </ion-grid>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>矩阵网格</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <svg
            :viewBox="`0 0 ${canvasViewBox.width} ${canvasViewBox.height}`"
            class="bg-gray-50 hidden"
          >
            <template v-for="peer in peerMatrix" :key="peer.index">
              <rect
                :x="peer.viewBound.left"
                :y="peer.viewBound.top"
                :width="peer.viewBound.width"
                :height="peer.viewBound.height"
                fill="var(--ion-color-secondary)"
              />
              <path
                :d="peer.connectedPeerPath()"
                stroke="rgba(var(--ion-color-tertiary-rgb,0.1))"
                stroke-width="1"
              />
              <!-- <template
                v-for="(cpeer, index) in peer.connectedPeers.values()"
                :key="peer.index + '/' + index"
              >
                <path
                  :d="peer.viewBound.p2pPath(cpeer.viewBound)"
                  stroke="rgba(var(--ion-color-secondary-rgb,0.5))"
                  stroke-width="1"
                />
              </template> -->
              <!-- <line :x1="peer.viewBound.centerX" :y1="peer.viewBound.centerY" x2="100" y2="20" stroke="black" stroke-width="2"/> -->
            </template>
          </svg>
          <canvas class="matrixView" ref="canvas"></canvas>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  // IonCardSubtitle,
  IonCardContent,
} from "@ionic/vue";
import { defineComponent } from "vue";
import * as PIXI from "pixi.js";
import { Layer, Group, Stage } from "@pixi/layers";
import * as convert from "color-convert";
import * as colorString from "color-string";
import { ShockwaveFilter } from "@pixi/filter-shockwave";
import { OutlineFilter } from "@pixi/filter-outline";

type $MatrixGenerateOptions = {
  edgeSize: number;
  maxConnectRate: number;
  minConnectRate: number;
};
const BUILDIN_MATRIX_GENERATE_OPTIONS_LIST = [
  {
    label: "Default",
    options: {
      edgeSize: 20,
      maxConnectRate: 5,
      minConnectRate: 2,
    } as $MatrixGenerateOptions,
  },
];
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
}

class ViewPeer {
  constructor(readonly index: number, public readonly viewBound: ViewBound) {}
  readonly connectedPeers = new Map<number, ViewPeer>();
  connectedPeerPath() {
    let d = "";
    for (const cpeer of this.connectedPeers.values()) {
      d += this.viewBound.p2pPath(cpeer.viewBound) + " ";
    }
    return d;
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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    // IonCardSubtitle,
    IonCardContent,
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
    };
  },
  created() {
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
              new ViewBound(UNIT_LEFT * x, UNIT_TOP * y, UNIT_W, UNIT_H)
            );
          }
        }
      }
      /// 节点互联
      {
        const _st = performance.now();

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
        console.log((performance.now() - _st).toFixed(4) + "ms");
      }
      this.$data.peerMatrix = peerMatrix;
    },
    canvasRender(canvas: HTMLCanvasElement) {
      const { peerMatrix, canvasViewBox, matrixGenOptions } = this.$data;
      const app = new PIXI.Application({
        view: canvas,
        width: canvasViewBox.width,
        height: canvasViewBox.height,
        resolution: 1,
        backgroundAlpha: 0,
        antialias: true,
      });
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
        HOVER_ALPHA: 1,
      };

      const peerGroup = new Group(2, false);
      const meshGroup = new Group(1, false);
      const topMeshGroup = new Group(4, false);
      const topPeerGroup = new Group(3, false);
      rootContainer.sortableChildren = true;
      rootContainer.addChild(new Layer(peerGroup));
      rootContainer.addChild(new Layer(meshGroup));
      rootContainer.addChild(new Layer(topMeshGroup));
      rootContainer.addChild(new Layer(topPeerGroup));

      const allPeerContainerList: PIXI.Container[] = [];
      for (const peer of peerMatrix) {
        const peerContainer = new PIXI.Container();
        allPeerContainerList[peer.index] = peerContainer;
        rootContainer.addChild(peerContainer);

        const { viewBound } = peer;
        const peerView = new PIXI.Graphics();
        peerView.beginFill(PEER_VIEW_FILL);
        peerView.drawRoundedRect(
          viewBound.left,
          viewBound.top,
          viewBound.width,
          viewBound.height,
          viewBound.width * 0.2
        );
        // peerView.alpha = 0.8;
        peerView.parentGroup = peerGroup;
        peerContainer.addChild(peerView);
        peerView.interactive = true;
        const meshView = new PIXI.Graphics();
        meshView.alpha = 0.5;
        meshView.lineStyle({
          width: 1,
          color: 0xffffff,
          alpha: 1,
          native: true,
        });
        meshView.tint = MESH_STYLE.FILL;
        meshView.alpha = MESH_STYLE.ALPHA;
        const { centerX, centerY } = viewBound;
        for (const cpeer of peer.connectedPeers.values()) {
          meshView.moveTo(centerX, centerY);
          meshView.lineTo(cpeer.viewBound.centerX, cpeer.viewBound.centerY);
        }
        meshView.parentGroup = meshGroup;
        meshView.blendMode = PIXI.BLEND_MODES.SOFT_LIGHT;
        peerContainer.addChild(meshView);
        // const waveFilter = new ShockwaveFilter([centerX, centerY], {
        //   amplitude: viewBound.width / 5,
        //   wavelength:
        //     viewBound.width * Math.ceil(matrixGenOptions.edgeSize / 2),
        //   brightness: 1,
        //   radius: -1,
        // });
        // waveFilter.speed = viewBound.width;
        // const MAX_TIME = (canvasViewBox.width * Math.SQRT2) / waveFilter.speed;
        // let actived = false;
        // app.ticker.add((t) => {
        //   if (actived) {
        //     waveFilter.time += t / 10;
        //     waveFilter.time %= MAX_TIME; // (waveFilter.time + 0.01) % 1;
        //   }
        // });

        const outlineFilter = new OutlineFilter(0.8);
        peerView.addListener("pointerover", () => {
          console.log(peerView, meshView);
          console.log("over", peer.index);
          // actived = true;
          // waveFilter.time = 0;
          peerContainer.cacheAsBitmap = false;

          meshView.tint = MESH_STYLE.HOVER_FILL;
          meshView.alpha = MESH_STYLE.HOVER_ALPHA;
          meshView.zIndex = 1;
          meshView.filters = [/* waveFilter, */ outlineFilter];
          meshView.parentGroup = topMeshGroup;
          peerView.filters = [outlineFilter];
          peerView.parentGroup = topPeerGroup;
          for (const cpeer of peer.connectedPeers.values()) {
            const cPeerContainer = allPeerContainerList[cpeer.index];
            cPeerContainer.cacheAsBitmap = false;
            const cPeerView = cPeerContainer.getChildAt(0);
            cPeerView.filters = [outlineFilter];
            cPeerView.parentGroup = topPeerGroup;
          }
        });
        peerView.addListener("pointerout", () => {
          console.log("out", peer.index);
          // actived = false;
          meshView.tint = MESH_STYLE.FILL;
          meshView.alpha = MESH_STYLE.ALPHA;
          meshView.zIndex = 0;
          meshView.filters = [];
          meshView.parentGroup = meshGroup;
          peerView.filters = [];
          peerView.parentGroup = peerGroup;
          for (const cpeer of peer.connectedPeers.values()) {
            const cPeerContainer = allPeerContainerList[cpeer.index];
            const cPeerView = cPeerContainer.getChildAt(0);
            cPeerView.filters = [];
            cPeerView.parentGroup = peerGroup;
            cPeerContainer.cacheAsBitmap = true;
          }

          // peerContainer.cacheAsBitmap = true;
        });
        // peerContainer.cacheAsBitmap = true;
      }
      console.log(PIXI.settings.TARGET_FPMS);
      // app.ticker.minFPS = 0;
      // app.ticker.maxFPS = 30;
    },
  },
});
</script>

<style scoped>
.ion-border-style-none {
  --border-style: none;
}
.matrixView {
  width: 100%;
  height: 100%;
}
</style>
