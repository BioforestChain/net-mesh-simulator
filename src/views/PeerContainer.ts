import * as PIXI from "pixi.js";
import { Group } from "@pixi/layers";
import { OutlineFilter } from "@pixi/filter-outline";
import { bindThis, cacheGetter } from "@bfchain/util-decorator";
import { ViewPeer } from "./Home";
import { IndexedTokenMap } from "./IndexedTokenMap";
import { BroadcastMatrix, Point } from "@/matrix/ripple";
import { ClassList } from "./ClassList";
import { countClassNamePrefix } from "./const";

export class PeerContainer extends PIXI.Container {
  public readonly peerView = new PIXI.Graphics();
  public readonly labelView = new PIXI.Text("");
  public readonly meshView = new PIXI.Graphics();
  @cacheGetter
  private get all() {
    return this.opts.allPeerContainerList;
  }
  constructor(
    public readonly peer: ViewPeer,
    private opts: {
      allPeerContainerList: PeerContainerArray;
      PEER_VIEW_FILL: number;
      MESH_STYLE: {
        FILL: number;
        HOVER_FILL: number;
        ALPHA: number;
        HOVER_ALPHA: number;
      };
      peerGroup: Group;
      meshGroup: Group;
      topPeerGroup: Group;
      topMeshGroup: Group;
    }
  ) {
    super();

    this._initDraw();
    this._initEvents();
    this._initClass();
  }

  /**初始化绘制节点 */
  private _initDraw() {
    const peerContainer = this;
    const { peer } = this;
    const {
      allPeerContainerList,
      PEER_VIEW_FILL,
      MESH_STYLE,
      peerGroup,
      meshGroup,
      topPeerGroup,
      topMeshGroup,
    } = this.opts;
    allPeerContainerList[peer.index] = peerContainer;

    const { viewBound } = peer;
    const { peerView } = this;
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

    const { labelView } = this;
    labelView.style.fontSize = viewBound.width * 0.5;
    labelView.style.fill = 0xffffff;
    labelView.visible = false;
    peerView.addChild(labelView);

    const { meshView } = this;
    meshView.alpha = MESH_STYLE.ALPHA;
    meshView.visible = false;
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
  }
  /**事件绑定 */
  private _initEvents() {
    const { peerView } = this;
    peerView.addListener("pointerover", () => this.classList.add("hover"));
    peerView.addListener("pointerout", () => this.classList.remove("hover"));
    peerView.addListener("pointertap", (event) => {
      /// 选中或者反选
      const actived = this.classList.toggle("active");

      /// 如果时选中
      if (actived) {
        const activedPcList = [
          ...this.all.getPeerContainersByClassName("active"),
        ];
        /// 如果前面已经有存在2个以上选中的，那么只留下第一个和自己
        if (activedPcList.length > 2) {
          for (let index = 1; index < activedPcList.length; index++) {
            const activedPc = activedPcList[index];
            if (activedPc === this) {
              continue;
            }
            activedPc.classList.remove("active");
          }
        }
      }
    });
  }
  /**样式绑定 */
  private _initClass() {
    this.classList.onClassChanged.on((info) => {
      if (
        info.list.some(
          (className) => className === "active" || className === "hover"
        )
      ) {
        if (this.classList.containsSome("active", "hover")) {
          this._showDetail();
        } else {
          this._hideDetail();
        }
      }

      if (info.list.some((className) => className === "boardcasted")) {
        if (this.classList.containsSome("boardcasted")) {
          this.peerView.tint = 0x00ff00;
        } else {
          this.peerView.tint = 0xffffff;
        }
      }

      if (info.list.some((c) => c.startsWith(countClassNamePrefix))) {
        const countClassName = this.classList.find((c) =>
          c.startsWith(countClassNamePrefix)
        );
        if (countClassName) {
          this.labelView.visible = true;
          this.labelView.text = countClassName.slice(
            countClassNamePrefix.length
          );
          this.labelView.x =
            this.peer.viewBound.centerX - this.labelView.width / 2;
          this.labelView.y =
            this.peer.viewBound.centerY - this.labelView.height / 2;
        } else {
          this.labelView.visible = false;
        }
      }
    });
  }

  private _showDetailFilters: PIXI.Filter[] = (() => {
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
    return [outlineFilter];
  })();
  private _hideDetailFilters: PIXI.Filter[] = [];
  private _showDetail() {
    const { peer, peerView, meshView, _showDetailFilters: showFilters } = this;
    const {
      MESH_STYLE,
      topMeshGroup,
      topPeerGroup,
      allPeerContainerList,
    } = this.opts;
    const peerContainer = this;

    // console.log(peerView, meshView);
    // console.log("over", peer.index);
    // waveFilter.time = 0;
    peerContainer.cacheAsBitmap = false;

    meshView.tint = MESH_STYLE.HOVER_FILL;
    meshView.alpha = MESH_STYLE.HOVER_ALPHA;
    meshView.visible = true;
    meshView.zIndex = 1;
    meshView.filters = showFilters;
    meshView.parentGroup = topMeshGroup;
    peerView.filters = showFilters;
    peerView.parentGroup = topPeerGroup;
    for (const cpeer of peer.connectedPeers.values()) {
      const cPeerContainer = allPeerContainerList[cpeer.index];
      cPeerContainer.cacheAsBitmap = false;
      const cPeerView = cPeerContainer.getChildAt(0);
      cPeerView.filters = showFilters;
      cPeerView.parentGroup = topPeerGroup;
    }
  }
  private _hideDetail() {
    const {
      MESH_STYLE,
      meshGroup,
      peerGroup,
      allPeerContainerList,
    } = this.opts;

    const { peer, peerView, meshView, _hideDetailFilters: hideFilters } = this;
    const peerContainer = this;

    // console.log("out", peer.index);
    meshView.tint = MESH_STYLE.FILL;
    meshView.alpha = MESH_STYLE.ALPHA;
    meshView.visible = false;
    meshView.zIndex = 0;
    meshView.filters = hideFilters;
    meshView.parentGroup = meshGroup;
    peerView.filters = hideFilters;
    peerView.parentGroup = peerGroup;
    for (const cpeer of peer.connectedPeers.values()) {
      const cPeerContainer = allPeerContainerList[cpeer.index];
      const cPeerView = cPeerContainer.getChildAt(0);
      cPeerView.filters = hideFilters;
      cPeerView.parentGroup = peerGroup;
      // cPeerContainer.cacheAsBitmap = true;
    }

    // peerContainer.cacheAsBitmap = true;
  }

  public readonly classList = new ClassList(
    this,
    this.all.peerContainer_ClassNames_Indexes
  );

  private _point?: Point;
  toPoint() {
    if (!this._point) {
      const point = (this._point = new Point(
        this.peer.x,
        this.peer.y,
        this.peer.edgeSize
      ));
      point.onData.on((data) => {
        this.classList.add("boardcasted");
        const countClassName = this.classList.find((c) =>
          c.startsWith(countClassNamePrefix)
        );
        if (countClassName) {
          this.classList.remove(countClassName);
          this.classList.add(
            `${countClassNamePrefix}${parseInt(
              countClassName.slice(countClassNamePrefix.length)
            ) + 1}`
          );
        } else {
          this.classList.add(`${countClassNamePrefix}1`);
        }
      });
    }
    return this._point;
  }
  /**初始化与广播矩阵的绑定 */
  private matrix?: BroadcastMatrix;
  private _initMatrix() {
    if (!this.matrix) {
      this.matrix = new BroadcastMatrix(this.toPoint());
      for (const [cindex] of this.peer.connectedPeers) {
        this.matrix.addConntectedPoint(this.all[cindex].toPoint());
      }
    }
    return this.matrix;
  }
  doBoardcast(endPc: PeerContainer, data: string) {
    const boardcast = this._initMatrix().startMartixBroadcast(
      endPc.toPoint(),
      data
    );
    // const startPoint = this.toPoint();
    // startPoint.onData.on(() => {
    //   boardcast.resolvePoint(startPoint);
    // });
    return boardcast;
  }
}
export class PeerContainerArray extends Array<PeerContainer> {
  public readonly peerContainer_ClassNames_Indexes = new IndexedTokenMap<
    PeerContainer,
    string
  >();
  private _emptyPcSet = new Set<PeerContainer>() as ReadonlySet<PeerContainer>;
  getPeerContainersByClassName(className: string) {
    return (
      this.peerContainer_ClassNames_Indexes.indexes.get(className)?.toSet() ||
      this._emptyPcSet
    );
  }
}
